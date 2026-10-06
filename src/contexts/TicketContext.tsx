/**
 * The signed-in passenger's tickets.
 *
 * Holds state, actions and memoized derived views. All booking rules,
 * persistence and status maths live in the ticket domain and `ticketService`;
 * this provider wires them to React.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { POLLING } from "@/constants/config";
import {
  selectActiveTicket,
  selectPassengerStats,
  selectTicketHistory,
  type PassengerStats,
} from "@/domain/ticket/selectors";
import { syncTicketStatuses } from "@/domain/ticket/status";
import type { Ticket, TicketDraft } from "@/domain/ticket/types";
import {
  bookTicket as bookTicketInStorage,
  issueValidatedTicket,
  validateBooking as validateBookingRules,
  cancelTicket as cancelTicketInStorage,
  loadTickets,
  migrateLegacyTicket,
  purgeOtherUsersTickets,
  pushTicket,
  pushTicketStatus,
  saveTickets,
  syncTickets,
  type BookingResult,
  type BookingValidation,
} from "@/services/ticketService";
import { useAuth } from "./AuthContext";

interface TicketContextValue {
  tickets: Ticket[];
  /** The journey in progress or next up, if any. */
  activeTicket: Ticket | null;
  /** Completed and cancelled journeys. */
  ticketHistory: Ticket[];
  stats: PassengerStats;
  bookTicket: (draft: TicketDraft) => Promise<BookingResult>;
  /** Applies the booking rules without writing. Call this before payment. */
  validateBooking: (draft: TicketDraft) => BookingValidation;
  /** Persists a validated, paid-for ticket. Never refuses. */
  issueTicket: (ticket: Ticket) => Promise<{ ticket: Ticket; persisted: boolean }>;
  /**
   * Cancels a ticket, reporting whether it actually happened.
   *
   * It can legitimately fail - a ticket that already departed, one that
   * belongs to somebody else, or a storage write that is refused - and a
   * caller that ignores the answer tells the passenger their ticket is
   * cancelled while it is still live.
   */
  cancelTicket: (ticketId: string) => Promise<boolean>;
  refreshTickets: () => void;
}

const TicketContext = createContext<TicketContextValue | null>(null);

const NO_TICKETS: Ticket[] = [];

export const TicketProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>(NO_TICKETS);

  const userId = user?.uid ?? null;
  const userEmail = user?.email ?? "";

  /** Loads the signed-in user's tickets, migrating any legacy record first. */
  useEffect(() => {
    if (!userId) {
      setTickets(NO_TICKETS);
      return;
    }

    // Shared devices: no other account's tickets, QR payloads or validation
    // tokens may remain at rest once someone else signs in.
    const purged = purgeOtherUsersTickets(userId);

    if (purged > 0) {
      console.info(`Cleared cached tickets for ${purged} other account(s).`);
    }

    migrateLegacyTicket(userId, userEmail);

    const stored = loadTickets(userId);
    const synced = syncTicketStatuses(stored, new Date());

    if (synced !== stored) saveTickets(userId, synced);

    setTickets(synced);

    /*
      The cached copy is published first so a ticket opens with no network at
      all. Reconciliation follows and may widen the list, but is never allowed
      to publish into a session that has since moved on to another account.
    */
    let stale = false;

    void syncTickets(userId, synced).then((merged) => {
      if (stale) return;

      const settled = syncTicketStatuses(merged, new Date());

      saveTickets(userId, settled);
      setTickets(settled);
    });

    return () => {
      stale = true;
    };
  }, [userId, userEmail]);

  /**
   * Re-derives statuses on a timer so a ticket moves through BOARDING_SOON,
   * IN_TRANSIT and COMPLETED while the tab stays open.
   */
  useEffect(() => {
    if (!userId) return;

    const interval = setInterval(() => {
      setTickets((previous) => {
        const next = syncTicketStatuses(previous, new Date());

        if (next !== previous) saveTickets(userId, next);

        return next;
      });
    }, POLLING.TICKET_STATUS_MS);

    return () => clearInterval(interval);
  }, [userId]);

  const refreshTickets = useCallback(() => {
    if (!userId) return;

    const stored = loadTickets(userId);
    const synced = syncTicketStatuses(stored, new Date());

    if (synced !== stored) saveTickets(userId, synced);

    setTickets(synced);
  }, [userId]);

  /*
    The ticket is issued from the local write, not from the server round trip,
    so a passenger standing in a dead spot still walks away holding it. The
    push is best-effort; anything it misses is sent by the next sync.
  */
  const bookTicket = useCallback(
    async (draft: TicketDraft): Promise<BookingResult> => {
      if (!userId) return { ok: false, reason: "NOT_AUTHENTICATED" };

      const result = bookTicketInStorage(userId, tickets, draft);

      if (!result.ok) return result;

      setTickets(result.tickets);

      await pushTicket(result.ticket);

      return result;
    },
    [userId, tickets]
  );

  const validateBooking = useCallback(
    (draft: TicketDraft): BookingValidation => {
      if (!userId) return { ok: false, reason: "NOT_AUTHENTICATED" };

      return validateBookingRules(userId, tickets, draft);
    },
    [userId, tickets]
  );

  const issueTicket = useCallback(
    async (ticket: Ticket): Promise<{ ticket: Ticket; persisted: boolean }> => {
      if (!userId) return { ticket, persisted: false };

      const issued = issueValidatedTicket(userId, tickets, ticket);

      setTickets(issued.tickets);

      await pushTicket(issued.ticket);

      return { ticket: issued.ticket, persisted: issued.persisted };
    },
    [userId, tickets]
  );

  const cancelTicket = useCallback(
    async (ticketId: string): Promise<boolean> => {
      if (!userId) return false;

      const next = cancelTicketInStorage(userId, tickets, ticketId);

      if (!next) return false;

      setTickets(next);

      const cancelled = next.find((ticket) => ticket.ticketId === ticketId);

      if (cancelled) await pushTicketStatus(cancelled);

      /*
        The local cancellation is what counts. `pushTicketStatus` is a
        best-effort broadcast to the operator and its failure must not tell
        the passenger their cancellation did not take, because it did.
      */
      return true;
    },
    [userId, tickets]
  );

  const activeTicket = useMemo(() => selectActiveTicket(tickets), [tickets]);
  const ticketHistory = useMemo(() => selectTicketHistory(tickets), [tickets]);
  const stats = useMemo(() => selectPassengerStats(tickets), [tickets]);

  const value = useMemo<TicketContextValue>(
    () => ({
      tickets,
      activeTicket,
      ticketHistory,
      stats,
      bookTicket,
      validateBooking,
      issueTicket,
      cancelTicket,
      refreshTickets,
    }),
    [
      tickets,
      activeTicket,
      ticketHistory,
      stats,
      bookTicket,
      validateBooking,
      issueTicket,
      cancelTicket,
      refreshTickets,
    ]
  );

  return <TicketContext.Provider value={value}>{children}</TicketContext.Provider>;
};

export const useTickets = (): TicketContextValue => {
  const context = useContext(TicketContext);

  if (!context) throw new Error("useTickets must be used within a TicketProvider");

  return context;
};
