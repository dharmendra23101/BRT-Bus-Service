/**
 * Whether a driver's position is actually reaching anyone.
 *
 * The driver screen used to answer this from a boolean the Start button sets,
 * which is a claim about intent rather than about what happened. A browser
 * clamps timers in a background tab - and suspends geolocation in one - so a
 * driver who switches apps at a terminus sees a green "Sharing Live Location"
 * indicator while nothing is being published at all. Passengers meanwhile watch
 * the bus go stale with no explanation.
 *
 * So health is derived from evidence: the last time a publish actually
 * succeeded. A timer that has been throttled produces no publish, and no
 * publish is exactly what this notices.
 */

import type { TranslationKey } from "@/domain/i18n/en";

export type SharingHealth =
  /** Not trying to share. */
  | "idle"
  /** Sharing, and a publish landed recently enough to believe it. */
  | "sharing"
  /** Sharing was asked for, but nothing has reached the database in time. */
  | "interrupted";

/**
 * How long past a due publish before sharing is called interrupted.
 *
 * One and a half intervals, which at the 30 s cadence is 45 s - deliberately
 * the same as `DEFAULT_FRESHNESS.liveMs`. THE ALIGNMENT IS THE POINT: a
 * driver is told their position has stopped reaching passengers at exactly
 * the moment passengers stop seeing them as LIVE. Two screens disagreeing
 * about whether a bus is being tracked is worse than either being wrong.
 *
 * It was two and a half intervals, to keep a single dropped request from
 * raising a false alarm. At a 15 s cadence that also caught a throttled
 * background tab, which browsers clamp to roughly a minute. At 30 s it would
 * not have: 2.5 intervals is 75 s, so a tab publishing once a minute because
 * it was backgrounded would have looked perfectly healthy - which is the
 * exact failure the evidence-based indicator exists to prevent.
 *
 * The cost is that one genuinely dropped publish now shows as interrupted.
 * That is not a false alarm: the position really has stopped reaching
 * passengers, and it clears itself on the next successful publish.
 */
export const INTERRUPTION_TOLERANCE = 1.5;

export const sharingHealth = (
  isSharing: boolean,
  lastPublishedAt: number | null,
  now: number,
  intervalMs: number
): SharingHealth => {
  if (!isSharing) return "idle";

  /*
    Nothing published yet is not an interruption: the first fix is still being
    acquired, and geolocation on a cold start can take several seconds.
  */
  if (lastPublishedAt === null) return "sharing";

  const overdue = now - lastPublishedAt > intervalMs * INTERRUPTION_TOLERANCE;

  return overdue ? "interrupted" : "sharing";
};

/** What the driver is told, in each state. */
export const SHARING_MESSAGES: Record<SharingHealth, TranslationKey> = {
  idle: "fleet.sharing.idle",
  sharing: "fleet.sharing.sharing",
  interrupted: "fleet.sharing.interrupted",
};

/**
 * Why sharing stopped, when we can tell.
 *
 * Only the background-tab cause is named, because it is the only one we can
 * actually observe - `document.visibilityState` says so directly. Anything
 * else gets the honest general form rather than a guess at a cause.
 */
export const interruptionReason = (
  hiddenSinceLastPublish: boolean
): TranslationKey =>
  hiddenSinceLastPublish
    ? "fleet.interruption.background"
    : "fleet.interruption.signal";
