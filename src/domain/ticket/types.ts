/**
 * Ticket domain types.
 *
 * Stops and routes are typed against the transit registries, so a ticket can
 * only ever reference a stop that actually exists.
 */

import type { RouteId } from "../transit/routes";
import type { StopName } from "../transit/stops";

export type TicketStatus =
  | "PENDING"
  | "ACTIVE"
  | "BOARDING_SOON"
  | "IN_TRANSIT"
  | "COMPLETED"
  | "CANCELLED";

export type PaymentStatus = "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED";

export interface Ticket {
  ticketId: string;
  paymentId: string;
  userId: string;
  userEmail: string;
  route: RouteId;
  fromStop: StopName;
  toStop: StopName;
  fare: number;
  /** Display departure time, e.g. "6:25 AM". */
  departureTime: string;
  /** Display arrival time, e.g. "7:48 AM". */
  arrivalTime: string;
  /** ISO date the journey takes place on. */
  travelDate: string;
  /** ISO instant the passenger booked. */
  bookingTime: string;
  createdAt: string;
  updatedAt: string;
  /** ISO instant the ticket stops being valid. */
  expiresAt: string;
  status: TicketStatus;
  paymentStatus: PaymentStatus;
  /**
   * What the passenger quotes when asking about the payment.
   *
   * Absent until a provider has accepted one - which is also how a ticket
   * built before payment is distinguishable from one that was paid for.
   */
  paymentReference?: string;
  /** Serialized QR payload; see `factory.ts`. */
  qrData: string;
  validationToken: string;
}

/**
 * A journey the passenger has chosen but not yet paid for.
 *
 * Carried between the booking modal and the payment modal, which previously
 * passed these six values as positional callback arguments.
 */
export interface JourneySelection {
  route: RouteId;
  fromStop: StopName;
  toStop: StopName;
  fare: number;
  departureTime: string;
  arrivalTime: string;
  /** ISO instant the passenger started booking. */
  bookingTime: string;
}

/** The fields a caller supplies; the factory derives the rest. */
export interface TicketDraft extends JourneySelection {
  userId: string;
  userEmail: string;
}
