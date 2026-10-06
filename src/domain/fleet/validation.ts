/**
 * What telemetry has to survive before it is allowed to be believed.
 *
 * Bad telemetry that reaches the map is worse than no telemetry, because a
 * passenger acts on it. Everything here is checked against what real feeds
 * actually publish rather than against what a well-behaved device would send.
 *
 * THE TRAP IN THE OBVIOUS FIRST CHECK: the natural instinct is a bounding box
 * around the corridor. Ours would have to be derived from `STOP_COORDS`, which
 * is a generated lattice sitting ~21 km from the real HNLU - so that box would
 * reject 100% of real telemetry from a real NRANVP bus while accepting every
 * fabricated position. A validation layer that admits only invented data is
 * worse than none. The box is defined below, deliberately NOT applied, and
 * gated behind surveyed coordinates arriving.
 */

import { haversineKm } from "@/domain/geo";
import { hasPosition, type VehicleTelemetry } from "./telemetry";

export type TelemetryRejection =
  | "future-timestamp"
  | "implausible-age"
  | "null-island"
  | "regressed-timestamp"
  | "impossible-jump";

export interface TelemetryVerdict {
  accepted: boolean;
  rejections: readonly TelemetryRejection[];
}

export const TELEMETRY_LIMITS = {
  /**
   * How far into the future an observation may claim to be.
   *
   * 60 s exactly, matching the GTFS-Realtime reference validator's
   * `MAX_IN_FUTURE_SECONDS`. Worth being able to say that aloud: it is not a
   * number we chose, it is the number the ecosystem already uses.
   */
  FUTURE_TOLERANCE_MS: 60_000,

  /**
   * How far into the past. Previously unbounded, which let a record dated
   * 1970 - or a seconds-vs-milliseconds mistake, which lands there - through
   * as merely very stale rather than as broken.
   */
  MAX_AGE_MS: 24 * 60 * 60 * 1000,

  /**
   * The speed above which a jump is suspicious. From a trade magazine's figure
   * for Indian bus operation, not from the gazette - say so when quoting it.
   */
  MAX_SPEED_KMPH: 100,

  /**
   * Displacement below which a jump is treated as noise whatever the speed.
   *
   * This is the half of the gate that matters. At a 3 s sampling interval,
   * ordinary GPS scatter alone produces an apparent 238.8 km/h - so a naive
   * distance-over-time check fires continuously on a PARKED bus.
   */
  NOISE_FLOOR_M: 250,

  /**
   * The shortest gap over which a speed check means anything, for the same
   * reason: below it, the error dominates the measurement.
   */
  MIN_WINDOW_MS: 10_000,
} as const;

/**
 * The corridor bounding box - DEFINED, NOT APPLIED.
 *
 * Kept here so the shape of the check is settled and reviewed now, and so the
 * day surveyed coordinates land it is a one-line change rather than a design
 * question. `applyServiceArea` stays false until then, and a test asserts it.
 * The margin is 2,000 m expressed in degrees at 21.23 degrees north.
 */
export const SERVICE_AREA = {
  applyServiceArea: false,
  marginLatDeg: 0.01797,
  marginLngDeg: 0.01927,
} as const;

/** Exactly (0, 0) - a real sentinel in published feeds, not a hypothetical. */
const isNullIsland = (lat: number, lng: number): boolean =>
  lat === 0 && lng === 0;

/** What the gate remembers about a vehicle between observations. */
interface VehicleHistory {
  lastAccepted: VehicleTelemetry;
  /**
   * Consecutive observations that failed the jump gate.
   *
   * A single wild fix is a glitch and is rejected. A second one, still far
   * from the old baseline, means the bus really is over there - a tunnel, a
   * long signal outage - so it is accepted and becomes the new baseline.
   * Without that, one bad fix would quarantine a vehicle permanently.
   */
  jumpStrikes: number;
}

export interface TelemetryGate {
  accept: (telemetry: VehicleTelemetry, now: number) => TelemetryVerdict;
  /** For the operator's feed-health view. */
  rejectionCounts: () => Readonly<Record<TelemetryRejection, number>>;
  reset: () => void;
}

const emptyCounts = (): Record<TelemetryRejection, number> => ({
  "future-timestamp": 0,
  "implausible-age": 0,
  "null-island": 0,
  "regressed-timestamp": 0,
  "impossible-jump": 0,
});

