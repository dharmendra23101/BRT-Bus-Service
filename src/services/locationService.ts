/**
 * Live bus positions.
 *
 * The Realtime Database SDK (~165 kB) is imported on demand. Only the map,
 * the driver screen and the arrival monitor need it, so a visitor reading the
 * timetable never downloads it.
 *
 * PRIVACY: the `busLocations` node is world-readable, because the live map is
 * a public page. Everything published here is therefore visible to anyone on
 * the internet, so the payload is reduced to the minimum the map needs:
 * coordinates, a freshness timestamp, and an opaque bus label.
 *
 * Driver names and email addresses were previously written to this node and
 * rendered in a public table. They are gone, and `database.rules.json`
 * rejects any field outside the allowlist so they cannot come back by
 * accident.
 */

import type { DataSnapshot } from "firebase/database";
import { getRtdb } from "@/firebase";
import { REMOTE_PATHS } from "@/constants/config";
import { AuthorizationError } from "@/domain/auth/errors";
import { assignedVehicle, isVehicleId } from "@/domain/fleet/roster";
import { PERMISSIONS, can } from "@/domain/auth/permissions";
import { fromDriverRecord } from "@/domain/fleet/adapters";
import { classifyAll, isPassengerVisible, type ClassifiedVehicle } from "@/domain/fleet/state";
import { acceptTelemetry, createTelemetryGate } from "@/domain/fleet/validation";
import type { VehicleTelemetry } from "@/domain/fleet/telemetry";
import { isRouteId, type RouteId } from "@/domain/transit/routes";
import {
  assignmentSchema,
  busPositionSchema,
  inboundBusPositionSchema,
  type ValidatedBusPosition,
} from "@/domain/validation/schemas";
import type { Actor } from "@/types/user";

/** A bus position as consumed by the UI. */
export interface LiveBus extends ValidatedBusPosition {
  busId: string;
}

/**
 * Narrowing options for a subscription.
 *
 * Widened now and filtered client-side, which is honest about what it does
 * today while fixing the signature at every call site. When the volume
 * justifies it the transport moves to a `/busLocationsByRoute/$routeId` path
 * shard and nothing above this line changes.
 *
 * Deliberately NOT `orderByChild('routeId')`: unindexed it downloads
 * everything anyway, and indexed it is documented as several times slower
 * than a key lookup while producing a per-query listen instead of one shared
 * broadcast.
 */
export interface SubscribeOptions {
  routeId?: RouteId;
}

/** Loads the Realtime Database SDK and handle together. */
/*
  One import of the SDK, shared by every caller.

  Three subscriptions can start in the same tick - positions, the server-time
  offset, and the roster - and each used to fire its own dynamic import. In
  production that is duplicated work; under test it is worse than that,
  because two concurrent imports of a mocked module do not reliably resolve to
  the same thing: the first got the mock and the second got the real SDK,
  whose `ref()` then threw on an object that was never a real Database. The
  symptom was a subscription that silently delivered nothing, since the
  rejection had nowhere to surface.

  Holding the promise rather than the module means concurrent callers await
  the same import instead of starting a second one.
*/
let sdkPromise: Promise<typeof import("firebase/database")> | null = null;

const database = async () => {
  sdkPromise ??= import("firebase/database");

  const [sdk, rtdb] = await Promise.all([sdkPromise, getRtdb()]);

  return { ...sdk, rtdb };
};

/** Whether live tracking can be used at all in this environment. */
export const isLiveTrackingAvailable = async (): Promise<boolean> =>
  (await getRtdb()) !== null;

/*
  The database's clock, as an offset from this device's.

  Positions are stamped by the server now, which removes the PUBLISHING
  device's clock from the trust model. It does not remove the READING one: a
  passenger whose phone is ten minutes fast would see every bus as stale, and
  one running slow would see stale buses as live. The database reports the
  difference at `/.info/serverTimeOffset`, and applying it makes both ends
  agree without either trusting a device.

  Module-level because the offset belongs to the connection rather than to any
  one screen, and every screen judging freshness against a different clock is
  the problem being solved.
*/
let serverTimeOffsetMs = 0;

/**
 * Now, according to the database rather than this device.
 *
 * Falls back to the local clock until the offset is known, which is correct:
 * an unknown offset is not evidence of a wrong clock.
 */
