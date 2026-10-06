/**
 * Ticket persistence and booking orchestration.
 *
 * The seam between the pure ticket domain and the browser. Everything read
 * back from storage is treated as untrusted: it is schema-validated, then
 * ownership-checked, before any of it reaches the UI. Firestore is read with
 * exactly the same suspicion - a document is another party's output, and this
 * app has no more reason to trust it than it trusts localStorage.
 *
 * Firestore holds the record; browser storage holds a copy so a ticket that
 * has already been synced can still be shown with no network. Every remote
 * call is therefore best-effort: losing the network costs synchronisation,
 * never the passenger's ability to open a ticket they already hold.
 */

import { getDb } from "@/firebase";
import { REMOTE_PATHS, STORAGE_KEYS } from "@/constants/config";
import { findConflictingTicket } from "@/domain/ticket/conflicts";
import { createTicket } from "@/domain/ticket/factory";
import { isLiveStatus } from "@/domain/ticket/status";
import { getArrivalAt, getDepartureAt } from "@/domain/ticket/timing";
import type { TranslationKey } from "@/domain/i18n/en";

import type { Ticket, TicketDraft } from "@/domain/ticket/types";
import { ticketSchema, unknownArraySchema } from "@/domain/validation/schemas";
import {
  clearWhere,
  readValidated,
  removeKey,
  storageKey,
  write,
} from "./storageService";

const ticketsKey = (userId: string): string => storageKey("tickets", userId);

/**
 * Client-side bound on a ticket read, matching the cap in `firestore.rules`.
 *
 * The rule refuses a wider query outright, so this is not merely a courtesy:
 * asking for more would fail the read rather than truncate it.
 */
export const MAX_TICKETS_PER_READ = 100;

/** Loads the Firestore SDK and database handle together. */
const firestore = async () => {
  const [sdk, db] = await Promise.all([import("firebase/firestore"), getDb()]);
  return { ...sdk, db };
};

/**
 * Upgrades payloads written before storage was versioned.
 *
 * Version 0 is the pre-envelope format: a bare `Ticket[]` written straight to
 * the key. Anything unrecognised becomes an empty list rather than being
 * passed through unvalidated.
 */
const migrateTickets = (raw: unknown, version: number): unknown => {
  if (version === 0 && Array.isArray(raw)) return raw;

  return Array.isArray(raw) ? raw : [];
};

/**
 * Every ticket held by a user, newest first.
 *
 * Each entry is validated on its own, so a single tampered or corrupt record
 * costs the passenger that one ticket rather than their whole history. Two
 * checks apply per entry: the schema rejects a wrong shape (a hand-edited
 * fare, an unknown stop, a broken date), and the ownership check rejects any
 * record claiming a different `userId`, so a tampered store cannot inject
 * another account's journey into this session.
 *
 * When anything is dropped the cleaned list is written back, so the store
 * heals instead of re-reporting the same damage on every read.
 */
export const loadTickets = (userId: string): Ticket[] => {
  if (!userId) return [];

  const { value } = readValidated<unknown[]>(
    ticketsKey(userId),
    unknownArraySchema,
    [],
    migrateTickets
  );

  const tickets: Ticket[] = [];
  let dropped = 0;

  for (const entry of value) {
    const parsed = ticketSchema.safeParse(entry);

    if (!parsed.success || parsed.data.userId !== userId) {
      dropped += 1;
      continue;
    }

    tickets.push(parsed.data);
  }

  if (dropped > 0) {
    console.warn(`Discarded ${dropped} unreadable or foreign stored ticket(s).`);
    saveTickets(userId, tickets);
  }

  return tickets;
};

/** Persists a user's full ticket list. Returns false when storage refused. */
export const saveTickets = (userId: string, tickets: Ticket[]): boolean =>
  userId ? write(ticketsKey(userId), tickets) === "ok" : false;

/**
 * Removes cached tickets for every account except the one signing in.
 *
 * Ticket data is session-scoped by intent: on a shared browser the previous
 * passenger's journeys, QR payloads and validation tokens must not remain at
 * rest once someone else signs in.
 */
export const purgeOtherUsersTickets = (currentUserId: string): number => {
  const keep = ticketsKey(currentUserId);

  return clearWhere((key) => key.startsWith(storageKey("tickets")) && key !== keep);
};

/**
 * Every ticket the server holds for a user.
 *
 * Each document is validated and ownership-checked exactly as a stored one is,
 * so a record written by an older build - or by anything other than this app -
 * costs that one ticket instead of breaking the list.
 */
export const fetchRemoteTickets = async (userId: string): Promise<Ticket[]> => {
  if (!userId) return [];

  const { collection, getDocs, limit, query, where, db } = await firestore();

  const snapshot = await getDocs(
    query(
      collection(db, REMOTE_PATHS.TICKETS),
      where("userId", "==", userId),
      limit(MAX_TICKETS_PER_READ)
    )
  );

  const tickets: Ticket[] = [];

  for (const entry of snapshot.docs) {
    const parsed = ticketSchema.safeParse(entry.data());

    if (parsed.success && parsed.data.userId === userId) tickets.push(parsed.data);
  }

  return tickets;
};

