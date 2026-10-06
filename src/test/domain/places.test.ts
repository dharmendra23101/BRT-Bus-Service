import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PLACE_CATEGORIES,
  PLACES,
  findPlace,
  gettingThereFor,
  isInsideNavaRaipur,
  routeIdForPlace,
  searchPlaces,
} from "@/domain/places";
import { isNetworkRouteId } from "@/domain/transit/routes";
import { isStopName } from "@/domain/transit/stops";

describe("place data integrity", () => {
  it("names every place exactly once", () => {
    const names = PLACES.map((place) => place.name);

    expect(new Set(names).size).toBe(names.length);
  });

  it("points every place at a real stop", () => {
    const unknown = PLACES.filter((place) => !isStopName(place.nearestStop));

    expect(unknown).toEqual([]);
  });

  it("gives every place a known category", () => {
    const stray = PLACES.filter(
      (place) => !PLACE_CATEGORIES.includes(place.category)
    );

    expect(stray).toEqual([]);
  });

  it("leaves no category listed without a place", () => {
    const empty = PLACE_CATEGORIES.filter(
      (category) => !PLACES.some((place) => place.category === category)
    );

    expect(empty).toEqual([]);
  });

  it("reaches every place by a route the explorer can open", () => {
    for (const place of PLACES) {
      const routeId = routeIdForPlace(place);

      expect(routeId).not.toBeNull();
      expect(isNetworkRouteId(routeId)).toBe(true);
    }
  });
});

describe("searchPlaces", () => {
  it("returns everything when nothing is asked for", () => {
    expect(searchPlaces("", null)).toHaveLength(PLACES.length);
  });

  it("matches on part of a name, case-insensitively", () => {
    const results = searchPlaces("hospital", null);

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((place) => /hospital/i.test(place.name))).toBe(true);
  });

  it("narrows to a single category", () => {
    const results = searchPlaces("", "Education");

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((place) => place.category === "Education")).toBe(true);
  });

  it("applies the name and category filters together", () => {
    const results = searchPlaces("bhavan", "Government");

    expect(results.every((place) => place.category === "Government")).toBe(true);
    expect(results.every((place) => /bhavan/i.test(place.name))).toBe(true);
  });

  it("returns nothing when the filters exclude every place", () => {
    expect(searchPlaces("zzzz", null)).toEqual([]);
  });
});

/**
 * The data-quality suite.
 *
 * This is the differentiator, and it only counts because it is pointed at our
 * own dataset. The operator's listing has one coordinate roughly 90 km outside
 * Nava Raipur and three coordinate pairs shared between six institutions; we
 * reproduce those values exactly and mark them, rather than correcting them
 * into something that looks tidy and is invented.
 */