export const serverNow = (): number => Date.now() + serverTimeOffsetMs;

/** Test seam. Never called by the application. */
export const resetServerTimeOffset = (): void => {
  serverTimeOffsetMs = 0;
};

/** Every bus the feed knows about, with its freshness resolved. */
export const classifyBuses = (
  buses: LiveBus[],
  now = Date.now()
): ClassifiedVehicle[] => classifyAll(toTelemetry(buses, now), now);

/**
 * Buses a passenger-facing surface should draw.
 *
 * This used to be a filter that DELETED anything older than two minutes,
 * which threw away the only evidence that a bus had stopped reporting - so
 * nothing downstream could tell "not running" from "not reporting", and those
 * are different facts to somebody standing at a stop.
 *
 * It is now a classification the caller narrows. The record survives either
 * way, carrying the state and the age, so a screen can say how old a position
 * is instead of silently dropping it.
 *
 * A record with NO timestamp is no longer treated as fresh forever. That was
 * an immortal phantom bus on a public map, and a test was protecting it.
 */
export const selectFreshBuses = (
  buses: LiveBus[],
  now = Date.now()
): ClassifiedVehicle[] => classifyBuses(buses, now).filter(isPassengerVisible);

/** Maps the shipped driver-phone records onto the normalized contract. */
export const toTelemetry = (
  buses: readonly LiveBus[],
  receivedAt = Date.now()
): VehicleTelemetry[] =>
  buses.map((bus) =>
    fromDriverRecord(
      bus.busId,
      { busId: bus.busId, lat: bus.lat, lng: bus.lng, updatedAt: bus.updatedAt, routeId: bus.routeId },
      receivedAt
    )
  );


export interface Coords {
  latitude: number;
  longitude: number;
}

/**
 * Publishes the signed-in driver's position.
 *
 * Writes only to the caller's own node; the matching rule pins the path to
 * `auth.uid`, so a driver cannot post a position as another vehicle.
 *
 * The position is also armed for removal on disconnect. Stopping deliberately
 * clears the node, but a crashed tab or a dead connection never gets that far,
 * and the node lives in a world-readable database - so the server is asked to
 * clear it too. The registration is renewed on every publish because the
 * database discards it once it has fired or the socket has been replaced.
 */
export const publishLocation = async (
  actor: Actor | null,
  coords: Coords,
  vehicleId: string,
  routeId?: RouteId
): Promise<void> => {
  if (!can(actor, PERMISSIONS.PUBLISH_LOCATION)) {
    throw new AuthorizationError(PERMISSIONS.PUBLISH_LOCATION);
  }

  /*
    A driver without an assignment has nothing to publish AS, and the rules
    would refuse the write anyway. Refusing here means the driver screen can
    say so plainly instead of showing a failed publish they cannot act on.
  */
  if (!isVehicleId(vehicleId)) {
    throw new Error("No vehicle is assigned to this driver.");
  }

  const { onDisconnect, ref, serverTimestamp, set, rtdb } = await database();
  if (!rtdb) return;

  /*
    The route is required now, because it is the path. A bus with no declared
    route has no shard to live in - which is stricter than before and matches
    what the driver screen already enforces by making the choice up front.
  */
  if (!routeId) {
    throw new Error("A route must be declared before publishing a position.");
  }

  const payload = {
    lat: coords.latitude,
    lng: coords.longitude,
    /*
      The server's clock, not this device's.

      Everything downstream decides whether a bus is LIVE, STALE or OFFLINE by
      comparing this against now, so whoever sets it decides how fresh the bus
      appears. A phone with a clock running fast would show itself as
      permanently current - and would keep a marker on a public map at a place
      nobody is - without anything on the reading side being able to tell.

      The rules require the value to fall inside a narrow window around server
      time, which this satisfies by construction and a guessed number does not.
    */
    updatedAt: serverTimestamp(),
  };

  // Validated before the write so an impossible coordinate is caught here
  // rather than being rejected by the database rule.
  const parsed = busPositionSchema.safeParse(payload);

  if (!parsed.success) {
    console.error("Refusing to publish an invalid position.", parsed.error.issues);
    return;
  }

  /*
    Keyed by the vehicle, not the driver.

    The node is world-readable. Keying it by uid meant the key itself was a
    stable identifier for a person - anyone watching the public map could
    follow one driver across days, even with names and emails long since
    stripped out. A bus is not a person.
  */
  const node = ref(
    rtdb,
    `${REMOTE_PATHS.BUS_LOCATIONS}/${routeId}/${vehicleId}`
  );

  await set(node, payload);

  const statusNode = ref(
    rtdb,
    `${REMOTE_PATHS.VEHICLE_STATUS}/${vehicleId}`
  );

  try {
    await onDisconnect(node).remove();

    /*
      The free half of absence detection, and the only half a client can do.

      Rules fire on writes, so a device that simply goes quiet produces
      nothing for anything to notice - which is why unattended absence
      detection is the first thing here that genuinely needs a server. But a
      dropped SOCKET is different: the database itself notices that, and will
      run a write we registered in advance. So we register one.

      The position is still removed, because a stale marker on a public map is
      worse than no marker. What survives is the time it went, stamped by the
      server, so an operator looking hours later can tell "stopped reporting
      at 14:32" from "never started" - which the empty row alone cannot say.

      What this does NOT cover is a device that keeps its socket open and
      stops publishing anyway - a frozen app, or GPS permission withdrawn
      mid-shift. That case still needs something server-side on a timer.

      Deliberately NOT written on every publish. While a bus is reporting, its
      position already carries the time of the last report; a second write
      would say the same thing, double the write rate, and halve the capacity
      ceiling the whole fleet is sized against. This node only has to be right
      once the position is gone.
    */
    await onDisconnect(statusNode).set({ lastSeenAt: serverTimestamp() });
  } catch (error) {
    console.error("Could not arm automatic cleanup for this vehicle:", error);
  }
};

