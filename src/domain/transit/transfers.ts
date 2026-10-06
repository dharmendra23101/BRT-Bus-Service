/**
 * Journeys that need one change.
 *
 * WHY THIS EXISTS. 68 of the 380 ordered stop pairs on this corridor - 18% of
 * them - are served by no single trip, and every one of those 68 is reachable
 * with exactly one change. The planner told a passenger "No scheduled service
 * for this journey" for all of them, which is not true: there is service, it
 * just is not direct. That is the same class of defect as the direction bug
 * that hid 47 published trips.
 *
 * ONE CHANGE, NOT N. A second change is not offered, and that is a decision
 * rather than a limit of the code: on a single trunk corridor with feeders,
 * anything a second change reaches is already reachable with one, so the
 * options would differ only in being worse.
 *
 * WHAT IS NOT MODELLED, because there is no evidence for it: any allowance for
 * walking, boarding, or a bus running late. A connection is offered when the
 * second bus departs at or after the first arrives, which is the only
 * constraint the timetable can actually support. A minimum connection time
 * would be a number we invented, and it would silently discard real journeys.
 * The interface says this rather than hiding it.
 */

import { getAllTrips, getDestinationsFrom, type Trip } from "./schedule";
import { serviceOn } from "./calendar";
import { toMinutes, tripServesJourney } from "./departures";
import type { StopName } from "./stops";

/** A journey made of two trips and the stop between them. */
export interface TransferOption {
  first: Trip;
  second: Trip;
  changeAt: StopName;
  /** Display times, exactly as the timetable states them. */
  departs: string;
  arrivesAtChange: string;
  departsChange: string;
  arrives: string;
  /** Minutes spent waiting at the change, from the timetable alone. */
  waitMinutes: number;
}

/** When a trip calls at a stop, or null if it never does. */
const callAt = (trip: Trip, stop: StopName) =>
  trip.calls.find((call) => call.stop === stop) ?? null;

/**
 * The last call at a stop, which is not always the first.
 *
 * The inbound working calls at HNLU twice. Alighting there means the later
 * call; boarding there for somewhere further on means the earlier one.
 */
const lastCallAt = (trip: Trip, stop: StopName) =>
  [...trip.calls].reverse().find((call) => call.stop === stop) ?? null;

/**
 * Journeys from one stop to another that need exactly one change.
 *
 * Ordered by arrival, then by departure: a passenger asking how to get
 * somewhere wants the option that lands first, and among equals the one that
 * lets them leave last.
 */
export const transferOptionsFor = (
  from: StopName,
  to: StopName,
  at: Date,
  limit = 3
): TransferOption[] => {
  if (from === to) return [];

  const trips = getAllTrips(serviceOn(at));

  /* A through trip exists, so a change is not what this passenger needs. */
  if (trips.some((trip) => tripServesJourney(trip, from, to))) return [];

  const options: TransferOption[] = [];

  for (const first of trips) {
    const boarding = callAt(first, from);

    if (!boarding) continue;

    const departs = toMinutes(boarding.time);

    if (departs === null) continue;

    for (const changeAt of getDestinationsFrom(first, from)) {
      const alighting = lastCallAt(first, changeAt);
      const arrivesAtChange = alighting && toMinutes(alighting.time);

      if (!alighting || arrivesAtChange === null) continue;

      for (const second of trips) {
        if (second === first) continue;
        if (!tripServesJourney(second, changeAt, to)) continue;

        const onward = callAt(second, changeAt);
        const departsChange = onward && toMinutes(onward.time);

        if (!onward || departsChange === null) continue;

        /* The only constraint the timetable supports: not before it arrives. */
        if (departsChange < arrivesAtChange) continue;

        const destination = lastCallAt(second, to);

        if (!destination) continue;

        options.push({
          first,
          second,
          changeAt,
          departs: boarding.time,
          arrivesAtChange: alighting.time,
          departsChange: onward.time,
          arrives: destination.time,
          waitMinutes: departsChange - arrivesAtChange,
        });
      }
    }
  }

  const arrivalOf = (option: TransferOption) => toMinutes(option.arrives) ?? 0;
  const departureOf = (option: TransferOption) => toMinutes(option.departs) ?? 0;

  return options
    .sort((a, b) => arrivalOf(a) - arrivalOf(b) || departureOf(b) - departureOf(a))
    .slice(0, limit);
};

/**
 * Whether a change would get a passenger there at all.
 *
 * Separate from the options themselves so a screen can tell "no service" from
 * "no DIRECT service" without rendering a list it may not have room for.
 */
export const needsChange = (from: StopName, to: StopName, at: Date): boolean =>
  transferOptionsFor(from, to, at, 1).length > 0;
