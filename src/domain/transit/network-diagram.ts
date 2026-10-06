/**
 * The network as a diagram, built from topology alone.
 *
 * NOTHING HERE READS A COORDINATE. That is not a simplification, it is the
 * only honest option: `STOP_COORDS` is a generated lattice - eight consecutive
 * stops exactly 0.002 degrees apart, describing a corridor about a quarter of
 * the operator's published length - so a geographic map drawn from it would
 * look precise and be fiction (`ARCHITECTURE-2.0.md` §14.1).
 *
 * What we do have is real: which stops each route serves, in the order it
 * serves them, and where those orders overlap. That is enough for a schematic,
 * which is what a transit diagram is anyway - the London tube map is not to
 * scale either, and is more useful for it.
 */

import {
  getNetworkRoutes,
  isInterchange,
  type NetworkRoute,
  type NetworkRouteId,
} from "./routes";
import type { StopName } from "./stops";

/**
 * Short codes for the diagram's column headings.
 *
 * "Feeder Route Ext. 1" does not fit above a 40px column, and rotating seven
 * headings trades one unreadable thing for another. Data rather than styling:
 * the legend and the diagram must agree, so there is one list.
 */
export const ROUTE_CODES: Record<NetworkRouteId, string> = {
  "trunk": "T",
  "trunk-iim": "T·I",
  "feeder-1": "F1",
  "feeder-2": "F2",
  "feeder-ext-1": "X1",
  "feeder-ext-2": "X2",
  "feeder-ext-3": "X3",
};

/** One stop's row on the diagram. */
export interface DiagramRow {
  stop: StopName;
  /** Routes calling here, in the network's own order. */
  routeIds: readonly NetworkRouteId[];
  /** True where more than one route calls, i.e. you can change buses. */
  interchange: boolean;
}

export interface NetworkGrid {
  /** Every stop any route serves, in a single consistent order. */
  rows: readonly DiagramRow[];
  routes: readonly NetworkRoute[];
}

/**
 * A single top-to-bottom order every route agrees with.
 *
 * This is a topological sort over "A is served before B on some route". Two
 * routes that share a stretch of corridor must agree about the order of the
 * stops on it, and every published route does - the feeders run the same way
 * along the trunk as the trunk does.
 *
 * Returns null rather than an order if they ever stop agreeing. A cycle means
 * two routes genuinely disagree, and there is no correct single column for
 * that stop; guessing one would draw a diagram that contradicts the timetable.
 * The test suite treats null as a failure, so a future route that introduces
 * one is caught rather than rendered. The routes are a parameter purely so
 * that branch is reachable from a test - the published network has no cycle,
 * and a branch nothing can exercise is a branch nobody has checked.
 */
export const networkColumnOrder = (
  routes: readonly NetworkRoute[] = getNetworkRoutes()
): readonly StopName[] | null => {
  const after = new Map<StopName, Set<StopName>>();
  const incoming = new Map<StopName, number>();
  /** First position a stop is seen at, so ties break the same way every run. */
  const firstSeen = new Map<StopName, number>();

  let seen = 0;

  const ensure = (stop: StopName) => {
    if (!after.has(stop)) {
      after.set(stop, new Set());
      incoming.set(stop, 0);
      firstSeen.set(stop, seen++);
    }
  };

  for (const route of routes) {
    route.servedStops.forEach(ensure);

    for (let i = 0; i < route.servedStops.length - 1; i += 1) {
      const from = route.servedStops[i]!;
      const to = route.servedStops[i + 1]!;

      if (after.get(from)!.has(to)) continue;

      after.get(from)!.add(to);
      incoming.set(to, incoming.get(to)! + 1);
    }
  }

  const ready = [...incoming.entries()]
    .filter(([, count]) => count === 0)
    .map(([stop]) => stop);

  const order: StopName[] = [];

  while (ready.length > 0) {
    ready.sort((a, b) => firstSeen.get(a)! - firstSeen.get(b)!);

    const stop = ready.shift()!;
    order.push(stop);

    for (const next of after.get(stop)!) {
      const remaining = incoming.get(next)! - 1;
      incoming.set(next, remaining);

      if (remaining === 0) ready.push(next);
    }
  }

  return order.length === after.size ? order : null;
};

/**
 * The diagram model: one row per stop, one column per route.
 *
 * Rows are stops rather than routes on purpose. A phone is tall and narrow,
 * seven route columns fit across it and thirty-nine stop labels do not - and
 * a stop name reads far better horizontally than rotated.
 */
export const networkGrid = (
  routes: readonly NetworkRoute[] = getNetworkRoutes()
): NetworkGrid | null => {
  const order = networkColumnOrder(routes);

  if (!order) return null;

  return {
    routes,
    rows: order.map((stop) => {
      const routeIds = routes
        .filter((route) => route.servedStops.includes(stop))
        .map((route) => route.id);

      return { stop, routeIds, interchange: isInterchange(stop) };
    }),
  };
};

/**
 * The vertical runs to draw for one route.
 *
 * A route calls at rows scattered down the diagram, and the line between two
 * of its stops passes rows it does not serve. Each run is a pair of row
 * indices to join, so the line skips those rows without pretending to stop
 * there.
 */
export const routeSegments = (
  grid: NetworkGrid,
  routeId: NetworkRouteId
): readonly (readonly [number, number])[] => {
  const rowsServed = grid.rows
    .map((row, index) => (row.routeIds.includes(routeId) ? index : -1))
    .filter((index) => index >= 0);

  const segments: (readonly [number, number])[] = [];

  for (let i = 0; i < rowsServed.length - 1; i += 1) {
    segments.push([rowsServed[i]!, rowsServed[i + 1]!]);
  }

  return segments;
};

/** A one-sentence description of the whole diagram, for a screen reader. */
export const describeNetwork = (grid: NetworkGrid): string => {
  const interchanges = grid.rows.filter((row) => row.interchange).length;

  return `Network diagram: ${grid.routes.length} routes across ${grid.rows.length} stops, with ${interchanges} interchanges where you can change buses. The same information is available as a table.`;
};
