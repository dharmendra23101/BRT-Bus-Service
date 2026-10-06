/**
 * What leaves a stop next.
 *
 * The timetable has never had a notion of "now": it renders every trip of both
 * service days, always, and leaves the passenger to find their own row. This
 * module is the missing half.
 *
 * Everything here is SCHEDULE ONLY. Nothing in this file observes a bus, so
 * nothing it returns may be presented as live. The distinction is carried in
 * the type - a `Departure` has a scheduled time and no observation - so a
 * caller cannot accidentally render one as an arrival prediction.
 */

import {
  serviceMinutesOf,
  serviceOn,
  nextServiceDate,
  serviceWeekdayName,
} from "./calendar";
import {
  getAllTrips,
  getCallTime,
  getDestinationsFrom,
  getTrips,
  type ServiceDay,
  type Trip,
} from "./schedule";
import type { Direction } from "./timetable";
import type { StopName } from "./stops";

/** One scheduled departure from a stop. */
export interface Departure {
  trip: Trip;
  stop: StopName;
  /** Display time exactly as the timetable states it, e.g. "6:25 AM". */
  time: string;
  /** Minutes since midnight, for ordering and comparison. */
  minutes: number;
}

/**
 * Minutes since midnight for a timetable time, or null when it does not parse.
 *
 * Deliberately a small hand-rolled parser rather than `Date`: these are
 * wall-clock times on a service day, not instants, and routing them through a
 * Date drags the browser's timezone into a comparison that must not depend on
 * it.
 */
export const toMinutes = (time: string): number | null => {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time.trim());

  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const isPm = match[3]!.toUpperCase() === "PM";

  if (hours < 1 || hours > 12 || minutes > 59) return null;

  const hour24 = (hours % 12) + (isPm ? 12 : 0);

  return hour24 * 60 + minutes;
};

/**
 * Every scheduled departure from a stop on a service day, in time order.
 *
 * **Both directions unless one is named.** A stop is served both ways and a
 * passenger standing at it wants to know about both; scoping to a direction is
 * for a surface that renders one working at a time, like the timetable grid.
 * This defaulted to outbound once, which is how five of the eight published
 * routes came to report no departures at all.
 */
export const departuresFrom = (
  service: ServiceDay,
  stop: StopName,
  direction?: Direction
): Departure[] => {
  const departures: Departure[] = [];

  const trips = direction ? getTrips(service, direction) : getAllTrips(service);

  for (const trip of trips) {
    const time = getCallTime(trip, stop);

    if (time === null) continue;

    const minutes = toMinutes(time);

    if (minutes === null) continue;

    departures.push({ trip, stop, time, minutes });
  }

  return departures.sort((a, b) => a.minutes - b.minutes);
};

/** Departures still to come at a stop, soonest first. */
export const upcomingDeparturesFrom = (
  stop: StopName,
  at: Date,
  limit = 3,
  direction?: Direction
): Departure[] => {
  const now = serviceMinutesOf(at);

  return departuresFrom(serviceOn(at), stop, direction)
    .filter((departure) => departure.minutes >= now)
    .slice(0, limit);
};

/**
 * Whether a trip can carry somebody from one stop to another.
 *
 * Not "calls at both": it has to reach the destination **after** the origin,
 * which `getDestinationsFrom` answers by walking the trip's own calls. The
 * inbound working calls at HNLU twice, so a naive membership test would sell a
 * journey that runs the wrong way down the corridor.
 */
export const tripServesJourney = (
  trip: Trip,
  from: StopName,
  to: StopName
): boolean => getDestinationsFrom(trip, from).includes(to);

/**
 * Every departure today that carries a passenger from one stop to the other,
 * in time order.
 */
export const journeyDeparturesFrom = (
  from: StopName,
  to: StopName,
  at: Date
): Departure[] =>
  from === to
    ? []
    : departuresFrom(serviceOn(at), from).filter((departure) =>
        tripServesJourney(departure.trip, from, to)
      );

/**
 * What a passenger holding this journey should be told right now.
 *
 * Shaped like `StopOutlook` and for the same reason: "nothing more today" and
 * "no bus runs this way today" are different facts, and collapsing both into a
 * missing departure leaves a passenger unable to tell whether to wait.
 *
 * Distinct from `nextDepartureFrom`, which answers "what leaves this stop
 * next" and may be a bus that never reaches where they are going. Wherever a
 * destination is known, this is the honest question.
 */
