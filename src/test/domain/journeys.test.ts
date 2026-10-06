/**
 * The journeys a device remembers.
 *
 * The two rules worth protecting are that direction is part of a journey's
 * identity, and that the automatic list and the deliberate one behave
 * differently when they fill up: history may evict, a passenger's own choices
 * may not.
 */

import { describe, expect, it } from "vitest";
import {
  forgetJourney,
  isRealJourney,
  isSameJourney,
  isSaved,
  recordRecent,
  toggleSaved,
  type JourneyPair,
  type RecentJourney,
} from "@/domain/journeys";

const j = (from: string, to: string) =>
  ({ from, to }) as unknown as JourneyPair;

const pairs = (list: readonly JourneyPair[]) =>
  list.map((entry) => `${entry.from}>${entry.to}`);

describe("what counts as the same journey", () => {
  it("matches a pair travelled the same way round", () => {
    expect(isSameJourney(j("HNLU", "CBD"), j("HNLU", "CBD"))).toBe(true);
  });

  /*
    The reverse is a different journey: it leaves at different times, may run
    on a different pattern, and may not exist at all. Treating the pair as
    unordered would merge two entries into one.
  */
  it("does not match the reverse", () => {
    expect(isSameJourney(j("HNLU", "CBD"), j("CBD", "HNLU"))).toBe(false);
  });

  it("refuses a pair with the same stop at both ends", () => {
    expect(isRealJourney(j("CBD", "CBD"))).toBe(false);
    expect(isRealJourney(j("HNLU", "CBD"))).toBe(true);
  });
});

describe("remembering what was searched", () => {
  it("puts the newest first", () => {
    let recent: RecentJourney[] = [];

    recent = recordRecent(recent, j("HNLU", "CBD"), 1, 6);
    recent = recordRecent(recent, j("CBD", "Telibandha"), 2, 6);

    expect(pairs(recent)).toEqual(["CBD>Telibandha", "HNLU>CBD"]);
  });

  it("moves a repeated journey rather than listing it twice", () => {
    let recent: RecentJourney[] = [];

    recent = recordRecent(recent, j("HNLU", "CBD"), 1, 6);
    recent = recordRecent(recent, j("CBD", "Telibandha"), 2, 6);
    recent = recordRecent(recent, j("HNLU", "CBD"), 3, 6);

    expect(pairs(recent)).toEqual(["HNLU>CBD", "CBD>Telibandha"]);
    expect(recent[0]?.at).toBe(3);
  });

  it("keeps the reverse as its own entry", () => {
    let recent: RecentJourney[] = [];

    recent = recordRecent(recent, j("HNLU", "CBD"), 1, 6);
    recent = recordRecent(recent, j("CBD", "HNLU"), 2, 6);

    expect(recent).toHaveLength(2);
  });

  it("drops the oldest once it is full", () => {
    let recent: RecentJourney[] = [];

    for (let i = 0; i < 4; i += 1) {
      recent = recordRecent(recent, j(`A${i}`, "CBD"), i, 3);
    }

    expect(pairs(recent)).toEqual(["A3>CBD", "A2>CBD", "A1>CBD"]);
  });

  it("never records a journey that goes nowhere", () => {
    expect(recordRecent([], j("CBD", "CBD"), 1, 6)).toEqual([]);
  });

  it("can be told to forget one", () => {
    const recent = recordRecent(
      recordRecent([], j("HNLU", "CBD"), 1, 6),
      j("CBD", "Telibandha"),
      2,
      6
    );

    expect(pairs(forgetJourney(recent, j("HNLU", "CBD")))).toEqual([
      "CBD>Telibandha",
    ]);
  });
});

describe("saving a journey on purpose", () => {
  it("adds one, and removes it when asked again", () => {
    const once = toggleSaved([], j("HNLU", "CBD"), 20);
    expect(pairs(once)).toEqual(["HNLU>CBD"]);

    expect(toggleSaved(once, j("HNLU", "CBD"), 20)).toEqual([]);
  });

  it("reports whether a journey is saved", () => {
    const saved = toggleSaved([], j("HNLU", "CBD"), 20);

    expect(isSaved(saved, j("HNLU", "CBD"))).toBe(true);
    expect(isSaved(saved, j("CBD", "HNLU"))).toBe(false);
  });

  /*
    The difference from history. Everything in this list was put there
    deliberately, so making room would delete one of the passenger's own
    choices to store another they may not have meant to add.
  */
  it("refuses a new one when full rather than evicting an old one", () => {
    const saved = [j("A", "B"), j("C", "D")];

    const next = toggleSaved(saved, j("HNLU", "CBD"), 2);

    expect(pairs(next)).toEqual(["A>B", "C>D"]);
    expect(next).toHaveLength(saved.length);
  });

  it("still removes when full, so the list cannot become a trap", () => {
    const saved = [j("A", "B"), j("C", "D")];

    expect(pairs(toggleSaved(saved, j("A", "B"), 2))).toEqual(["C>D"]);
  });

  it("never saves a journey that goes nowhere", () => {
    expect(toggleSaved([], j("CBD", "CBD"), 20)).toEqual([]);
  });
});
