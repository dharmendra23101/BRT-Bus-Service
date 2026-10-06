import type { DataSnapshot } from "firebase/database";

import { getRtdb } from "@/firebase";
import { REMOTE_PATHS } from "@/constants/config";

import { AuthorizationError } from "@/domain/auth/errors";
import {
  assignedVehicle,
  isVehicleId,
} from "@/domain/fleet/roster";

import {
  PERMISSIONS,
  can,
} from "@/domain/auth/permissions";

import { fromDriverRecord } from "@/domain/fleet/adapters";

import {
  classifyAll,
  isPassengerVisible,
  type ClassifiedVehicle,
} from "@/domain/fleet/state";

import {
  acceptTelemetry,
  createTelemetryGate,
} from "@/domain/fleet/validation";

import type { VehicleTelemetry } from "@/domain/fleet/telemetry";

import {
  isRouteId,
  type RouteId,
} from "@/domain/transit/routes";

import {
  assignmentSchema,
  busPositionSchema,
  inboundBusPositionSchema,
  type ValidatedBusPosition,
} from "@/domain/validation/schemas";

import type { Actor } from "@/types/user";


/* ============================================================
   TYPES
   ============================================================ */

export interface LiveBus
  extends ValidatedBusPosition {
  busId: string;

  /*
   * Your existing Firebase records do not currently contain
   * routeId.
   *
   * It is optional so older records continue working.
   */
  routeId?: RouteId;
}


export interface SubscribeOptions {
  routeId?: RouteId;
}


/* ============================================================
   FIREBASE SDK
   ============================================================ */

let sdkPromise:
  Promise<typeof import("firebase/database")> | null = null;


const database = async () => {
  sdkPromise ??= import("firebase/database");

  const [sdk, rtdb] = await Promise.all([
    sdkPromise,
    getRtdb(),
  ]);

  return {
    ...sdk,
    rtdb,
  };
};


/* ============================================================
   LIVE TRACKING AVAILABILITY
   ============================================================ */

export const isLiveTrackingAvailable =
  async (): Promise<boolean> =>
    (await getRtdb()) !== null;


/* ============================================================
   SERVER TIME
   ============================================================ */

let serverTimeOffsetMs = 0;


export const serverNow = (): number =>
  Date.now() + serverTimeOffsetMs;


export const resetServerTimeOffset = (): void => {
  serverTimeOffsetMs = 0;
};


/* ============================================================
   TELEMETRY / CLASSIFICATION
   ============================================================ */

export const classifyBuses = (
  buses: LiveBus[],
  now = Date.now()
): ClassifiedVehicle[] =>
  classifyAll(
    toTelemetry(buses, now),
    now
  );


export const selectFreshBuses = (
  buses: LiveBus[],
  now = Date.now()
): ClassifiedVehicle[] =>
  classifyBuses(
    buses,
    now
  ).filter(isPassengerVisible);


export const toTelemetry = (
  buses: readonly LiveBus[],
  receivedAt = Date.now()
): VehicleTelemetry[] =>
  buses.map((bus) =>
    fromDriverRecord(
      bus.busId,
      {
        busId: bus.busId,
        lat: bus.lat,
        lng: bus.lng,
        updatedAt: bus.updatedAt,
        routeId: bus.routeId,
      },
      receivedAt
    )
  );


/* ============================================================
   COORDINATES
   ============================================================ */

export interface Coords {
  latitude: number;
  longitude: number;
}


/* ============================================================
   PUBLISH DRIVER LOCATION
   ============================================================

   YOUR ACTUAL FIREBASE STRUCTURE:

   busLocations/
      DRIVER_UID/
         email
         lat
         lng
         name
         updatedAt

   We therefore write to:

   busLocations/{actor.uid}

   NOT:

   busLocationsByRoute/{routeId}/{vehicleId}
   ============================================================ */

