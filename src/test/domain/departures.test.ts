/**
 * The next-departure engine.
 *
 * Schedule only. Nothing here observes a bus, so nothing it returns may be
 * shown as live - the tests below pin that boundary as much as the ordering.
 */

import { describe, expect, it } from "vitest";
import {
  departuresFrom,
  journeyDeparturesFrom,
  journeyOutlookFor,
  nextDepartureFrom,
  outlookFor,
  previousDepartureFrom,
  toMinutes,
  tripDepartureMinutes,
  tripServesJourney,
  tripTimings,
  upcomingDeparturesFrom,
} from "@/domain/transit/departures";
import { getTrips, type Trip } from "@/domain/transit/schedule";
import { serviceOn } from "@/domain/transit/calendar";
import { STOPS } from "@/domain/transit/stops";

/*
  Derived, not named. "Muktangan" used to be a stop with no departures and is
  now served by the inbound working - the kind of premise that rots the moment
  the timetable grows. This asks the data instead.
*/
const UNSERVED = STOPS.find(
  (stop) =>
    departuresFrom("weekday", stop).length === 0 &&
    departuresFrom("weekend", stop).length === 0
)!;

/** A corridor-local wall clock, given as the UTC instant it corresponds to. */
const ist = (date: string, hour: number, minute = 0) => {
  const utcHour = hour - 5;
  const utcMinute = minute - 30;

  return new Date(
    `${date}T00:00:00Z`
  ).getTime() + (utcHour * 60 + utcMinute) * 60_000;
};

const at = (date: string, hour: number, minute = 0) =>
  new Date(ist(date, hour, minute));

// 2026-08-24 is a Monday; 2026-08-29 a Saturday.
const MONDAY = "2026-08-24";
const SATURDAY = "2026-08-29";
const FRIDAY = "2026-08-28";

describe("reading a timetable time", () => {
  it("converts to minutes from midnight", () => {
    expect(toMinutes("6:25 AM")).toBe(6 * 60 + 25);
    expect(toMinutes("12:05 PM")).toBe(12 * 60 + 5);
    expect(toMinutes("9:25 PM")).toBe(21 * 60 + 25);
  });

  it("puts midnight and noon on the right side of twelve", () => {
    expect(toMinutes("12:00 AM")).toBe(0);
    expect(toMinutes("12:00 PM")).toBe(720);
  });

  it("refuses what it cannot read rather than guessing", () => {
    expect(toMinutes("25:00 AM")).toBeNull();
    expect(toMinutes("6:75 AM")).toBeNull();
    expect(toMinutes("half past six")).toBeNull();
    expect(toMinutes("")).toBeNull();
  });
});

describe("listing departures from a stop", () => {
  it("returns them in time order", () => {
    const departures = departuresFrom("weekday", "HNLU");

    expect(departures.length).toBeGreaterThan(0);

    const minutes = departures.map((departure) => departure.minutes);

    expect([...minutes].sort((a, b) => a - b)).toEqual(minutes);
  });

  it("is empty for a stop with no scheduled service", () => {
    expect(departuresFrom("weekday", UNSERVED)).toEqual([]);
  });
});

describe("what leaves next", () => {
  it("skips departures that have already gone", () => {
    const next = nextDepartureFrom("HNLU", at(MONDAY, 9, 0));

    expect(next).not.toBeNull();
    expect(next!.minutes).toBeGreaterThanOrEqual(9 * 60);
  });

  it("includes a departure happening exactly now", () => {
    const first = departuresFrom("weekday", "HNLU")[0]!;
    const next = nextDepartureFrom(
      "HNLU",
      at(MONDAY, Math.floor(first.minutes / 60), first.minutes % 60)
    );

    expect(next!.time).toBe(first.time);
  });

  it("offers the following departures after the next one", () => {
    const upcoming = upcomingDeparturesFrom("HNLU", at(MONDAY, 9, 0), 3);

    expect(upcoming).toHaveLength(3);
    expect(upcoming[0]!.minutes).toBeLessThan(upcoming[1]!.minutes);
    expect(upcoming[1]!.minutes).toBeLessThan(upcoming[2]!.minutes);
  });

  it("reports the departure that has just gone", () => {
    const previous = previousDepartureFrom("HNLU", at(MONDAY, 9, 0));

    expect(previous).not.toBeNull();
    expect(previous!.minutes).toBeLessThan(9 * 60);
  });

  it("has nothing previous before the first bus of the day", () => {
    expect(previousDepartureFrom("HNLU", at(MONDAY, 4, 0))).toBeNull();
  });
});

