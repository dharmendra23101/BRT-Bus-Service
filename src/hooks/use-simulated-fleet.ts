import { useEffect, useState } from "react";
import {
  advance,
  createFleet,
  isSimulatorPermitted,
  toTelemetry,
  type SimulatorOptions,
} from "@/domain/fleet/simulator";
import type { VehicleTelemetry } from "@/domain/fleet/telemetry";
import type { RouteId } from "@/domain/transit/routes";

/**
 * Runs the synthetic fleet in the browser.
 *
 * Client-side only, and deliberately so: it never writes to the Realtime
 * Database. Synthetic vehicles in a shared world-readable node would be
 * indistinguishable from real ones to every other reader, including the
 * operator, and there is no way to clean that up reliably. Keeping the fleet
 * in one tab's memory means it cannot escape.
 *
 * Returns an empty fleet wherever the simulator is not permitted, so a caller
 * needs no environment check of its own.
 */
export const useSimulatedFleet = (
  options: SimulatorOptions,
  enabled: boolean
): VehicleTelemetry[] => {
  const permitted = enabled && isSimulatorPermitted(import.meta.env);
  const [fleet, setFleet] = useState<VehicleTelemetry[]>([]);

  /*
    Destructured rather than depending on the options object, which most
    callers rebuild on every render - depending on it would restart the fleet
    continuously. The route list is joined into a string for the same reason:
    a fresh array with identical contents is a new value to the dependency
    check but the same run to the simulator.
  */
  const { fleetSize, seed, progressPerTick } = options;
  const intervalMs = options.intervalMs ?? 15_000;
  const routeKey = options.routeIds.join(",");

  useEffect(() => {
    if (!permitted) {
      setFleet([]);
      return;
    }

    const run: SimulatorOptions = {
      fleetSize,
      routeIds: routeKey.split(",") as RouteId[],
      intervalMs,
      progressPerTick,
      seed,
    };

    let state = createFleet(run);
    setFleet(toTelemetry(state, Date.now()));

    const interval = setInterval(() => {
      state = advance(state, run);
      setFleet(toTelemetry(state, Date.now()));
    }, intervalMs);

    return () => clearInterval(interval);
  }, [permitted, fleetSize, routeKey, intervalMs, progressPerTick, seed]);

  return fleet;
};
