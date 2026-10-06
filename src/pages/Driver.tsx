import { useCallback, useEffect, useId, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { POLLING } from "@/constants/config";
import { useAuth } from "@/contexts/AuthContext";
import { toSafeMessage } from "@/domain/auth/errors";
import type { TranslationKey } from "@/domain/i18n/en";
import { useTranslation } from "@/contexts/LocaleContext";
import { PERMISSIONS, can } from "@/domain/auth/permissions";
import { ROUTE_IDS, getRoute, type RouteId } from "@/domain/transit/routes";
import {
  SHARING_MESSAGES,
  interruptionReason,
  sharingHealth,
} from "@/domain/fleet/sharing";
import { useNow } from "@/hooks/use-now";
import { useAnnounce } from "@/components/a11y/LiveAnnouncer";
import {
  isLiveTrackingAvailable,
  publishLocation,
  stopPublishing,
  subscribeToAssignment,
} from "@/services/locationService";

interface DriverCoords {
  latitude: number;
  longitude: number;
}

/**
 * Driver location broadcasting.
 *
 * The route guard already refuses non-drivers, but the capability is checked
 * again here before any publish. That redundancy is deliberate: a guard
 * decides what renders, this decides what is written.
 */
const Driver = () => {
  const { t } = useTranslation();
  const { user, actor } = useAuth();

  const [isSharing, setIsSharing] = useState(false);
  const [routeId, setRouteId] = useState<RouteId>(ROUTE_IDS[0]);
  const [coords, setCoords] = useState<DriverCoords | null>(null);
  const [error, setError] = useState<TranslationKey | "">("");

  /*
    Which bus this driver may publish as, read live.

    `undefined` means we have not been told yet; `null` means we have, and the
    answer is nobody has assigned them one. The distinction matters on screen:
    "checking" and "you have no bus" are different things to be told, and
    showing the second while the first is true would be a false accusation.
  */
  const [vehicleId, setVehicleId] = useState<string | null | undefined>(
    undefined
  );

  useEffect(() => {
    if (!user) return;

    return subscribeToAssignment(user.uid, setVehicleId);
  }, [user]);

  /*
    Evidence, not intent. The indicator below is driven by when a publish last
    actually succeeded rather than by the Start button, because a background
    tab has its timers clamped and its geolocation suspended - so the old
    boolean showed a green "sharing" light while nothing was being sent.
  */
  const [lastPublishedAt, setLastPublishedAt] = useState<number | null>(null);
  const [wasHidden, setWasHidden] = useState(false);

  // A short tick so an interruption is noticed while the driver is looking at
  // the screen, rather than only when something else happens to re-render.
  const now = useNow(2_000);

  const mayPublish = can(actor, PERMISSIONS.PUBLISH_LOCATION);
  const announce = useAnnounce();
  const routeFieldId = useId();

  useEffect(() => {
    // No assignment, nothing to publish as - and the rules would refuse it.
    if (!isSharing || !mayPublish || !vehicleId) return;

    let cancelled = false;

    const publish = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (cancelled) return;

          const { latitude, longitude } = position.coords;
          setCoords({ latitude, longitude });

          publishLocation(actor, { latitude, longitude }, vehicleId!, routeId)
            .then(() => {
              if (cancelled) return;
              setLastPublishedAt(Date.now());
              setWasHidden(false);
            })
            .catch((err) => {
              if (cancelled) return;
              setError(toSafeMessage(err, "error.shareLocation"));
              setIsSharing(false);
            });
        },
        (geoError) => {
          if (cancelled) return;

          console.error("Geolocation failed:", geoError);
          setError(
            geoError.code === geoError.PERMISSION_DENIED
              ? "driver.error.permission"
              : "driver.error.readFailed"
          );
          setIsSharing(false);
        },
        { enableHighAccuracy: true }
      );
    };

    publish();
    const interval = setInterval(publish, POLLING.DRIVER_LOCATION_MS);

    /*
      Publish again the moment the tab comes back.

      A throttled interval may not fire for another minute, so without this the
      bus stays missing from the map long after the driver has returned to the
      screen. The hidden flag is recorded on the way out so the driver can be
      told what actually happened rather than a generic failure.
    */
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        setWasHidden(true);
        return;
      }

      publish();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isSharing, mayPublish, actor, routeId, vehicleId]);

  /**
   * Clears the published position when the driver stops or leaves the page,
   * so a stale marker does not sit on the public map after a shift ends.
   */
  const stop = useCallback(async () => {
    setIsSharing(false);
    setCoords(null);
    setLastPublishedAt(null);
    setWasHidden(false);

    try {
      if (vehicleId) await stopPublishing(actor, vehicleId, routeId);
    } catch (err) {
      console.error("Could not clear published location:", err);
    }
  }, [actor, vehicleId, routeId]);

  useEffect(() => {
    return () => {
      if (vehicleId) void stopPublishing(actor, vehicleId, routeId);
    };
  }, [actor, vehicleId, routeId]);

  const health = sharingHealth(
    isSharing,
    lastPublishedAt,
    now.getTime(),
    POLLING.DRIVER_LOCATION_MS
  );

  /*
    Announced once per interruption, not on every re-render: the health check
    re-evaluates every two seconds, and re-announcing would talk over the
    driver continuously.
  */
  useEffect(() => {
    if (health !== "interrupted") return;

    announce(
      t("driver.announce.interrupted", {
        reason: t(interruptionReason(wasHidden)),
      }),
      "assertive"
    );
  }, [health, wasHidden, announce, t]);

  const startSharing = async () => {
    setError("");

    // Resolves the on-demand Realtime Database load before promising the
    // driver that their position is being broadcast.
    if (!(await isLiveTrackingAvailable())) {
      setError("driver.error.unavailable");
      return;
    }

    setIsSharing(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main id="main-content" tabIndex={-1} className="py-20 px-4">
        <div className="max-w-xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center space-y-6">
            <h1 className="text-2xl font-bold text-primary-deep">{t("driver.title")}</h1>

            {vehicleId && (
              <p className="text-sm text-gray-500">
                {t("driver.broadcastingAs")}{" "}
                <span className="font-mono font-medium">{vehicleId}</span>
              </p>
            )}

            {vehicleId === undefined && (
              <p className="text-sm text-gray-500">{t("driver.checking")}</p>
            )}

            {/*
              The state this ships in, and it is not an error.

              Nobody has a bus until the operator issues an assignment, and an
              assignment expires on its own at the end of a shift. Both look
              the same from here, and in both cases the honest thing is to say
              there is nothing to broadcast as - rather than offer a Start
              button that produces a write the database refuses and an error
              the driver cannot act on.
            */}
            {vehicleId === null && (
              <div
                role="note"
                className="rounded-lg border border-primary/30 bg-accent px-4 py-3 text-left"
              >
                <p className="text-sm text-primary-deep">
                  <strong>{t("driver.noAssignment.lead")}</strong>{" "}
                  {t("driver.noAssignment.body")}
                </p>
              </div>
            )}

            <div className="text-left">
              <label
                htmlFor={routeFieldId}
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {t("driver.routeLabel")}
              </label>

              <select
                id={routeFieldId}
                value={routeId}
                disabled={isSharing}
                onChange={(event) => setRouteId(event.target.value as RouteId)}
                className="w-full bg-gray-50 rounded-lg px-4 py-2.5 border-2 border-input focus:border-primary transition-colors disabled:opacity-60"
              >
                {ROUTE_IDS.map((id) => (
                  <option key={id} value={id}>
                    {getRoute(id).name} — {getRoute(id).headline}
                  </option>
                ))}
              </select>

              {isSharing && (
                <p className="text-xs text-gray-500 mt-1">
                  {t("driver.stopToChange")}
                </p>
              )}
            </div>

            <div className="flex justify-center items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  health === "sharing"
                    ? "bg-green-500 animate-pulse"
                    : health === "interrupted"
                      ? "bg-destructive"
                      : "bg-gray-400"
                }`}
              />
              <span className="text-sm font-medium">
                {t(SHARING_MESSAGES[health])}
                {health === "sharing" &&
                  t("driver.sharingOn", { route: getRoute(routeId).name })}
              </span>
            </div>

            {/*
              Spoken through the shared assertive region rather than by a role
              on this box - it does not exist until the interruption does, and
              a live region that appears with its message already inside it is
              not reliably announced. Colour alone certainly cannot carry it.
            */}
            {health === "interrupted" && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-left">
                <p className="text-sm font-semibold text-destructive">
                  {t("driver.interrupted.title")}
                </p>
                <p className="text-sm text-destructive mt-1">
                  {t(interruptionReason(wasHidden))}
                </p>
              </div>
            )}

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                <p className="text-sm text-destructive">{t(error)}</p>
              </div>
            )}

            {coords && (
              <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700">
                <p>
                  {t("driver.latitude")}: {coords.latitude}
                </p>
                <p>
                  {t("driver.longitude")}: {coords.longitude}
                </p>
              </div>
            )}

            <div className="flex justify-center gap-4">
              {!isSharing ? (
                <button
                  onClick={() => void startSharing()}
                  /*
                    Nothing to share as, so there is nothing to start. The
                    note above says why; a live button here would produce a
                    write the database refuses and an error the driver could
                    do nothing about.
                  */
                  disabled={!mayPublish || !vehicleId}
                  className="px-6 py-3 rounded-xl bg-green-600 text-white font-medium shadow hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("driver.start")}
                </button>
              ) : (
                <button
                  onClick={() => void stop()}
                  className="px-6 py-3 rounded-xl bg-destructive text-white font-medium shadow hover:bg-destructive transition"
                >
                  {t("driver.stop")}
                </button>
              )}
            </div>

            <p className="text-xs text-gray-400">
              {t("driver.privacy")}
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Driver;
