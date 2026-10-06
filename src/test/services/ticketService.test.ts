/**
 * Ticket persistence and booking rules.
 *
 * These are the application's money paths: what may be booked, what is
 * refused, what survives a reload, and what happens when storage returns
 * something the app did not write. Several assertions here are regressions
 * for defects found during earlier sprints and are labelled as such.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { en } from "@/domain/i18n/en";
import { hi } from "@/domain/i18n/hi";
import {
  BOOKING_FAILURE_MESSAGES,
  bookTicket,
  cancelTicket,
  fetchRemoteTickets,
  issueValidatedTicket,
  loadTickets,
  mergeTickets,
  migrateLegacyTicket,
  purgeOtherUsersTickets,
  pushTicket,
  pushTicketStatus,
  saveTickets,
  syncTickets,
  validateBooking,
} from "@/services/ticketService";
import {
  at,
  makeDraft,
  makeTicket,
  seedLegacyStoredTickets,
  seedStoredTickets,
  TEST_NOW,
} from "../helpers/factories";
import { readDoc, seedDoc } from "../helpers/firebase";
import type { Ticket } from "@/domain/ticket/types";

const USER = "user-1";

describe("booking rules", () => {
  it("accepts a journey that departs in the future", () => {
    const result = bookTicket(USER, [], makeDraft(), at(9, 0));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ticket.fromStop).toBe("HNLU");
      expect(result.tickets).toHaveLength(1);
    }
  });

  it("refuses a bus that has already departed", () => {
    const result = bookTicket(USER, [], makeDraft(), at(10, 30));

    expect(result).toEqual({ ok: false, reason: "ALREADY_DEPARTED" });
  });

  it("refuses a journey overlapping a ticket the passenger already holds", () => {
    const existing = makeTicket({}, at(8, 0));

    const result = bookTicket(
      USER,
      [existing],
      makeDraft({ departureTime: "10:30 AM", arrivalTime: "11:30 AM" }),
      at(9, 0)
    );

    expect(result).toEqual({ ok: false, reason: "OVERLAPPING_TICKET" });
  });

  it("allows a second journey that does not overlap", () => {
    const existing = makeTicket({}, at(8, 0));

    const result = bookTicket(
      USER,
      [existing],
      makeDraft({ departureTime: "12:00 PM", arrivalTime: "1:00 PM" }),
      at(9, 0)
    );

    expect(result.ok).toBe(true);
  });

  it("ignores a completed ticket when checking for overlaps", () => {
    const finished = makeTicket({}, at(8, 0), { status: "COMPLETED" });

    const result = bookTicket(USER, [finished], makeDraft(), at(9, 0));

    expect(result.ok).toBe(true);
  });

  it("refuses to book on behalf of another account", () => {
    const result = bookTicket(
      USER,
      [],
      makeDraft({ userId: "someone-else" }),
      at(9, 0)
    );

    expect(result).toEqual({ ok: false, reason: "NOT_AUTHENTICATED" });
  });

  /*
    The registry holds KEYS now, so what a passenger reads is one lookup
    further on - and there are two languages to read it in. Checking the key
    strings would pass while a refusal rendered as
    `booking.failure.storageFailed` on a Hindi screen.
  */
  it("explains every refusal in words a passenger can act on", () => {
    for (const key of Object.values(BOOKING_FAILURE_MESSAGES)) {
      for (const catalogue of [en, hi]) {
        const message = catalogue[key];

        expect(message.length, key).toBeGreaterThan(10);
        // No error codes, internals or untranslated keys leaking into the UI.
        expect(message, key).not.toMatch(/[A-Z]{2,}_[A-Z]{2,}/);
        /* A key has no spaces and equals itself; a sentence has both. */
        expect(message, key).not.toBe(key);
        expect(message, key).toContain(" ");
      }
    }
  });
});

describe("cancelling", () => {
  it("marks a live ticket cancelled", () => {
    const ticket = makeTicket({}, at(8, 0));
    saveTickets(USER, [ticket]);

    const next = cancelTicket(USER, [ticket], ticket.ticketId, at(9, 0));

    expect(next?.[0]?.status).toBe("CANCELLED");
  });

  it("refuses to cancel a ticket owned by someone else", () => {
    const foreign = makeTicket({ userId: "someone-else" }, at(8, 0));

    expect(cancelTicket(USER, [foreign], foreign.ticketId, at(9, 0))).toBeNull();
  });

  it("refuses to cancel a journey that has already finished", () => {
    const done = makeTicket({}, at(8, 0), { status: "COMPLETED" });

    expect(cancelTicket(USER, [done], done.ticketId, at(9, 0))).toBeNull();
  });

  it("returns null for a ticket that does not exist", () => {
    expect(cancelTicket(USER, [], "TICKET-NOPE", at(9, 0))).toBeNull();
  });
});

