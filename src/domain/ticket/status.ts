/**
 * The ticket status engine.
 *
 * Status is never stored as the source of truth - it is derived from the
 * clock every time it is asked for, then persisted as a cache. That is why a
 * ticket booked yesterday shows as COMPLETED today without anything having
 * run in the background.
 */

import { TICKET_RULES } from "@/constants/config";
import { getArrivalAt, getDepartureAt } from "./timing";
import type { Ticket, TicketStatus } from "./types";
import type { TranslationKey } from "@/domain/i18n/en";

/**
 * What each status is called, as a key rather than as words.
 *
 * The status engine decides which state a ticket is in; it does not decide
 * which language to say so in. Three surfaces render these - the ticket, the
 * history list and /help - and they have to agree, which is the reason this
 * is one table rather than three sets of literals.
 */
export const STATUS_LABELS: Record<TicketStatus, TranslationKey> = {
  PENDING: "ticket.status.pending",
  ACTIVE: "ticket.status.active",
  BOARDING_SOON: "ticket.status.boardingSoon",
  IN_TRANSIT: "ticket.status.inTransit",
  COMPLETED: "ticket.status.completed",
  CANCELLED: "ticket.status.cancelled",
};

/**
 * Derives a ticket's status at a given instant.
 *
 * Cancellation and unsettled payment are terminal and win over the clock.
 */
export const resolveTicketStatus = (ticket: Ticket, now: Date): TicketStatus => {
  if (ticket.status === "CANCELLED") return "CANCELLED";
  if (ticket.paymentStatus !== "SUCCESS") return "PENDING";

  const time = now.getTime();
  const departureAt = getDepartureAt(ticket).getTime();
  const arrivalAt = getArrivalAt(ticket).getTime();

  if (time >= arrivalAt) return "COMPLETED";
  if (time >= departureAt) return "IN_TRANSIT";

  if (departureAt - time <= TICKET_RULES.BOARDING_WINDOW_MINUTES * 60_000) {
    return "BOARDING_SOON";
  }

  return "ACTIVE";
};

/** Whether a ticket still entitles the holder to travel. */
export const isLiveStatus = (status: TicketStatus): boolean =>
  status === "ACTIVE" || status === "BOARDING_SOON" || status === "IN_TRANSIT";

/**
 * Re-derives statuses for a list of tickets.
 *
 * Returns the original array reference when nothing changed so callers can
 * skip a re-render and a storage write with a cheap identity check.
 */
export const syncTicketStatuses = (tickets: Ticket[], now: Date): Ticket[] => {
  let changed = false;

  const next = tickets.map((ticket) => {
    const status = resolveTicketStatus(ticket, now);
    if (status === ticket.status) return ticket;

    changed = true;
    return { ...ticket, status, updatedAt: now.toISOString() };
  });

  return changed ? next : tickets;
};
