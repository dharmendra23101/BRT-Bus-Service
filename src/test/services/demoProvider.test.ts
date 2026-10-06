/**
 * The payment provider used while no gateway is configured.
 *
 * Two properties matter here and both are safety properties rather than
 * features: the provider must never claim to move money, and a repeated
 * attempt must resolve to the original outcome rather than a second charge.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PAYMENT_CONFIG } from "@/constants/config";
import {
  activePaymentProvider,
  demoPaymentProvider,
  resetDemoPayments,
} from "@/services/payment/demoProvider";

const KEY = "user-1|101|HNLU|CBD|08:25";

beforeEach(() => {
  vi.useFakeTimers();
  resetDemoPayments();
});

afterEach(() => {
  vi.useRealTimers();
});

/** Runs a payment to completion through the artificial delay. */
const pay = async (amount: number, key: string) => {
  const inFlight = demoPaymentProvider.pay(amount, key);

  await vi.advanceTimersByTimeAsync(PAYMENT_CONFIG.SIMULATED_DELAY_MS);

  return inFlight;
};

describe("being honest about what it is", () => {
  it("never claims to settle real money", () => {
    expect(demoPaymentProvider.settlesRealMoney).toBe(false);
  });

  it("is the provider the application actually uses", () => {
    expect(activePaymentProvider()).toBe(demoPaymentProvider);
  });

  /*
    The defect this guards: a scannable upi:// intent naming a payee nobody
    owns. Nothing the provider returns may be usable as a payment target.
  */
  it("returns no payment instrument a passenger could act on", async () => {
    const outcome = await pay(15, KEY);

    expect(outcome.ok).toBe(true);

    const serialised = JSON.stringify(outcome);

    expect(serialised).not.toContain("upi:");
    expect(serialised).not.toContain("@");
  });
});

describe("not charging twice for one booking", () => {
  it("returns the original outcome when the same attempt is repeated", async () => {
    const first = await pay(15, KEY);
    const second = await pay(15, KEY);

    expect(second).toBe(first);
  });

  it("resolves a repeat immediately, without a second settlement delay", async () => {
    await pay(15, KEY);

    let settled = false;
    void demoPaymentProvider.pay(15, KEY).then(() => {
      settled = true;
    });

    // No timer advance: a genuine second settlement could not have completed.
    await vi.advanceTimersByTimeAsync(0);

    expect(settled).toBe(true);
  });

  it("treats a different journey as a different payment", async () => {
    const first = await pay(15, KEY);
    const other = await pay(15, "user-1|101|HNLU|Telibandha|08:25");

    expect(other).not.toBe(first);
    expect(other.ok && first.ok).toBe(true);

    if (other.ok && first.ok) {
      expect(other.intent.intentId).not.toBe(first.intent.intentId);
    }
  });

  it("forgets settled attempts once reset", async () => {
    const first = await pay(15, KEY);

    resetDemoPayments();

    const second = await pay(15, KEY);

    expect(second).not.toBe(first);
  });
});
