/**
 * The one search across everything the corridor publishes.
 *
 * The behaviour worth protecting is that it never invents a match. Ranking
 * decides the order of real matches; it never promotes something that does not
 * contain what was typed, and it never corrects a query into a different one.
 */

import { describe, expect, it } from "vitest";
import { searchEverything } from "@/domain/search";
import { STOPS } from "@/domain/transit/stops";
import { hasScheduledService } from "@/domain/transit/schedule";
import { PLACES } from "@/domain/places";

const labels = (query: string) =>
  searchEverything(query).map((result) => result.label);

describe("what a search returns at all", () => {
  it("returns nothing before anything is typed", () => {
    expect(searchEverything("")).toEqual([]);
    expect(searchEverything("   ")).toEqual([]);
  });

  it("returns nothing rather than a guess when nothing matches", () => {
    expect(searchEverything("qzxvv")).toEqual([]);
  });

  it("finds a stop, a route and a place from their own names", () => {
    expect(labels("CBD")).toContain("CBD");
    expect(labels("Trunk")).toContain("Trunk Route");
    expect(labels("Route 101")).toContain("Route 101");

    const place = PLACES[0]!;
    expect(labels(place.name)).toContain(place.name);
  });

  it("does not care about case", () => {
    expect(labels("cbd")).toEqual(labels("CBD"));
  });

  it("respects the limit it is given", () => {
    expect(searchEverything("a", 3)).toHaveLength(3);
  });
});

describe("which match comes first", () => {
  it("puts an exact name above a longer one containing it", () => {
    const found = labels("CBD");

    expect(found[0]).toBe("CBD");
    expect(found).toContain("CBD Railway Station");
    expect(found.indexOf("CBD")).toBeLessThan(
      found.indexOf("CBD Railway Station")
    );
  });

  it("puts a name match above something matched only by its description", () => {
    const found = searchEverything("HNLU");

    expect(found[0]).toMatchObject({ kind: "stop", label: "HNLU" });
  });

  it("still finds a route by where it runs, not only by its number", () => {
    expect(labels("Raipur Railway Station")).toContain("Trunk Route");
  });
});

describe("what a result says about itself", () => {
  it("warns that a stop has no departures rather than implying it does", () => {
    const unserved = STOPS.find((stop) => !hasScheduledService(stop))!;

    const result = searchEverything(unserved).find(
      (entry) => entry.kind === "stop" && entry.label === unserved
    );

    expect(result?.detail).toBe("No departures yet");
  });

  it("names a route that serves a stop which has departures", () => {
    const served = STOPS.find((stop) => hasScheduledService(stop))!;

    const result = searchEverything(served).find(
      (entry) => entry.kind === "stop" && entry.label === served
    );

    expect(result?.detail).toMatch(/^Served by |^Has departures$/);
  });

  it("says where a place is, by the stop it is nearest", () => {
    const place = PLACES[0]!;

    const result = searchEverything(place.name).find(
      (entry) => entry.kind === "place" && entry.id === place.id
    );

    expect(result?.detail).toContain(place.nearestStop);
  });

  it("carries an identity its own registry recognises, not a URL", () => {
    for (const result of searchEverything("CBD")) {
      expect(result.id).not.toContain("/");
    }
  });
});
