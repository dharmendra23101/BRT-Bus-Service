/**
 * The operator's published figures.
 *
 * These tests do not check that the numbers are right - nobody in this repo
 * can, and the source has been unreachable since August. They check the two
 * things we control: that a figure we reproduce stays attributable to whoever
 * published it, and that a number we counted ourselves never gets presented as
 * one of theirs.
 */

import { describe, expect, it } from "vitest";
import {
  OPERATOR,
  OPERATOR_SOURCE,
  SERVICE_FACTS,
  INFRASTRUCTURE_FACTS,
  PUBLISHED_STOPS,
  type OperatorFact,
} from "@/domain/transit/operator";
import { STOPS } from "@/domain/transit/stops";
import { SCHEDULED_STOPS } from "@/domain/transit/schedule";

const ALL_FACTS: readonly (readonly [string, readonly OperatorFact[]])[] = [
  ["service", SERVICE_FACTS],
  ["infrastructure", INFRASTRUCTURE_FACTS],
  ["published stops", PUBLISHED_STOPS],
];

describe("citing the operator", () => {
  it("names who published the figures", () => {
    expect(OPERATOR.name).toBe("Nava Raipur Atal Nagar Vikas Pradhikaran");
    expect(OPERATOR.abbreviation).toBe("NRANVP");
  });

  it("records where each figure was read, and when", () => {
    expect(OPERATOR_SOURCE.publication).not.toBe("");
    expect(OPERATOR_SOURCE.url).toMatch(/^https?:\/\//);
    expect(OPERATOR_SOURCE.retrievedOn).not.toBe("");
  });

  it("records that the source can no longer be checked", () => {
    expect(OPERATOR_SOURCE.reachableAtRetrieval).toBe(true);
    expect(OPERATOR_SOURCE.unreachableSince).not.toBe("");
  });
});

describe("keeping their figures apart from ours", () => {
  it("attributes no count we derived from our own registry", () => {
    const ours = [String(STOPS.length), String(SCHEDULED_STOPS.size)];

    for (const [group, facts] of ALL_FACTS) {
      for (const { label, value } of facts) {
        expect(
          ours,
          `${group} fact "${label}" reports one of our own counts`
        ).not.toContain(value.trim());
      }
    }
  });

  it("publishes no stop total the operator never gave", () => {
    expect(PUBLISHED_STOPS.map(({ label }) => label)).not.toContain("Total stops");
  });
});

describe("the shape a fact list has to hold", () => {
  it("labels every figure exactly once", () => {
    for (const [group, facts] of ALL_FACTS) {
      const labels = facts.map(({ label }) => label);

      expect(new Set(labels).size, `${group} repeats a label`).toBe(labels.length);
    }
  });

  it("leaves no figure without a value", () => {
    for (const [, facts] of ALL_FACTS) {
      for (const { label, value } of facts) {
        expect(value.trim(), `${label} has no value`).not.toBe("");
      }
    }
  });

  it("keeps the qualification the frequency figure was published with", () => {
    const frequency = SERVICE_FACTS.find(({ label }) => label === "Frequency");

    expect(frequency?.caveat).toBeTruthy();
  });
});
