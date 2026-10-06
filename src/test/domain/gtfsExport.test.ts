/**
 * The GTFS static export.
 *
 * The feed is the one artefact an operator can hand to anybody - Google Maps,
 * a journey planner, another consultant - so the two things that matter are
 * that every row is derived from the authoritative timetable, and that the
 * export REFUSES rather than inventing the parts only the operator knows.
 *
 * Coordinates here are fixtures. They are not this application's stop
 * coordinates, which are a generated lattice, and nothing in these tests
 * asserts a position is real.
 */

import { describe, expect, it } from "vitest";
import {
  buildGtfsFeed,
  gtfsRequirements,
  gtfsStopId,
  type GtfsInputs,
} from "@/domain/gtfs/export";
import { ROUTE_IDS } from "@/domain/transit/routes";
import { TIMETABLE_SOURCE } from "@/domain/transit/timetable";
import { getAllTrips } from "@/domain/transit/schedule";
import { serviceOn } from "@/domain/transit/calendar";

const agency = {
  id: "fixture-agency",
  name: "Fixture Transit Authority",
  url: "https://example.invalid",
  timezone: "Asia/Kolkata",
};

/* Every served stop, given an arbitrary position. Fixtures, not a survey. */
const fixtureCoordinates = () =>
  Object.fromEntries(
    gtfsRequirements().stopsNeedingSurvey.map((stop, index) => [
      stop,
      { lat: 21 + index / 1000, lng: 81 + index / 1000 },
    ])
  );

/* Deliberately not the agency: the feed's publisher is a separate claim. */
const feedPublisher = {
  name: "Fixture Feed Publisher",
  url: "https://feeds.example.invalid",
};

const inputs = (over: Partial<GtfsInputs> = {}): GtfsInputs => ({
  agency,
  feedPublisher,
  stopCoordinates: fixtureCoordinates(),
  startDate: "20260101",
  endDate: "20261231",
  ...over,
});

const built = () => {
  const feed = buildGtfsFeed(inputs());

  if (!feed.ok) throw new Error("expected a feed");

  return feed.files;
};

const rows = (file: string) =>
  file.trim().split("\n").slice(1).map((line) => line.split(","));

/*
  The dataset's own provenance.

  A feed that does not say who published it or which version it is leaves a
  consumer unable to tell a current file from a stale one - and GTFS has a
  place for exactly that, which this export did not fill.
*/
describe("what the feed says about itself", () => {
  it("publishes feed_info.txt", () => {
    expect(Object.keys(built())).toContain("feed_info.txt");
  });

  /*
    THE LINE. The agency runs the buses; we assembled the file. Naming the
    operator as publisher would credit them with something they did not
    produce, in every system that ingests it.
  */
  it("names the feed's publisher, not the operator", () => {
    const rows = built()["feed_info.txt"]!;

    expect(rows).toContain(feedPublisher.name);
    expect(rows).not.toContain(agency.name);
  });

  /*
    Read from the timetable's own provenance rather than typed, so the version
    moves when the data does. A constant here would report the same version
    forever.
  */
  it("versions the feed by the date the timetable was read", () => {
    expect(built()["feed_info.txt"]).toContain(TIMETABLE_SOURCE.extractedOn);
  });

  /*
    The language of the NAMES in the feed, not of the site. Stops and routes
    are carried as the operator publishes them, which stays English however
    many languages the app is read in.
  */
  it("declares the language its names are written in", () => {
    expect(built()["feed_info.txt"]).toMatch(/(^|,)en(,|$)/m);
  });

  it("refuses to build without a feed publisher", () => {
    const feed = buildGtfsFeed(
      inputs({ feedPublisher: { name: "", url: "" } })
    );

    expect(feed.ok).toBe(false);
    if (!feed.ok) {
      expect(feed.gaps.map((gap) => gap.kind)).toContain("FEED_PUBLISHER");
    }
  });
});

