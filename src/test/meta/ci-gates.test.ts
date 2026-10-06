/**
 * The gates CI runs, checked against the gates `npm run verify` runs.
 *
 * The README states three times that `npm run verify` is "exactly what CI
 * runs, in the same order". That was untrue: CI ran four gates and `verify`
 * ran six, so `typecheck:domain` and `test:domain` - the domain project that
 * is the entire portability guarantee - were never enforced on a push. A
 * contributor could land a domain module that reaches for `window`, watch CI
 * go green, and only discover it when someone ran the full sequence locally.
 *
 * Nothing detects that drift by reading either file alone, because each is
 * correct on its own terms. So this compares them.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};

/** The gate names in `verify`, in order: "npm run typecheck && ..." */
const verifyGates = (packageJson.scripts.verify ?? "")
  .split("&&")
  .map((step) => step.trim().replace(/^npm run /, ""))
  .filter(Boolean);

/** The gate names CI invokes, in the order its steps declare them. */
const ciGates = [
  ...readFileSync(".github/workflows/ci.yml", "utf8").matchAll(
    /^\s+run: npm run (\S+)/gm
  ),
].map((match) => match[1]!);

describe("the gates a push is actually held to", () => {
  it("names some gates at all", () => {
    expect(verifyGates.length).toBeGreaterThan(0);
    expect(ciGates.length).toBeGreaterThan(0);
  });

  /*
    Every gate, not merely the count - a swap would keep the count identical
    while dropping the one that mattered.
  */
  it("runs every gate in verify", () => {
    for (const gate of verifyGates) {
      expect(ciGates, `CI never runs "npm run ${gate}"`).toContain(gate);
    }
  });

  /*
    The README's claim is "in the same order", and order is not decoration
    here: a cheap gate ahead of an expensive one is what makes a red run
    cheap to read.
  */
  it("runs them in the order verify declares", () => {
    expect(ciGates.filter((gate) => verifyGates.includes(gate))).toEqual(
      verifyGates
    );
  });

  /*
    The two that were missing, named outright. If the domain project is ever
    dropped from CI again, this says so in the failure message rather than
    leaving a future reader to diff two files.
  */
  it("enforces the domain project, which the main suite cannot", () => {
    expect(ciGates).toContain("typecheck:domain");
    expect(ciGates).toContain("test:domain");
  });
});
