/**
 * Source-specific shapes, mapped onto the one contract.
 *
 * Every adapter here is a PURE FUNCTION: object in, `VehicleTelemetry[]` out.
 * No fetch, no timers, no Firebase. Transport lives outside, which is what
 * makes an adapter swappable and lets its tests run against a captured
 * fixture with no network and no clock.
 */

import { isRouteId, type RouteId } from "@/domain/transit/routes";
import {
  emptyTelemetry,
  type OccupancyStatus,
  type VehicleStopStatus,
  type VehicleTelemetry,
} from "./telemetry";

/** What the driver app writes to the Realtime Database today. */
export interface DriverPositionRecord {
  busId?: string;
  lat: number;
  lng: number;
  updatedAt?: number;
  routeId?: string;
}

/**
 * The shipped driver-phone path, as an adapter.
 *
 * This is the argument for doing the adapter work before any operator has
 * called back: our own tracking becomes one source among several rather than
 * the thing everything else is written against, and the classification and
 * validation layers start applying to it immediately.
 */
export const fromDriverRecord = (
  key: string,
  record: DriverPositionRecord,
  receivedAt: number
): VehicleTelemetry => ({
  ...emptyTelemetry(record.busId ?? key, receivedAt, "rtdb-driver"),
  lat: record.lat,
  lng: record.lng,
  /*
    Absent stays absent. It used to mean "fresh forever" - a record with no
    timestamp rendered as a permanently active bus - and the honest mapping is
    null, which classifies as UNKNOWN.
  */
  observedAt: record.updatedAt ?? null,
  routeRef: record.routeId ?? null,
  routeId: isRouteId(record.routeId) ? record.routeId : null,
  positionSource: "GPS",
});

/**
 * The GTFS-Realtime `VehiclePosition` shape, in its decoded form.
 *
 * Typed against the JSON representation rather than the protobuf, because the
 * mapping is where every real-world trap lives and none of them need a decoder
 * to demonstrate. Wire decoding is transport and belongs outside this file,
 * which also means this adapter is already testable with no dependency added.
 */
export interface GtfsRealtimeFeed {
  header?: { timestamp?: number | string | null };
  entity?: readonly {
    id?: string;
    vehicle?: {
      trip?: { tripId?: string; routeId?: string; directionId?: number };
      vehicle?: { id?: string; label?: string };
      position?: {
        latitude?: number;
        longitude?: number;
        bearing?: number;
        speed?: number;
      } | null;
      currentStopSequence?: number;
      stopId?: string;
      currentStatus?: string;
      timestamp?: number | string | null;
      occupancyStatus?: string;
    } | null;
  }[];
}

const STOP_STATUSES: readonly string[] = [
  "INCOMING_AT",
  "STOPPED_AT",
  "IN_TRANSIT_TO",
];

const OCCUPANCIES: readonly string[] = [
  "EMPTY",
  "MANY_SEATS_AVAILABLE",
  "FEW_SEATS_AVAILABLE",
  "STANDING_ROOM_ONLY",
  "CRUSHED_STANDING_ROOM_ONLY",
  "FULL",
  "NOT_ACCEPTING_PASSENGERS",
];

/**
 * GTFS-Realtime timestamps are POSIX SECONDS. This is the conversion, and it
 * happens exactly once, here.
 *
 * Getting it wrong does not throw: every vehicle simply reads as 56 years old
 * and the map empties with nothing logged. That is the single most expensive
 * mistake available in this file, which is why it is a named function rather
 * than a `* 1000` somewhere in a mapping expression.
 */
const secondsToMillis = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined) return null;

  const seconds = typeof value === "string" ? Number(value) : value;

  return Number.isFinite(seconds) ? Math.round(seconds * 1000) : null;
};

export const fromGtfsRealtime = (
  feed: GtfsRealtimeFeed,
  receivedAt: number,
  options: { feedSource?: string; mapRoute?: (ref: string) => RouteId | null } = {}
): VehicleTelemetry[] => {
  const feedSource = options.feedSource ?? "gtfs-rt";
  const headerAt = secondsToMillis(feed.header?.timestamp);
  const out: VehicleTelemetry[] = [];

  for (const entity of feed.entity ?? []) {
    const vehicle = entity.vehicle;

    if (!vehicle) continue;

    const vehicleId = vehicle.vehicle?.id ?? vehicle.vehicle?.label ?? entity.id;

    // Without an id we cannot dedupe or track it, so it is not a vehicle.
    if (!vehicleId) continue;

    const routeRef = vehicle.trip?.routeId ?? null;

    const base = emptyTelemetry(vehicleId, receivedAt, feedSource);

    /*
      `position` is OPTIONAL in the proto and agencies really do omit it -
      hundreds of entities in a single real feed. Reading `.latitude` off it
      unguarded is the second-most-expensive mistake here.
    */
    const position = vehicle.position ?? null;

    out.push({
      ...base,
      lat: typeof position?.latitude === "number" ? position.latitude : null,
      lng: typeof position?.longitude === "number" ? position.longitude : null,
      /*
        Vehicle timestamp, then the feed header, then our receive clock. The
        fallback chain never decays to zero, because a record dated 1970 is
        indistinguishable from a seconds-vs-milliseconds bug.
      */
      observedAt: secondsToMillis(vehicle.timestamp) ?? headerAt,
      bearingDeg: typeof position?.bearing === "number" ? position.bearing : null,
      speedMps: typeof position?.speed === "number" ? position.speed : null,
      routeRef,
      routeId: routeRef
        ? (options.mapRoute?.(routeRef) ?? (isRouteId(routeRef) ? routeRef : null))
        : null,
      tripRef: vehicle.trip?.tripId ?? null,
      directionId:
        vehicle.trip?.directionId === 0 || vehicle.trip?.directionId === 1
          ? vehicle.trip.directionId
          : null,
      stopRef: vehicle.stopId ?? null,
      stopSequence:
        typeof vehicle.currentStopSequence === "number"
          ? vehicle.currentStopSequence
          : null,
      vehicleStatus: STOP_STATUSES.includes(vehicle.currentStatus ?? "")
        ? (vehicle.currentStatus as VehicleStopStatus)
        : null,
      occupancy: OCCUPANCIES.includes(vehicle.occupancyStatus ?? "")
        ? (vehicle.occupancyStatus as OccupancyStatus)
        : "UNKNOWN",
      positionSource: position ? "GPS" : "UNKNOWN",
    });
  }

  return out;
};