export const publishLocation = async (
  actor: Actor | null,
  coords: Coords,
  vehicleId: string,
  routeId?: RouteId
): Promise<void> => {

  if (
    !can(
      actor,
      PERMISSIONS.PUBLISH_LOCATION
    )
  ) {
    throw new AuthorizationError(
      PERMISSIONS.PUBLISH_LOCATION
    );
  }

  if (!actor) {
    throw new AuthorizationError(
      PERMISSIONS.PUBLISH_LOCATION
    );
  }

  if (!isVehicleId(vehicleId)) {
    throw new Error(
      "No vehicle is assigned to this driver."
    );
  }

  const {
    onDisconnect,
    ref,
    serverTimestamp,
    set,
    rtdb,
  } = await database();

  if (!rtdb) {
    return;
  }


  /*
   * Keep the existing Firebase structure.
   *
   * We intentionally do NOT require routeId here.
   *
   * The current Firebase node does not use routeId.
   */
  const actorData =
    actor as Actor & {
      email?: string | null;
      name?: string | null;
      displayName?: string | null;
    };


  /*
   * Keep the fields that already exist in your Firebase.
   */
  const payload: Record<string, unknown> = {
    lat: coords.latitude,
    lng: coords.longitude,
    updatedAt: serverTimestamp(),
  };


  /*
   * Preserve email if available.
   */
  if (actorData.email) {
    payload.email = actorData.email;
  }


  /*
   * Preserve name if available.
   */
  const name =
    actorData.name ??
    actorData.displayName;

  if (name) {
    payload.name = name;
  }


  /*
   * If routeId exists, preserve it in the record.
   *
   * This does NOT affect old Firebase records.
   */
  if (
    routeId &&
    isRouteId(routeId)
  ) {
    payload.routeId = routeId;
  }


  /*
   * Validate coordinates before writing.
   */
  const parsed =
    busPositionSchema.safeParse({
      lat: coords.latitude,
      lng: coords.longitude,
      updatedAt: serverTimestamp(),
    });


  if (!parsed.success) {
    console.error(
      "Refusing to publish an invalid position.",
      parsed.error.issues
    );

    return;
  }


  /*
   * ==========================================================
   * IMPORTANT
   *
   * Actual Firebase path:
   *
   * busLocations/{driverUid}
   *
   * ==========================================================
   */
  const node = ref(
    rtdb,
    `busLocations/${actor.uid}`
  );


  await set(
    node,
    payload
  );


  /*
   * Vehicle status remains unchanged.
   */
  const statusNode = ref(
    rtdb,
    `${REMOTE_PATHS.VEHICLE_STATUS}/${vehicleId}`
  );


  try {

    await onDisconnect(
      node
    ).remove();

    await onDisconnect(
      statusNode
    ).set({
      lastSeenAt:
        serverTimestamp(),
    });

  } catch (error) {

    console.error(
      "Could not arm automatic cleanup for this vehicle:",
      error
    );
  }
};


/* ============================================================
   DRIVER ASSIGNMENT
   ============================================================ */

export const subscribeToAssignment = (
  driverUid: string,
  onAssignment: (
    vehicleId: string | null
  ) => void,
  onError?: (
    error: Error
  ) => void
): (() => void) => {

  let cancelled = false;

  let detach: () => void = () => {};


  void (async () => {

    const {
      ref,
      onValue,
      off,
      rtdb,
    } = await database();


    if (cancelled) {
      return;
    }


    if (!rtdb) {
      onAssignment(null);
      return;
    }


    const node = ref(
      rtdb,
      `${REMOTE_PATHS.ASSIGNMENTS}/${driverUid}`
    );


    const handle = (
      snapshot: {
        val: () => unknown;
      }
    ) => {

      const parsed =
        assignmentSchema.safeParse(
          snapshot.val()
        );


      if (!parsed.success) {
        onAssignment(null);
        return;
      }


      onAssignment(
        assignedVehicle(
          {
            ...parsed.data,
            driverUid,
          },
          serverNow()
        )
      );
    };


    onValue(
      node,
      handle,
      (error) => {

        console.error(
          "Could not read this driver's assignment:",
          error
        );

        onError?.(error);

        onAssignment(null);
      }
    );


    detach = () =>
      off(
        node,
        "value",
        handle
      );

  })();


  return () => {
    cancelled = true;
    detach();
  };
};


/* ============================================================
   ALL ASSIGNMENTS
   ============================================================ */

