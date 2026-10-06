/**
 * The payment dialog.
 *
 * This is where money and tickets meet, so the tests below care most about the
 * paths a passenger must never be stranded in: a payment that cannot complete,
 * one that is interrupted halfway, and one that quietly fails to produce the
 * ticket it charged for.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PaymentModal from "@/components/PaymentModal";
import { PAYMENT_CONFIG } from "@/constants/config";
import { calculateFare } from "@/domain/transit/fares";
import { getCallTime, getTripStops } from "@/domain/transit/schedule";
import type { JourneySelection } from "@/domain/ticket/types";
import { demoPaymentProvider } from "@/services/payment/demoProvider";
import { loadTickets } from "@/services/ticketService";
import { act, renderWithProviders, screen, waitFor } from "../helpers/render";
import { firstWeekdayTrip, makeUpcomingTicket, seedStoredTickets } from "../helpers/factories";
import { makeUser, signInAs } from "../helpers/firebase";

vi.mock("@/services/userService", async () => {
  const helper = await import("../helpers/userService");
  return helper.userServiceMock();
});

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 6, 20, 5, 0, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

const journey = (): JourneySelection => {
  const trip = firstWeekdayTrip();
  const stops = getTripStops(trip);
  const fromStop = stops[0]!;
  const toStop = stops[1]!;

  return {
    route: trip.routeId,
    fromStop,
    toStop,
    fare: calculateFare(fromStop, toStop)!,
    departureTime: getCallTime(trip, fromStop)!,
    arrivalTime: getCallTime(trip, toStop)!,
    bookingTime: new Date().toISOString(),
  };
};

const renderModal = (
  overrides: Partial<React.ComponentProps<typeof PaymentModal>> = {}
) => {
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  const utils = renderWithProviders(
    <PaymentModal
      open
      selection={journey()}
      onClose={onClose}
      onSuccess={onSuccess}
      {...overrides}
    />
  );

  return { ...utils, onClose, onSuccess };
};

const settlePayment = async () => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(PAYMENT_CONFIG.SIMULATED_DELAY_MS);
  });
};

const pay = async (user: ReturnType<typeof renderModal>["user"]) => {
  await user.click(screen.getByRole("button", { name: /demonstration ticket/i }));
  await settlePayment();
};

describe("what the passenger is asked to pay", () => {
  it("shows the journey and its fare before charging anything", () => {
    const selection = journey();
    renderModal({ selection });

    expect(screen.getByText(`₹${selection.fare}/-`)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `Issue a demonstration ticket for ₹${selection.fare}` })
    ).toBeInTheDocument();
  });

  /*
    The defect this replaced: a scannable QR encoding a real upi:// intent
    with a payee nobody owns. A demonstration must carry no payment target a
    passenger could act on.
  */
  it("offers no scannable payment target at all", () => {
    const { container } = renderModal({ selection: journey() });

    expect(container.querySelector("svg[height][width]")).toBeNull();
    expect(container.innerHTML).not.toContain("upi://");
  });

  it("says plainly that no payment will be taken", () => {
    renderModal({ selection: journey() });

    expect(screen.getByText(/no payment will be taken/i)).toBeInTheDocument();
  });
});

/*
  Regression for the ordering defect. Booking rules used to run AFTER the
  payment resolved, so an overlapping ticket meant the passenger was charged
  and then refused. The provider must not be reached at all.
*/
describe("refusing a journey before any money moves", () => {
  it("does not call the payment provider when the journey is already held", async () => {
    const pay = vi.spyOn(demoPaymentProvider, "pay");
    const selection = journey();

    signInAs(makeUser({ uid: "user-1" }));
    seedStoredTickets("user-1", [
      makeUpcomingTicket({
        userId: "user-1",
        fromStop: selection.fromStop,
        toStop: selection.toStop,
        departureTime: selection.departureTime,
        arrivalTime: selection.arrivalTime,
      }),
    ]);

    const { user } = renderModal({ selection });

    await user.click(
      await screen.findByRole("button", { name: /demonstration ticket/i })
    );

    expect(
      await screen.findByRole("heading", { name: /payment failed/i })
    ).toBeInTheDocument();
    expect(pay).not.toHaveBeenCalled();

    pay.mockRestore();
  });
});

