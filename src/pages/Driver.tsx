import { useEffect, useRef, useState } from "react";

import Header from "@/components/Header";
import Footer from "@/components/Footer";

import { useAuth } from "@/contexts/AuthContext";

import {
  ROUTE_IDS,
  getRoute,
  type RouteId,
} from "@/domain/transit/routes";

import { getRtdb } from "@/firebase";

import {
  PERMISSIONS,
  can,
} from "@/domain/auth/permissions";


interface DriverCoords {
  latitude: number;
  longitude: number;
}


const Driver = () => {
  const { actor } = useAuth();

  const [routeId, setRouteId] =
    useState<RouteId>(ROUTE_IDS[0]);

  const [isSharing, setIsSharing] =
    useState(false);

  const [starting, setStarting] =
    useState(false);

  const [coords, setCoords] =
    useState<DriverCoords | null>(null);

  const [error, setError] =
    useState("");

  const [lastSent, setLastSent] =
    useState<number | null>(null);


  /*
   * Firebase unique object ID for THIS
   * driver's current sharing session.
   *
   * Example:
   *
   * -Oabc123xyz
   */
  const locationIdRef =
    useRef<string | null>(null);


  /*
   * Prevent multiple location requests
   * from running at the same time.
   */
  const sendingRef =
    useRef(false);


  /*
   * 1-second interval.
   */
  const intervalRef =
    useRef<number | null>(null);


  /*
   * Prevent cleanup from running multiple times.
   */
  const cleanedRef =
    useRef(false);


  const mayPublish = can(
    actor,
    PERMISSIONS.PUBLISH_LOCATION
  );

  const actorDisplayName =
    (
      actor as
        | {
            name?: string;
            displayName?: string;
          }
        | null
    )?.name ??
    (
      actor as
        | {
            name?: string;
            displayName?: string;
          }
        | null
    )?.displayName ??
    "Driver";

  const actorEmail =
    (
      actor as
        | {
            email?: string;
          }
        | null
    )?.email ?? "";


  /* ============================================================
     CREATE UNIQUE FIREBASE LOCATION ID
     ============================================================ */

  const createLocationId = async () => {
    if (locationIdRef.current) {
      return locationIdRef.current;
    }

    const rtdb =
      await getRtdb();

    if (!rtdb) {
      throw new Error(
        "Realtime Database is unavailable."
      );
    }

    const {
      ref,
      push,
    } = await import(
      "firebase/database"
    );

    /*
     * IMPORTANT:
     *
     * push() generates a completely unique
     * Firebase key.
     *
     * Example:
     *
     * -Oabc123xyz
     */
    const newRef = push(
      ref(rtdb, "busLocations")
    );

    if (!newRef.key) {
      throw new Error(
        "Could not create a unique location ID."
      );
    }

    locationIdRef.current =
      newRef.key;

    return newRef.key;
  };


  /* ============================================================
     SEND LOCATION
     ============================================================ */

  const sendLocation = async () => {
    if (!actor) {
      return;
    }

    if (sendingRef.current) {
      return;
    }

    if (!navigator.geolocation) {
      setError(
        "Geolocation is not supported by this browser."
      );

      return;
    }

    sendingRef.current = true;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const latitude =
            position.coords.latitude;

          const longitude =
            position.coords.longitude;

          setCoords({
            latitude,
            longitude,
          });


          /* ====================================================
             GET UNIQUE LOCATION ID
             ==================================================== */

          const locationId =
            await createLocationId();


          /* ====================================================
             FIREBASE
             ==================================================== */

          const rtdb =
            await getRtdb();

          if (!rtdb) {
            throw new Error(
              "Realtime Database is unavailable."
            );
          }

          const {
            ref,
            set,
            serverTimestamp,
          } = await import(
            "firebase/database"
          );


          /*
           * IMPORTANT:
           *
           * We DO NOT write to:
           *
           * busLocations/${actor.uid}
           *
           * We write to:
           *
           * busLocations/${uniquePushId}
           *
           * Therefore different drivers cannot
           * overwrite each other.
           */

          const locationRef =
            ref(
              rtdb,
              `busLocations/${locationId}`
            );


          /*
           * EXACT structure requested.
           */
          await set(
            locationRef,
            {
              email:
                "",

              lat: latitude,

              lng: longitude,

              name:
                "Driver",

              updatedAt:
                serverTimestamp(),
            }
          );


          setLastSent(
            Date.now()
          );

          setError("");

        } catch (err) {
          console.error(
            "Location publish failed:",
            err
          );

          setError(
            err instanceof Error
              ? err.message
              : "Could not send location."
          );

        } finally {
          sendingRef.current = false;
        }
      },

      (geoError) => {
        console.error(
          "Geolocation error:",
          geoError
        );

        if (
          geoError.code ===
          geoError.PERMISSION_DENIED
        ) {
          setError(
            "Location permission was denied. Please allow location access."
          );
        } else if (
          geoError.code ===
          geoError.POSITION_UNAVAILABLE
        ) {
          setError(
            "Current location is unavailable."
          );
        } else {
          setError(
            "Could not get your current location."
          );
        }

        sendingRef.current = false;
      },

      {
        enableHighAccuracy: true,

        timeout: 10000,

        maximumAge: 0,
      }
    );
  };


  /* ============================================================
     START SHARING
     ============================================================ */

  const startSharing = async () => {
    if (!actor) {
      setError(
        "You must be logged in."
      );

      return;
    }

    if (!mayPublish) {
      setError(
        "You do not have permission to share your location."
      );

      return;
    }

    if (isSharing) {
      return;
    }

    setError("");

    setStarting(true);

    try {
      /*
       * Create unique Firebase object FIRST.
       *
       * This guarantees that this driver has
       * its own object before sending location.
       */
      await createLocationId();

      /*
       * Send first location immediately.
       */
      await sendLocation();

      setIsSharing(true);

      /*
       * Clear any old interval.
       */
      if (
        intervalRef.current !== null
      ) {
        window.clearInterval(
          intervalRef.current
        );
      }

      /*
       * SEND EVERY SECOND.
       */
      intervalRef.current =
        window.setInterval(() => {
          void sendLocation();
        }, 1000);

    } catch (err) {
      console.error(
        "Could not start sharing:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Could not start sharing."
      );

    } finally {
      setStarting(false);
    }
  };


  /* ============================================================
     STOP SHARING
     ============================================================ */

  const stopSharing = async () => {
    setIsSharing(false);

    setCoords(null);

    setLastSent(null);


    /*
     * Stop 1-second updates.
     */
    if (
      intervalRef.current !== null
    ) {
      window.clearInterval(
        intervalRef.current
      );

      intervalRef.current = null;
    }


    /*
     * Delete ONLY this driver's unique
     * Firebase object.
     */
    const locationId =
      locationIdRef.current;

    if (!locationId) {
      return;
    }


    try {
      const rtdb =
        await getRtdb();

      if (!rtdb) {
        return;
      }

      const {
        ref,
        remove,
      } = await import(
        "firebase/database"
      );

      await remove(
        ref(
          rtdb,
          `busLocations/${locationId}`
        )
      );

    } catch (err) {
      console.error(
        "Could not remove location:",
        err
      );
    }


    /*
     * Allow a NEW ID next time
     * Start Sharing is clicked.
     */
    locationIdRef.current =
      null;

    cleanedRef.current = false;
  };


  /* ============================================================
     CLEANUP
     ============================================================ */

  useEffect(() => {
    return () => {
      /*
       * Stop interval.
       */
      if (
        intervalRef.current !== null
      ) {
        window.clearInterval(
          intervalRef.current
        );

        intervalRef.current = null;
      }


      /*
       * Remove only our own unique object.
       */
      const locationId =
        locationIdRef.current;

      if (
        !locationId ||
        cleanedRef.current
      ) {
        return;
      }

      cleanedRef.current = true;


      void (async () => {
        try {
          const rtdb =
            await getRtdb();

          if (!rtdb) {
            return;
          }

          const {
            ref,
            remove,
          } = await import(
            "firebase/database"
          );

          await remove(
            ref(
              rtdb,
              `busLocations/${locationId}`
            )
          );

        } catch (err) {
          console.error(
            "Location cleanup failed:",
            err
          );
        }
      })();
    };
  }, []);


  /* ============================================================
     UI
     ============================================================ */

  return (
    <div className="min-h-screen bg-background">

      <Header />

      <main
        id="main-content"
        className="py-12 px-4"
      >

        <div className="max-w-xl mx-auto">

          <div className="bg-white rounded-2xl shadow-lg border p-8">

            {/* TITLE */}

            <div className="text-center mb-8">

              <h1 className="text-2xl font-bold text-primary-deep">
                Driver Live Tracking
              </h1>

              <p className="text-sm text-gray-500 mt-2">
                Share your live location
                with the BRT map.
              </p>

            </div>


            {/* DRIVER */}

            <div className="bg-gray-50 rounded-lg p-4 mb-5">

              <p className="text-xs text-gray-500">
                Driver
              </p>

              <p className="font-semibold text-gray-800 mt-1">
                {actorDisplayName}
              </p>

              <p className="text-xs text-gray-400 mt-1 break-all">
                {actorEmail}
              </p>

            </div>


            {/* ROUTE */}

            <div className="mb-5">

              <label
                htmlFor="route"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Route you are running
              </label>

              <select
                id="route"
                value={routeId}
                disabled={isSharing}
                onChange={(event) =>
                  setRouteId(
                    event.target
                      .value as RouteId
                  )
                }
                className="
                  w-full
                  px-4
                  py-3
                  rounded-lg
                  border
                  bg-white
                  outline-none
                  focus:ring-2
                  focus:ring-primary
                  disabled:bg-gray-100
                "
              >

                {ROUTE_IDS.map(
                  (id) => {
                    const route =
                      getRoute(id);

                    return (
                      <option
                        key={id}
                        value={id}
                      >
                        {route.name} —{" "}
                        {route.headline}
                      </option>
                    );
                  }
                )}

              </select>

            </div>


            {/* STATUS */}

            <div className="flex items-center justify-center gap-2 mb-6">

              <span
                className={`
                  w-3
                  h-3
                  rounded-full
                  ${
                    isSharing
                      ? "bg-green-500 animate-pulse"
                      : "bg-gray-400"
                  }
                `}
              />

              <span className="font-medium text-sm">
                {isSharing
                  ? "Sharing location"
                  : "Not sharing"}
              </span>

            </div>


            {/* ERROR */}

            {error && (
              <div className="mb-5 p-4 rounded-lg bg-red-50 border border-red-200">

                <p className="text-sm text-red-700">
                  {error}
                </p>

              </div>
            )}


            {/* CURRENT LOCATION */}

            {coords && (
              <div className="bg-gray-50 rounded-lg p-4 mb-5">

                <p className="text-sm font-medium text-gray-700 mb-3">
                  Current location
                </p>

                <div className="grid grid-cols-2 gap-4">

                  <div>
                    <p className="text-xs text-gray-500">
                      Latitude
                    </p>

                    <p className="font-mono text-sm mt-1">
                      {coords.latitude.toFixed(
                        7
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500">
                      Longitude
                    </p>

                    <p className="font-mono text-sm mt-1">
                      {coords.longitude.toFixed(
                        7
                      )}
                    </p>
                  </div>

                </div>

              </div>
            )}


            {/* LAST SENT */}

            {lastSent && (
              <p className="text-center text-xs text-gray-400 mb-5">
                Last location sent:{" "}
                {new Date(
                  lastSent
                ).toLocaleTimeString()}
              </p>
            )}


            {/* BUTTON */}

            <div className="flex justify-center">

              {!isSharing ? (

                <button
                  type="button"
                  onClick={() =>
                    void startSharing()
                  }
                  disabled={
                    starting ||
                    !mayPublish
                  }
                  className="
                    px-8
                    py-3
                    rounded-xl
                    bg-green-600
                    text-white
                    font-semibold
                    hover:bg-green-700
                    transition
                    disabled:opacity-50
                    disabled:cursor-not-allowed
                  "
                >
                  {starting
                    ? "Starting..."
                    : "Start Sharing"}
                </button>

              ) : (

                <button
                  type="button"
                  onClick={() =>
                    void stopSharing()
                  }
                  className="
                    px-8
                    py-3
                    rounded-xl
                    bg-red-600
                    text-white
                    font-semibold
                    hover:bg-red-700
                    transition
                  "
                >
                  Stop Sharing
                </button>

              )}

            </div>


            {/* INFO */}

            <div className="mt-6 text-center">

              <p className="text-xs text-gray-400">
                Location is sent every second
                while sharing.
              </p>

              {locationIdRef.current && (
                <p className="text-[10px] text-gray-300 mt-2 break-all">
                  Location ID:{" "}
                  {locationIdRef.current}
                </p>
              )}

            </div>

          </div>

        </div>

      </main>

      <Footer />

    </div>
  );
};

export default Driver;
