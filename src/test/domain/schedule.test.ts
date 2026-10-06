/**
 * Timetable integrity.
 *
 * The schedule is authored as a grid and zipped against each route's served
 * stops at load. A mismatch between the two would misalign every departure
 * time on a row - the kind of fault that produces a plausible-looking
 * timetable full of wrong times, so it is checked structurally rather than
 * by spot-reading a few cells.
 */

import { describe, expect, it } from "vitest";
import { getRoute, ROUTE_IDS } from "@/domain/transit/routes";
import {
  getCallTime,
  getDestinationsFrom,
  getTripStops,
  getTrips,
  hasScheduledService,
  SCHEDULED_STOPS,
} from "@/domain/transit/schedule";
import { STOPS } from "@/domain/transit/stops";

const allTrips = [...getTrips("weekday"), ...getTrips("weekend")];

describe("schedule loads", () => {
  it("builds every trip the operator publishes", () => {
    // Counted from the authoritative shelter timetable. A shortfall means the
    // generated data and the source have drifted apart.
    expect(getTrips("weekday", "outbound")).toHaveLength(34);
    expect(getTrips("weekday", "inbound")).toHaveLength(23);
    expect(getTrips("weekend", "outbound")).toHaveLength(21);
    expect(getTrips("weekend", "inbound")).toHaveLength(24);
  });

  it("defaults to the outbound working, so existing callers are unchanged", () => {
    expect(getTrips("weekday")).toEqual(getTrips("weekday", "outbound"));
  });

  /*
    The return service is a different service, not route 101 backwards: it runs
    under its own numbers and continues past HNLU to Muktangan before
    terminating back at HNLU.
  */
  it("carries the inbound working under its own route numbers", () => {
    const inbound = new Set(getTrips("weekday", "inbound").map((t) => t.routeId));

    expect(inbound).toContain("201");
    expect(inbound).not.toContain("101");
  });

  it("gives every trip a unique id", () => {
    // Trip ids are React keys in the timetable; a duplicate would make rows
    // reconcile onto each other.
    const ids = allTrips.map((trip) => trip.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("trips match their route", () => {
  it("calls at exactly the stops its route serves, in order", () => {
    for (const trip of allTrips) {
      expect(getTripStops(trip)).toEqual([...getRoute(trip.routeId).servedStops]);
    }
  });

  it("only uses known route ids", () => {
    for (const trip of allTrips) {
      expect(ROUTE_IDS).toContain(trip.routeId);
    }
  });

  it("never carries an empty call time", () => {
    // The old grid used empty strings for stops a route skips. A skipped
    // stop must now be absent, not blank.
    for (const trip of allTrips) {
      for (const call of trip.calls) {
        expect(call.time).not.toBe("");
      }
    }
  });
});

describe("the express route skips the two Bhavan stops", () => {
  const express = getTrips("weekend").filter((trip) => trip.routeId === "102");

  it("runs on weekends", () => {
    expect(express.length).toBeGreaterThan(0);
  });

  it("has no call at either skipped stop", () => {
    for (const trip of express) {
      expect(getCallTime(trip, "Indravati Bhavan")).toBeNull();
      expect(getCallTime(trip, "Mahanadi Bhavan")).toBeNull();
    }
  });

  it("still calls at every other stop", () => {
    const skipped = new Set(["Indravati Bhavan", "Mahanadi Bhavan"]);

    for (const stop of getRoute("101").servedStops) {
      if (skipped.has(stop)) continue;
      expect(getCallTime(express[0]!, stop)).not.toBeNull();
    }
  });
});

describe("which stops the timetable actually serves", () => {
  it("counts a stop as served when any trip calls there", () => {
    for (const trip of allTrips) {
      for (const stop of getTripStops(trip)) {
        expect(hasScheduledService(stop)).toBe(true);
      }
    }
  });

  it("covers every stop the outbound route serves", () => {
    for (const stop of getRoute("101").servedStops) {
      expect(SCHEDULED_STOPS.has(stop), stop).toBe(true);
    }
  });

  /*
    The inbound working reaches four stops no outbound service calls at, which
    is why the served set is larger than any single route's stop list.
  */
  it("also covers the stops only the inbound working reaches", () => {
    for (const stop of ["HNLU Gate", "Jungle Safari", "IIIT", "Muktangan"] as const) {
      expect(SCHEDULED_STOPS.has(stop), stop).toBe(true);
    }
  });

  it("reports the network stops that have no departures yet", () => {
    const unserved = STOPS.filter((stop) => !hasScheduledService(stop));

    expect(unserved).toContain("Agriculture College");
    expect(unserved).not.toContain("Jungle Safari");
    expect(unserved).not.toContain("IIM");
    expect(unserved).not.toContain("HNLU");
    expect(unserved).toHaveLength(STOPS.length - SCHEDULED_STOPS.size);
  });
});

describe("forward-travel rule", () => {
  const trip = getTrips("weekday")[0]!;

  it("offers only stops the bus reaches after the boarding point", () => {
    const stops = getTripStops(trip);
    const origin = stops[3]!;

    expect(getDestinationsFrom(trip, origin)).toEqual(stops.slice(4));
  });

  it("offers nothing from the final stop", () => {
    const last = getTripStops(trip).at(-1)!;

    expect(getDestinationsFrom(trip, last)).toEqual([]);
  });

  it("offers nothing from a stop this trip does not serve", () => {
    const express = getTrips("weekend").find((t) => t.routeId === "102")!;

    expect(getDestinationsFrom(express, "Indravati Bhavan")).toEqual([]);
  });
});