/**
 * The vehicle this driver may currently publish as, or null.
 *
 * Read live rather than fetched once. An assignment expires on its own - that
 * is the whole point of a bounded window - so a screen that read it at login
 * would go on offering a Start button for a shift that ended hours ago, and
 * the driver would discover it as a write the database refused.
 *
 * A driver may read only their own node; the rules refuse the rest of the
 * roster, because who else is on shift and in which bus is staff scheduling.
 */
export const subscribeToAssignment = (
  driverUid: string,
  onAssignment: (vehicleId: string | null) => void,
  onError?: (error: Error) => void
): (() => void) => {
  let cancelled = false;
  let detach: () => void = () => {};

  void (async () => {
    const { ref, onValue, off, rtdb } = await database();

    if (cancelled) return;

    if (!rtdb) {
      onAssignment(null);
      return;
    }

    const node = ref(rtdb, `${REMOTE_PATHS.ASSIGNMENTS}/${driverUid}`);

    const handle = (snapshot: { val: () => unknown }) => {
      const parsed = assignmentSchema.safeParse(snapshot.val());

      if (!parsed.success) {
        onAssignment(null);
        return;
      }

      /*
        Judged against server time, like every other freshness decision here.
        A device whose clock is wrong must not be able to talk itself into a
        shift that has not started or has already finished.
      */
      onAssignment(
        assignedVehicle({ ...parsed.data, driverUid }, serverNow())
      );
    };

    onValue(node, handle, (error) => {
      console.error("Could not read this driver's assignment:", error);
      onError?.(error);
      onAssignment(null);
    });

    detach = () => off(node, "value", handle);
  })();

  return () => {
    cancelled = true;
    detach();
  };
};

/**
 * Every current assignment, as a driver-uid to vehicle-id map.
 *
 * The operator's view of who is in which bus. Gated on its own allowlist -
 * Realtime Database rules cannot read a Firestore role, which is the same
 * reason `driverAllowlist` exists as a separate node - so a caller who is not
 * on it receives an empty map rather than an error. That reads correctly as
 * "nobody is on shift", which is also what an operator with no roster sees.
 *
 * Expired assignments are dropped here rather than surfaced, because an
 * assignment that has run out authorises nothing and showing it would suggest
 * somebody is driving who is not.
 */
