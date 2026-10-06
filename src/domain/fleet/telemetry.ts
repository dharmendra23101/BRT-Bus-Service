/**
 * The one shape every position source is normalised into.
 *
 * The point of this file is that nothing downstream knows where a position
 * came from. A driver's phone, a certified AIS-140 tracker and an operator's
 * API feed produce the same record, so the map, the arrival monitor and the
 * fleet view are written once and keep working when the source changes - which
 * it will, because the driver app is a bridge, not the destination.
 *
 * Units and nullability are the substance here, not the field list. Every rule
 * below exists because a real published feed violates the obvious assumption:
 *
 * - `observedAt` is epoch MILLISECONDS. GTFS-Realtime publishes SECONDS, and a
 *   feed converted zero times reads as 56 years stale - every bus silently
 *   disappears from the map with nothing logged anywhere.
 * - `observedAt` may be NULL. Hundreds of entities in real agency feeds carry
 *   no timestamp at all. An adapter that knows the feed's production time -
 *   a GTFS-Realtime header, say - fills it in from there; one that does not
 *   leaves it null, and the vehicle classifies as UNKNOWN rather than being
 *   dated from our own clock. See `effectiveTimestamp` for why that
 *   distinction is load-bearing.
 * - `lat`/`lng` may be NULL. `position` is an optional field in the GTFS-RT
 *   proto, and agencies really do publish vehicles without one.
 * - `routeId` is OUR id or null. It is never coerced from an unrecognised
 *   operator string, because a bus attributed to the wrong route is worse than
 *   a bus attributed to none.
 * - `occupancy` defaults to UNKNOWN and is never inferred. We have no sensor
 *   for it, and a guess printed next to a real fare chart is a fabrication.
 */

import type { RouteId } from "@/domain/transit/routes";

/** How a position was obtained, as reported by the source. */
export type PositionSource =
  | "GPS"
  | "DEAD_RECKONING"
  | "ODOMETER"
  | "MANUAL"
  | "UNKNOWN";

/**
 * How full the vehicle is.
 *
 * Present because the contract has to be able to carry it, and absent from
 * every record we produce because nothing measures it. See the never-invent
 * rule: an occupancy figure with no sensor behind it is a made-up number on a
 * page that also shows the operator's real fares.
 */
export type OccupancyStatus =
  | "EMPTY"
  | "MANY_SEATS_AVAILABLE"
  | "FEW_SEATS_AVAILABLE"
  | "STANDING_ROOM_ONLY"
  | "CRUSHED_STANDING_ROOM_ONLY"
  | "FULL"
  | "NOT_ACCEPTING_PASSENGERS"
  | "UNKNOWN";

/** Where the vehicle is relative to its next stop, in GTFS-RT's vocabulary. */
export type VehicleStopStatus = "INCOMING_AT" | "STOPPED_AT" | "IN_TRANSIT_TO";

export interface VehicleTelemetry {
  /** Stable and opaque. Never a driver's uid, name or plate. */
  vehicleId: string;

  lat: number | null;
  lng: number | null;

  /** When the vehicle says it was there. Epoch milliseconds. */
  observedAt: number | null;
  /**
   * When we received it. Our clock, always set.
   *
   * For ordering, deduplication and audit - NOT for staleness. See
   * `effectiveTimestamp`.
   */
  receivedAt: number;

  /** Degrees clockwise from true north, 0-360. */
  bearingDeg: number | null;
  /** Metres per second. Not km/h - convert once, at the adapter. */
  speedMps: number | null;

  /** The operator's own route string, unmodified, for tracing a mismatch. */
  routeRef: string | null;
  /** Our id, or null. Never coerced from an unrecognised `routeRef`. */
  routeId: RouteId | null;

  tripRef: string | null;
  /** GTFS convention: 0 and 1 are the two directions of a route. */
  directionId: 0 | 1 | null;

  stopRef: string | null;
  stopSequence: number | null;
  vehicleStatus: VehicleStopStatus | null;

  /** Positive means LATE, following the GTFS-RT convention. */
  scheduleDeviationSec: number | null;

  occupancy: OccupancyStatus;
  positionSource: PositionSource;

  /** Which adapter produced this: "rtdb-driver", "gtfs-rt", a vendor name. */
  feedSource: string;

  /**
   * True when this vehicle does not exist.
   *
   * Carried on the record rather than inferred from `feedSource`, so that
   * every surface which renders a vehicle is forced to decide what to do with
   * it. An unlabelled synthetic bus sitting beside the operator's real fare
   * chart is not a demo, it is a fabricated claim about a real service.
   */
  simulated: boolean;
}

/**
 * A telemetry record with every optional field explicitly absent.
 *
 * Adapters spread over this rather than building objects field by field, so a
 * field added to the contract cannot silently arrive as `undefined` in one
 * adapter and present in another.
 */
export const emptyTelemetry = (
  vehicleId: string,
  receivedAt: number,
  feedSource: string
): VehicleTelemetry => ({
  vehicleId,
  lat: null,
  lng: null,
  observedAt: null,
  receivedAt,
  bearingDeg: null,
  speedMps: null,
  routeRef: null,
  routeId: null,
  tripRef: null,
  directionId: null,
  stopRef: null,
  stopSequence: null,
  vehicleStatus: null,
  scheduleDeviationSec: null,
  occupancy: "UNKNOWN",
  positionSource: "UNKNOWN",
  feedSource,
  simulated: false,
});

/**
 * The most recent moment we know anything about this vehicle.
 *
 * FOR DISPLAY AND ORDERING ONLY. It must never drive staleness, and the
 * reason is subtle enough to be worth stating: `receivedAt` is a sound proxy
 * for observation time when a feed is PULLED - the entities in it were
 * produced when we fetched it - but not when it is PUSHED from a
 * last-write-wins store. A Realtime Database snapshot re-fires "now" for a
 * record written hours ago, so using it here would resurrect exactly the
 * immortal phantom bus the five-state model exists to kill.
 *
 * An adapter that genuinely knows the feed's production time puts it in
 * `observedAt` - which is what the GTFS-Realtime header fallback does.
 */
export const effectiveTimestamp = (telemetry: VehicleTelemetry): number =>
  telemetry.observedAt ?? telemetry.receivedAt;

/** Whether a record carries a usable position at all. */
export const hasPosition = (
  telemetry: VehicleTelemetry
): telemetry is VehicleTelemetry & { lat: number; lng: number } =>
  telemetry.lat !== null && telemetry.lng !== null;