describe("what the data is allowed to claim", () => {
  const located = PLACES.filter(
    (place) => place.coordinates !== null && place.coordinateStatus !== "disputed"
  );

  it("keeps every point it presents as located inside Nava Raipur", () => {
    const escaped = located
      .filter((place) => !isInsideNavaRaipur(place.coordinates!))
      .map((place) => place.name);

    expect(escaped).toEqual([]);
  });

  /*
    The other half of the same rule, and the half that matters: a point outside
    the city is not deleted, it is labelled. Without this a future entry could
    pass the test above simply by having its coordinate dropped.
  */
  it("marks a point outside the city as disputed rather than dropping it", () => {
    const outside = PLACES.filter(
      (place) => place.coordinates !== null && !isInsideNavaRaipur(place.coordinates)
    );

    expect(outside.length).toBeGreaterThan(0);
    expect(outside.every((place) => place.coordinateStatus === "disputed")).toBe(true);
  });

  it("never presents two places at the same point", () => {
    const seen = new Map<string, string>();
    const collisions: string[] = [];

    for (const place of located) {
      const key = `${place.coordinates!.lat},${place.coordinates!.lng}`;
      const first = seen.get(key);

      if (first) collisions.push(`${first} / ${place.name}`);
      else seen.set(key, place.name);
    }

    expect(collisions).toEqual([]);
  });

  it("marks a shared point as disputed on both places, not just one", () => {
    const byPoint = new Map<string, string[]>();

    for (const place of PLACES) {
      if (!place.coordinates) continue;

      const key = `${place.coordinates.lat},${place.coordinates.lng}`;
      byPoint.set(key, [...(byPoint.get(key) ?? []), place.name]);
    }

    const shared = [...byPoint.values()].filter((names) => names.length > 1);

    expect(shared.length).toBeGreaterThan(0);

    const halfMarked = shared.filter((names) =>
      names.some(
        (name) =>
          PLACES.find((place) => place.name === name)!.coordinateStatus !== "disputed"
      )
    );

    expect(halfMarked).toEqual([]);
  });

  it("says why, wherever it says a point is disputed", () => {
    const silent = PLACES.filter(
      (place) => place.coordinateStatus === "disputed" && !place.coordinateNote
    ).map((place) => place.name);

    expect(silent).toEqual([]);
  });

  /*
    Nothing may claim `verified` until somebody has stood at the point. The
    corridor survey has not happened, so a `verified` here today would be a
    claim about fieldwork that was never done.
  */
  it("claims no coordinate is verified, because none has been", () => {
    expect(PLACES.filter((place) => place.coordinateStatus === "verified")).toEqual([]);
  });

  it("records where every entry came from, and when it was checked", () => {
    const unsourced = PLACES.filter(
      (place) => !place.source || !/^\d{4}-\d{2}-\d{2}$/.test(place.lastVerified)
    ).map((place) => place.name);

    expect(unsourced).toEqual([]);
  });

  /*
    Reusing a photograph without a licence is the single cheapest way to turn
    this project into a legal problem, so an image cannot exist without one.
  */
  it("licenses and attributes every image it ships", () => {
    const unlicensed = PLACES.filter(
      (place) => place.image && (!place.image.licence || !place.image.attribution)
    ).map((place) => place.name);

    expect(unlicensed).toEqual([]);
  });

  it("says whether a stop pairing came from the operator or from us", () => {
    const derived = PLACES.filter((place) => place.nearestStopSource === "registry");
    const published = PLACES.filter((place) => place.nearestStopSource === "operator");

    expect(derived.length).toBeGreaterThan(0);
    expect(published.length).toBeGreaterThan(0);
  });

  it("gives every place a stable, url-safe id used only once", () => {
    const ids = PLACES.map((place) => place.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((id) => !/^[a-z0-9-]+$/.test(id))).toEqual([]);
  });

  it("writes a description for every place", () => {
    const missing = PLACES.filter(
      (place) => place.description.trim().length < 40
    ).map((place) => place.name);

    expect(missing).toEqual([]);
  });
});

describe("how to get there, derived rather than written", () => {
  it("reads the stop, the routes and the service from the live registry", () => {
    const miraj = findPlace("miraj-cinema")!;
    const there = gettingThereFor(miraj);

    expect(there.stop).toBe("CBD");
    expect(there.routeIds).toContain("trunk");
    expect(there.scheduled).toBe(true);
    expect(there.stopSource).toBe("operator");
  });

  /*
    A stop can be on the published network and still have nothing scheduled to
    it. Offering a journey there would send a passenger to wait for a bus that
    is not coming.
  */
  it("reports a stop with no scheduled service as unreachable", () => {
    expect(gettingThereFor(findPlace("tribal-museum")!).scheduled).toBe(false);
  });
});

/*
  A page nothing links to from outside the app is a page nobody finds. Adding
  a place without adding its URL is the easy mistake, so the sitemap is
  derived-checked rather than trusted.
*/
describe("every place is discoverable", () => {
  it("appears in the sitemap", () => {
    const sitemap = readFileSync(
      join(process.cwd(), "public", "sitemap.xml"),
      "utf8"
    );

    const missing = PLACES.filter(
      (place) => !sitemap.includes(`/nearby/${place.id}<`)
    ).map((place) => place.id);

    expect(missing).toEqual([]);
  });

  it("lists no place URL the data no longer has", () => {
    const sitemap = readFileSync(
      join(process.cwd(), "public", "sitemap.xml"),
      "utf8"
    );

    const listed = [...sitemap.matchAll(/\/nearby\/([a-z0-9-]+)</g)].map((m) => m[1]!);
    const known = new Set(PLACES.map((place) => place.id));

    expect(listed.filter((id) => !known.has(id))).toEqual([]);
  });
});
