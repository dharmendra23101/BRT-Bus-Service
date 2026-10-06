/**
 * Timetable conformance — GTFS migration step 0.
 *
 * No refactor, no production change: these are invariants asserted over the
 * schedule exactly as it is authored today. GTFS requires that stop times
 * within a trip never go backwards, and `buildTrips` only validates row
 * LENGTH, so nothing in the app has ever checked it.
 *
 * It fails on eight real trips. Those eight are quarantined by name below
 * rather than deleted or "corrected", because the operator publishes them that
 * way: the authoritative timetable reproduces every one of them to the minute.
 * The quarantine is exact, so a NEW violation fails immediately - and so does
 * silently "fixing" one without updating the list.
 */

import { describe, expect, it } from "vitest";
import { parseTimeToDate } from "@/domain/time";
import { getRoute } from "@/domain/transit/routes";
import { getTrips, type Trip } from "@/domain/transit/schedule";
import { STOPS } from "@/domain/transit/stops";
import { TIMETABLE_SOURCE } from "@/domain/transit/timetable";

const ALL_TRIPS: readonly Trip[] = [
  ...getTrips("weekday", "outbound"),
  ...getTrips("weekday", "inbound"),
  ...getTrips("weekend", "outbound"),
  ...getTrips("weekend", "inbound"),
];

/**
 * Trips whose calls go backwards, with the call that does it.
 *
 * Every one is Route 101 outbound, at North Block, where the time drops two
 * minutes below Mahanadi Bhavan. THIS IS THE OPERATOR'S OWN DATA: the
 * published shelter timetable prints all eight exactly as they appear here,
 * verified against the source on 2026-08-27. They are not a transcription
 * error and must not be "corrected" - doing so would put times on a public
 * timetable that the operator does not publish.
 *
 * Worth raising with NRANVP: eight of their services reach North Block two
 * minutes before they leave Mahanadi Bhavan.
 */
const KNOWN_BACKWARDS_TRIPS: readonly string[] = [
  "weekday-outbound-101-31",
  "weekday-outbound-101-33",
  "weekend-outbound-101-5",
  "weekend-outbound-101-6",
  "weekend-outbound-101-7",
  "weekend-outbound-101-8",
  "weekend-outbound-101-9",
  "weekend-outbound-101-10",
];

const STOP_SET = new Set<string>(STOPS);

/** Trip ids whose calls are not in non-decreasing time order. */
const findBackwardsTrips = (): string[] =>
  ALL_TRIPS.filter((trip) =>
    trip.calls.some((call, index) => {
      if (index === 0) return false;

      const previous = parseTimeToDate(trip.calls[index - 1]!.time).getTime();

      return parseTimeToDate(call.time).getTime() < previous;
    })
  ).map((trip) => trip.id);

describe("every trip is internally consistent", () => {
  it("has at least one call", () => {
    for (const trip of ALL_TRIPS) {
      expect(trip.calls.length, trip.id).toBeGreaterThan(0);
    }
  });

  it("calls only at stops the registry knows", () => {
    for (const trip of ALL_TRIPS) {
      for (const call of trip.calls) {
        expect(STOP_SET.has(call.stop), `${trip.id} calls at ${call.stop}`).toBe(true);
      }
    }
  });

  /*
    Weaker than it used to be, and deliberately so. This once asserted that a
    trip calls at exactly its route's stops in exactly that order. The
    authoritative timetable disproves that: route 201 runs four different
    patterns, several workings terminate early at Balco Medical Center, one
    starts mid-corridor at DKS Bhawan, and the full inbound service calls at
    HNLU twice - mid-route and again as its terminus. A route does not own a
    single pattern, so the invariant that survives is containment, not equality.
  */
  it("calls only at stops its own route serves", () => {
    for (const trip of ALL_TRIPS) {
      const served = new Set<string>(getRoute(trip.routeId).servedStops);

      for (const call of trip.calls) {
        expect(
          served.has(call.stop),
          `${trip.id} calls at ${call.stop}, which route ${trip.routeId} does not serve`
        ).toBe(true);
      }
    }
  });

  it("never calls at the same stop twice in succession", () => {
    for (const trip of ALL_TRIPS) {
      trip.calls.forEach((call, index) => {
        if (index === 0) return;

        expect(call.stop, `${trip.id} repeats ${call.stop}`).not.toBe(
          trip.calls[index - 1]!.stop
        );
      });
    }
  });

  it("states every time in a form the app can parse", () => {
    for (const trip of ALL_TRIPS) {
      for (const call of trip.calls) {
        const parsed = parseTimeToDate(call.time);

        expect(Number.isNaN(parsed.getTime()), `${trip.id} @ ${call.time}`).toBe(false);
      }
    }
  });

  it("never calls at a stop before the stop it just left", () => {
    expect(findBackwardsTrips().sort()).toEqual([...KNOWN_BACKWARDS_TRIPS].sort());
  });

  /*
    Guards the quarantine itself. If the operator republishes and corrects
    any of the eight, this fails and forces the list to shrink rather than be
    left behind as a lie about the data.
  */
  it("quarantines only trips that are genuinely still broken", () => {
    const broken = new Set(findBackwardsTrips());

    for (const id of KNOWN_BACKWARDS_TRIPS) {
      expect(broken.has(id), `${id} is quarantined but no longer broken`).toBe(true);
    }
  });
});

/*
  Fidelity to the published source.

  The dataset is generated from the operator's shelter timetable, but the
  generator and its artifact live outside the repository, so CI cannot diff
  against them. These spot-checks stand in for that: each one is a value the
  previous hand-authored grid got WRONG, so a regression to the old data fails
  here rather than reaching a passenger.
*/
describe("faithful to the operator's published timetable", () => {
  const callAt = (tripId: string, stop: string) =>
    ALL_TRIPS.find((trip) => trip.id === tripId)?.calls.find(
      (call) => call.stop === stop
    )?.time;

  it("keeps route 105 as its own service rather than folding it into 101", () => {
    const trip = ALL_TRIPS.find((t) => t.id === "weekday-outbound-105-1");

    expect(trip, "route 105 is missing").toBeDefined();
    expect(trip!.routeId).toBe("105");
    expect(trip!.calls[0]!.time).toBe("5:55 PM");
    // The old grid recorded this as a route-101 trip with invented times and
    // the wrong pattern; the real service calls at IIM and skips Sector 30.
    expect(trip!.calls.map((c) => c.stop)).toContain("IIM");
    expect(trip!.calls.map((c) => c.stop)).not.toContain("Sector 30");
  });

  it("publishes North Block as the operator does, not smoothed", () => {
    expect(callAt("weekday-outbound-101-31", "North Block")).toBe("8:42 PM");
    expect(callAt("weekday-outbound-101-33", "North Block")).toBe("9:42 PM");
    expect(callAt("weekend-outbound-101-5", "North Block")).toBe("11:42 AM");
  });

  it("runs the inbound working past HNLU and back to it", () => {
    const trip = ALL_TRIPS.find((t) => t.id === "weekday-inbound-205-1");
    const stops = trip!.calls.map((call) => call.stop);

    expect(stops[0]).toBe("Raipur Railway Station");
    expect(stops.at(-1)).toBe("HNLU");
    expect(stops).toContain("Muktangan");
    // HNLU is called at twice: mid-route, and again as the terminus.
    expect(stops.filter((stop) => stop === "HNLU")).toHaveLength(2);
  });

  it("carries the source it was generated from", () => {
    expect(TIMETABLE_SOURCE.document).toMatch(/Shelter/i);
    expect(TIMETABLE_SOURCE.extractedOn).toBe("2026-08-27");
  });
});
