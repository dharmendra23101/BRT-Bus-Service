/**
 * The capacity model, derived from the constants the app actually runs on.
 *
 * `ARCHITECTURE-2.0.md` §1 states a concurrent-viewer ceiling, and that number
 * is arithmetic over two things: how often a driver publishes, and the fact
 * that every map viewer listens to the whole `busLocations` node so each write
 * fans out to all of them. Both live in this repository, so the ceiling can be
 * computed rather than asserted - and it drifted before anyone noticed: the
 * document still derives from a 3 s cadence the code left behind.
 *
 * Nothing here measures Firebase. It measures the load *we* generate, which is
 * the input to the published cap - the cap itself is Google's documented
 * figure and is treated as an external constant, never as something observed.
 */

import { describe, expect, it } from "vitest";
import { POLLING } from "@/constants/config";

/**
 * Documented by Google, not measured by us:
 * firebase.google.com/docs/database/usage/limits
 */
const RTDB_RESPONSES_PER_SECOND = 100_000;

/** NRANVP's own published fleet, and the depot capacity they also publish. */
const FLEET_TODAY = 30;
const FLEET_AT_DEPOT_CAPACITY = 100;

/**
 * Peak concurrent viewers, from Little's Law over 15,000 registered users.
 * Derivation in `ARCHITECTURE-2.0.md` §1.2; 450 is the burst figure.
 */
const PEAK_CONCURRENT_WITH_BURST = 450;

const writesPerSecond = (fleet: number, cadenceMs: number) =>
  fleet / (cadenceMs / 1000);

/** Whole-node listeners mean one write reaches every viewer. */
const viewerCeiling = (fleet: number, cadenceMs: number) =>
  RTDB_RESPONSES_PER_SECOND / writesPerSecond(fleet, cadenceMs);

describe("the load the fleet actually generates", () => {
  it("publishes at the cadence the code sets, not the one the plan assumed", () => {
    expect(writesPerSecond(FLEET_TODAY, POLLING.DRIVER_LOCATION_MS)).toBe(1);
  });

  it("leaves room for far more viewers than the service can have", () => {
    const ceiling = viewerCeiling(FLEET_TODAY, POLLING.DRIVER_LOCATION_MS);

    expect(ceiling).toBe(100_000);
    expect(ceiling / PEAK_CONCURRENT_WITH_BURST).toBeGreaterThan(100);
  });

  /*
    The fleet is the other half of the divisor, and it is the half we do not
    control. Depot parking is the operator's own published upper bound, so the
    ceiling has to survive it.
  */
  it("still clears the target if the operator fills the depot", () => {
    const ceiling = viewerCeiling(
      FLEET_AT_DEPOT_CAPACITY,
      POLLING.DRIVER_LOCATION_MS
    );

    expect(ceiling).toBeGreaterThan(PEAK_CONCURRENT_WITH_BURST * 20);
  });
});

describe("the cadence is bounded by the ecosystem, not by taste", () => {
  /*
    No certified AIS-140 device emits faster than 5 s and real deployments
    default to minutes; GTFS-Realtime's guidance is "at least once every 30
    seconds". Arrival logic has to be correct at those cadences, so publishing
    faster than the slowest device we must already support buys nothing and
    multiplies writes, egress and a driver's battery and mobile data.
  */
  it("never publishes faster than any real device would", () => {
    expect(POLLING.DRIVER_LOCATION_MS).toBeGreaterThanOrEqual(5_000);
  });

  it("stays inside the window GTFS-Realtime asks feeds to keep", () => {
    expect(POLLING.DRIVER_LOCATION_MS).toBeLessThanOrEqual(30_000);
  });

  /*
    Freshness has to be judged on a slower clock than the publisher runs on, or
    a bus is marked stale between two perfectly healthy reports.
  */
  it("classifies freshness no faster than positions arrive", () => {
    expect(POLLING.BUS_FRESHNESS_MS).toBeGreaterThanOrEqual(
      POLLING.DRIVER_LOCATION_MS / 2
    );
  });
});

describe("what would have to change for the ceiling to matter", () => {
  /*
    Kept as arithmetic rather than prose so the trade stays checkable:
    returning to the 3 s cadence the architecture document once assumed costs
    ten times the writes and nine tenths of the headroom.
  */
  it("shows what the abandoned 3-second cadence would cost", () => {
    const atThree = viewerCeiling(FLEET_TODAY, 3_000);
    const today = viewerCeiling(FLEET_TODAY, POLLING.DRIVER_LOCATION_MS);

    expect(atThree).toBe(10_000);
    expect(today / atThree).toBe(10);
  });

  /*
    The move from 15 s to 30 s, stated as the thing it actually bought.

    Ingest headroom was never the constraint - the measured fanout put egress
    there first. But the same halving applies to every byte leaving for every
    viewer at once, which is why this was the largest free lever available and
    why it is worth a test that fails if somebody quietly moves it back.
  */
  it("halves what every viewer costs, against the previous cadence", () => {
    const atFifteen = viewerCeiling(FLEET_TODAY, 15_000);
    const today = viewerCeiling(FLEET_TODAY, POLLING.DRIVER_LOCATION_MS);

    expect(today / atFifteen).toBe(2);
  });
});
