/**
 * Geographic helpers for live bus tracking.
 *
 * Extracted from ArrivalMonitor so distance maths is testable without
 * mounting a component or connecting to the Realtime Database.
 *
 * Straight-line distance only. There was once an `etaBetween` here that
 * divided this by an assumed average speed to produce an arrival time in
 * minutes; it was removed because the result rose as a bus got closer -
 * distance to the terminus increases along the corridor - so no choice of
 * speed could make it correct. An arrival time needs route geometry, a
 * position projected onto it, and the schedule to compare against.
 */

import type { Coordinate } from "./transit/stops";

const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/** Great-circle distance between two points, in kilometres. */
export const haversineKm = (from: Coordinate, to: Coordinate): number => {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) *
      Math.cos(toRadians(to.lat)) *
      Math.sin(dLng / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
