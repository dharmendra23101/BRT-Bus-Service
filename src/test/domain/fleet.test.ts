/**
 * The fleet telemetry platform.
 *
 * Almost every assertion here corresponds to something a real published feed
 * actually does, not to something a well-behaved device would do. The
 * expensive failures in this area are silent: a units mistake does not throw,
 * it just empties the map.
 */

import { describe, expect, it } from "vitest";
import { POLLING } from "@/constants/config";
import {
  emptyTelemetry,
  effectiveTimestamp,
  hasPosition,
  type VehicleTelemetry,
} from "@/domain/fleet/telemetry";
import {
  DEFAULT_FRESHNESS,
  STATE_DESCRIPTIONS,
  STATE_LABELS,
  classify,
  classifyAll,
  countByState,
  isPassengerVisible,
  type VehicleState,
} from "@/domain/fleet/state";
import {
  SERVICE_AREA,
  TELEMETRY_LIMITS,
  acceptTelemetry,
  createTelemetryGate,
} from "@/domain/fleet/validation";
import {
  fromDriverRecord,
  fromGtfsRealtime,
  type GtfsRealtimeFeed,
} from "@/domain/fleet/adapters";
import { en } from "@/domain/i18n/en";
import { hi } from "@/domain/i18n/hi";
import {
  INTERRUPTION_TOLERANCE,
  SHARING_MESSAGES,
  interruptionReason,
  sharingHealth,
} from "@/domain/fleet/sharing";
import {
  SIMULATED_FEED_SOURCE,
  advance,
  createFleet,
  isSimulatorPermitted,
  toTelemetry,
} from "@/domain/fleet/simulator";

const NOW = Date.UTC(2026, 7, 28, 6, 0, 0);

const at = (vehicleId: string, observedAt: number | null): VehicleTelemetry => ({
  ...emptyTelemetry(vehicleId, NOW, "test"),
  observedAt,
});

describe("the normalized contract", () => {
  it("starts every optional field explicitly absent", () => {
    const telemetry = emptyTelemetry("BUS-1", NOW, "test");

    expect(telemetry.lat).toBeNull();
    expect(telemetry.observedAt).toBeNull();
    expect(telemetry.routeId).toBeNull();
    expect(telemetry.receivedAt).toBe(NOW);
  });

  /*
    We have no occupancy sensor of any kind. A default of anything else would
    be a fabricated number printed beside the operator's real fare chart.
  */
  it("never guesses how full a bus is", () => {
    expect(emptyTelemetry("BUS-1", NOW, "test").occupancy).toBe("UNKNOWN");
  });

  it("falls back to our receive clock when the vehicle gave no time", () => {
    expect(effectiveTimestamp(at("BUS-1", null))).toBe(NOW);
    expect(effectiveTimestamp(at("BUS-1", 123))).toBe(123);
  });

  it("narrows a record that actually carries a position", () => {
    expect(hasPosition(emptyTelemetry("BUS-1", NOW, "test"))).toBe(false);
    expect(
      hasPosition({ ...emptyTelemetry("BUS-1", NOW, "test"), lat: 21.1, lng: 81.8 })
    ).toBe(true);
  });
});