describe("paying for a journey", () => {
  it("confirms the ticket once payment settles", async () => {
    const { user } = renderModal();
    signInAs(makeUser({ uid: "user-1" }));

    await screen.findByRole("button", { name: /demonstration ticket/i });
    await pay(user);

    expect(
      await screen.findByRole("heading", { name: "Payment successful" })
    ).toBeInTheDocument();
  });

  it("stores a ticket for the journey that was paid for", async () => {
    const selection = journey();
    const { user } = renderModal({ selection });
    signInAs(makeUser({ uid: "user-1" }));

    await screen.findByRole("button", { name: /demonstration ticket/i });
    await pay(user);

    await screen.findByRole("heading", { name: "Payment successful" });

    const stored = loadTickets("user-1");

    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      fromStop: selection.fromStop,
      toStop: selection.toStop,
      fare: selection.fare,
    });
  });

  it("hands the passenger on to their ticket", async () => {
    const { user, onSuccess, onClose } = renderModal();
    signInAs(makeUser({ uid: "user-1" }));

    await screen.findByRole("button", { name: /demonstration ticket/i });
    await pay(user);

    await user.click(await screen.findByRole("button", { name: "View my ticket" }));

    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("puts focus on the confirmation so a keyboard user is not stranded", async () => {
    const { user } = renderModal();
    signInAs(makeUser({ uid: "user-1" }));

    await screen.findByRole("button", { name: /demonstration ticket/i });
    await pay(user);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "View my ticket" })).toHaveFocus()
    );
  });
});

describe("a payment that cannot go through", () => {
  it("refuses to charge a visitor who is not signed in", async () => {
    const { user } = renderModal();

    await user.click(screen.getByRole("button", { name: /demonstration ticket/i }));

    expect(
      await screen.findByRole("heading", { name: "Payment failed" })
    ).toBeInTheDocument();
    expect(screen.getAllByText(/must be signed in/i)).not.toHaveLength(0);
  });

  it("charges nobody when the journey overlaps a ticket already held", async () => {
    const selection = journey();

    seedStoredTickets("user-1", [
      makeUpcomingTicket({
        userId: "user-1",
        fromStop: selection.fromStop,
        toStop: selection.toStop,
        departureTime: selection.departureTime,
        arrivalTime: selection.arrivalTime,
      }),
    ]);

    const { user } = renderModal({ selection });
    signInAs(makeUser({ uid: "user-1" }));

    await screen.findByRole("button", { name: /demonstration ticket/i });
    await pay(user);

    expect(
      await screen.findByRole("heading", { name: "Payment failed" })
    ).toBeInTheDocument();
    expect(screen.getAllByText(/already hold a ticket/i)).not.toHaveLength(0);
    expect(loadTickets("user-1")).toHaveLength(1);
  });

  it("lets the passenger try again rather than trapping them", async () => {
    const { user } = renderModal();

    await user.click(screen.getByRole("button", { name: /demonstration ticket/i }));
    await screen.findByRole("heading", { name: "Payment failed" });

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(
      screen.getByRole("button", { name: /demonstration ticket/i })
    ).toBeInTheDocument();
  });
});

describe("a payment already in flight", () => {
  const startPaying = async (user: ReturnType<typeof renderModal>["user"]) => {
    await user.click(screen.getByRole("button", { name: /demonstration ticket/i }));
    await screen.findByRole("heading", { name: "Processing payment" });
  };

  it("closes on Escape before any payment starts", async () => {
    const { user, onClose } = renderModal();

    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("offers no close control to click", async () => {
    const { user } = renderModal();
    signInAs(makeUser({ uid: "user-1" }));

    await screen.findByRole("button", { name: /demonstration ticket/i });
    await startPaying(user);

    expect(screen.queryByRole("button", { name: /close/i })).not.toBeInTheDocument();

    await settlePayment();
  });
});

describe("reopening the dialog", () => {
  it("starts a fresh payment rather than showing the last outcome", async () => {
    const { user, rerender } = renderModal();

    await user.click(screen.getByRole("button", { name: /demonstration ticket/i }));
    await screen.findByRole("heading", { name: "Payment failed" });

    rerender(
      <PaymentModal
        open={false}
        selection={journey()}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    rerender(
      <PaymentModal open selection={journey()} onClose={vi.fn()} onSuccess={vi.fn()} />
    );

    expect(
      await screen.findByRole("button", { name: /demonstration ticket/i })
    ).toBeInTheDocument();
  });
});