describe("reading stored tickets", () => {
  it("round-trips what it wrote", () => {
    const ticket = makeTicket();
    saveTickets(USER, [ticket]);

    expect(loadTickets(USER).map((t) => t.ticketId)).toEqual([ticket.ticketId]);
  });

  it("reads tickets written before storage was versioned", () => {
    // Regression: the versioned envelope must not orphan existing tickets.
    const ticket = makeTicket();
    seedLegacyStoredTickets(USER, [ticket]);

    expect(loadTickets(USER)).toHaveLength(1);
  });

  it("upgrades a legacy payload in place so the migration happens once", () => {
    seedLegacyStoredTickets(USER, [makeTicket()]);

    loadTickets(USER);

    const raw = JSON.parse(localStorage.getItem(`brt.tickets.${USER}`)!);
    expect(raw.v).toBe(2);
  });

  it("drops only the damaged entry, keeping the rest", () => {
    /*
      Regression, twice over. Both the hand-rolled validator and its zod
      replacement originally failed the whole array on one bad element, which
      would have deleted a passenger's entire history over a single corrupt
      record.
    */
    const good = makeTicket();
    seedStoredTickets(USER, [
      good,
      { ticketId: "junk" } as never,
      { ...good, fare: -5 },
    ]);

    const loaded = loadTickets(USER);

    expect(loaded).toHaveLength(1);
    expect(loaded[0]!.ticketId).toBe(good.ticketId);
  });

  it("rejects a ticket claiming to belong to another account", () => {
    seedStoredTickets(USER, [makeTicket({ userId: "someone-else" })]);

    expect(loadTickets(USER)).toEqual([]);
  });

  it("survives outright corrupt JSON", () => {
    localStorage.setItem(`brt.tickets.${USER}`, "{not json");

    expect(loadTickets(USER)).toEqual([]);
  });

  it("returns nothing for a signed-out user", () => {
    expect(loadTickets("")).toEqual([]);
  });
});

describe("account switching on a shared device", () => {
  beforeEach(() => {
    saveTickets("user-1", [makeTicket({ userId: "user-1" })]);
    saveTickets("user-2", [makeTicket({ userId: "user-2" })]);
    saveTickets("user-10", [makeTicket({ userId: "user-10" })]);
  });

  it("clears every other account's cached tickets", () => {
    expect(purgeOtherUsersTickets("user-1")).toBe(2);
    expect(localStorage.getItem("brt.tickets.user-2")).toBeNull();
  });

  it("keeps the signed-in account's own tickets", () => {
    purgeOtherUsersTickets("user-1");

    expect(loadTickets("user-1")).toHaveLength(1);
  });

  it("does not confuse an account whose id merely shares a prefix", () => {
    // "user-1" is a prefix of "user-10"; a naive startsWith would nuke both.
    purgeOtherUsersTickets("user-10");

    expect(loadTickets("user-10")).toHaveLength(1);
  });
});

describe("migrating a pre-Sprint-2 ticket", () => {
  const legacyRecord = {
    ticketId: "TICKET-LEGACY1",
    paymentId: "PAY-LEGACY1",
    route: "101",
    from: "HNLU",
    to: "CBD",
    fare: 10,
    departure: "6:25 AM",
    arrival: "7:48 AM",
    user: "rider@example.com",
    bookingTime: at(5, 0).toISOString(),
  };

  it("moves it into the per-user collection and clears the old key", () => {
    localStorage.setItem("latestTicket", JSON.stringify(legacyRecord));

    migrateLegacyTicket(USER, "rider@example.com");

    const tickets = loadTickets(USER);
    expect(tickets).toHaveLength(1);
    expect(tickets[0]!.ticketId).toBe("TICKET-LEGACY1");
    expect(localStorage.getItem("latestTicket")).toBeNull();
  });

  it("discards a record belonging to a different account", () => {
    localStorage.setItem("latestTicket", JSON.stringify(legacyRecord));

    migrateLegacyTicket(USER, "someone-else@example.com");

    expect(loadTickets(USER)).toEqual([]);
    expect(localStorage.getItem("latestTicket")).toBeNull();
  });

  it("discards a record naming a stop that no longer exists", () => {
    localStorage.setItem(
      "latestTicket",
      JSON.stringify({ ...legacyRecord, to: "Abolished Halt" })
    );

    migrateLegacyTicket(USER, "rider@example.com");

    expect(loadTickets(USER)).toEqual([]);
  });

  it("does nothing when there is no legacy record", () => {
    migrateLegacyTicket(USER, "rider@example.com");

    expect(loadTickets(USER)).toEqual([]);
  });
});

