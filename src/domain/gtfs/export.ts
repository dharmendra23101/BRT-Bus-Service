/**
 * The published timetable, as a GTFS static feed.
 *
 * WHY THIS IS WORTH BUILDING. GTFS is the format every transit consumer
 * speaks - Google Maps, Transit, OpenTripPlanner, every journey planner
 * anyone would plug this corridor into. Today the timetable exists as a PDF
 * somebody typed up and as this repository's TypeScript. Neither is machine
 * readable by anybody else, which is why the corridor appears in no transit
 * app at all. This turns the authoritative timetable into the one artefact an
 * operator can hand to anyone.
 *
 * WHAT IT REFUSES TO DO, AND WHY THAT IS THE POINT.
 *
 * `stops.txt` requires `stop_lat` and `stop_lon`. The coordinates this
 * application ships are a generated lattice - useful for putting a marker
 * roughly on a map, and NOT a survey. Emitting them here would publish
 * fabricated geography inside a format whose entire purpose is that other
 * systems consume it as fact: a journey planner would route people to a point
 * on a road that has no bus stop on it.
 *
 * So coordinates are an INPUT, not a lookup. With none supplied the exporter
 * refuses and names every stop it is missing. That is a more useful artefact
 * for the operator conversation than a plausible feed would be - it says
 * "your timetable is already GTFS-shaped, and here is the single thing only
 * you can provide."
 *
 * The agency is an input for the same reason: the legal name and URL of the
 * body running the service are facts about somebody else, and guessing them
 * misattributes the service in every downstream system that ingests the feed.
 */

import { TICKET_RULES } from "@/constants/config";
import { ROUTE_IDS, getRoute, type RouteId } from "@/domain/transit/routes";
import { STOPS, type StopName } from "@/domain/transit/stops";
import { getAllTrips, type ServiceDay, type Trip } from "@/domain/transit/schedule";
import { TIMETABLE_SOURCE } from "@/domain/transit/timetable";

/** Where the service is run from, as the operator states it. */
export interface GtfsAgency {
  id: string;
  name: string;
  url: string;
  /** IANA zone, e.g. "Asia/Kolkata". GTFS rejects an offset. */
  timezone: string;
}

/**
 * Who publishes the FEED, which is not who runs the service.
 *
 * GTFS asks for both and they are different claims. The agency is the
 * operator; the feed publisher is whoever assembled this file. Naming the
 * operator in both would attribute our export to them, in every system that
 * ingests it - and this site says plainly elsewhere that it is not their
 * product and not affiliated with them.
 */
export interface GtfsFeedPublisher {
  name: string;
  url: string;
}

export interface GtfsCoordinate {
  lat: number;
  lng: number;
}

export interface GtfsInputs {
  agency: GtfsAgency;
  /** Whoever is publishing this feed. Not the operator - see the type. */
  feedPublisher: GtfsFeedPublisher;
  /**
   * Surveyed stop positions.
   *
   * Deliberately NOT defaulted to `STOP_COORDS`. Those are a lattice, and a
   * feed carrying them would send people to places no bus stops.
   */
  stopCoordinates: Partial<Record<StopName, GtfsCoordinate>>;
  /** Feed validity, as GTFS dates: YYYYMMDD. */
  startDate: string;
  endDate: string;
}

export type GtfsGap =
  | { kind: "AGENCY"; detail: string }
  | { kind: "FEED_WINDOW"; detail: string }
  | { kind: "FEED_PUBLISHER"; detail: string }
  | { kind: "STOP_COORDINATES"; detail: string; stops: StopName[] };

export type GtfsFeed =
  | { ok: true; files: Record<string, string> }
  | { ok: false; gaps: GtfsGap[] };

/** GTFS route_type 3 is a bus. */
const BUS = "3";

const GTFS_DATE = /^\d{8}$/;

/**
 * A stable id for a stop, derived from its name.
 *
 * Deliberately not a positional index: adding a stop to the registry would
 * renumber every stop after it, and a GTFS consumer that had cached the feed
 * would silently attach yesterday's times to today's wrong stops.
 */
export const gtfsStopId = (stop: StopName): string =>
  stop
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * A display time as GTFS seconds-past-midnight-of-the-service-day.
 *
 * Returns minutes so a caller can detect a rollover; formatting happens once
 * the whole trip is known.
 */
const minutesOf = (display: string): number | null => {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(display.trim());

  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const isPm = match[3]!.toUpperCase() === "PM";

  if (hour < 1 || hour > 12 || minute > 59) return null;

  const hours24 = (hour % 12) + (isPm ? 12 : 0);

  return hours24 * 60 + minute;
};

