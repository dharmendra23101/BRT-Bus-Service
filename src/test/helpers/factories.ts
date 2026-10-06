/**
 * Fake data builders.
 *
 * Each builder produces a valid object by default and takes an override, so
 * a test states only the field it cares about. That keeps the intent of a
 * test visible instead of buried in twenty lines of fixture setup, and means
 * adding a required field to a domain type breaks one file rather than forty.
 */

import { confirmPayment, createTicket } from "@/domain/ticket/factory";
import type { Ticket, TicketDraft } from "@/domain/ticket/types";
import { getTrips, type Trip } from "@/domain/transit/schedule";
import type { UserRecord } from "@/types/user";

/** A fixed clock so every time-dependent assertion is deterministic. */
export const TEST_NOW = new Date(2026, 6, 19, 8, 0, 0);

export const at = (hours: number, minutes = 0): Date =>
  new Date(2026, 6, 19, hours, minutes, 0);

export const makeDraft = (over: Partial<TicketDraft> = {}): TicketDraft => ({
  userId: "user-1",
  userEmail: "rider@example.com",
  route: "101",
  fromStop: "HNLU",
  toStop: "CBD",
  fare: 10,
  departureTime: "10:00 AM",
  arrivalTime: "11:00 AM",
  bookingTime: at(7, 0).toISOString(),
  ...over,
});

/**
 * A payment intent standing in for whatever a provider returned.
 *
 * The amount is not read by anything that stores a ticket; the reference is,
 * because it is the passenger's handle on the transaction.
 */
const paidWith = { intentId: "test-intent", amountInr: 10, reference: "test-ref" };

/**
 * A complete, paid ticket.
 *
 * Built through the real factory rather than hand-written, so a fixture can
 * never describe a ticket the application itself could not produce - and
 * through BOTH of its steps, because a ticket in storage is one a passenger
 * paid for. `createTicket` alone now leaves the payment PENDING, which is the
 * truthful state of a journey that has been validated and not yet bought.
 *
 * A test that wants the unpaid half can ask for it through `patch`.
 */
export const makeTicket = (
  over: Partial<TicketDraft> = {},
  now: Date = TEST_NOW,
  patch: Partial<Ticket> = {}
): Ticket => ({
  ...confirmPayment(createTicket(makeDraft(over), now), paidWith, now),
  ...patch,
});

/** Formats a Date as the 12-hour string the timetable uses ("6:25 AM"). */
export const formatClockTime = (date: Date): string => {
  const hours = ((date.getHours() + 11) % 12) + 1;
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes} ${date.getHours() < 12 ? "AM" : "PM"}`;
};

/**
 * A draft for a journey that genuinely departs in the future.
 *
 * Anything time-dependent has to be built from the real clock rather than a
 * fixed string: a hardcoded "10:00 AM" is in the past for most of the day,
 * so the booking rules would reject it and the test would pass or fail
 * depending on when it ran.
 */
export const makeFutureDraft = (
  over: Partial<TicketDraft> = {},
  minutesAhead = 60
): TicketDraft => {
  const now = new Date();
  const departure = new Date(now.getTime() + minutesAhead * 60_000);
  const arrival = new Date(departure.getTime() + 30 * 60_000);

  return makeDraft({
    departureTime: formatClockTime(departure),
    arrivalTime: formatClockTime(arrival),
    bookingTime: now.toISOString(),
    ...over,
  });
};

/** A ticket for a journey that has not departed yet, so it stays cancellable. */
export const makeUpcomingTicket = (over: Partial<TicketDraft> = {}): Ticket => {
  const now = new Date();

  return confirmPayment(createTicket(makeFutureDraft(over), now), paidWith, now);
};

export const makeUserRecord = (over: Partial<UserRecord> = {}): UserRecord => ({
  uid: "user-1",
  name: "Test Rider",
  email: "rider@example.com",
  role: "user",
  ...over,
});

/** The first weekday trip, which calls at every stop. */
export const firstWeekdayTrip = (): Trip => getTrips("weekday")[0]!;

/** The first weekend route-102 trip, which skips the two Bhavan stops. */
export const expressTrip = (): Trip =>
  getTrips("weekend").find((trip) => trip.routeId === "102")!;

/** Writes tickets to storage exactly as the app does, for read-path tests. */
export const seedStoredTickets = (userId: string, tickets: Ticket[]): void => {
  localStorage.setItem(
    `brt.tickets.${userId}`,
    JSON.stringify({ v: 2, data: tickets })
  );
};

/** Writes tickets in the pre-Sprint-5 bare-array format. */
export const seedLegacyStoredTickets = (userId: string, tickets: Ticket[]): void => {
  localStorage.setItem(`brt.tickets.${userId}`, JSON.stringify(tickets));
};