export const subscribeToAssignments = (
  onAssignments: (byDriver: Record<string, string>) => void
): (() => void) => {
  let cancelled = false;
  let detach: () => void = () => {};

  void (async () => {
    const { ref, onValue, off, rtdb } = await database();

    if (cancelled) return;

    if (!rtdb) {
      onAssignments({});
      return;
    }

    const node = ref(rtdb, REMOTE_PATHS.ASSIGNMENTS);

    const handle = (snapshot: { val: () => unknown }) => {
      const raw: unknown = snapshot.val();

      if (typeof raw !== "object" || raw === null) {
        onAssignments({});
        return;
      }

      const now = serverNow();
      const byDriver: Record<string, string> = {};

      for (const [driverUid, value] of Object.entries(raw)) {
        const parsed = assignmentSchema.safeParse(value);

        if (!parsed.success) continue;

        const vehicleId = assignedVehicle({ ...parsed.data, driverUid }, now);

        if (vehicleId) byDriver[driverUid] = vehicleId;
      }

      onAssignments(byDriver);
    };

    onValue(node, handle, () => onAssignments({}));

    detach = () => off(node, "value", handle);
  })();

  return () => {
    cancelled = true;
    detach();
  };
};

/**
 * When each vehicle was last heard from, by vehicle id.
 *
 * Only meaningful for a vehicle that is NOT currently reporting - while it is,
 * its position carries a fresher timestamp. This is what lets an operator
 * looking at a quiet fleet hours later tell "stopped at 14:32" from "never
 * started", which an empty row cannot say on its own.
 */
export const subscribeToVehicleStatus = (
  onStatus: (lastSeenByVehicle: Record<string, number>) => void
): (() => void) => {
  let cancelled = false;
  let detach: () => void = () => {};

  void (async () => {
    const { ref, onValue, off, rtdb } = await database();

    if (cancelled) return;

    if (!rtdb) {
      onStatus({});
      return;
    }

    const node = ref(rtdb, REMOTE_PATHS.VEHICLE_STATUS);

    const handle = (snapshot: { val: () => unknown }) => {
      const raw: unknown = snapshot.val();

      if (typeof raw !== "object" || raw === null) {
        onStatus({});
        return;
      }

      const lastSeen: Record<string, number> = {};

      for (const [vehicleId, value] of Object.entries(raw)) {
        const at = (value as { lastSeenAt?: unknown })?.lastSeenAt;

        if (typeof at === "number" && Number.isFinite(at)) {
          lastSeen[vehicleId] = at;
        }
      }

      onStatus(lastSeen);
    };

    onValue(node, handle, () => onStatus({}));

    detach = () => off(node, "value", handle);
  })();

  return () => {
    cancelled = true;
    detach();
  };
};

/** Removes the driver's position when they stop sharing. */
export const stopPublishing = async (
  actor: Actor | null,
  vehicleId: string,
  routeId: RouteId
): Promise<void> => {
  if (!actor || !isVehicleId(vehicleId)) return;

  const { ref, remove, serverTimestamp, set, rtdb } = await database();
  if (!rtdb) return;

  await remove(
    ref(rtdb, `${REMOTE_PATHS.BUS_LOCATIONS}/${routeId}/${vehicleId}`)
  );

  /*
    A deliberate stop is also a last sighting, and unlike the disconnect
    registration this one is certain to run. One write per shift end.
  */
  try {
    await set(
      ref(rtdb, `${REMOTE_PATHS.VEHICLE_STATUS}/${vehicleId}`),
      { lastSeenAt: serverTimestamp() }
    );
  } catch (error) {
    console.error("Could not record this vehicle's last report:", error);
  }
};

/**
 * Subscribes to live bus positions.
 *
 * Deliberately keeps a synchronous signature returning an unsubscribe
 * function, even though loading the SDK is asynchronous: React effects need
 * to return their cleanup immediately. Unsubscribing before the SDK finishes
 * loading is handled by the `cancelled` flag, so a component that mounts and
 * unmounts quickly never leaves a listener attached.
 *
 * Every entry is schema-checked. A malformed or hostile record - a string
 * where a latitude should be, an injected extra field - is dropped rather
 * than rendered, so the public node cannot drive the UI into a bad state.
 */
