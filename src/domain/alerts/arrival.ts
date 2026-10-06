/**
 * When a passenger should be told their bus is close.
 *
 * These rules used to live in `notificationService`, which also asks the
 * browser for permission and therefore touches `window` and `Notification`.
 * That put the decision of *whether to alert* inside a file that cannot load
 * anywhere except a browser - so a native app could not have reused any of it,
 * and would have ended up with a second, drifting copy of the one rule that
 * decides whether to interrupt somebody.
 *
 * The permission request stays in the service, because asking a platform for
 * permission is exactly the part that differs per platform. The rules are
 * here, where the portability guards can see them.
 */

import { ARRIVAL_RULES, NOTIFICATION_RULES } from "@/constants/config";
import { haversineKm } from "@/domain/geo";
import { hasPosition } from "@/domain/fleet/telemetry";
import type { ClassifiedVehicle } from "@/domain/fleet/state";
import type { Coordinate } from "@/domain/transit/stops";

/**
 * Straight-line distance to the closest usable bus, in kilometres; null when
 * nothing is reporting.
 *
 * Deliberately not an arrival time. The distance is honest about what the app
 * observed - a position, and how far it is from the stop in a straight line.
 * It says nothing about the road, the route the bus is on, or the direction it
 * is travelling, so it must never be presented to a passenger as minutes.
 *
 * Takes vehicles that are already classified, rather than raw records and a
 * clock. That is what makes it a domain function at all: the caller decides
 * where the positions came from, and this decides only what they mean.
 */
export const selectNearestDistanceKm = (
  vehicles: readonly ClassifiedVehicle[],
  stop: Coordinate
): number | null => {
  let best: number | null = null;

  /*
    LIVE and RECENT only, not the full passenger-visible set.

    A map may draw a STALE vehicle, because the dot sits next to the age and a
    reader can weigh it. A push notification carries no age at all - it says
    "your bus is near" - so alerting on a position that may be five minutes
    old would tell somebody to run for a bus that has already gone.
  */
  for (const { telemetry, state } of vehicles) {
    if (state !== "LIVE" && state !== "RECENT") continue;

    // The contract allows a vehicle with no position, and real feeds publish
    // them. One cannot be near anything.
    if (!hasPosition(telemetry)) continue;

    const distance = haversineKm({ lat: telemetry.lat, lng: telemetry.lng }, stop);
    if (best === null || distance < best) best = distance;
  }

  return best;
};

/** Whether a bus is close enough to be worth interrupting the passenger. */
export const shouldAlert = (distanceKm: number | null): distanceKm is number =>
  distanceKm !== null && distanceKm <= ARRIVAL_RULES.ALERT_RADIUS_KM;

/**
 * Tracks which alerts have already fired so a bus lingering near a stop does
 * not notify repeatedly. Keyed by route and stop.
 */
export const createAlertThrottle = () => {
  const lastSentAt = new Map<string, number>();

  return {
    /** Records the alert and reports whether it should be shown now. */
    claim(routeId: string, stop: string, now = Date.now()): boolean {
      const key = `${routeId}::${stop}`;
      const previous = lastSentAt.get(key);

      if (
        previous !== undefined &&
        now - previous < NOTIFICATION_RULES.DEDUPE_WINDOW_MS
      ) {
        return false;
      }

      lastSentAt.set(key, now);
      return true;
    },
  };
};
