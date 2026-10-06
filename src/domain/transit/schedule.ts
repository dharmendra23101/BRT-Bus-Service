/**
 * Timetable data and trip queries.
 *
 * A timetable is naturally a grid, so the grid stays the authoring format -
 * but it is confined to this module and converted into structured `Trip`
 * objects at load. Consumers only ever see trips whose stop calls are named,
 * which is what removed the old `rowData: string[]` / `columns: string[]`
 * parallel-array contract between the timetable page and the booking modal.
 *
 * Times listed in a row align to that route's `servedStops`, so the
 * empty-string placeholders the old grid used for skipped stops are gone.
 */

import type { RouteId } from "./routes";
import type { StopName } from "./stops";
import { TIMETABLE, type Direction } from "./timetable";

export type ServiceDay = "weekday" | "weekend";

/** A scheduled call at one stop. */
export interface StopCall {
  stop: StopName;
  /** Display time, e.g. "6:25 AM". */
  time: string;
}

/** One scheduled run of a route. */
export interface Trip {
  /** Stable identity, e.g. "weekday-101-0". */
  id: string;
  routeId: RouteId;
  service: ServiceDay;
  /** Which way along the corridor this trip runs. */
  direction: Direction;
  /** Calls in travel order. */
  calls: readonly StopCall[];
}

const TRIPS: readonly Trip[] = TIMETABLE.map(([id, routeId, service, direction, calls]) => ({
  id,
  routeId,
  service,
  direction,
  calls: calls.map(([stop, time]) => ({ stop, time })),
}));

export const serviceFor = (date: Date): ServiceDay =>
  date.getDay() === 0 || date.getDay() === 6 ? "weekend" : "weekday";

/**
 * Trips for a service day in one direction, in timetable order.
 *
 * Direction defaults to outbound because a grid that renders its stop columns
 * from one working cannot show the other in the same table - the reverse
 * pattern is not the mirror of the forward one.
 *
 * **That default is for column rendering only.** Anything answering "what is
 * there to catch" must ask `getAllTrips`, or it silently drops the 47 published
 * inbound trips and tells a passenger a real service does not exist.
 */
export const getTrips = (
  service: ServiceDay,
  direction: Direction = "outbound"
): readonly Trip[] =>
  TRIPS.filter((trip) => trip.service === service && trip.direction === direction);

/**
 * Every trip on a service day, both directions.
 *
 * A stop is served in both directions and a passenger standing at one wants to
 * know about both. Routes 201-205 run inbound only, so a caller using
 * `getTrips` alone reports nothing at all for five of the eight published
 * routes.
 */
export const getAllTrips = (service: ServiceDay): readonly Trip[] =>
  TRIPS.filter((trip) => trip.service === service);

/** Scheduled time this trip calls at a stop, or null when it does not. */
export const getCallTime = (trip: Trip, stop: StopName): string | null =>
  trip.calls.find((call) => call.stop === stop)?.time ?? null;

/** Stops this trip actually calls at, in travel order. */
export const getTripStops = (trip: Trip): StopName[] =>
  trip.calls.map((call) => call.stop);

export const SCHEDULED_STOPS: ReadonlySet<StopName> = new Set(
  TRIPS.flatMap(getTripStops)
);

export const hasScheduledService = (stop: StopName): boolean =>
  SCHEDULED_STOPS.has(stop);

/**
 * Stops reachable from an origin on this trip.
 *
 * Enforces the forward-travel rule: you may only alight at a stop the bus
 * reaches after the one you board at.
 */
export const getDestinationsFrom = (trip: Trip, origin: StopName): StopName[] => {
  const index = trip.calls.findIndex((call) => call.stop === origin);
  if (index < 0) return [];

  return trip.calls.slice(index + 1).map((call) => call.stop);
};