export const subscribeToBuses = (
  onBuses: (buses: LiveBus[]) => void,
  onError?: (error: Error) => void,
  options: SubscribeOptions = {}
): (() => void) => {
  let cancelled = false;
  let detach: () => void = () => {};
  const gate = createTelemetryGate();

  void (async () => {
    const { ref, onValue, off, rtdb } = await database();

    if (cancelled) return;

    if (!rtdb) {
      onError?.(new Error("Live tracking is unavailable."));
      onBuses([]);
      return;
    }

    /*
      Subscribing to the shard rather than filtering after the fact. This is
      the whole point: a route-scoped viewer never receives the other routes'
      buses, so the bytes are not spent and then thrown away.
    */
    const node = ref(
      rtdb,
      options.routeId
        ? `${REMOTE_PATHS.BUS_LOCATIONS}/${options.routeId}`
        : REMOTE_PATHS.BUS_LOCATIONS
    );

    const handleValue = (snapshot: DataSnapshot) => {
      if (!snapshot.exists()) {
        onBuses([]);
        return;
      }

      const raw: unknown = snapshot.val();

      if (typeof raw !== "object" || raw === null) {
        onBuses([]);
        return;
      }

      const buses: LiveBus[] = [];
      let unreadable = 0;
      let unknownRoutes = 0;

      /*
        One shard or all of them, and the difference is what makes sharding
        worth anything. Subscribed to a single route, the snapshot is already
        just that route's buses - nothing is fetched and discarded. Subscribed
        to the parent, it is a route-keyed map of them, and a whole-fleet view
        still costs exactly one listener rather than one per route.
      */
      const shards: Array<[string | undefined, unknown]> = options.routeId
        ? [[options.routeId, raw]]
        : Object.entries(raw as Record<string, unknown>);

      for (const [shardRoute, contents] of shards) {
        if (typeof contents !== "object" || contents === null) {
          unreadable += 1;
          continue;
        }

        /*
          The route is the path. A build that predates a new route still shows
          those buses on the map - they simply arrive without a label, which
          costs the bus its route name and never its position.
        */
        const routeId = isRouteId(shardRoute) ? shardRoute : undefined;

        if (shardRoute !== undefined && routeId === undefined) unknownRoutes += 1;

        for (const [vehicleId, value] of Object.entries(
          contents as Record<string, unknown>
        )) {
          const parsed = inboundBusPositionSchema.safeParse(value);

          if (!parsed.success) {
            unreadable += 1;
            continue;
          }

          buses.push({
            ...parsed.data,
            routeId,
            /*
              The key, not a field. A published `busId` disagreeing with the
              node it lives under would be a second, contradictory answer to
              "which bus is this?", and only one of them is the one the rules
              authorised.
            */
            busId: vehicleId,
          });
        }
      }

      /*
        Counted rather than silently dropped. A bare `continue` here meant a
        malformed or newer record left no trace at all, so a passenger seeing
        fewer buses than exist had nothing to report and we had nothing to
        look at.
      */
      if (unreadable > 0 || unknownRoutes > 0) {
        console.warn(
          `Live buses: ${unreadable} position(s) could not be read, ` +
            `${unknownRoutes} on a route this build does not know.`
        );
      }

      /*
        Everything is gated before the caller sees it.

        The node is world-readable and, until the rules are deployed, writable
        by any signed-in account - so a timestamp from next week, a position at
        (0, 0) or a vehicle that teleports across the state are all things the
        UI could otherwise be driven with. The gate lives in this closure so it
        keeps its per-vehicle history for the life of the subscription, which
        is what makes the ordering and jump checks possible at all.
      */
      const now = serverNow();
      const believable = new Set(
        acceptTelemetry(gate, toTelemetry(buses, now), now).map(
          (telemetry) => telemetry.vehicleId
        )
      );

      onBuses(buses.filter((bus) => believable.has(bus.busId)));
    };

    onValue(node, handleValue, (error) => {
      console.error("Live bus subscription failed:", error);
      onError?.(error);
      onBuses([]);
    });

    /*
      Tracked alongside the fleet rather than on its own, so the offset is
      known for exactly as long as something is reading positions.
    */
    const offsetNode = ref(rtdb, ".info/serverTimeOffset");

    const handleOffset = (snapshot: { val: () => unknown }) => {
      const value = snapshot.val();

      if (typeof value === "number" && Number.isFinite(value)) {
        serverTimeOffsetMs = value;
      }
    };

    onValue(offsetNode, handleOffset);

    detach = () => {
      off(node, "value", handleValue);
      off(offsetNode, "value", handleOffset);
    };
  })();

  return () => {
    cancelled = true;
    detach();
  };
};
