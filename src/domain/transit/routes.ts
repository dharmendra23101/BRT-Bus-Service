/**
 * Route registry.
 *
 * A route is a first-class object owning its identity, the stops it serves and
 * its human-readable description. Pages render routes; they never redeclare
 * them.
 */

import { haversineKm } from "../geo";
import { STOP_COORDS, type Coordinate, type StopName } from "./stops";
import { ROUTE_STOPS } from "./route-stops";

/**
 * Every route the operator publishes.
 *
 * 101, 102 and 105 run HNLU to the railway station; 201-205 run the return
 * working, which is a different service with its own numbering rather than
 * "101 backwards".
 */
export const ROUTE_IDS = ["101", "102", "105", "201", "202", "203", "204", "205"] as const;

export type RouteId = (typeof ROUTE_IDS)[number];

export interface Route {
  id: RouteId;
  /** Display name, e.g. "Route 101". */
  name: string;
  /** Where the route starts and ends, for captions and cards. */
  headline: string;
  /** Stops this route calls at, in travel order. */
  servedStops: readonly StopName[];
}

/**
 * The stops a route calls at.
 *
 * Read from a generated module rather than computed from the trip data here:
 * routes are reachable from the eager entry chunk, so importing 102 trips to
 * derive fifteen stop names would make every visitor download the timetable.
 */
const stopsOf = (id: RouteId): readonly StopName[] => ROUTE_STOPS[id] ?? [];

const HEADLINES: Record<RouteId, string> = {
  "101": "HNLU to Raipur Railway Station",
  "102": "HNLU to Raipur Railway Station (Express)",
  "105": "HNLU to Raipur Railway Station (via IIM)",
  "201": "Raipur Railway Station to HNLU",
  "202": "Raipur Railway Station to HNLU",
  "203": "Raipur Railway Station to HNLU",
  "204": "DKS Bhawan to Balco Medical Center",
  "205": "Raipur Railway Station to HNLU (via IIM)",
};

export const ROUTES: Record<RouteId, Route> = Object.fromEntries(
  ROUTE_IDS.map((id) => [
    id,
    { id, name: `Route ${id}`, headline: HEADLINES[id], servedStops: stopsOf(id) },
  ])
) as Record<RouteId, Route>;

export const getRoute = (id: RouteId): Route => ROUTES[id];

/** Where a vehicle has reached along the route it is running. */
export interface RoutePosition {
  nearestStop: StopName;
  /** The stop after the nearest one; null at the end of the line. */
  nextStop: StopName | null;
  destination: StopName;
  /** How many of the route's stops are at or behind the vehicle. */
  stopsCovered: number;
  totalStops: number;
}

/** Where a route ends, from its published stop order. Needs no coordinates. */
export const destinationOf = (id: RouteId): StopName =>
  ROUTES[id].servedStops[ROUTES[id].servedStops.length - 1]!;

/**
 * Places a position against a route's stops.
 *
 * DO NOT SHOW THE RESULT TO ANYONE. The algorithm is sound; the data it reads
 * is not. `STOP_COORDS` is a generated lattice whose "HNLU" sits about 21 km
 * from the real one, so the nearest stop to a genuine GPS fix is effectively
 * arbitrary - and "next stop" is the kind of claim a passenger acts on. It
 * stays here, tested, ready for the day surveyed coordinates land
 * (`ARCHITECTURE-2.0.md` §14.1); a test asserts no component imports it.
 *
 * Both routes are declared in travel order and run the corridor in one
 * direction only, so the stop after the nearest one is genuinely the next one
 * a passenger will be picked up at. Nothing here is inferred from movement,
 * which means a stationary bus still reports honestly.
 */
export const locateOnRoute = (id: RouteId, at: Coordinate): RoutePosition | null => {
  const stops = ROUTES[id].servedStops;

  let nearestIndex = -1;
  let shortest = Infinity;

  stops.forEach((stop, index) => {
    const coord = STOP_COORDS[stop];

    if (!coord) return;

    const distance = haversineKm(at, coord);

    if (distance < shortest) {
      shortest = distance;
      nearestIndex = index;
    }
  });

  if (nearestIndex === -1) return null;

  return {
    nearestStop: stops[nearestIndex]!,
    nextStop: stops[nearestIndex + 1] ?? null,
    destination: stops[stops.length - 1]!,
    stopsCovered: nearestIndex + 1,
    totalStops: stops.length,
  };
};

const ROUTE_ID_SET: ReadonlySet<string> = new Set(ROUTE_IDS);

export const isRouteId = (value: unknown): value is RouteId =>
  typeof value === "string" && ROUTE_ID_SET.has(value);

export const NETWORK_ROUTE_IDS = [
  "trunk",
  "trunk-iim",
  "feeder-1",
  "feeder-2",
  "feeder-ext-1",
  "feeder-ext-2",
  "feeder-ext-3",
] as const;

export type NetworkRouteId = (typeof NETWORK_ROUTE_IDS)[number];

