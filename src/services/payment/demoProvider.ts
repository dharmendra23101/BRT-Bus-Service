/**
 * The provider used while no gateway is configured.
 *
 * It moves no money and says so. There is deliberately no payment instrument
 * here - no UPI intent, no payee, no account number - because a demonstration
 * that renders a real-looking payment target is the one failure mode this
 * module exists to prevent: a passenger cannot scan their way out of a demo
 * and into their bank.
 *
 * Replacing it with a real gateway means implementing `PaymentProvider`
 * elsewhere and swapping what `activePaymentProvider` returns. Nothing in the
 * booking flow changes.
 */

import { PAYMENT_CONFIG } from "@/constants/config";
import type { PaymentOutcome, PaymentProvider } from "@/domain/payment/types";

const settled = new Map<string, PaymentOutcome>();

/** Clears remembered outcomes. Test seam; never called by the application. */
export const resetDemoPayments = (): void => {
  settled.clear();
};

export const demoPaymentProvider: PaymentProvider = {
  id: "demo",
  label: "Demonstration",
  settlesRealMoney: false,

  async pay(amountInr: number, idempotencyKey: string): Promise<PaymentOutcome> {
    const previous = settled.get(idempotencyKey);

    // A repeated attempt returns the original outcome rather than a second
    // one, which is what a real gateway's idempotency key buys and what stops
    // a double-tapped button becoming two tickets.
    if (previous) return previous;

    await new Promise((resolve) =>
      setTimeout(resolve, PAYMENT_CONFIG.SIMULATED_DELAY_MS)
    );

    const outcome: PaymentOutcome = {
      ok: true,
      intent: {
        intentId: `demo-${idempotencyKey}`,
        amountInr,
        reference: idempotencyKey,
      },
    };

    settled.set(idempotencyKey, outcome);

    return outcome;
  },
};

/** The provider the application currently uses. */
export const activePaymentProvider = (): PaymentProvider => demoPaymentProvider;