/**
 * A stateful validator, one per feed.
 *
 * Stateful because three of the five checks are only answerable by comparison
 * with what this vehicle reported last: a timestamp going backwards, a
 * position teleporting, and the two-strike recovery from a teleport.
 */
export const createTelemetryGate = (
  limits: { -readonly [K in keyof typeof TELEMETRY_LIMITS]: number } = TELEMETRY_LIMITS
): TelemetryGate => {
  let history = new Map<string, VehicleHistory>();
  let counts = emptyCounts();

  const accept = (
    telemetry: VehicleTelemetry,
    now: number
  ): TelemetryVerdict => {
    const rejections: TelemetryRejection[] = [];
    const at = telemetry.observedAt;

    if (at !== null) {
      if (at > now + limits.FUTURE_TOLERANCE_MS) rejections.push("future-timestamp");
      if (at < now - limits.MAX_AGE_MS) rejections.push("implausible-age");
    }

    if (hasPosition(telemetry) && isNullIsland(telemetry.lat, telemetry.lng)) {
      rejections.push("null-island");
    }

    const previous = history.get(telemetry.vehicleId);

    if (previous && at !== null) {
      const before = previous.lastAccepted.observedAt;

      /*
        `<` rather than `<=`: an identical timestamp is a retry of the same
        observation, and rejecting those would make the feed non-idempotent
        for no benefit.
      */
      if (before !== null && at < before) rejections.push("regressed-timestamp");
    }

    let jumped = false;

    if (
      previous &&
      hasPosition(telemetry) &&
      hasPosition(previous.lastAccepted) &&
      at !== null
    ) {
      const before = previous.lastAccepted.observedAt ?? previous.lastAccepted.receivedAt;
      const windowMs = at - before;

      if (windowMs >= limits.MIN_WINDOW_MS) {
        const metres =
          haversineKm(
            { lat: previous.lastAccepted.lat, lng: previous.lastAccepted.lng },
            { lat: telemetry.lat, lng: telemetry.lng }
          ) * 1000;

        const kmph = (metres / 1000 / windowMs) * 3_600_000;

        /*
          Both halves, never either. The speed term alone fires on a PARKED
          bus, because ordinary GPS scatter at a short interval produces an
          apparent 238.8 km/h.

          Worth knowing: at the default 10 s window the two terms are
          arithmetically redundant - 100 km/h sustained for 10 s is 278 m, so
          anything fast enough already clears the 250 m floor. The floor is
          what keeps this gate correct if `MIN_WINDOW_MS` is ever shortened
          for a device reporting every 5 s, which is permitted under AIS-140
          and is the configuration change most likely to be made.
        */
        jumped = kmph > limits.MAX_SPEED_KMPH && metres > limits.NOISE_FLOOR_M;
      }
    }

    if (jumped && previous!.jumpStrikes === 0) {
      rejections.push("impossible-jump");
    }

    for (const rejection of rejections) counts[rejection] += 1;

    if (rejections.length > 0) {
      // A rejected jump still counts, so the next one is believed.
      if (jumped && previous) previous.jumpStrikes += 1;

      return { accepted: false, rejections };
    }

    history.set(telemetry.vehicleId, { lastAccepted: telemetry, jumpStrikes: 0 });

    return { accepted: true, rejections: [] };
  };

  return {
    accept,
    rejectionCounts: () => ({ ...counts }),
    reset: () => {
      history = new Map();
      counts = emptyCounts();
    },
  };
};

/**
 * Runs a batch through one gate, keeping the accepted records.
 *
 * Deduplicates on `vehicleId`, newest `receivedAt` winning: a feed that
 * publishes the same vehicle twice must never become two markers on a map.
 */
export const acceptTelemetry = (
  gate: TelemetryGate,
  batch: readonly VehicleTelemetry[],
  now: number
): VehicleTelemetry[] => {
  const newestFirst = [...batch].sort((a, b) => b.receivedAt - a.receivedAt);
  const seen = new Set<string>();
  const accepted: VehicleTelemetry[] = [];

  for (const telemetry of newestFirst) {
    if (seen.has(telemetry.vehicleId)) continue;
    seen.add(telemetry.vehicleId);

    if (gate.accept(telemetry, now).accepted) accepted.push(telemetry);
  }

  return accepted;
};