export type JourneyOutlook =
  | { kind: "upcoming"; next: Departure }
  | { kind: "ended"; last: Departure }
  | { kind: "not-served" };

export const journeyOutlookFor = (
  from: StopName,
  to: StopName,
  at: Date
): JourneyOutlook => {
  const departures = journeyDeparturesFrom(from, to, at);

  if (departures.length === 0) return { kind: "not-served" };

  const now = serviceMinutesOf(at);
  const next = departures.find((departure) => departure.minutes >= now);

  return next
    ? { kind: "upcoming", next }
    : { kind: "ended", last: departures[departures.length - 1]! };
};

/** The next departure from a stop today, or null once service has ended. */
export const nextDepartureFrom = (
  stop: StopName,
  at: Date,
  direction?: Direction
): Departure | null => upcomingDeparturesFrom(stop, at, 1, direction)[0] ?? null;

/** The most recent departure that has already gone, or null before service. */
export const previousDepartureFrom = (
  stop: StopName,
  at: Date,
  direction?: Direction
): Departure | null => {
  const now = serviceMinutesOf(at);

  const gone = departuresFrom(serviceOn(at), stop, direction).filter(
    (departure) => departure.minutes < now
  );

  return gone[gone.length - 1] ?? null;
};

/**
 * What a passenger standing at a stop should be told.
 *
 * `ended` is a state in its own right rather than an absent `next`, because
 * "nothing more today" and "this stop has no service at all" are different
 * facts and a passenger needs to be able to tell them apart. When service has
 * ended the answer rolls to the FIRST departure of the next service day - and
 * the calendar decides what that day runs, so a Friday night correctly points
 * at the weekend timetable rather than assuming tomorrow looks like today.
 */
export type StopOutlook =
  | { kind: "upcoming"; next: Departure; following: Departure[] }
  | {
      kind: "ended";
      resumesOn: ServiceDay;
      resumesWeekday: string;
      first: Departure;
    }
  | { kind: "no-service" };

export const outlookFor = (
  stop: StopName,
  at: Date,
  direction?: Direction
): StopOutlook => {
  const upcoming = upcomingDeparturesFrom(stop, at, 4, direction);

  if (upcoming.length > 0) {
    return { kind: "upcoming", next: upcoming[0]!, following: upcoming.slice(1) };
  }

  const tomorrow = nextServiceDate(at);
  const tomorrowService = serviceOn(tomorrow);
  const first = departuresFrom(tomorrowService, stop, direction)[0];

  if (!first) return { kind: "no-service" };

  return {
    kind: "ended",
    resumesOn: tomorrowService,
    resumesWeekday: serviceWeekdayName(tomorrow),
    first,
  };
};

/** The minute a trip leaves its own first stop, or null when it does not parse. */
export const tripDepartureMinutes = (trip: Trip): number | null => {
  const first = trip.calls[0];

  return first ? toMinutes(first.time) : null;
};

/** Where a listed trip sits relative to the current moment. */
export type TripTiming = "departed" | "next" | "later";

/**
 * Marks every trip in a listing as gone, next, or still to come.
 *
 * Each trip is judged on its OWN first call rather than on a shared corridor
 * origin, because several workings start mid-corridor - route 204 begins at
 * DKS Bhawan - and one listing mixes them. List order is not assumed either:
 * "next" is the soonest departure still to come, wherever in the list it sits.
 */
export const tripTimings = (
  trips: readonly Trip[],
  minutes: number
): readonly TripTiming[] => {
  let nextIndex = -1;
  let nextAt = Infinity;

  trips.forEach((trip, index) => {
    const departs = tripDepartureMinutes(trip);

    if (departs === null || departs < minutes || departs >= nextAt) return;

    nextAt = departs;
    nextIndex = index;
  });

  return trips.map((trip, index) => {
    if (index === nextIndex) return "next";

    const departs = tripDepartureMinutes(trip);

    return departs !== null && departs < minutes ? "departed" : "later";
  });
};