describe("how fresh a vehicle is", () => {
  const stateAt = (ageMs: number): VehicleState =>
    classify(at("BUS-1", NOW - ageMs), NOW).state;

  it("walks the ladder as the position ages", () => {
    expect(stateAt(0)).toBe("LIVE");
    expect(stateAt(DEFAULT_FRESHNESS.liveMs)).toBe("LIVE");
    expect(stateAt(DEFAULT_FRESHNESS.liveMs + 1)).toBe("RECENT");
    expect(stateAt(DEFAULT_FRESHNESS.recentMs)).toBe("RECENT");
    expect(stateAt(DEFAULT_FRESHNESS.recentMs + 1)).toBe("STALE");
    expect(stateAt(DEFAULT_FRESHNESS.staleMs)).toBe("STALE");
    expect(stateAt(DEFAULT_FRESHNESS.staleMs + 1)).toBe("OFFLINE");
  });

  /*
    THE BUG THIS REPLACES. A record with no timestamp used to be treated as
    fresh forever - an immortal phantom bus on a public map, and a test was
    protecting it.
  */
  it("does not treat a record with no timestamp as live forever", () => {
    const noTime: VehicleTelemetry = {
      ...emptyTelemetry("BUS-GHOST", 0, "test"),
      observedAt: null,
    };

    expect(classify(noTime, NOW).state).toBe("UNKNOWN");
    expect(classify(noTime, NOW).ageMs).toBeNull();
  });

  it("refuses to call a position from the future the freshest of all", () => {
    expect(classify(at("BUS-1", NOW + 60_000), NOW).state).toBe("UNKNOWN");
  });

  /*
    The whole reason this is a classification rather than a filter: an offline
    bus stays in the list carrying the reason it is not being drawn.
  */
  it("keeps an offline vehicle rather than deleting it", () => {
    const fleet = classifyAll(
      [at("BUS-1", NOW), at("BUS-2", NOW - 600_000)],
      NOW
    );

    expect(fleet).toHaveLength(2);
    expect(fleet.map((vehicle) => vehicle.state)).toEqual(["LIVE", "OFFLINE"]);
  });

  it("shows a stale position rather than telling a waiting passenger nothing", () => {
    expect(isPassengerVisible(classify(at("BUS-1", NOW - 200_000), NOW))).toBe(true);
    expect(isPassengerVisible(classify(at("BUS-1", NOW - 600_000), NOW))).toBe(false);
  });

  it("counts the fleet by state for the operator", () => {
    const counts = countByState(
      classifyAll([at("A", NOW), at("B", NOW), at("C", NOW - 600_000)], NOW)
    );

    expect(counts.LIVE).toBe(2);
    expect(counts.OFFLINE).toBe(1);
    expect(counts.STALE).toBe(0);
  });

  /*
    Colour cannot carry these: the design research measured on-time against
    delayed at a luminance ratio of 1.05. Every state has words at the point of
    definition so no screen has to invent its own.
  */
  it("gives every state a label and an explanation", () => {
    for (const state of Object.keys(STATE_LABELS) as VehicleState[]) {
      for (const catalogue of [en, hi]) {
        expect(catalogue[STATE_LABELS[state]].length, state).toBeGreaterThan(0);
        expect(
          catalogue[STATE_DESCRIPTIONS[state]].length,
          state
        ).toBeGreaterThan(10);
      }
    }
  });

  it("takes a slower ladder for a fleet that reports slowly", () => {
    const slow = { liveMs: 120_000, recentMs: 300_000, staleMs: 900_000 };

    // The same position, judged by two fleets with different reporting rates.
    expect(classify(at("BUS-1", NOW - 100_000), NOW, slow).state).toBe("LIVE");
    expect(classify(at("BUS-1", NOW - 100_000), NOW).state).toBe("STALE");
  });
});