describe("when the day's service has finished", () => {
  it("says so rather than returning nothing", () => {
    const outlook = outlookFor("HNLU", at(MONDAY, 23, 30));

    expect(outlook.kind).toBe("ended");
  });

  /*
    The rule this protects: end of service must roll to the service the NEXT
    day actually runs, not to "tomorrow, same timetable". A Friday night that
    points at the weekday timetable sends a passenger to a bus that will not
    come.
  */
  it("points a Friday night at the weekend timetable", () => {
    const outlook = outlookFor("HNLU", at(FRIDAY, 23, 30));

    expect(outlook.kind).toBe("ended");

    if (outlook.kind === "ended") {
      expect(outlook.resumesOn).toBe("weekend");
      expect(outlook.resumesWeekday).toBe("Saturday");
      expect(outlook.first.time).toBe(departuresFrom("weekend", "HNLU")[0]!.time);
    }
  });

  it("points a Sunday night back at the weekday timetable", () => {
    const outlook = outlookFor("HNLU", at("2026-08-30", 23, 30));

    expect(outlook.kind).toBe("ended");

    if (outlook.kind === "ended") {
      expect(outlook.resumesOn).toBe("weekday");
      expect(outlook.resumesWeekday).toBe("Monday");
    }
  });

  it("reports upcoming service during the day", () => {
    const outlook = outlookFor("HNLU", at(SATURDAY, 9, 0));

    expect(outlook.kind).toBe("upcoming");
  });

  it("distinguishes a stop with no service at all from a finished day", () => {
    expect(outlookFor(UNSERVED, at(MONDAY, 9, 0)).kind).toBe("no-service");
  });
});

describe("marking a listing against the clock", () => {
  const weekdayOutbound = getTrips("weekday", "outbound");

  /** The row a timing belongs to, so a failure names a departure not an index. */
  const timingOf = (trips: readonly Trip[], minutes: number, departure: string) => {
    const index = trips.findIndex((trip) => trip.calls[0]?.time === departure);

    return tripTimings(trips, minutes)[index];
  };

  it("reads a trip's departure off its own first call", () => {
    expect(tripDepartureMinutes(weekdayOutbound[0]!)).toBe(6 * 60 + 25);
  });

  it("splits a listing into gone, next and still to come", () => {
    // 8:30 AM: the 8:25 has left, the 8:40 is next, the 8:55 follows.
    const nine = 8 * 60 + 30;

    expect(timingOf(weekdayOutbound, nine, "8:25 AM")).toBe("departed");
    expect(timingOf(weekdayOutbound, nine, "8:40 AM")).toBe("next");
    expect(timingOf(weekdayOutbound, nine, "8:55 AM")).toBe("later");
  });

  it("counts a departure as still to come in the minute it leaves", () => {
    expect(timingOf(weekdayOutbound, 8 * 60 + 40, "8:40 AM")).toBe("next");
  });

  it("marks nothing as next once the last bus has gone", () => {
    const timings = tripTimings(weekdayOutbound, 23 * 60 + 59);

    expect(timings).not.toContain("next");
    expect(new Set(timings)).toEqual(new Set(["departed"]));
  });

  it("marks nothing as departed before the first bus", () => {
    expect(tripTimings(weekdayOutbound, 0).filter((t) => t === "departed")).toHaveLength(0);
  });

  /*
    Route 204 starts mid-corridor at DKS Bhawan, so a listing mixes trips with
    different origins. Judging them against a single corridor origin would call
    that working departed while it is still sitting at its own first stop.
  */
  it("judges a mid-corridor working on its own first stop", () => {
    const inbound = getTrips("weekday", "inbound");
    const midCorridor = inbound.find((trip) => trip.calls[0]?.stop === "DKS Bhawan")!;

    expect(midCorridor).toBeDefined();
    expect(tripDepartureMinutes(midCorridor)).toBe(9 * 60 + 30);

    const index = inbound.indexOf(midCorridor);

    expect(tripTimings(inbound, 9 * 60 + 15)[index]).not.toBe("departed");
  });

  /*
    The listing happens to be in time order today, but nothing enforces that -
    a regenerated timetable grouped by route would silently make "the first
    row still to come" the wrong bus.
  */
  it("finds the soonest departure wherever it sits in the list", () => {
    const scrambled = [...weekdayOutbound].reverse();
    const timings = tripTimings(scrambled, 8 * 60 + 30);
    const nextIndex = timings.indexOf("next");

    expect(scrambled[nextIndex]!.calls[0]!.time).toBe("8:40 AM");
  });
});

