/**
 * The ticket context wires the domain to React.
 *
 * These tests drive it through the real provider stack and the mocked auth
 * listener, so they cover the seams that unit tests cannot: what happens on
 * sign-in, on sign-out, when a different account signs in on the same device,
 * and as time passes.
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { TicketProvider, useTickets } from "@/contexts/TicketContext";
import { POLLING } from "@/constants/config";
import {
  makeDraft,
  makeFutureDraft,
  makeTicket,
  makeUpcomingTicket,
  seedStoredTickets,
  TEST_NOW,
} from "../helpers/factories";
import { makeUser, readDoc, seedDoc, signInAs, signOutMock } from "../helpers/firebase";

// These tests are about tickets, not user records.
vi.mock("@/services/userService", async () => {
  const helper = await import("../helpers/userService");
  return helper.userServiceMock();
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter>
    <AuthProvider>
      <TicketProvider>{children}</TicketProvider>
    </AuthProvider>
  </MemoryRouter>
);

const renderTickets = () => renderHook(() => useTickets(), { wrapper });

describe("without a signed-in passenger", () => {
  it("holds no tickets", async () => {
    const { result } = renderTickets();

    await waitFor(() => expect(result.current.tickets).toEqual([]));
    expect(result.current.activeTicket).toBeNull();
  });

  it("refuses to book", async () => {
    const { result } = renderTickets();

    const outcome = await result.current.bookTicket(makeDraft());

    expect(outcome).toEqual({ ok: false, reason: "NOT_AUTHENTICATED" });
  });
});

describe("signing in", () => {
  it("loads the tickets already stored for that account", async () => {
    const stored = makeTicket({ userId: "user-1" });
    seedStoredTickets("user-1", [stored]);

    const { result } = renderTickets();
    act(() => signInAs(makeUser({ uid: "user-1" })));

    await waitFor(() => expect(result.current.tickets).toHaveLength(1));
    expect(result.current.tickets[0]!.ticketId).toBe(stored.ticketId);
  });

  it("does not surface tickets belonging to another account", async () => {
    seedStoredTickets("user-1", [makeTicket({ userId: "someone-else" })]);

    const { result } = renderTickets();
    act(() => signInAs(makeUser({ uid: "user-1" })));

    await waitFor(() => expect(result.current.tickets).toEqual([]));
  });

  it("clears a previous passenger's cached tickets from a shared device", async () => {
    seedStoredTickets("user-2", [makeTicket({ userId: "user-2" })]);

    const { result } = renderTickets();
    act(() => signInAs(makeUser({ uid: "user-1" })));

    await waitFor(() => expect(result.current.tickets).toEqual([]));
    expect(localStorage.getItem("brt.tickets.user-2")).toBeNull();
  });
});

describe("signing out", () => {
  it("empties the in-memory state", async () => {
    seedStoredTickets("user-1", [makeTicket({ userId: "user-1" })]);

    const { result } = renderTickets();
    act(() => signInAs(makeUser({ uid: "user-1" })));
    await waitFor(() => expect(result.current.tickets).toHaveLength(1));

    act(() => signOutMock());

    await waitFor(() => expect(result.current.tickets).toEqual([]));
  });
});

describe("booking through the context", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(TEST_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /*
    `bookTicket` takes no payment - it validates and issues. No page calls it;
    the booking flow goes through `validateBooking`, the provider, and
    `issueTicket`. So the ticket it produces is unpaid, and an unpaid ticket
    is not one the passenger can travel on. That used to be invisible because
    every ticket claimed to be paid the moment it was built.
  */
  it("adds an unpaid booking without making it travellable", async () => {
    const { result } = renderTickets();
    act(() => signInAs(makeUser({ uid: "user-1" })));
    await waitFor(() => expect(result.current.tickets).toEqual([]));

    let outcome: Awaited<ReturnType<typeof result.current.bookTicket>> | undefined;

    await act(async () => {
      outcome = await result.current.bookTicket(makeFutureDraft({ userId: "user-1" }));
    });

    expect(outcome?.ok).toBe(true);
    await waitFor(() => expect(result.current.tickets).toHaveLength(1));
    expect(result.current.tickets[0]?.paymentStatus).toBe("PENDING");
    expect(result.current.activeTicket).toBeNull();
  });

  it("persists the booking so it survives a reload", async () => {
    const { result } = renderTickets();
    act(() => signInAs(makeUser({ uid: "user-1" })));
    await waitFor(() => expect(result.current.tickets).toEqual([]));

    await act(async () => {
      await result.current.bookTicket(makeFutureDraft({ userId: "user-1" }));
    });

    await waitFor(() =>
      expect(localStorage.getItem("brt.tickets.user-1")).not.toBeNull()
    );
  });
});