describe("when the device refuses to store anything", () => {
  it("reports the failure instead of pretending the booking worked", () => {
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new DOMException("full", "QuotaExceededError");
      });

    const result = bookTicket(USER, [], makeDraft(), at(9, 0));

    expect(result).toEqual({ ok: false, reason: "STORAGE_FAILED" });

    setItem.mockRestore();
  });
});

/*
  Regression for the ordering defect: every one of these refusals used to fire
  AFTER the payment had been taken, which is how a passenger ends up debited
  and then told they already hold an overlapping ticket.
*/
describe("the order money and rules run in", () => {
  it("refuses a departed service without writing anything", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");

    const result = validateBooking(USER, [], makeDraft(), at(10, 30));

    expect(result).toEqual({ ok: false, reason: "ALREADY_DEPARTED" });
    expect(setItem).not.toHaveBeenCalled();

    setItem.mockRestore();
  });

  it("refuses an overlapping journey without writing anything", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const existing = makeTicket();

    const result = validateBooking(USER, [existing], makeDraft(), at(9, 0));

    expect(result).toEqual({ ok: false, reason: "OVERLAPPING_TICKET" });
    expect(setItem).not.toHaveBeenCalled();

    setItem.mockRestore();
  });

  it("hands back a ticket to pay for without storing it yet", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");

    const result = validateBooking(USER, [], makeDraft(), at(9, 0));

    expect(result.ok).toBe(true);
    expect(setItem).not.toHaveBeenCalled();

    setItem.mockRestore();
  });

  it("never withholds a paid-for ticket, even when storage refuses it", () => {
    const validated = validateBooking(USER, [], makeDraft(), at(9, 0));

    if (!validated.ok) throw new Error("expected the journey to validate");

    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new DOMException("full", "QuotaExceededError");
      });

    const issued = issueValidatedTicket(USER, [], validated.ticket);

    // The money has moved by this point, so a full disk may report a problem
    // but must never destroy the ticket.
    expect(issued.persisted).toBe(false);
    expect(issued.ticket).toEqual(validated.ticket);
    expect(issued.tickets).toContainEqual(validated.ticket);

    setItem.mockRestore();
  });
});

describe("reading tickets the server holds", () => {
  const seedRemote = (ticket: Ticket) =>
    seedDoc("tickets", ticket.ticketId, { ...ticket });

  it("asks only for the caller's own tickets", async () => {
    const mine = makeTicket({ userId: USER });
    const theirs = makeTicket({ userId: "someone-else" });

    seedRemote(mine);
    seedRemote(theirs);

    const tickets = await fetchRemoteTickets(USER);

    expect(tickets.map((ticket) => ticket.ticketId)).toEqual([mine.ticketId]);
  });

  it("drops a document claiming to belong to another account", async () => {
    const foreign = makeTicket({ userId: USER });

    seedDoc("tickets", foreign.ticketId, { ...foreign, userId: "someone-else" });

    expect(await fetchRemoteTickets(USER)).toEqual([]);
  });

  it("loses only the unreadable document, not the whole wallet", async () => {
    const good = makeTicket({ userId: USER });

    seedRemote(good);
    seedDoc("tickets", "broken", { userId: USER, fare: "free" });

    const tickets = await fetchRemoteTickets(USER);

    expect(tickets.map((ticket) => ticket.ticketId)).toEqual([good.ticketId]);
  });

  it("reports nothing for a caller with no id", async () => {
    expect(await fetchRemoteTickets("")).toEqual([]);
  });
});