describe("what telemetry has to survive to be believed", () => {
  it("rejects a timestamp further ahead than the reference validator allows", () => {
    const gate = createTelemetryGate();

    expect(
      gate.accept(at("BUS-1", NOW + TELEMETRY_LIMITS.FUTURE_TOLERANCE_MS + 1), NOW)
        .rejections
    ).toContain("future-timestamp");

    expect(
      gate.accept(at("BUS-2", NOW + TELEMETRY_LIMITS.FUTURE_TOLERANCE_MS), NOW).accepted
    ).toBe(true);
  });

  /*
    The lower bound was missing entirely, which is how a seconds-vs-
    milliseconds mistake gets through: it lands in 1970 and reads as merely
    very stale rather than as broken.
  */
  it("rejects a timestamp from an implausible past", () => {
    const gate = createTelemetryGate();

    expect(gate.accept(at("BUS-1", 1_756_000), NOW).rejections).toContain(
      "implausible-age"
    );
  });

  it("rejects the null island sentinel", () => {
    const gate = createTelemetryGate();
    const sentinel = { ...at("BUS-1", NOW), lat: 0, lng: 0 };

    expect(gate.accept(sentinel, NOW).rejections).toContain("null-island");
  });

  it("accepts a repeated timestamp so a retry stays idempotent", () => {
    const gate = createTelemetryGate();

    expect(gate.accept(at("BUS-1", NOW - 1000), NOW).accepted).toBe(true);
    expect(gate.accept(at("BUS-1", NOW - 1000), NOW).accepted).toBe(true);
  });

  it("rejects a timestamp that goes backwards", () => {
    const gate = createTelemetryGate();

    gate.accept(at("BUS-1", NOW - 1000), NOW);

    expect(gate.accept(at("BUS-1", NOW - 5000), NOW).rejections).toContain(
      "regressed-timestamp"
    );
  });

  const positioned = (
    vehicleId: string,
    observedAt: number,
    lat: number,
    lng: number
  ): VehicleTelemetry => ({ ...at(vehicleId, observedAt), lat, lng });

  /*
    THE HALF OF THE GATE THAT MATTERS. At a 3 s sampling interval, ordinary GPS
    scatter alone produces an apparent 238.8 km/h, so a naive
    distance-over-time check fires continuously on a PARKED bus.
  */
  it("does not call GPS scatter on a stationary bus an impossible jump", () => {
    const gate = createTelemetryGate();

    gate.accept(positioned("BUS-1", NOW - 20_000, 21.1, 81.8), NOW);

    // ~11 m away after 12 s: 3.3 km/h of real movement, but a large enough
    // apparent speed to trip a single-term gate at a short interval.
    const verdict = gate.accept(
      positioned("BUS-1", NOW - 8_000, 21.1001, 81.8),
      NOW
    );

    expect(verdict.accepted).toBe(true);
  });

  it("rejects a genuine teleport", () => {
    const gate = createTelemetryGate();

    gate.accept(positioned("BUS-1", NOW - 30_000, 21.1, 81.8), NOW);

    const verdict = gate.accept(
      positioned("BUS-1", NOW - 15_000, 21.9, 82.6),
      NOW
    );

    expect(verdict.rejections).toContain("impossible-jump");
  });

  /*
    A single wild fix is a glitch. A second one, still far from the old
    baseline, means the bus really is over there - after a tunnel, or a long
    signal outage. Without the recovery, one bad fix quarantines a vehicle for
    the rest of its shift.
  */
  it("believes the second consecutive jump and re-baselines", () => {
    const gate = createTelemetryGate();

    gate.accept(positioned("BUS-1", NOW - 40_000, 21.1, 81.8), NOW);

    expect(
      gate.accept(positioned("BUS-1", NOW - 25_000, 21.9, 82.6), NOW).accepted
    ).toBe(false);
    expect(
      gate.accept(positioned("BUS-1", NOW - 10_000, 21.91, 82.61), NOW).accepted
    ).toBe(true);
  });

  it("does not judge speed over a window too short to measure it", () => {
    const gate = createTelemetryGate();

    gate.accept(positioned("BUS-1", NOW - 12_000, 21.1, 81.8), NOW);

    // 5 s apart: below the window where a speed estimate means anything.
    expect(
      gate.accept(positioned("BUS-1", NOW - 7_000, 21.9, 82.6), NOW).accepted
    ).toBe(true);
  });

  it("counts rejections for the operator's feed-health view", () => {
    const gate = createTelemetryGate();

    gate.accept(at("BUS-1", NOW + 999_999), NOW);
    gate.accept({ ...at("BUS-2", NOW), lat: 0, lng: 0 }, NOW);

    expect(gate.rejectionCounts()["future-timestamp"]).toBe(1);
    expect(gate.rejectionCounts()["null-island"]).toBe(1);
  });

  it("never renders two markers for one vehicle", () => {
    const gate = createTelemetryGate();

    const accepted = acceptTelemetry(
      gate,
      [
        { ...at("BUS-1", NOW - 5000), receivedAt: NOW - 5000 },
        { ...at("BUS-1", NOW), receivedAt: NOW },
      ],
      NOW
    );

    expect(accepted).toHaveLength(1);
    expect(accepted[0]!.observedAt).toBe(NOW);
  });

  /*
    THE TRAP IN THE OBVIOUS FIRST TASK. A bounding box derived from
    `STOP_COORDS` would reject 100% of real telemetry from a real bus and
    accept every fabricated position - a validation layer that admits only
    invented data. The box is designed and deliberately switched off.
  */
  it("does not yet apply a service-area box, because ours would reject real buses", () => {
    expect(SERVICE_AREA.applyServiceArea).toBe(false);

    const gate = createTelemetryGate();
    const realNavaRaipur = {
      ...at("BUS-1", NOW),
      lat: 21.1049,
      lng: 81.7728,
    };

    expect(gate.accept(realNavaRaipur, NOW).accepted).toBe(true);
  });
});

