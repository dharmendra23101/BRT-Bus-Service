/**
 * How fresh a vehicle's position is, in five states rather than two.
 *
 * The app used to apply one binary rule as a FILTER: anything older than two
 * minutes was removed from the array. That destroyed the only evidence that a
 * bus had stopped reporting, so nothing downstream could tell "this bus is not
 * running" from "this bus is not reporting" - and those mean completely
 * different things to a passenger standing at a stop.
 *
 * So this is a classification, not a filter. Callers decide what to render;
 * the domain refuses to decide for them by deleting the record.
 */

import type { VehicleTelemetry } from "./telemetry";
import type { TranslationKey } from "@/domain/i18n/en";

export type VehicleState = "LIVE" | "RECENT" | "STALE" | "OFFLINE" | "UNKNOWN";

/**
 * The freshness ladder, in milliseconds.
 *
 * Each boundary is a number with a reason, not a round figure:
 *
 * - LIVE at 45 s is one and a half publish intervals at the 30 s cadence in
 *   `POLLING.DRIVER_LOCATION_MS`. THE RELATIONSHIP IS THE POINT, not the
 *   figure: a bus reporting exactly on schedule is up to a full interval old
 *   at any instant, so a LIVE bound at or below the cadence would mean a
 *   perfectly healthy vehicle was never once classified LIVE. The half
 *   interval on top absorbs network latency and clock jitter without
 *   absorbing a MISSED report - one skipped position drops to RECENT, which
 *   is a signal worth keeping.
 * - RECENT ends at 90 s, the bound beyond which GTFS-Realtime considers a
 *   position no longer publishable. That is three intervals, so it also means
 *   two consecutive misses.
 * - STALE ends at 300 s, which is under the corridor's average inter-stop leg,
 *   so a position at the edge of STALE is still within one stop of the truth.
 *   Independent of cadence - it is a fact about the road, not the radio.
 *
 * `POLLING.BUS_FRESHNESS_MS` must stay at or below `liveMs`, or the UI's own
 * re-tick could let a vehicle appear to skip a state between renders.
 *
 * Configurable because a certified AIS-140 device may report as slowly as two
 * minutes, and a fleet running at that cadence needs a different ladder rather
 * than a screen full of vehicles marked stale.
 */
export interface FreshnessThresholds {
  liveMs: number;
  recentMs: number;
  staleMs: number;
}

export const DEFAULT_FRESHNESS: FreshnessThresholds = {
  liveMs: 45_000,
  recentMs: 90_000,
  staleMs: 300_000,
};

/** A telemetry record with its freshness resolved. */
export interface ClassifiedVehicle {
  telemetry: VehicleTelemetry;
  state: VehicleState;
  /** How old the position is, or null when there is no usable timestamp. */
  ageMs: number | null;
}

/**
 * Whether a timestamp can be reasoned about at all.
 *
 * A record with no timestamp used to be treated as fresh forever - an
 * immortal phantom bus that a test was protecting. It is now UNKNOWN, which
 * is the honest answer and the one a passenger can act on.
 */
const isUsable = (at: number | null): at is number =>
  at !== null && Number.isFinite(at) && at > 0;

export const classify = (
  telemetry: VehicleTelemetry,
  now: number,
  thresholds: FreshnessThresholds = DEFAULT_FRESHNESS
): ClassifiedVehicle => {
  /*
    `observedAt` only, never a fallback to `receivedAt`. See the note on
    `effectiveTimestamp`: our receive clock is a sound proxy for observation
    time in a pulled feed and a lie in a pushed one, and this function cannot
    tell which it is looking at. An adapter that knows puts the answer in
    `observedAt`.
  */
  const at = telemetry.observedAt;

  if (!isUsable(at)) {
    return { telemetry, state: "UNKNOWN", ageMs: null };
  }

  /*
    A position from the future is not fresh, it is wrong. Clamping the age to
    zero would render it as the liveliest bus on the map; the validator rejects
    such a record before it reaches here, and this is the second line.
  */
  const ageMs = now - at;

  if (ageMs < 0) return { telemetry, state: "UNKNOWN", ageMs };

  if (ageMs <= thresholds.liveMs) return { telemetry, state: "LIVE", ageMs };
  if (ageMs <= thresholds.recentMs) return { telemetry, state: "RECENT", ageMs };
  if (ageMs <= thresholds.staleMs) return { telemetry, state: "STALE", ageMs };

  return { telemetry, state: "OFFLINE", ageMs };
};