describe("writing a ticket to the server", () => {
  it("keys the document by the ticket id so a retry cannot duplicate it", async () => {
    const ticket = makeTicket({ userId: USER });

    expect(await pushTicket(ticket)).toBe(true);
    expect(await pushTicket(ticket)).toBe(true);

    expect(await fetchRemoteTickets(USER)).toHaveLength(1);
  });

  it("sends only the two fields a cancellation may move", async () => {
    const ticket = makeTicket({ userId: USER });
    await pushTicket(ticket);

    await pushTicketStatus({
      ...ticket,
      status: "CANCELLED",
      updatedAt: at(12, 0).toISOString(),
      fare: 9999,
    });

    const stored = readDoc("tickets", ticket.ticketId)!;

    expect(stored.status).toBe("CANCELLED");
    expect(stored.fare).toBe(ticket.fare);
  });

  it("reports a refusal rather than throwing into a render", async () => {
    const { setDoc } = await import("firebase/firestore");
    vi.mocked(setDoc).mockRejectedValueOnce(new Error("offline"));

    const failed = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(await pushTicket(makeTicket({ userId: USER }))).toBe(false);

    failed.mockRestore();
  });
});

describe("combining what each side holds", () => {
  it("keeps a ticket only one side knows about", () => {
    const local = makeTicket({ userId: USER }, TEST_NOW);
    const remote = makeTicket({ userId: USER, fromStop: "CBD", toStop: "HNLU" }, TEST_NOW);

    const merged = mergeTickets([local], [remote]);

    expect(merged).toHaveLength(2);
  });

  it("never lists the same ticket twice", () => {
    const ticket = makeTicket({ userId: USER });

    expect(mergeTickets([ticket], [ticket])).toHaveLength(1);
  });

  it("lets a cancellation win over a copy that never saw it", () => {
    const ticket = makeTicket({ userId: USER });
    const cancelled = { ...ticket, status: "CANCELLED" as const };

    expect(mergeTickets([cancelled], [ticket])[0]!.status).toBe("CANCELLED");
    expect(mergeTickets([ticket], [cancelled])[0]!.status).toBe("CANCELLED");
  });

  it("prefers whichever copy was written last", () => {
    const ticket = makeTicket({ userId: USER });
    const newer = { ...ticket, updatedAt: at(23, 0).toISOString(), fare: 40 };

    expect(mergeTickets([ticket], [newer])[0]!.fare).toBe(40);
  });

  it("puts the most recently booked journey first", () => {
    const older = makeTicket({ userId: USER, bookingTime: at(6, 0).toISOString() });
    const newer = makeTicket({
      userId: USER,
      bookingTime: at(9, 0).toISOString(),
      fromStop: "CBD",
      toStop: "HNLU",
    });

    expect(mergeTickets([older], [newer])[0]!.ticketId).toBe(newer.ticketId);
  });
});

describe("reconciling a browser with the server", () => {
  it("uploads a ticket booked while there was no connection", async () => {
    const offlineBooking = makeTicket({ userId: USER });

    await syncTickets(USER, [offlineBooking]);

    expect(readDoc("tickets", offlineBooking.ticketId)).toBeDefined();
  });

  it("publishes a cancellation made while there was no connection", async () => {
    const ticket = makeTicket({ userId: USER });
    await pushTicket(ticket);

    await syncTickets(USER, [{ ...ticket, status: "CANCELLED" }]);

    expect(readDoc("tickets", ticket.ticketId)).toMatchObject({
      status: "CANCELLED",
    });
  });

  it("brings down a ticket booked on another device", async () => {
    const elsewhere = makeTicket({ userId: USER });
    await pushTicket(elsewhere);

    const merged = await syncTickets(USER, []);

    expect(merged.map((ticket) => ticket.ticketId)).toEqual([elsewhere.ticketId]);
  });

  it("keeps what the browser holds when the server cannot be reached", async () => {
    const { getDocs } = await import("firebase/firestore");
    vi.mocked(getDocs).mockRejectedValueOnce(new Error("offline"));

    const failed = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const held = makeTicket({ userId: USER });

    expect(await syncTickets(USER, [held])).toEqual([held]);

    failed.mockRestore();
  });

  it("does nothing for a caller with no id", async () => {
    const held = makeTicket({ userId: USER });

    expect(await syncTickets("", [held])).toEqual([held]);
  });
});