describe("mapping a driver's phone onto the contract", () => {
  it("carries the position and the route it reports", () => {
    const telemetry = fromDriverRecord(
      "uid-1",
      { busId: "BUS-7A2C", lat: 21.1, lng: 81.8, updatedAt: NOW, routeId: "101" },
      NOW
    );

    expect(telemetry.vehicleId).toBe("BUS-7A2C");
    expect(telemetry.routeId).toBe("101");
    expect(telemetry.feedSource).toBe("rtdb-driver");
    expect(telemetry.simulated).toBe(false);
  });

  it("refuses to coerce a route the network does not publish", () => {
    const telemetry = fromDriverRecord(
      "uid-1",
      { lat: 21.1, lng: 81.8, updatedAt: NOW, routeId: "999" },
      NOW
    );

    // The raw string is kept so a mismatch can be traced; the id is not faked.
    expect(telemetry.routeRef).toBe("999");
    expect(telemetry.routeId).toBeNull();
  });

  it("maps a missing timestamp to absent, not to now", () => {
    expect(fromDriverRecord("uid-1", { lat: 21.1, lng: 81.8 }, NOW).observedAt).toBeNull();
  });
});

describe("mapping GTFS-Realtime onto the contract", () => {
  const feed = (
    vehicle: NonNullable<NonNullable<GtfsRealtimeFeed["entity"]>[number]["vehicle"]>,
    header?: number
  ): GtfsRealtimeFeed => ({
    header: header === undefined ? undefined : { timestamp: header },
    entity: [{ id: "e1", vehicle }],
  });

  /*
    THE MOST EXPENSIVE MISTAKE AVAILABLE. GTFS-Realtime publishes POSIX
    SECONDS. Missing the conversion does not throw - every bus reads as 56
    years stale and the map empties with nothing logged anywhere.
  */
  it("converts seconds to milliseconds exactly once", () => {
    const seconds = Math.floor(NOW / 1000);
    const [telemetry] = fromGtfsRealtime(
      feed({ vehicle: { id: "V1" }, timestamp: seconds }),
      NOW
    );

    expect(telemetry!.observedAt).toBe(seconds * 1000);
    expect(NOW - telemetry!.observedAt!).toBeLessThan(1000);
  });

  /*
    `position` is optional in the proto, and agencies really do publish
    vehicles without one - hundreds of entities in a single real feed.
  */
  it("survives an entity with no position at all", () => {
    const [telemetry] = fromGtfsRealtime(
      feed({ vehicle: { id: "V1" }, position: null, timestamp: 1_756_000_000 }),
      NOW
    );

    expect(telemetry!.lat).toBeNull();
    expect(telemetry!.positionSource).toBe("UNKNOWN");
  });

  it("falls back to the feed header when the vehicle carries no time", () => {
    const [telemetry] = fromGtfsRealtime(
      feed({ vehicle: { id: "V1" } }, Math.floor(NOW / 1000)),
      NOW
    );

    expect(telemetry!.observedAt).toBe(Math.floor(NOW / 1000) * 1000);
  });

  it("never decays a missing timestamp to the epoch", () => {
    const [telemetry] = fromGtfsRealtime(feed({ vehicle: { id: "V1" } }), NOW);

    expect(telemetry!.observedAt).toBeNull();
    expect(effectiveTimestamp(telemetry!)).toBe(NOW);
  });

  it("keeps the operator's route string and maps the id only when asked", () => {
    const [unmapped] = fromGtfsRealtime(
      feed({ vehicle: { id: "V1" }, trip: { routeId: "DL-42" } }),
      NOW
    );

    expect(unmapped!.routeRef).toBe("DL-42");
    expect(unmapped!.routeId).toBeNull();

    const [mapped] = fromGtfsRealtime(
      feed({ vehicle: { id: "V1" }, trip: { routeId: "DL-42" } }),
      NOW,
      { mapRoute: (ref) => (ref === "DL-42" ? "101" : null) }
    );

    expect(mapped!.routeId).toBe("101");
  });

  it("drops an entity with no usable vehicle id", () => {
    expect(
      fromGtfsRealtime({ entity: [{ vehicle: { trip: { routeId: "1" } } }] }, NOW)
    ).toEqual([]);
  });

  it("ignores a status or occupancy value outside the enum", () => {
    const [telemetry] = fromGtfsRealtime(
      feed({
        vehicle: { id: "V1" },
        currentStatus: "TELEPORTING",
        occupancyStatus: "VERY_FULL",
      }),
      NOW
    );

    expect(telemetry!.vehicleStatus).toBeNull();
    expect(telemetry!.occupancy).toBe("UNKNOWN");
  });
});