describe("what the export refuses to invent", () => {
  /*
    The whole reason coordinates are an input. This application's own
    coordinates are a generated lattice; emitting them into a format whose
    purpose is that other systems consume it as fact would route passengers
    to points on roads where no bus stops.
  */
  it("refuses to publish a feed with no surveyed coordinates", () => {
    const feed = buildGtfsFeed(inputs({ stopCoordinates: {} }));

    expect(feed.ok).toBe(false);

    if (feed.ok) return;

    const gap = feed.gaps.find((entry) => entry.kind === "STOP_COORDINATES");

    expect(gap).toBeDefined();
    expect(gap?.detail).toMatch(/lattice/i);
  });

  it("names every stop it is missing, so the gap is actionable", () => {
    const feed = buildGtfsFeed(inputs({ stopCoordinates: {} }));

    if (feed.ok) throw new Error("expected a refusal");

    const gap = feed.gaps.find((entry) => entry.kind === "STOP_COORDINATES");

    expect(gap && "stops" in gap ? gap.stops.length : 0).toBe(
      gtfsRequirements().stopsNeedingSurvey.length
    );
  });

  it("refuses a partial survey rather than filling the holes", () => {
    const [first] = gtfsRequirements().stopsNeedingSurvey;

    const feed = buildGtfsFeed(
      inputs({ stopCoordinates: { [first!]: { lat: 21.2, lng: 81.6 } } })
    );

    expect(feed.ok).toBe(false);
  });

  /*
    The operator's legal name and URL are facts about somebody else. A guess
    misattributes the service in every system that ingests the feed.
  */
  it("refuses without an agency", () => {
    const feed = buildGtfsFeed(
      inputs({ agency: { ...agency, name: "", url: "" } })
    );

    if (feed.ok) throw new Error("expected a refusal");

    expect(feed.gaps.some((gap) => gap.kind === "AGENCY")).toBe(true);
  });

  it("refuses a feed window that is not a GTFS date", () => {
    const feed = buildGtfsFeed(inputs({ startDate: "1 Jan 2026" }));

    if (feed.ok) throw new Error("expected a refusal");

    expect(feed.gaps.some((gap) => gap.kind === "FEED_WINDOW")).toBe(true);
  });

  it("reports every gap at once rather than one at a time", () => {
    const feed = buildGtfsFeed(
      inputs({
        agency: { ...agency, name: "" },
        stopCoordinates: {},
        startDate: "nope",
      })
    );

    if (feed.ok) throw new Error("expected a refusal");

    expect(feed.gaps).toHaveLength(3);
  });
});

describe("the feed it does produce", () => {
  it("emits the files a consumer requires", () => {
    expect(Object.keys(built()).sort()).toEqual([
      "agency.txt",
      "calendar.txt",
      "feed_info.txt",
      "routes.txt",
      "stop_times.txt",
      "trips.txt",
      "stops.txt",
    ].sort());
  });

  it("names every published route, and calls them buses", () => {
    const routes = rows(built()["routes.txt"]!);

    expect(routes.map((row) => row[0])).toEqual([...ROUTE_IDS]);
    /* GTFS route_type 3 is a bus; 2 would be rail and 0 a tram. */
    expect(routes.every((row) => row[4] === "3")).toBe(true);
  });

  it("emits every published trip, in both directions", () => {
    const trips = rows(built()["trips.txt"]!);
    const published =
      getAllTrips("weekday").length + getAllTrips("weekend").length;

    expect(trips).toHaveLength(published);
    expect(new Set(trips.map((row) => row[3]))).toEqual(new Set(["0", "1"]));
  });

  it("emits a stop time for every call of every trip", () => {
    const calls = [...getAllTrips("weekday"), ...getAllTrips("weekend")].reduce(
      (total, trip) => total + trip.calls.length,
      0
    );

    expect(rows(built()["stop_times.txt"]!)).toHaveLength(calls);
  });

  /*
    A GTFS consumer keys on these. A positional index would renumber every
    stop after an insertion, silently attaching yesterday's times to today's
    wrong stops in any consumer that had cached the feed.
  */
  it("gives every stop a stable, unique id", () => {
    const ids = gtfsRequirements().stopsNeedingSurvey.map(gtfsStopId);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => /^[a-z0-9-]+$/.test(id))).toBe(true);
  });

  it("derives the id from the name rather than the position", () => {
    expect(gtfsStopId("Sector 27-29 Mid")).toBe("sector-27-29-mid");
    expect(gtfsStopId("HNLU")).toBe("hnlu");
  });
});

