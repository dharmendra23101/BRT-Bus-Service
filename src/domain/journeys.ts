/**
 * The journeys a passenger keeps on this device.
 *
 * Two lists with different owners. **Recent** journeys are written by the app
 * whenever a search runs, so they are a record of what someone did. **Saved**
 * journeys are written only when a passenger asks, so they are a statement of
 * what they want. Never promote one to the other automatically: a route
 * travelled once by mistake is not a favourite, and guessing at that is how a
 * personalisation feature starts telling people about themselves.
 *
 * A journey is a pair of stops and **direction is part of its identity**.
 * HNLU to CBD is not CBD to HNLU - they leave at different times, may run on
 * different route patterns, and one of them may not exist at all. Treating the
 * pair as unordered would silently merge two different journeys into one
 * entry.
 *
 * Everything here is a pure function over lists. Where those lists live is the
 * service's problem, which is what keeps this file portable.
 */

import type { StopName } from "@/domain/transit/stops";

export interface JourneyPair {
  from: StopName;
  to: StopName;
}

export interface RecentJourney extends JourneyPair {
  /** When it was last planned, milliseconds since the epoch. */
  at: number;
}

export const isSameJourney = (a: JourneyPair, b: JourneyPair): boolean =>
  a.from === b.from && a.to === b.to;

/**
 * Whether this is a journey at all.
 *
 * A pair with the same stop at both ends is a form in an incomplete state,
 * not something to remember. The planner refuses it too; this exists so the
 * history cannot be poisoned by a caller that does not.
 */
export const isRealJourney = (journey: JourneyPair): boolean =>
  journey.from !== journey.to;

export const isSaved = (
  saved: readonly JourneyPair[],
  journey: JourneyPair
): boolean => saved.some((entry) => isSameJourney(entry, journey));

const without = <T extends JourneyPair>(
  list: readonly T[],
  journey: JourneyPair
): T[] => list.filter((entry) => !isSameJourney(entry, journey));

export const forgetJourney = <T extends JourneyPair>(
  list: readonly T[],
  journey: JourneyPair
): T[] => without(list, journey);

/**
 * Adds or removes a saved journey.
 *
 * At capacity an addition is **refused rather than made room for**: everything
 * in the list was put there deliberately, so dropping the oldest would delete
 * a passenger's own choice to make space for another. The list is returned
 * unchanged, which the caller can detect and explain.
 */
export const toggleSaved = (
  saved: readonly JourneyPair[],
  journey: JourneyPair,
  limit: number
): JourneyPair[] => {
  if (!isRealJourney(journey)) return [...saved];

  if (isSaved(saved, journey)) return without(saved, journey);

  if (saved.length >= limit) return [...saved];

  return [...saved, { from: journey.from, to: journey.to }];
};

/**
 * Records a journey as just planned, newest first.
 *
 * Planning the same journey again moves it to the front and re-dates it rather
 * than adding a second copy - a commuter searching one route every morning
 * should end up with one entry, not a week of them.
 */
export const recordRecent = (
  recent: readonly RecentJourney[],
  journey: JourneyPair,
  now: number,
  limit: number
): RecentJourney[] => {
  if (!isRealJourney(journey)) return [...recent];

  const entry: RecentJourney = { from: journey.from, to: journey.to, at: now };

  return [entry, ...without(recent, journey)].slice(0, Math.max(0, limit));
};
