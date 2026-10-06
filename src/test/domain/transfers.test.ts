/**
 * Journeys that need one change.
 *
 * The planner told a passenger "No scheduled service for this journey" for 68
 * of the 380 ordered stop pairs on this corridor, and every one of those 68 is
 * reachable with exactly one change. These tests hold the three things that
 * makes true: that a change is only offered where no through trip exists, that
 * the second bus never leaves before the first arrives, and that the pairs
 * measured as solvable actually are.
 */

import { describe, expect, it } from "vitest";
import { needsChange, transferOptionsFor } from "@/domain/transit/transfers";
import { getAllTrips } from "@/domain/transit/schedule";
import { toMinutes, tripServesJourney } from "@/domain/transit/departures";
import { serviceOn } from "@/domain/transit/calendar";
import { STOPS, type StopName } from "@/domain/transit/stops";

/* A Wednesday, so the weekday timetable applies. */
const WEEKDAY = new Date("2026-09-02T09:00:00");

const served = (): StopName[] => {
  const stops = new Set<StopName>();

  for (const trip of getAllTrips(serviceOn(WEEKDAY))) {
    for (const call of trip.calls) stops.add(call.stop);
  }

  return [...stops];
};

const hasThroughTrip = (from: StopName, to: StopName) =>
  getAllTrips(serviceOn(WEEKDAY)).some((trip) =>
    tripServesJourney(trip, from, to)
  );

/** Every ordered pair no single trip serves. */
const needingAChange = () => {
  const stops = served();
  const pairs: [StopName, StopName][] = [];

  for (const from of stops) {
    for (const to of stops) {
      if (from !== to && !hasThroughTrip(from, to)) pairs.push([from, to]);
    }
  }

  return pairs;
};

describe("where a change is offered at all", () => {
  /*
    THE MEASUREMENT THIS MODULE EXISTS FOR. Derived rather than typed: if the
    operator publishes a through service for one of these pairs tomorrow, the
    count falls on its own and nothing here lies about it.
  */
  it("covers every pair no single trip serves", () => {
    const pairs = needingAChange();

    expect(pairs.length).toBeGreaterThan(0);

    const unreachable = pairs.filter(
      ([from, to]) => !needsChange(from, to, WEEKDAY)
    );

    expect(unreachable).toEqual([]);
  });

  /*
    And never where one does. A change offered beside a direct bus is noise at
    best and a worse journey at worst.
  */
  it("offers nothing when a through trip exists", () => {
    const direct = served()
      .flatMap((from) => served().map((to) => [from, to] as const))
      .filter(([from, to]) => from !== to && hasThroughTrip(from, to));

    expect(direct.length).toBeGreaterThan(0);

    for (const [from, to] of direct.slice(0, 40)) {
      expect(transferOptionsFor(from, to, WEEKDAY), `${from} to ${to}`).toEqual(
        []
      );
    }
  });

  it("offers nothing for a journey to the same stop", () => {
    expect(transferOptionsFor(STOPS[0]!, STOPS[0]!, WEEKDAY)).toEqual([]);
  });
});

describe("what an offered change actually says", () => {
  const sample = () => {
    const [pair] = needingAChange();

    expect(pair).toBeDefined();

    return transferOptionsFor(pair![0], pair![1], WEEKDAY);
  };

  /*
    The constraint the timetable can support, and the only one. A second bus
    that leaves before the first arrives is a journey nobody can make.
  */
  it("never boards a bus that has already left", () => {
    for (const [from, to] of needingAChange()) {
      for (const option of transferOptionsFor(from, to, WEEKDAY)) {
        const arrives = toMinutes(option.arrivesAtChange);
        const departs = toMinutes(option.departsChange);

        expect(arrives).not.toBeNull();
        expect(departs).not.toBeNull();
        expect(departs!, `${from} to ${to} via ${option.changeAt}`)
          .toBeGreaterThanOrEqual(arrives!);
        expect(option.waitMinutes).toBeGreaterThanOrEqual(0);
      }
    }
  });

  /*
    Both legs have to be real journeys on their own trip, in the right
    direction. A membership test would sell a change that runs back up the
    corridor - the inbound working calls at HNLU twice, which is exactly how
    that mistake gets made.
  */
  it("uses two trips that each genuinely carry the passenger", () => {
    for (const [from, to] of needingAChange().slice(0, 20)) {
      for (const option of transferOptionsFor(from, to, WEEKDAY)) {
        expect(tripServesJourney(option.first, from, option.changeAt)).toBe(true);
        expect(tripServesJourney(option.second, option.changeAt, to)).toBe(true);
        expect(option.first).not.toBe(option.second);
      }
    }
  });

  it("quotes times exactly as the timetable states them", () => {
    for (const option of sample()) {
      for (const time of [
        option.departs,
        option.arrivesAtChange,
        option.departsChange,
        option.arrives,
      ]) {
        expect(time).toMatch(/^\d{1,2}:\d{2} (AM|PM)$/);
      }
    }
  });

  it("puts the option that arrives first at the top", () => {
    const options = sample();

    expect(options.length).toBeGreaterThan(0);

    const arrivals = options.map((option) => toMinutes(option.arrives)!);

    expect([...arrivals].sort((a, b) => a - b)).toEqual(arrivals);
  });

  it("returns no more than it was asked for", () => {
    const [pair] = needingAChange();

    expect(transferOptionsFor(pair![0], pair![1], WEEKDAY, 1).length)
      .toBeLessThanOrEqual(1);
  });

  /*
    The change stop has to be somewhere both buses actually call, or the
    passenger is told to get off in a place the second bus never reaches.
  */
  it("changes at a stop both trips call at", () => {
    for (const [from, to] of needingAChange().slice(0, 20)) {
      for (const option of transferOptionsFor(from, to, WEEKDAY)) {
        expect(option.first.calls.map((call) => call.stop)).toContain(
          option.changeAt
        );
        expect(option.second.calls.map((call) => call.stop)).toContain(
          option.changeAt
        );
      }
    }
  });
});