export const classifyAll = (
  fleet: readonly VehicleTelemetry[],
  now: number,
  thresholds: FreshnessThresholds = DEFAULT_FRESHNESS
): ClassifiedVehicle[] =>
  fleet.map((telemetry) => classify(telemetry, now, thresholds));

/**
 * States a passenger-facing surface should draw as a vehicle in service.
 *
 * STALE is deliberately included: the position is old but still within a stop
 * of the truth, and hiding it tells a waiting passenger that no bus is coming
 * when one is. The state travels with it so the UI can say how old it is.
 */
export const PASSENGER_VISIBLE: readonly VehicleState[] = [
  "LIVE",
  "RECENT",
  "STALE",
];

export const isPassengerVisible = (vehicle: ClassifiedVehicle): boolean =>
  PASSENGER_VISIBLE.includes(vehicle.state);

/** Words for each state, so no surface invents its own vocabulary. */
export const STATE_LABELS: Record<VehicleState, TranslationKey> = {
  LIVE: "fleet.state.live",
  RECENT: "fleet.state.recent",
  STALE: "fleet.state.stale",
  OFFLINE: "fleet.state.offline",
  UNKNOWN: "fleet.state.unknown",
};

/**
 * A plain-language explanation, because the label alone is not enough.
 *
 * Colour cannot carry this - the design system's own CVD measurements put
 * on-time against delayed at a luminance ratio of 1.05 - so every state has
 * words attached at the point of definition rather than being left to each
 * screen.
 */
export const STATE_DESCRIPTIONS: Record<VehicleState, TranslationKey> = {
  LIVE: "fleet.state.live.detail",
  RECENT: "fleet.state.recent.detail",
  STALE: "fleet.state.stale.detail",
  OFFLINE: "fleet.state.offline.detail",
  UNKNOWN: "fleet.state.unknown.detail",
};

/**
 * How many vehicles are in each state.
 *
 * The operator's view of fleet health: a row of counts answers "is the feed
 * healthy?" in one line, which a table of thirty vehicles does not.
 */
export const countByState = (
  fleet: readonly ClassifiedVehicle[]
): Record<VehicleState, number> => {
  const counts: Record<VehicleState, number> = {
    LIVE: 0,
    RECENT: 0,
    STALE: 0,
    OFFLINE: 0,
    UNKNOWN: 0,
  };

  for (const vehicle of fleet) counts[vehicle.state] += 1;

  return counts;
};

/**
 * How long ago a vehicle was last heard from, in words.
 *
 * The operator's question about a bus that is not reporting is never "is it
 * absent?" - the empty row already says that - it is "since when?". Absence
 * with a time attached is actionable; absence without one is indistinguishable
 * from a bus that never started.
 *
 * Returns null when nothing has ever been recorded, which is a different fact
 * again and must not be rendered as "just now".
 */
export const describeLastSeen = (
  lastSeenAt: number | null | undefined,
  now: number
): string | null => {
  if (typeof lastSeenAt !== "number" || !Number.isFinite(lastSeenAt)) return null;

  const ageMs = now - lastSeenAt;

  /*
    A clock disagreement can put "last seen" slightly in the future. Reporting
    that as a negative age would be worse than rounding it to the present, and
    the server stamps this value so the disagreement is the reader's.
  */
  if (ageMs < 60_000) return "in the last minute";

  const minutes = Math.floor(ageMs / 60_000);

  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);

  return `${days} day${days === 1 ? "" : "s"} ago`;
};