export interface NetworkRoute {
  id: NetworkRouteId;
  name: string;
  headline: string;
  servedStops: readonly StopName[];
}

export const NETWORK_ROUTES: Record<NetworkRouteId, NetworkRoute> = {
  "trunk": {
    id: "trunk",
    name: "Trunk Route",
    headline: "Raipur Railway Station to HNLU",
    servedStops: [
      "Raipur Railway Station",
      "DKS Bhawan",
      "Telibandha",
      "Agriculture College",
      "Sector 15",
      "CBD",
      "Ekatm Path",
      "North Block",
      "Mahanadi Bhavan",
      "Indravati Bhavan",
      "South Block",
      "Sector 27",
      "Sector 29",
      "Balco Medical Center",
      "HNLU",
    ],
  },
  "trunk-iim": {
    id: "trunk-iim",
    name: "Trunk Route (IIM branch)",
    headline: "Raipur Railway Station to IIM",
    servedStops: [
      "Raipur Railway Station",
      "DKS Bhawan",
      "Telibandha",
      "Agriculture College",
      "Sector 15",
      "CBD",
      "Ekatm Path",
      "North Block",
      "Mahanadi Bhavan",
      "Indravati Bhavan",
      "South Block",
      "Sector 27",
      "Sector 29",
      "Sector 30",
      "IIM",
    ],
  },
  "feeder-1": {
    id: "feeder-1",
    name: "Feeder Route 1",
    headline: "North Block to Nawagaon via NH53",
    servedStops: [
      "North Block",
      "Sector 17 Gate",
      "Sector 18 Gate",
      "Sector 17",
      "Sector 12",
      "Satya Sai Hospital",
      "Stadium",
      "Nawagaon",
    ],
  },
  "feeder-2": {
    id: "feeder-2",
    name: "Feeder Route 2",
    headline: "Sector 22 to Sector 30 via CBD Railway Station",
    servedStops: [
      "Sector 22",
      "CBD Railway Station",
      "Office Complex Block A B",
      "Sector 23",
      "Mantri Aawas",
      "CBD",
      "North Block",
      "South Block",
      "Sector 27",
      "Rakhi Village",
      "Sector 27-29 Mid",
      "Sector 30",
    ],
  },
  "feeder-ext-1": {
    id: "feeder-ext-1",
    name: "Feeder Route Ext. 1",
    headline: "HNLU to Thanaud via Jungle Safari",
    servedStops: [
      "HNLU",
      "Jungle Safari",
      "Rawatpura Sarkar University",
      "Thanaud",
    ],
  },
  "feeder-ext-2": {
    id: "feeder-ext-2",
    name: "Feeder Route Ext. 2",
    headline: "HNLU to NH 30 Chowk",
    servedStops: [
      "HNLU",
      "HNLU Gate",
      "NH 30 Chowk",
    ],
  },
  "feeder-ext-3": {
    id: "feeder-ext-3",
    name: "Feeder Route Ext. 3",
    headline: "HNLU to Muktangan",
    servedStops: [
      "HNLU",
      "IIIT",
      "Tribal Museum",
      "Muktangan",
    ],
  },
};

export const getNetworkRoute = (id: NetworkRouteId): NetworkRoute =>
  NETWORK_ROUTES[id];

const NETWORK_ROUTE_ID_SET: ReadonlySet<string> = new Set(NETWORK_ROUTE_IDS);

export const isNetworkRouteId = (value: unknown): value is NetworkRouteId =>
  typeof value === "string" && NETWORK_ROUTE_ID_SET.has(value);

export interface Interchange {
  stop: StopName;
  routes: readonly NetworkRouteId[];
}

export const INTERCHANGES: readonly Interchange[] = [
  { stop: "North Block", routes: ["trunk", "feeder-1", "feeder-2"] },
  { stop: "CBD", routes: ["trunk", "feeder-2"] },
  { stop: "South Block", routes: ["trunk", "feeder-2"] },
  { stop: "Sector 27", routes: ["trunk", "feeder-2"] },
  { stop: "Sector 30", routes: ["trunk-iim", "feeder-2"] },
  {
    stop: "HNLU",
    routes: ["trunk", "feeder-ext-1", "feeder-ext-2", "feeder-ext-3"],
  },
];

const INTERCHANGE_SET: ReadonlySet<string> = new Set(
  INTERCHANGES.map((interchange) => interchange.stop)
);

export const isInterchange = (stop: StopName): boolean =>
  INTERCHANGE_SET.has(stop);

export const getNetworkRoutes = (): NetworkRoute[] =>
  NETWORK_ROUTE_IDS.map(getNetworkRoute);

export const getRoutesServing = (stop: StopName): NetworkRoute[] =>
  getNetworkRoutes().filter((route) => route.servedStops.includes(stop));

export const getConnectedRoutes = (
  stop: StopName,
  from: NetworkRouteId
): NetworkRoute[] =>
  getRoutesServing(stop).filter((route) => route.id !== from);