describe("the fleet simulator", () => {
  const options = { fleetSize: 25, routeIds: ["101", "102"] as const, seed: 7 };

  it("runs the fleet sizes the plan calls for", () => {
    for (const fleetSize of [10, 25, 50, 100]) {
      expect(createFleet({ ...options, fleetSize }).vehicles).toHaveLength(fleetSize);
    }
  });

  /*
    Every surface that draws one of these has to be able to say so. An
    unlabelled synthetic bus beside the operator's real fare chart is a
    fabricated claim about a real service.
  */
  it("marks every vehicle it produces as simulated", () => {
    const telemetry = toTelemetry(createFleet(options), NOW);

    expect(telemetry.every((vehicle) => vehicle.simulated)).toBe(true);
    expect(telemetry.every((vehicle) => vehicle.feedSource === SIMULATED_FEED_SOURCE)).toBe(true);
    expect(telemetry.every((vehicle) => vehicle.vehicleId.startsWith("SIM-"))).toBe(true);
  });

  /*
    It reports where it is topologically - route and next stop - and NOT a
    coordinate, because the only coordinates available to invent from are the
    synthetic lattice.
  */
  it("reports no coordinates at all", () => {
    const telemetry = toTelemetry(createFleet(options), NOW);

    expect(telemetry.every((vehicle) => vehicle.lat === null)).toBe(true);
    expect(telemetry.every((vehicle) => vehicle.stopRef !== null)).toBe(true);
  });

  it("produces the same run every time, from the same seed", () => {
    expect(createFleet(options)).toEqual(createFleet(options));
    expect(createFleet({ ...options, seed: 8 })).not.toEqual(createFleet(options));
  });

  it("advances every vehicle along its route", () => {
    let state = createFleet(options);

    for (let i = 0; i < 10; i += 1) state = advance(state, options);

    expect(state.tick).toBe(10);
    expect(state.vehicles.every((vehicle) => vehicle.progress >= 0 && vehicle.progress < 1)).toBe(true);
  });

  /*
    Its output has to survive the same gate a real device's does, or the
    simulator is exercising a path production never takes.
  */
  it("emits telemetry the real validator accepts", () => {
    const gate = createTelemetryGate();
    const accepted = acceptTelemetry(gate, toTelemetry(createFleet(options), NOW), NOW);

    expect(accepted).toHaveLength(options.fleetSize);
  });

  it("classifies as live at the moment it reports", () => {
    const fleet = classifyAll(toTelemetry(createFleet(options), NOW), NOW);

    expect(fleet.every((vehicle) => vehicle.state === "LIVE")).toBe(true);
  });

  it("is switched off in a production build unless deliberately enabled", () => {
    expect(isSimulatorPermitted({ DEV: true })).toBe(true);
    expect(isSimulatorPermitted({ DEV: false })).toBe(false);
    expect(isSimulatorPermitted({})).toBe(false);
    expect(
      isSimulatorPermitted({ DEV: false, VITE_ENABLE_FLEET_SIMULATOR: "true" })
    ).toBe(true);
    expect(
      isSimulatorPermitted({ DEV: false, VITE_ENABLE_FLEET_SIMULATOR: "1" })
    ).toBe(false);
  });
});

/*
  The noise floor, isolated.

  At the default ten-second window the two terms of the gate are redundant:
  100 km/h sustained for 10 s is 278 m, so anything fast enough already clears
  the 250 m floor. Shorten the window for a device reporting every few seconds
  - permitted under AIS-140, and the change most likely to be made - and the
  floor becomes the only thing standing between a parked bus and a permanent
  "impossible jump".
*/
describe("the noise floor, once the window is short enough to need it", () => {
  const fastGate = () =>
    createTelemetryGate({ ...TELEMETRY_LIMITS, MIN_WINDOW_MS: 3_000 });

  const fix = (observedAt: number, lat: number): VehicleTelemetry => ({
    ...at("BUS-PARKED", observedAt),
    lat,
    lng: 81.8,
  });

  it("holds a stationary bus whose scatter reads as 238 km/h", () => {
    const gate = fastGate();

    gate.accept(fix(NOW - 6_000, 21.1), NOW);

    // ~200 m of apparent movement in 3 s: 240 km/h, under the 250 m floor.
    const verdict = gate.accept(fix(NOW - 3_000, 21.1018), NOW);

    expect(verdict.accepted).toBe(true);
  });

  it("still catches a real teleport at the same window", () => {
    const gate = fastGate();

    gate.accept(fix(NOW - 6_000, 21.1), NOW);

    expect(gate.accept(fix(NOW - 3_000, 21.15), NOW).rejections).toContain(
      "impossible-jump"
    );
  });
});