/**
 * Writes a ticket to the server, keyed by its own id so a retry cannot create
 * a second copy of the same journey.
 */
export const pushTicket = async (ticket: Ticket): Promise<boolean> => {
  try {
    const { doc, setDoc, db } = await firestore();

    await setDoc(doc(db, REMOTE_PATHS.TICKETS, ticket.ticketId), ticket);

    return true;
  } catch (error) {
    console.error("Could not save that ticket to the server:", error);
    return false;
  }
};

/**
 * Publishes a cancellation.
 *
 * Only the two fields the rules allow to move after purchase are sent, so this
 * cannot be used to rewrite a fare or a journey.
 */
export const pushTicketStatus = async (ticket: Ticket): Promise<boolean> => {
  try {
    const { doc, updateDoc, db } = await firestore();

    await updateDoc(doc(db, REMOTE_PATHS.TICKETS, ticket.ticketId), {
      status: ticket.status,
      updatedAt: ticket.updatedAt,
    });

    return true;
  } catch (error) {
    console.error("Could not update that ticket on the server:", error);
    return false;
  }
};

/**
 * Picks the version of a ticket that should survive.
 *
 * Status is otherwise derived from the clock rather than stored, so the only
 * disagreement that carries intent is a cancellation - which is terminal, and
 * wins from whichever side holds it however stale that side looks.
 */
const preferTicket = (a: Ticket, b: Ticket): Ticket => {
  if (a.status === "CANCELLED") return a;
  if (b.status === "CANCELLED") return b;

  return Date.parse(b.updatedAt) >= Date.parse(a.updatedAt) ? b : a;
};

/** Combines what the server holds with what this browser holds, newest first. */
export const mergeTickets = (local: Ticket[], remote: Ticket[]): Ticket[] => {
  const byId = new Map<string, Ticket>();

  for (const ticket of [...remote, ...local]) {
    const existing = byId.get(ticket.ticketId);

    byId.set(ticket.ticketId, existing ? preferTicket(existing, ticket) : ticket);
  }

  return [...byId.values()].sort(
    (first, second) => Date.parse(second.bookingTime) - Date.parse(first.bookingTime)
  );
};

/**
 * Reconciles this browser with the server.
 *
 * Tickets booked while offline are pushed up, cancellations made while offline
 * are published, and the two sides are merged. A failure anywhere returns what
 * the browser already had: an unreachable server must never empty a passenger's
 * wallet.
 */
export const syncTickets = async (
  userId: string,
  local: Ticket[]
): Promise<Ticket[]> => {
  if (!userId) return local;

  try {
    const remote = await fetchRemoteTickets(userId);

    for (const ticket of local) {
      const counterpart = remote.find(
        (entry) => entry.ticketId === ticket.ticketId
      );

      if (!counterpart) {
        await pushTicket(ticket);
        continue;
      }

      if (ticket.status === "CANCELLED" && counterpart.status !== "CANCELLED") {
        await pushTicketStatus(ticket);
      }
    }

    return mergeTickets(local, remote);
  } catch (error) {
    console.error("Could not synchronise tickets:", error);
    return local;
  }
};

export type BookingFailure =
  | "NOT_AUTHENTICATED"
  | "ALREADY_DEPARTED"
  | "OVERLAPPING_TICKET"
  | "INVALID_JOURNEY"
  | "STORAGE_FAILED";

export type BookingResult =
  | { ok: true; ticket: Ticket; tickets: Ticket[] }
  | { ok: false; reason: BookingFailure };

/** Why a booking was refused, in words a passenger can act on. */
export const BOOKING_FAILURE_MESSAGES: Record<BookingFailure, TranslationKey> = {
  NOT_AUTHENTICATED: "booking.failure.notAuthenticated",
  ALREADY_DEPARTED: "booking.failure.alreadyDeparted",
  OVERLAPPING_TICKET: "booking.failure.overlapping",
  INVALID_JOURNEY: "booking.failure.invalidJourney",
  STORAGE_FAILED: "booking.failure.storageFailed",
};

/** A journey that passed every booking rule and may now be paid for. */
export type BookingValidation =
  | { ok: true; ticket: Ticket }
  | { ok: false; reason: BookingFailure };

/** The outcome of persisting a ticket that has already been paid for. */
export interface IssuedTicket {
  ticket: Ticket;
  tickets: Ticket[];
  /**
   * Whether the ticket reached storage.
   *
   * False is not a refusal. Once payment has been taken the passenger owns
   * the ticket, so it is returned either way and the caller warns rather than
   * discarding it.
   */
  persisted: boolean;
}

/**
 * Applies every booking rule without writing anything.
 *
 * This runs BEFORE payment. The order matters more than it looks: each of
 * these refusals used to fire after the money had moved, which is how a
 * passenger ends up debited and then told they already hold an overlapping
 * ticket.
 *
 * The freshly built ticket is validated against the same schema used on read,
 * so a journey assembled from bad UI state is rejected at the boundary rather
 * than becoming a permanently malformed record.
 */