const asGtfsTime = (minutes: number): string => {
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");

  return `${hh}:${mm}:00`;
};

/**
 * A trip's calls as GTFS times, with midnight handled the way GTFS expects.
 *
 * A trip that departs at 11:40 PM and arrives at 12:10 AM does NOT wrap to
 * 00:10 - in GTFS it is 24:10:00, still on the service day it started.
 * Wrapping would place the arrival before the departure, and a planner
 * reading that either drops the trip or offers a journey arriving before it
 * leaves.
 *
 * BUT NOT EVERY BACKWARDS STEP IS MIDNIGHT. A published timetable contains
 * the occasional typo, and 11:55 going to 11:25 is one - treating it as a day
 * boundary would push that stop and everything after it 24 hours into the
 * future, in a feed other systems consume as fact.
 *
 * The domain already draws this line for ticket arrivals, at
 * `TICKET_RULES.MIDNIGHT_ROLLOVER_HOURS`: a gap larger than half a day is a
 * real crossing, and anything smaller is a mistake to clamp rather than
 * honour. The same constant is used here so the two cannot disagree about
 * what midnight means.
 */
const tripTimes = (trip: Trip): string[] | null => {
  const times: string[] = [];
  const rolloverMinutes = TICKET_RULES.MIDNIGHT_ROLLOVER_HOURS * 60;

  let previous = -1;
  let dayOffset = 0;

  for (const call of trip.calls) {
    const minutes = minutesOf(call.time);

    if (minutes === null) return null;

    let absolute = minutes + dayOffset;

    if (previous >= 0 && absolute < previous) {
      const backwards = previous - absolute;

      if (backwards > rolloverMinutes) {
        dayOffset += 24 * 60;
        absolute = minutes + dayOffset;
      } else {
        /*
          A typo, not a new day. Clamped to the previous call so the trip
          never travels backwards - the same choice `getArrivalAt` makes,
          and the honest one: we cannot know the intended time, only that
          this one cannot be right.
        */
        absolute = previous;
      }
    }

    times.push(asGtfsTime(absolute));
    previous = absolute;
  }

  return times;
};

/** RFC 4180: quote a field only when it needs it, and double inner quotes. */
const csvField = (value: string): string =>
  /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

const csv = (header: readonly string[], rows: readonly string[][]): string =>
  [header.join(","), ...rows.map((row) => row.map(csvField).join(","))].join("\n") +
  "\n";

/** GTFS direction_id: 0 and 1 are simply "the two ways along the corridor". */
const directionId = (trip: Trip): string =>
  trip.direction === "outbound" ? "0" : "1";

const SERVICE_DAYS: readonly ServiceDay[] = ["weekday", "weekend"];

/**
 * Which weekdays each service runs, matching `calendar.ts`.
 *
 * Stated here rather than imported because `isWeekendDay` is private to that
 * module - but the two must agree, and the test asserts they do rather than
 * trusting this comment.
 */
const SERVICE_DAY_FLAGS: Record<ServiceDay, string[]> = {
  //        mon  tue  wed  thu  fri  sat  sun
  weekday: ["1", "1", "1", "1", "1", "0", "0"],
  weekend: ["0", "0", "0", "0", "0", "1", "1"],
};

/** Stops any published trip actually calls at. */
const servedStops = (): StopName[] => {
  const seen = new Set<StopName>();

  for (const service of SERVICE_DAYS) {
    for (const trip of getAllTrips(service)) {
      for (const call of trip.calls) seen.add(call.stop);
    }
  }

  return STOPS.filter((stop) => seen.has(stop));
};

const missingCoordinates = (
  supplied: GtfsInputs["stopCoordinates"]
): StopName[] =>
  servedStops().filter((stop) => {
    const at = supplied[stop];

    return (
      !at ||
      typeof at.lat !== "number" ||
      typeof at.lng !== "number" ||
      !Number.isFinite(at.lat) ||
      !Number.isFinite(at.lng)
    );
  });

/**
 * Builds the feed, or explains exactly what is missing.
 *
 * Every file is derived from the authoritative timetable already in this
 * repository. Nothing here invents a route, a time, or a stop.
 */