/**
 * Whether the driver's position is actually reaching anyone.
 *
 * The driver screen used to answer this from the Start button - a claim about
 * intent. A browser clamps timers in a background tab and suspends its
 * geolocation, so a driver who switched apps saw a green "sharing" light while
 * nothing was being published, and passengers watched the bus go stale with no
 * explanation.
 */
describe("whether sharing is actually happening", () => {
  /*
    The cadence the app actually runs at, not a sample of one. `sharingHealth`
    is interval-agnostic by design - the test below proves that separately -
    but the tolerance is only meaningful against the real configured value,
    and a local constant is how these comments drift out of step with it.
  */
  const INTERVAL = POLLING.DRIVER_LOCATION_MS;

  it("says nothing is happening when nothing was asked for", () => {
    expect(sharingHealth(false, NOW, NOW, INTERVAL)).toBe("idle");
  });

  /*
    A cold geolocation fix can take several seconds. Calling that an
    interruption would light a warning on every single shift start.
  */
  it("does not call the first fix an interruption", () => {
    expect(sharingHealth(true, null, NOW, INTERVAL)).toBe("sharing");
  });

  it("believes a publish that landed on schedule", () => {
    expect(sharingHealth(true, NOW - INTERVAL, NOW, INTERVAL)).toBe("sharing");
  });

  /*
    A whole missed publish is an interruption, and saying so is not crying
    wolf: the position really has stopped reaching passengers by then. At the
    30 s cadence the tolerance is 45 s, the same as the LIVE boundary, so the
    driver is told at the moment passengers stop seeing them as live.
  */
  it("calls a missed publish what it is", () => {
    expect(sharingHealth(true, NOW - INTERVAL * 2, NOW, INTERVAL)).toBe(
      "interrupted"
    );
  });

  /*
    THE DEFECT this exists for. Browsers clamp a background tab's timers to
    roughly a minute, so a driver who switches apps keeps publishing - just
    far too slowly - and the old indicator went on showing a green light.

    It is also why the tolerance is 1.5 intervals rather than 2.5. At a 15 s
    cadence 2.5 intervals was 37.5 s and caught this; at 30 s it would have
    been 75 s, and a tab publishing once a minute would have looked healthy.
  */
  it("catches a tab throttled to once a minute", () => {
    expect(sharingHealth(true, NOW - 60_000, NOW, INTERVAL)).toBe("interrupted");
    expect(sharingHealth(true, NOW - INTERVAL * 3, NOW, INTERVAL)).toBe(
      "interrupted"
    );
  });

  it("tolerates a fix that is merely late", () => {
    const justInside = NOW - INTERVAL * INTERRUPTION_TOLERANCE;

    expect(sharingHealth(true, justInside, NOW, INTERVAL)).toBe("sharing");
    expect(sharingHealth(true, justInside - 1, NOW, INTERVAL)).toBe("interrupted");
  });

  it("scales with the reporting interval rather than a fixed number", () => {
    // The same gap is fine for a two-minute device and an interruption at 15 s.
    expect(sharingHealth(true, NOW - 100_000, NOW, 120_000)).toBe("sharing");
    expect(sharingHealth(true, NOW - 100_000, NOW, INTERVAL)).toBe("interrupted");
  });

  /*
    Only the cause we can actually observe is named. `visibilityState` tells us
    the tab was hidden; nothing tells us the signal dropped, so that case gets
    the honest general form instead of a guess.
  */
  it("names the background tab only when that is what happened", () => {
    expect(interruptionReason(true)).toBe("fleet.interruption.background");
    expect(interruptionReason(false)).toBe("fleet.interruption.signal");

    expect(en["fleet.interruption.background"]).toMatch(/background/i);
    expect(en["fleet.interruption.background"]).toMatch(/keep this screen open/i);
    expect(en["fleet.interruption.signal"]).not.toMatch(/background/i);
    expect(en["fleet.interruption.signal"]).toMatch(/signal/i);
  });

  /*
    And the Hindi must not turn "we do not know why" into a guess that sounds
    specific. Only the observed cause names a cause.
  */
  it("stays general about the cause it cannot observe, in every language", () => {
    for (const catalogue of [en, hi]) {
      const general = catalogue["fleet.interruption.signal"];

      expect(general.length).toBeGreaterThan(10);
      expect(general).not.toMatch(/background|टैब|पीछे/i);
    }
  });

  it("gives every state something to say", () => {
    for (const health of ["idle", "sharing", "interrupted"] as const) {
      for (const catalogue of [en, hi]) {
        expect(catalogue[SHARING_MESSAGES[health]].length, health).toBeGreaterThan(5);
      }
    }
  });
});