describe("cancelling through the context", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(TEST_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("moves the ticket into history", async () => {
    const stored = makeUpcomingTicket({ userId: "user-1" });
    seedStoredTickets("user-1", [stored]);

    const { result } = renderTickets();
    act(() => signInAs(makeUser({ uid: "user-1" })));
    await waitFor(() => expect(result.current.tickets).toHaveLength(1));

    await act(async () => {
      await result.current.cancelTicket(stored.ticketId);
    });

    await waitFor(() =>
      expect(result.current.tickets[0]!.status).toBe("CANCELLED")
    );
    expect(result.current.activeTicket).toBeNull();
    expect(result.current.ticketHistory).toHaveLength(1);
  });
});

describe("as time passes", () => {
  it("re-derives ticket status on its polling interval", async () => {
    /*
      A ticket booked for a departure that has since passed must move to
      COMPLETED without a reload. The status engine is pure, so what is
      being tested here is that the provider actually re-runs it.
    */
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const stored = makeTicket({ userId: "user-1" }, new Date(), {
      status: "ACTIVE",
      departureTime: "12:00 AM",
      arrivalTime: "12:01 AM",
    });
    seedStoredTickets("user-1", [stored]);

    const { result } = renderTickets();
    act(() => signInAs(makeUser({ uid: "user-1" })));

    await waitFor(() => expect(result.current.tickets).toHaveLength(1));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLLING.TICKET_STATUS_MS + 100);
    });

    expect(result.current.tickets[0]!.status).toBe("COMPLETED");

    vi.useRealTimers();
  });
});

describe("tickets that live on the server", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(TEST_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens an already-synced ticket with no connection at all", async () => {
    const { getDocs } = await import("firebase/firestore");
    const failed = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(getDocs).mockRejectedValue(new Error("offline"));

    const held = makeUpcomingTicket({ userId: "user-1" });
    seedStoredTickets("user-1", [held]);

    const { result } = renderTickets();
    act(() => signInAs(makeUser({ uid: "user-1" })));

    await waitFor(() => expect(result.current.tickets).toHaveLength(1));
    expect(result.current.activeTicket?.ticketId).toBe(held.ticketId);

    vi.mocked(getDocs).mockRestore();
    failed.mockRestore();
  });

  it("brings down a ticket booked on another device", async () => {
    const elsewhere = makeUpcomingTicket({ userId: "user-1" });
    seedDoc("tickets", elsewhere.ticketId, { ...elsewhere });

    const { result } = renderTickets();
    act(() => signInAs(makeUser({ uid: "user-1" })));

    await waitFor(() => expect(result.current.tickets).toHaveLength(1));
    expect(result.current.tickets[0]!.ticketId).toBe(elsewhere.ticketId);
  });

  it("keeps the newly synced ticket for the next visit", async () => {
    const elsewhere = makeUpcomingTicket({ userId: "user-1" });
    seedDoc("tickets", elsewhere.ticketId, { ...elsewhere });

    const { result } = renderTickets();
    act(() => signInAs(makeUser({ uid: "user-1" })));

    await waitFor(() => expect(result.current.tickets).toHaveLength(1));

    expect(localStorage.getItem("brt.tickets.user-1")).toContain(elsewhere.ticketId);
  });

  it("sends a new booking to the server", async () => {
    const { result } = renderTickets();
    act(() => signInAs(makeUser({ uid: "user-1" })));
    await waitFor(() => expect(result.current.tickets).toEqual([]));

    let booked: string | undefined;

    await act(async () => {
      const outcome = await result.current.bookTicket(
        makeFutureDraft({ userId: "user-1" })
      );

      if (outcome.ok) booked = outcome.ticket.ticketId;
    });

    await waitFor(() => expect(readDoc("tickets", booked!)).toBeDefined());
  });

  it("sends a cancellation to the server", async () => {
    const stored = makeUpcomingTicket({ userId: "user-1" });
    seedStoredTickets("user-1", [stored]);
    seedDoc("tickets", stored.ticketId, { ...stored });

    const { result } = renderTickets();
    act(() => signInAs(makeUser({ uid: "user-1" })));
    await waitFor(() => expect(result.current.tickets).toHaveLength(1));

    await act(async () => {
      await result.current.cancelTicket(stored.ticketId);
    });

    await waitFor(() =>
      expect(readDoc("tickets", stored.ticketId)).toMatchObject({
        status: "CANCELLED",
      })
    );
  });

  it("never lets a slow read publish into the account that followed it", async () => {
    const theirs = makeUpcomingTicket({ userId: "user-1" });
    const { getDocs } = await import("firebase/firestore");

    let release = () => {};
    const stalled = new Promise<void>((resolve) => {
      release = resolve;
    });

    vi.mocked(getDocs).mockImplementationOnce(async () => {
      await stalled;

      return {
        docs: [{ id: theirs.ticketId, data: () => ({ ...theirs }) }],
      } as unknown as Awaited<ReturnType<typeof getDocs>>;
    });

    const { result } = renderTickets();
    act(() => signInAs(makeUser({ uid: "user-1" })));

    act(() => signOutMock());
    act(() => signInAs(makeUser({ uid: "user-2" })));

    await act(async () => {
      release();
      await stalled;
    });

    expect(result.current.tickets).toEqual([]);
    expect(localStorage.getItem("brt.tickets.user-2") ?? "").not.toContain(
      theirs.ticketId
    );
  });
});