export const validateBooking = (
  userId: string,
  existing: Ticket[],
  draft: TicketDraft,
  now = new Date()
): BookingValidation => {
  if (!userId || draft.userId !== userId) {
    return { ok: false, reason: "NOT_AUTHENTICATED" };
  }

  const ticket = createTicket(draft, now);

  if (!ticketSchema.safeParse(ticket).success) {
    return { ok: false, reason: "INVALID_JOURNEY" };
  }

  if (getDepartureAt(ticket) < now) {
    return { ok: false, reason: "ALREADY_DEPARTED" };
  }

  const conflict = findConflictingTicket(
    existing,
    getDepartureAt(ticket),
    getArrivalAt(ticket)
  );

  if (conflict) return { ok: false, reason: "OVERLAPPING_TICKET" };

  return { ok: true, ticket };
};

/**
 * Persists a ticket that has already been validated and paid for.
 *
 * Total by construction: it has no failure branch, because there is no
 * acceptable way to refuse a passenger a ticket they have paid for.
 */
export const issueValidatedTicket = (
  userId: string,
  existing: Ticket[],
  ticket: Ticket
): IssuedTicket => {
  const tickets = [ticket, ...existing];

  return { ticket, tickets, persisted: saveTickets(userId, tickets) };
};

/**
 * Validates and persists in one step, for callers that take no payment.
 *
 * A payment flow must not use this: it has to validate, take the money, then
 * issue, so a rule can never refuse after the money has moved.
 */
export const bookTicket = (
  userId: string,
  existing: Ticket[],
  draft: TicketDraft,
  now = new Date()
): BookingResult => {
  const validation = validateBooking(userId, existing, draft, now);

  if (!validation.ok) return validation;

  const issued = issueValidatedTicket(userId, existing, validation.ticket);

  if (!issued.persisted) return { ok: false, reason: "STORAGE_FAILED" };

  return { ok: true, ticket: issued.ticket, tickets: issued.tickets };
};

/**
 * Marks a live ticket cancelled.
 *
 * Returns the updated list, or null when the ticket is missing, not owned by
 * the caller, already finished, or storage refused the write.
 */
export const cancelTicket = (
  userId: string,
  existing: Ticket[],
  ticketId: string,
  now = new Date()
): Ticket[] | null => {
  const target = existing.find((ticket) => ticket.ticketId === ticketId);

  if (!target || target.userId !== userId) return null;
  if (!isLiveStatus(target.status)) return null;

  const tickets = existing.map((ticket) =>
    ticket.ticketId === ticketId
      ? { ...ticket, status: "CANCELLED" as const, updatedAt: now.toISOString() }
      : ticket
  );

  return saveTickets(userId, tickets) ? tickets : null;
};

/**
 * Moves a pre-Sprint-2 single-ticket record into the per-user collection.
 *
 * Runs once per login. The legacy key is cleared on every outcome except a
 * failed write, where it is deliberately left in place so the migration can
 * be retried on the next login rather than losing the passenger's ticket.
 */
export const migrateLegacyTicket = (userId: string, userEmail: string): void => {
  let raw: string | null;

  try {
    raw = localStorage.getItem(STORAGE_KEYS.LEGACY_TICKET);
  } catch {
    return;
  }

  if (!raw) return;

  try {
    const legacy = JSON.parse(raw) as Record<string, unknown>;

    // Belongs to a different account: discard rather than hand it over.
    if (legacy?.user && legacy.user !== userEmail) {
      removeKey(STORAGE_KEYS.LEGACY_TICKET);
      return;
    }

    const existing = loadTickets(userId);
    const legacyId = typeof legacy.ticketId === "string" ? legacy.ticketId : null;
    const alreadyStored =
      legacyId !== null && existing.some((t) => t.ticketId === legacyId);

    if (legacyId && !alreadyStored) {
      const candidate = createTicket({
        userId,
        userEmail,
        route: "101",
        fromStop: "HNLU",
        toStop: "CBD",
        fare: typeof legacy.fare === "number" ? legacy.fare : 0,
        departureTime: typeof legacy.departure === "string" ? legacy.departure : "",
        arrivalTime: typeof legacy.arrival === "string" ? legacy.arrival : "",
        bookingTime:
          typeof legacy.bookingTime === "string"
            ? legacy.bookingTime
            : new Date().toISOString(),
      });

      const migrated = {
        ...candidate,
        ticketId: legacyId,
        paymentId:
          typeof legacy.paymentId === "string" ? legacy.paymentId : candidate.paymentId,
        route: legacy.route,
        fromStop: legacy.from,
        toStop: legacy.to,
      };

      // The legacy record's stops and route are free-form strings from an
      // older schema; only migrate it if it validates against the current one.
      const parsed = ticketSchema.safeParse(migrated);

      if (parsed.success && !saveTickets(userId, [parsed.data, ...existing])) {
        // Keep the legacy record so the next login can try again.
        return;
      }
    }

    removeKey(STORAGE_KEYS.LEGACY_TICKET);
  } catch (error) {
    console.error("Failed to migrate legacy ticket:", error);
    removeKey(STORAGE_KEYS.LEGACY_TICKET);
  }
};