export const buildGtfsFeed = (inputs: GtfsInputs): GtfsFeed => {
  const gaps: GtfsGap[] = [];
  const { agency, feedPublisher, stopCoordinates, startDate, endDate } = inputs;

  if (!agency?.name?.trim() || !agency?.url?.trim() || !agency?.timezone?.trim()) {
    gaps.push({
      kind: "AGENCY",
      detail:
        "The operator's name, public URL and IANA timezone are facts about " +
        "somebody else. Guessing them misattributes the service in every " +
        "system that ingests the feed.",
    });
  }

  if (!feedPublisher?.name?.trim() || !feedPublisher?.url?.trim()) {
    gaps.push({
      kind: "FEED_PUBLISHER",
      detail:
        "A feed names who published it, separately from who runs the buses. " +
        "Defaulting it to the operator would credit them with a file they " +
        "did not produce.",
    });
  }

  if (!GTFS_DATE.test(startDate) || !GTFS_DATE.test(endDate)) {
    gaps.push({
      kind: "FEED_WINDOW",
      detail: "A feed states the dates it is valid for, as YYYYMMDD.",
    });
  }

  const withoutCoordinates = missingCoordinates(stopCoordinates);

  if (withoutCoordinates.length > 0) {
    gaps.push({
      kind: "STOP_COORDINATES",
      detail:
        "GTFS requires a latitude and longitude for every stop, and this " +
        "application's coordinates are a generated lattice rather than a " +
        "survey. Publishing them would route passengers to places no bus " +
        "stops at.",
      stops: withoutCoordinates,
    });
  }

  if (gaps.length > 0) return { ok: false, gaps };

  const stops = servedStops();

  const stopRows = stops.map((stop) => {
    const at = stopCoordinates[stop]!;

    return [gtfsStopId(stop), stop, String(at.lat), String(at.lng)];
  });

  const routeRows = ROUTE_IDS.map((id: RouteId) => [
    id,
    agency.id,
    id,
    getRoute(id).headline,
    BUS,
  ]);

  const tripRows: string[][] = [];
  const stopTimeRows: string[][] = [];

  for (const service of SERVICE_DAYS) {
    for (const trip of getAllTrips(service)) {
      const times = tripTimes(trip);

      /*
        A trip whose times cannot be parsed is dropped rather than emitted
        with a guess. It cannot happen against the published timetable - the
        test asserts every trip converts - but a feed with one invented time
        in it is worse than a feed with one trip fewer.
      */
      if (!times) continue;

      tripRows.push([
        trip.routeId,
        service,
        trip.id,
        directionId(trip),
        getRoute(trip.routeId).headline,
      ]);

      trip.calls.forEach((call, index) => {
        stopTimeRows.push([
          trip.id,
          times[index]!,
          times[index]!,
          gtfsStopId(call.stop),
          String(index + 1),
        ]);
      });
    }
  }

  return {
    ok: true,
    files: {
      /*
        The dataset's own provenance. `feed_version` is the date the
        timetable was read, because that is what changes when the data
        changes - a version that never moves tells a consumer nothing about
        whether they are holding the current file.

        `feed_lang` is the language of the NAMES in this feed, not of the app.
        Stops and routes are carried in the form the operator publishes them,
        which is English, and that stays true however many languages the site
        is read in.
      */
      "feed_info.txt": csv(
        [
          "feed_publisher_name",
          "feed_publisher_url",
          "feed_lang",
          "feed_start_date",
          "feed_end_date",
          "feed_version",
        ],
        [
          [
            feedPublisher.name,
            feedPublisher.url,
            "en",
            startDate,
            endDate,
            TIMETABLE_SOURCE.extractedOn,
          ],
        ]
      ),
      "agency.txt": csv(
        ["agency_id", "agency_name", "agency_url", "agency_timezone"],
        [[agency.id, agency.name, agency.url, agency.timezone]]
      ),
      "stops.txt": csv(
        ["stop_id", "stop_name", "stop_lat", "stop_lon"],
        stopRows
      ),
      "routes.txt": csv(
        [
          "route_id",
          "agency_id",
          "route_short_name",
          "route_long_name",
          "route_type",
        ],
        routeRows
      ),
      "trips.txt": csv(
        ["route_id", "service_id", "trip_id", "direction_id", "trip_headsign"],
        tripRows
      ),
      "stop_times.txt": csv(
        [
          "trip_id",
          "arrival_time",
          "departure_time",
          "stop_id",
          "stop_sequence",
        ],
        stopTimeRows
      ),
      "calendar.txt": csv(
        [
          "service_id",
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday",
          "start_date",
          "end_date",
        ],
        SERVICE_DAYS.map((service) => [
          service,
          ...SERVICE_DAY_FLAGS[service],
          startDate,
          endDate,
        ])
      ),
    },
  };
};

/**
 * What an operator would have to supply to make the feed publishable.
 *
 * Separated from `buildGtfsFeed` so a screen can state the requirement
 * without pretending to attempt an export it knows will fail.
 */
export const gtfsRequirements = (): { stopsNeedingSurvey: StopName[] } => ({
  stopsNeedingSurvey: servedStops(),
});
