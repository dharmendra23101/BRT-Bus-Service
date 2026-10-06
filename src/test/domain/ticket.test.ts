import { describe, it, expect } from "vitest";
import { findConflictingTicket } from "@/domain/ticket/conflicts";
import { confirmPayment, createTicket } from "@/domain/ticket/factory";
import { isLiveStatus, resolveTicketStatus } from "@/domain/ticket/status";
import { getArrivalAt, getDepartureAt } from "@/domain/ticket/timing";
import type { TicketDraft } from "@/domain/ticket/types";
import { calculateFare } from "@/domain/transit/fares";

const BOOKED_ON = new Date(2026, 6, 19, 7, 0, 0).toISOString();

const draft = (over: Partial<TicketDraft> = {}): TicketDraft => ({
  userId: "u1",
  userEmail: "rider@example.com",
  route: "101",
  fromStop: "HNLU",
  toStop: "CBD",
  fare: 20,
  departureTime: "10:00 AM",
  arrivalTime: "11:00 AM",
  bookingTime: BOOKED_ON,
  ...over,
});

const at = (h: number, m: number) => new Date(2026, 6, 19, h, m, 0);

describe("fare calculation", () => {
  it("resolves fares that only exist in the reverse direction", () => {
    expect(calculateFare("HNLU", "Balco Medical Center")).toBe(5);
    expect(calculateFare("HNLU", "Sector 30")).toBe(5);
  });

  it("never returns zero for a valid distinct pair", () => {
    expect(calculateFare("HNLU", "CBD")).toBeGreaterThan(0);
    expect(calculateFare("Telibandha", "HNLU")).toBeGreaterThan(0);
  });

  it("returns zero for identical stops and no fare for empty ones", () => {
    expect(calculateFare("HNLU", "HNLU")).toBe(0);
    expect(calculateFare("", "CBD")).toBeNull();
  });
});

describe("ticket creation", () => {
  it("expires fifteen minutes after arrival", () => {
    const ticket = createTicket(draft());
    const expiry = new Date(ticket.expiresAt).getTime();
    const arrival = getArrivalAt(ticket).getTime();

    expect(expiry - arrival).toBe(15 * 60000);
  });

  it("emits a decodable qr payload carrying validation data", () => {
    const ticket = createTicket(draft());
    const payload = JSON.parse(ticket.qrData);

    expect(payload.tid).toBe(ticket.ticketId);
    expect(payload.uid).toBe("u1");
    expect(payload.from).toBe("HNLU");
    expect(payload.to).toBe("CBD");
    expect(payload.tok).toBe(ticket.validationToken);
    expect(payload.exp).toBe(ticket.expiresAt);
  });

  it("rolls arrival to the next day for a genuine midnight crossing", () => {
    const ticket = createTicket(
      draft({ departureTime: "11:30 PM", arrivalTime: "12:20 AM" })
    );

    const minutes =
      (getArrivalAt(ticket).getTime() - getDepartureAt(ticket).getTime()) / 60000;

    expect(minutes).toBe(50);
  });

  it("clamps a backwards timetable entry instead of adding a day", () => {
    const ticket = createTicket(
      draft({ departureTime: "4:14 PM", arrivalTime: "4:12 PM" })
    );

    const hours =
      (getArrivalAt(ticket).getTime() - getDepartureAt(ticket).getTime()) / 3600000;

    expect(hours).toBe(0);
  });
});

describe("status engine", () => {
  const intent = { intentId: "i", amountInr: 10, reference: "ref" };

  /* Paid, because every ticket that reaches storage has been. */
  const ticket = confirmPayment(createTicket(draft()), intent);

  /*
    This rule used to be unreachable. `createTicket` hardcoded SUCCESS, so no
    ticket could ever fail the payment check and the branch below it was dead
    - which is exactly why nothing noticed that the claim was never true.
  */
  it("holds a ticket at pending until its payment goes through", () => {
    expect(resolveTicketStatus(createTicket(draft()), at(8, 0))).toBe("PENDING");
  });

  it("records what the passenger would quote about the payment", () => {
    expect(ticket.paymentReference).toBe("ref");
  });

  it("is active well before departure", () => {
    expect(resolveTicketStatus(ticket, at(8, 0))).toBe("ACTIVE");
  });

  it("switches to boarding soon inside the departure window", () => {
    expect(resolveTicketStatus(ticket, at(9, 50))).toBe("BOARDING_SOON");
  });

  it("is in transit between departure and arrival", () => {
    expect(resolveTicketStatus(ticket, at(10, 30))).toBe("IN_TRANSIT");
  });

  it("completes once arrival passes", () => {
    expect(resolveTicketStatus(ticket, at(11, 5))).toBe("COMPLETED");
  });

  it("stays completed long after the grace period", () => {
    expect(resolveTicketStatus(ticket, at(11, 20))).toBe("COMPLETED");
    expect(resolveTicketStatus(ticket, at(23, 59))).toBe("COMPLETED");
  });

  it("keeps cancelled tickets cancelled", () => {
    expect(
      resolveTicketStatus({ ...ticket, status: "CANCELLED" }, at(8, 0))
    ).toBe("CANCELLED");
  });

  it("treats only pre-arrival states as live", () => {
    expect(isLiveStatus("ACTIVE")).toBe(true);
    expect(isLiveStatus("BOARDING_SOON")).toBe(true);
    expect(isLiveStatus("IN_TRANSIT")).toBe(true);
    expect(isLiveStatus("COMPLETED")).toBe(false);
    expect(isLiveStatus("CANCELLED")).toBe(false);
  });
});

describe("duplicate booking prevention", () => {
  const existing = confirmPayment(
    createTicket(draft(), at(8, 0)),
    { intentId: "i", amountInr: 10, reference: "ref" },
    at(8, 0)
  );

  it("blocks a journey overlapping a live ticket", () => {
    const conflict = findConflictingTicket(
      [existing],
      at(10, 30),
      at(11, 30)
    );

    expect(conflict?.ticketId).toBe(existing.ticketId);
  });

  it("allows a later non-overlapping journey", () => {
    expect(findConflictingTicket([existing], at(12, 0), at(13, 0))).toBeNull();
  });

  it("allows an earlier non-overlapping journey", () => {
    expect(findConflictingTicket([existing], at(7, 30), at(8, 30))).toBeNull();
  });

  it("ignores tickets that are no longer live", () => {
    const done = { ...existing, status: "COMPLETED" as const };

    expect(findConflictingTicket([done], at(10, 30), at(11, 30))).toBeNull();
  });
});