describe("times", () => {
  const stopTimes = () => rows(built()["stop_times.txt"]!);

  it("writes every time as GTFS 24-hour", () => {
    expect(
      stopTimes().every((row) => /^\d{2,3}:\d{2}:\d{2}$/.test(row[1]!))
    ).toBe(true);
  });

  it("converts every published time, dropping none", () => {
    const calls = [...getAllTrips("weekday"), ...getAllTrips("weekend")].reduce(
      (total, trip) => total + trip.calls.length,
      0
    );

    expect(stopTimes()).toHaveLength(calls);
  });

  /*
    THE ONE THAT MATTERS. A trip departing 11:40 PM and arriving 12:10 AM is
    24:10:00 in GTFS, still on the service day it began. Wrapping to 00:10
    would put the arrival before the departure, and a planner reading that
    either drops the trip or offers a journey arriving before it leaves.
  */
  it("never lets a trip arrive before it departed", () => {
    const byTrip = new Map<string, number[]>();

    for (const row of stopTimes()) {
      const tripId = row[0]!;
      const [hh, mm] = row[1]!.split(":");
      const minutes = Number(hh) * 60 + Number(mm);

      byTrip.set(tripId, [...(byTrip.get(tripId) ?? []), minutes]);
    }

    for (const [tripId, times] of byTrip) {
      const ascending = times.every(
        (minute, index) => index === 0 || minute >= times[index - 1]!
      );

      expect(ascending, `${tripId} goes backwards in time`).toBe(true);
    }
  });

  /*
    THE ONE THE ASCENDING CHECK MISSES.

    A published timetable contains the occasional backwards typo. Treating it
    as a day boundary keeps the times ascending - so the check above stays
    green - while pushing that stop and every one after it 24 hours into the
    future, in a feed other systems consume as fact.

    A corridor trip takes about an hour. Nothing here legitimately spans six,
    so a trip that does is a typo that was honoured as midnight.
  */
  it("does not turn a backwards typo into a day-long trip", () => {
    const spans = new Map<string, { first: number; last: number }>();

    for (const row of stopTimes()) {
      const [hh, mm] = row[1]!.split(":");
      const minutes = Number(hh) * 60 + Number(mm);
      const seen = spans.get(row[0]!);

      spans.set(row[0]!, {
        first: seen ? Math.min(seen.first, minutes) : minutes,
        last: seen ? Math.max(seen.last, minutes) : minutes,
      });
    }

    for (const [tripId, { first, last }] of spans) {
      expect(
        last - first,
        `${tripId} spans ${(last - first) / 60} hours`
      ).toBeLessThan(6 * 60);
    }
  });

  it("passes midnight by continuing past 24:00 rather than wrapping", () => {
    const late = stopTimes().filter((row) => Number(row[1]!.split(":")[0]) >= 24);

    /*
      Not asserting that late trips EXIST - that would encode today's
      timetable. Asserting that if any do, they are expressed the way GTFS
      requires rather than wrapped.
    */
    expect(
      late.every((row) => /^2[4-9]:\d{2}:\d{2}$/.test(row[1]!))
    ).toBe(true);
  });
});

describe("the calendar", () => {
  const calendar = () => rows(built()["calendar.txt"]!);

  it("declares both service days", () => {
    expect(calendar().map((row) => row[0])).toEqual(["weekday", "weekend"]);
  });

  /*
    The flags have to agree with what the application itself thinks a weekend
    is, or a consumer plans a Saturday against the weekday timetable. Checked
    against `serviceOn` rather than restated, because a comment claiming they
    match is exactly what would rot.
  */
  it("agrees with the application about which days are which", () => {
    const flags = Object.fromEntries(
      calendar().map((row) => [row[0]!, row.slice(1, 8)])
    );

    /* A known Monday, then each following day. */
    for (let offset = 0; offset < 7; offset += 1) {
      const date = new Date(Date.UTC(2026, 0, 5 + offset, 6, 0, 0));
      const service = serviceOn(date);

      /* GTFS columns run Monday first; 5 Jan 2026 is a Monday. */
      expect(
        flags[service]?.[offset],
        `${service} should run on day ${offset}`
      ).toBe("1");
    }
  });

  it("carries the window it was given", () => {
    expect(calendar().every((row) => row[8] === "20260101")).toBe(true);
    expect(calendar().every((row) => row[9] === "20261231")).toBe(true);
  });
});

describe("csv safety", () => {
  /*
    Route headlines contain commas and parentheses. An unquoted comma splits
    one field into two and shifts every column after it, which a consumer
    reads as a different route entirely.
  */
  it("quotes a field containing a comma", () => {
    const feed = buildGtfsFeed(
      inputs({ agency: { ...agency, name: "Authority, The" } })
    );

    if (!feed.ok) throw new Error("expected a feed");

    expect(feed.files["agency.txt"]).toContain('"Authority, The"');
  });

  it("doubles an inner quote rather than breaking the field", () => {
    const feed = buildGtfsFeed(
      inputs({ agency: { ...agency, name: 'The "Fast" Line' } })
    );

    if (!feed.ok) throw new Error("expected a feed");

    expect(feed.files["agency.txt"]).toContain('"The ""Fast"" Line"');
  });

  it("leaves an ordinary field unquoted", () => {
    expect(built()["agency.txt"]).toContain("Fixture Transit Authority");
  });
});