export const subscribeToAssignments = (
  onAssignments: (
    byDriver: Record<string, string>
  ) => void
): (() => void) => {

  let cancelled = false;

  let detach: () => void = () => {};


  void (async () => {

    const {
      ref,
      onValue,
      off,
      rtdb,
    } = await database();


    if (cancelled) {
      return;
    }


    if (!rtdb) {
      onAssignments({});
      return;
    }


    const node = ref(
      rtdb,
      REMOTE_PATHS.ASSIGNMENTS
    );


    const handle = (
      snapshot: {
        val: () => unknown;
      }
    ) => {

      const raw =
        snapshot.val();


      if (
        typeof raw !== "object" ||
        raw === null
      ) {
        onAssignments({});
        return;
      }


      const now =
        serverNow();


      const byDriver:
        Record<string, string> = {};


      for (
        const [
          driverUid,
          value,
        ] of Object.entries(raw)
      ) {

        const parsed =
          assignmentSchema.safeParse(
            value
          );


        if (!parsed.success) {
          continue;
        }


        const vehicleId =
          assignedVehicle(
            {
              ...parsed.data,
              driverUid,
            },
            now
          );


        if (vehicleId) {
          byDriver[driverUid] =
            vehicleId;
        }
      }


      onAssignments(
        byDriver
      );
    };


    onValue(
      node,
      handle,
      () => onAssignments({})
    );


    detach = () =>
      off(
        node,
        "value",
        handle
      );

  })();


  return () => {
    cancelled = true;
    detach();
  };
};


/* ============================================================
   VEHICLE STATUS
   ============================================================ */

export const subscribeToVehicleStatus = (
  onStatus: (
    lastSeenByVehicle:
      Record<string, number>
  ) => void
): (() => void) => {

  let cancelled = false;

  let detach: () => void = () => {};


  void (async () => {

    const {
      ref,
      onValue,
      off,
      rtdb,
    } = await database();


    if (cancelled) {
      return;
    }


    if (!rtdb) {
      onStatus({});
      return;
    }


    const node = ref(
      rtdb,
      REMOTE_PATHS.VEHICLE_STATUS
    );


    const handle = (
      snapshot: {
        val: () => unknown;
      }
    ) => {

      const raw =
        snapshot.val();


      if (
        typeof raw !== "object" ||
        raw === null
      ) {
        onStatus({});
        return;
      }


      const lastSeen:
        Record<string, number> = {};


      for (
        const [
          vehicleId,
          value,
        ] of Object.entries(raw)
      ) {

        const at =
          (
            value as {
              lastSeenAt?: unknown;
            }
          )?.lastSeenAt;


        if (
          typeof at === "number" &&
          Number.isFinite(at)
        ) {
          lastSeen[vehicleId] =
            at;
        }
      }


      onStatus(
        lastSeen
      );
    };


    onValue(
      node,
      handle,
      () => onStatus({})
    );


    detach = () =>
      off(
        node,
        "value",
        handle
      );

  })();


  return () => {
    cancelled = true;
    detach();
  };
};


/* ============================================================
   STOP PUBLISHING
   ============================================================ */

export const stopPublishing = async (
  actor: Actor | null,
  vehicleId: string,
  routeId: RouteId
): Promise<void> => {

  if (
    !actor ||
    !isVehicleId(vehicleId)
  ) {
    return;
  }


  const {
    ref,
    remove,
    serverTimestamp,
    set,
    rtdb,
  } = await database();


  if (!rtdb) {
    return;
  }


  /*
   * IMPORTANT:
   *
   * Remove the same node used by publishLocation:
   *
   * busLocations/{actor.uid}
   */
  await remove(
    ref(
      rtdb,
      `busLocations/${actor.uid}`
    )
  );


  /*
   * Preserve existing vehicle-status functionality.
   */
  try {

    await set(
      ref(
        rtdb,
        `${REMOTE_PATHS.VEHICLE_STATUS}/${vehicleId}`
      ),
      {
        lastSeenAt:
          serverTimestamp(),
      }
    );

  } catch (error) {

    console.error(
      "Could not record this vehicle's last report:",
      error
    );
  }
};


/* ============================================================
   LIVE BUS SUBSCRIPTION
   ============================================================

   ACTUAL FIREBASE:

   busLocations/
      Ri7ed4NyCfZGR4zPlmj03JEhyFv2/
         email
         lat
         lng
         name
         updatedAt

   Therefore:

   READ /busLocations

   NOT:

   /busLocationsByRoute
   /busLocations/{routeId}
   /busLocations/{routeId}/{vehicleId}
   ============================================================ */

