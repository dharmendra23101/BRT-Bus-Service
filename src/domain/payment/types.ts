/**
 * The payment contract the booking flow talks to.
 *
 * Nothing above this interface knows whether money actually moved. That is
 * deliberate: it is the seam a real Indian gateway drops into later without
 * the booking flow changing shape.
 *
 * `settlesRealMoney` exists so the interface cannot be implemented dishonestly.
 * A provider that does not move money has to say so, and the UI reads that flag
 * rather than a hardcoded assumption, so a demonstration can never be mistaken
 * for a payment.
 */

import type { TranslationKey } from "@/domain/i18n/en";

/** A payment the provider has accepted. */
export interface PaymentIntent {
  /** Provider-side identifier for this attempt. */
  intentId: string;
  amountInr: number;
  /** What the passenger would quote when asking about the payment. */
  reference: string;
}

export type PaymentFailure = "DECLINED" | "PROVIDER_UNAVAILABLE";

export type PaymentOutcome =
  | { ok: true; intent: PaymentIntent }
  | { ok: false; reason: PaymentFailure };

/** Why a payment was refused, in words a passenger can act on. */
export const PAYMENT_FAILURE_MESSAGES: Record<PaymentFailure, TranslationKey> = {
  DECLINED: "payment.failure.declined",
  PROVIDER_UNAVAILABLE: "payment.failure.unavailable",
};

export interface PaymentProvider {
  readonly id: string;
  /** Shown to the passenger, so they know what they are paying through. */
  readonly label: string;
  /**
   * Whether a successful payment transfers real money.
   *
   * When false the UI must say plainly that no payment is taken.
   */
  readonly settlesRealMoney: boolean;
  /**
   * Takes payment.
   *
   * `idempotencyKey` identifies the booking attempt, not the click: repeating
   * a call with the same key must return the original outcome rather than
   * charging twice.
   */
  pay(amountInr: number, idempotencyKey: string): Promise<PaymentOutcome>;
}
