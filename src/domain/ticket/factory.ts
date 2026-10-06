/**
 * Ticket construction and QR payload generation.
 */

import { resolveTicketStatus } from "./status";
import { getExpiryAt } from "./timing";
import type { Ticket, TicketDraft } from "./types";
import type { PaymentIntent } from "../payment/types";

const generateId = (prefix: string): string =>
  `${prefix}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

/**
 * The payload encoded into a ticket's QR code.
 *
 * Deliberately short-keyed: QR density grows with payload size, and this is
 * scanned on a phone screen. `v` lets a future validator reject payloads it
 * does not understand.
 */
const buildQrPayload = (ticket: Ticket): string =>
  JSON.stringify({
    v: 1,
    tid: ticket.ticketId,
    pid: ticket.paymentId,
    uid: ticket.userId,
    route: ticket.route,
    from: ticket.fromStop,
    to: ticket.toStop,
    dep: ticket.departureTime,
    arr: ticket.arrivalTime,
    date: ticket.travelDate,
    fare: ticket.fare,
    exp: ticket.expiresAt,
    tok: ticket.validationToken,
  });

/**
 * Builds a complete ticket from a draft.
 *
 * Expiry, QR payload and initial status are all derived rather than supplied,
 * so a caller cannot mint a ticket that outlives its journey.
 *
 * The payment is UNPAID here, and that is not a placeholder. This runs during
 * validation, before a provider has been asked for anything, precisely so a
 * refusal lands before money moves - see `validateBooking`. A ticket that
 * called itself paid at this point was stating something no code had checked,
 * and it stated it identically whether the payment later succeeded, failed or
 * was never attempted.
 */
export const createTicket = (draft: TicketDraft, now = new Date()): Ticket => {
  const nowIso = now.toISOString();

  const ticket: Ticket = {
    ticketId: generateId("TICKET"),
    paymentId: generateId("PAY"),
    userId: draft.userId,
    userEmail: draft.userEmail,
    route: draft.route,
    fromStop: draft.fromStop,
    toStop: draft.toStop,
    fare: draft.fare,
    departureTime: draft.departureTime,
    arrivalTime: draft.arrivalTime,
    travelDate: new Date(draft.bookingTime).toISOString(),
    bookingTime: draft.bookingTime,
    createdAt: nowIso,
    updatedAt: nowIso,
    expiresAt: nowIso,
    status: "PENDING",
    paymentStatus: "PENDING",
    qrData: "",
    validationToken: generateId("VAL"),
  };

  ticket.expiresAt = getExpiryAt(ticket).toISOString();

  ticket.qrData = buildQrPayload(ticket);
  ticket.status = resolveTicketStatus(ticket, now);

  return ticket;
};

/**
 * Records the payment a provider actually accepted.
 *
 * The intent's `reference` is kept because it is the only thing linking this
 * ticket to the provider's side of the transaction. Without it a passenger
 * saying "I paid, here is my reference" cannot be answered at all - and the
 * gateway seam was built to carry exactly that value, so discarding it threw
 * away the reconciliation the interface existed to make possible.
 *
 * Status is re-derived rather than assumed: a ticket whose departure passed
 * while the payment was in flight is not suddenly upcoming because it is paid.
 */
export const confirmPayment = (
  ticket: Ticket,
  intent: PaymentIntent,
  now = new Date()
): Ticket => {
  const paid: Ticket = {
    ...ticket,
    paymentStatus: "SUCCESS",
    paymentReference: intent.reference,
    updatedAt: now.toISOString(),
  };

  return { ...paid, status: resolveTicketStatus(paid, now) };
};