/**
 * Journey-aware departures.
 *
 * `nextDepartureFrom` answers "what leaves this stop next", which on a
 * corridor running in both directions is often a bus that never reaches where
 * the passenger is going. Anywhere a destination is known, the honest question
 * is this one.
 */
describe("what leaves next that actually gets there", () => {
  const morning = new Date("2026-08-31T09:00:00+05:30");

  it("only counts trips that reach the destination", () => {
    for (const departure of journeyDeparturesFrom("HNLU", "CBD", morning)) {
      expect(tripServesJourney(departure.trip, "HNLU", "CBD")).toBe(true);
    }
  });

  it("never returns more than the stop's own departures", () => {
    const all = departuresFrom(serviceOn(morning), "CBD").length;

    expect(journeyDeparturesFrom("CBD", "HNLU", morning).length).toBeLessThanOrEqual(all);
  });

  /*
    Proven against the real timetable rather than asserted: this searches for a
    journey whose next usable bus is NOT the next bus out of the origin. If the
    data ever stopped containing such a case the distinction would be
    theoretical, and this test says so by failing.
  */
  it("skips a bus that leaves from here but does not go there", () => {
    const divergent: string[] = [];

    for (const from of STOPS) {
      const leaving = nextDepartureFrom(from, morning);
      if (!leaving) continue;

      for (const to of STOPS) {
        if (to === from) continue;

        const outlook = journeyOutlookFor(from, to, morning);
        if (outlook.kind !== "upcoming") continue;

        if (outlook.next.trip.id !== leaving.trip.id) {
          divergent.push(`${from}>${to}`);
        }
      }
    }

    expect(divergent.length).toBeGreaterThan(0);
  });

  it("reports a journey no bus makes today as unserved, not merely finished", () => {
    expect(journeyOutlookFor("CBD", "CBD", morning)).toEqual({ kind: "not-served" });
  });

  it("distinguishes nothing-more-today from no-bus-runs-this-way", () => {
    const late = new Date("2026-08-31T23:45:00+05:30");

    const served = journeyOutlookFor("HNLU", "CBD", late);

    expect(served.kind).toBe("ended");
    if (served.kind === "ended") {
      expect(served.last.time).toBeTruthy();
    }
  });
});

/**
 * Both directions.
 *
 * `getTrips` defaults to outbound so the timetable grid can render one working
 * per table. `departuresFrom` inherited that default, and five of the eight
 * published routes - 201 to 205, which run inbound only - reported no
 * departures anywhere in the product. These pin the fix at the layer every
 * surface reads from.
 */
describe("serving a stop in both directions", () => {
  const morning = new Date("2026-08-31T09:00:00+05:30");

  it("counts inbound trips, which five published routes run exclusively", () => {
    const inboundOnly = ["201", "202", "203", "204", "205"];

    const routes = new Set(
      ["weekday", "weekend"].flatMap((service) =>
        STOPS.flatMap((stop) =>
          departuresFrom(service as "weekday" | "weekend", stop).map(
            (departure) => departure.trip.routeId as string
          )
        )
      )
    );

    for (const route of inboundOnly) {
      expect(routes, `route ${route} is invisible again`).toContain(route);
    }
  });

  it("returns more from a stop than either direction alone", () => {
    const both = departuresFrom("weekday", "CBD").length;
    const out = departuresFrom("weekday", "CBD", "outbound").length;
    const inb = departuresFrom("weekday", "CBD", "inbound").length;

    expect(out).toBeGreaterThan(0);
    expect(inb).toBeGreaterThan(0);
    expect(both).toBe(out + inb);
  });

  it("scopes to one direction when a surface asks for one", () => {
    for (const departure of departuresFrom("weekday", "CBD", "inbound")) {
      expect(departure.trip.direction).toBe("inbound");
    }
  });

  /*
    The planner's defect in one assertion: this journey is published on the
    inbound working, and the page told passengers it did not exist.
  */
  it("finds a return journey the operator publishes", () => {
    const back = journeyDeparturesFrom("CBD", "HNLU", morning);

    expect(back.length).toBeGreaterThan(0);
    expect(back.every((d) => d.trip.direction === "inbound")).toBe(true);
  });

  it("answers a stop question with whichever direction leaves first", () => {
    const next = nextDepartureFrom("CBD", morning);
    const outboundNext = nextDepartureFrom("CBD", morning, "outbound");

    expect(next).not.toBeNull();
    expect(next!.minutes).toBeLessThanOrEqual(outboundNext!.minutes);
  });
});