export const subscribeToBuses = (
  onBuses: (
    buses: LiveBus[]
  ) => void,
  onError?: (
    error: Error
  ) => void,
  _options: SubscribeOptions = {}
): (() => void) => {

  let cancelled = false;

  let detach: () => void = () => {};

  const gate =
    createTelemetryGate();


  void (async () => {

    try {

      const {
        ref,
        onValue,
        off,
        rtdb,
      } = await database();


      if (cancelled) {
        return;
      }


      if (!rtdb) {

        onError?.(
          new Error(
            "Live tracking is unavailable."
          )
        );

        onBuses([]);

        return;
      }


      /*
       * ========================================================
       * THE MAIN FIX
       * ========================================================
       *
       * Always read the actual existing node.
       */
      const node = ref(
        rtdb,
        "busLocations"
      );


      const handleValue = (
        snapshot: DataSnapshot
      ) => {

        if (!snapshot.exists()) {
          onBuses([]);
          return;
        }


        const raw:
          unknown =
          snapshot.val();


        if (
          typeof raw !== "object" ||
          raw === null
        ) {
          onBuses([]);
          return;
        }


        const buses:
          LiveBus[] = [];


        let unreadable = 0;


        /*
         * Each direct child is one bus/driver.
         *
         * Example:
         *
         * busLocations/
         *    UID/
         *       lat
         *       lng
         *       updatedAt
         */
        for (
          const [
            busId,
            value,
          ] of Object.entries(
            raw as Record<
              string,
              unknown
            >
          )
        ) {

          if (
            typeof value !== "object" ||
            value === null
          ) {

            unreadable++;
            continue;
          }


          const record =
            value as Record<
              string,
              unknown
            >;


          /*
           * Build exactly the position object
           * expected by your existing schema.
           */
          const position = {
            lat:
              record.lat,

            lng:
              record.lng,

            updatedAt:
              record.updatedAt,
          };


          const parsed =
            inboundBusPositionSchema.safeParse(
              position
            );


          if (!parsed.success) {

            unreadable++;

            console.warn(
              "Ignoring invalid live bus record:",
              busId,
              parsed.error.issues
            );

            continue;
          }


          /*
           * Route is optional.
           *
           * Existing Firebase records don't have
           * routeId, but if you later add it,
           * the code automatically preserves it.
           */
          let routeId:
            RouteId | undefined;


          if (
            typeof record.routeId ===
              "string" &&
            isRouteId(
              record.routeId
            )
          ) {

            routeId =
              record.routeId;
          }


          buses.push({
            ...parsed.data,
            busId,
            routeId,
          });
        }


        if (unreadable > 0) {

          console.warn(
            `Live buses: ${unreadable} ` +
            `record(s) could not be read.`
          );
        }


        /*
         * Existing telemetry validation remains active.
         */
        const now =
          serverNow();


        const believable =
          new Set(
            acceptTelemetry(
              gate,
              toTelemetry(
                buses,
                now
              ),
              now
            ).map(
              (telemetry) =>
                telemetry.vehicleId
            )
          );


        onBuses(
          buses.filter(
            (bus) =>
              believable.has(
                bus.busId
              )
          )
        );
      };


      onValue(
        node,
        handleValue,
        (error) => {

          console.error(
            "Live bus subscription failed:",
            error
          );

          onError?.(
            error
          );

          onBuses([]);
        }
      );


      /*
       * Firebase server-time offset.
       */
      const offsetNode =
        ref(
          rtdb,
          ".info/serverTimeOffset"
        );


      const handleOffset = (
        snapshot: {
          val: () => unknown;
        }
      ) => {

        const value =
          snapshot.val();


        if (
          typeof value ===
            "number" &&
          Number.isFinite(value)
        ) {

          serverTimeOffsetMs =
            value;
        }
      };


      onValue(
        offsetNode,
        handleOffset
      );


      detach = () => {

        off(
          node,
          "value",
          handleValue
        );

        off(
          offsetNode,
          "value",
          handleOffset
        );
      };

    } catch (error) {

      console.error(
        "Could not initialize live bus subscription:",
        error
      );

      onError?.(
        error instanceof Error
          ? error
          : new Error(
              "Could not initialize live tracking."
            )
      );

      onBuses([]);
    }

  })();


  return () => {

    cancelled = true;

    detach();
  };
};
