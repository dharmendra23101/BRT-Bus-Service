/**
 * A synthetic fleet, for demonstrating a hundred buses before one exists.
 *
 * THE RULE THAT MAKES THIS LEGITIMATE: every vehicle it produces carries
 * `simulated: true`, and every surface that renders one must say so. An
 * unlabelled synthetic bus sitting beside the operator's real published fare
 * chart and real published timetable is not a demo - it is a fabricated claim
 * about a real transit service, made to the one audience able to check it.
 *
 * It emits the SAME normalized contract a certified tracker would, which is
 * the whole point: if the passenger app can be driven by this, it can be
 * driven by a real feed without changing a line downstream.
 *
 * PURE. No timers, no network, no `Date.now()`. The caller supplies the clock
 * and drives the ticks, so a test can run an hour of service in a millisecond
 * and nothing here can join the midnight-flaky class of tests.
 */

import { getRoute, type RouteId } from "@/domain/transit/routes";
import { emptyTelemetry, type VehicleTelemetry } from "./telemetry";

export const SIMULATED_FEED_SOURCE = "simulator";

export interface SimulatorOptions {
  /** How many vehicles to run. The plan calls for 10, 25, 50 and 100. */
  fleetSize: number;
  /** Routes to spread the fleet across. */
  routeIds: readonly RouteId[];
  /**
   * Seconds between reports.
   *
   * Defaults to 15, the recommended production cadence, rather than the 3 s
   * the driver app used - so arrival logic is exercised at a rate a certified
   * device would actually produce. AIS-140 permits anything from 5 s to ten
   * minutes, and real state defaults run to two minutes.
   */
  intervalMs?: number;
  /** Fraction of a vehicle's run completed per tick, 0-1. */
  progressPerTick?: number;
  /** Deterministic seed, so a run is reproducible. */
  seed?: number;
}

export interface SimulatedVehicle {
  vehicleId: string;
  routeId: RouteId;
  /** How far along its route, 0-1. */
  progress: number;
  /** Index of the stop it is heading for. */
  nextStopIndex: number;
}

export interface SimulatorState {
  vehicles: readonly SimulatedVehicle[];
  tick: number;
}

/**
 * A tiny deterministic generator.
 *
 * `Math.random()` is banned here for the same reason `Date.now()` is: a
 * simulator whose output changes between runs cannot be asserted on, and a
 * demo that looks different every time is impossible to talk over.
 */
const nextRandom = (seed: number): [number, number] => {
  const next = (seed * 1_664_525 + 1_013_904_223) % 4_294_967_296;

  return [next / 4_294_967_296, next];
};

export const createFleet = (options: SimulatorOptions): SimulatorState => {
  const vehicles: SimulatedVehicle[] = [];
  let seed = options.seed ?? 1;

  for (let i = 0; i < options.fleetSize; i += 1) {
    const routeId = options.routeIds[i % options.routeIds.length]!;
    const [value, nextSeed] = nextRandom(seed);
    seed = nextSeed;

    vehicles.push({
      // Distinctly named, so a simulated id can never be mistaken for a real
      // vehicle label in a log, a database node or a screenshot.
      vehicleId: `SIM-${String(i + 1).padStart(3, "0")}`,
      routeId,
      // Spread around the route rather than all starting at the terminus.
      progress: value,
      nextStopIndex: 0,
    });
  }

  return { vehicles, tick: 0 };
};

/** Advances every vehicle one reporting interval. */
export const advance = (
  state: SimulatorState,
  options: SimulatorOptions
): SimulatorState => {
  const step = options.progressPerTick ?? 0.02;

  return {
    tick: state.tick + 1,
    vehicles: state.vehicles.map((vehicle) => {
      const stops = getRoute(vehicle.routeId).servedStops;
      // Wraps rather than stopping: a bus reaching its terminus starts again,
      // which is what a fleet in service looks like.
      const progress = (vehicle.progress + step) % 1;

      return {
        ...vehicle,
        progress,
        nextStopIndex: Math.min(
          stops.length - 1,
          Math.floor(progress * stops.length)
        ),
      };
    }),
  };
};

/**
 * The fleet as telemetry.
 *
 * NO COORDINATES ARE PRODUCED. `lat` and `lng` stay null, which the contract
 * explicitly permits and real feeds really do publish. Inventing positions
 * would mean deriving them from `STOP_COORDS` - a generated lattice - and
 * then feeding fabricated geography into a validator and onto a map. What the
 * simulator can honestly report is topological: which route, which stop it is
 * heading for, and how far along it is.
 */
export const toTelemetry = (
  state: SimulatorState,
  at: number
): VehicleTelemetry[] =>
  state.vehicles.map((vehicle) => {
    const stops = getRoute(vehicle.routeId).servedStops;

    return {
      ...emptyTelemetry(vehicle.vehicleId, at, SIMULATED_FEED_SOURCE),
      observedAt: at,
      routeRef: vehicle.routeId,
      routeId: vehicle.routeId,
      stopRef: stops[vehicle.nextStopIndex] ?? null,
      stopSequence: vehicle.nextStopIndex,
      vehicleStatus: "IN_TRANSIT_TO",
      positionSource: "MANUAL",
      simulated: true,
    };
  });

/**
 * Whether the simulator is allowed to run here.
 *
 * Structural, not a convention: the plan requires the simulator to be
 * prevented from reaching production rather than merely discouraged. It runs
 * in development, and in a production build only when a build-time flag has
 * been set deliberately - so shipping it on by accident takes two mistakes.
 */
export const isSimulatorPermitted = (env: {
  DEV?: boolean;
  VITE_ENABLE_FLEET_SIMULATOR?: string;
}): boolean => Boolean(env.DEV) || env.VITE_ENABLE_FLEET_SIMULATOR === "true";
