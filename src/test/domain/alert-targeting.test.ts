/**
 * Alert targeting.
 *
 * Two things are being protected here. The first is the AND/OR distinction,
 * which is easy to get backwards and silent when you do. The second, and the
 * one that matters more, is that every ambiguous case resolves towards showing
 * the notice: a passenger seeing one banner that is not about them costs a
 * moment, and a hidden disruption costs them the journey.
 */

import { describe, expect, it } from "vitest";
import {
  affectsScope,
  describeEntities,
  isGloballyScoped,
  isWithinWindow,
} from "@/domain/alerts/targeting";

describe("which passengers a notice is about", () => {
  it("reaches everyone when it names nothing", () => {
    expect(affectsScope(undefined, { stopIds: ["CBD"] })).toBe(true);
    expect(affectsScope([], { stopIds: ["CBD"] })).toBe(true);
  });

  it("joins the fields of one entity by AND", () => {
    const at101AndCbd = [{ routeId: "101", stopId: "CBD" }];

    expect(affectsScope(at101AndCbd, { routeIds: ["101"], stopIds: ["CBD"] })).toBe(true);
    expect(affectsScope(at101AndCbd, { routeIds: ["101"], stopIds: ["HNLU"] })).toBe(false);
    expect(affectsScope(at101AndCbd, { routeIds: ["102"], stopIds: ["CBD"] })).toBe(false);
  });

  it("joins separate entities by OR", () => {
    const either = [{ routeId: "101" }, { stopId: "CBD" }];

    expect(affectsScope(either, { routeIds: ["101"] })).toBe(true);
    expect(affectsScope(either, { stopIds: ["CBD"] })).toBe(true);
    expect(affectsScope(either, { routeIds: ["205"], stopIds: ["HNLU"] })).toBe(false);
  });

  it("does not confuse the two", () => {
    const and = [{ routeId: "101", stopId: "CBD" }];
    const or = [{ routeId: "101" }, { stopId: "CBD" }];
    const routeOnly = { routeIds: ["101"], stopIds: ["HNLU"] };

    expect(affectsScope(and, routeOnly)).toBe(false);
    expect(affectsScope(or, routeOnly)).toBe(true);
  });
});

describe("resolving doubt towards showing the notice", () => {
  it("treats an entity that selects nothing as affecting everyone", () => {
    expect(isGloballyScoped([{}])).toBe(true);
    expect(affectsScope([{}], {})).toBe(true);
  });

  it("still reaches everyone when one entity among several selects nothing", () => {
    expect(affectsScope([{ routeId: "101" }, {}], { routeIds: ["205"] })).toBe(true);
  });

  it("does not require a route this build has heard of", () => {
    const future = [{ routeId: "301" }];

    expect(affectsScope(future, { routeIds: ["301"] })).toBe(true);
    expect(affectsScope(future, { routeIds: ["101"] })).toBe(false);
  });

  it("matches a global notice against a scope that names nothing", () => {
    expect(affectsScope(undefined, {})).toBe(true);
  });
});

describe("when a notice is current", () => {
  const noon = 1_700_000_000_000;

  it("is current when it claims no dates at all", () => {
    expect(isWithinWindow({}, noon)).toBe(true);
  });

  it("waits for its start", () => {
    expect(isWithinWindow({ startsAt: noon + 1 }, noon)).toBe(false);
    expect(isWithinWindow({ startsAt: noon }, noon)).toBe(true);
  });

  it("stops on its own at the end", () => {
    expect(isWithinWindow({ endsAt: noon - 1 }, noon)).toBe(false);
    expect(isWithinWindow({ endsAt: noon }, noon)).toBe(true);
  });

  it("shows a notice whose dates are the wrong way round", () => {
    expect(isWithinWindow({ startsAt: noon + 1000, endsAt: noon - 1000 }, noon)).toBe(true);
  });
});

describe("telling a passenger what is affected", () => {
  it("says nothing for a notice about the whole network", () => {
    expect(describeEntities(undefined)).toEqual([]);
    expect(describeEntities([])).toEqual([]);
    expect(describeEntities([{}])).toEqual([]);
  });

  it("reads a combined entity as one place on one route", () => {
    expect(describeEntities([{ routeId: "101", stopId: "CBD" }])).toEqual([
      "Route 101 at CBD",
    ]);
  });

  it("lists each affected thing separately", () => {
    expect(describeEntities([{ routeId: "101" }, { stopId: "CBD" }])).toEqual([
      "Route 101",
      "CBD",
    ]);
  });
});
