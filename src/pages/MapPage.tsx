import { useCallback, useEffect, useMemo, useState } from "react";
import { Pause, Play } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { MAP_CONFIG, POLLING } from "@/constants/config";
import { serviceClockLabel } from "@/domain/transit/calendar";
import { useAnnounce } from "@/components/a11y/LiveAnnouncer";
import { DEFAULT_MAP_CENTER } from "@/domain/transit/stops";
import { ROUTE_IDS, destinationOf, getRoute, type RouteId } from "@/domain/transit/routes";
import { STATE_DESCRIPTIONS, STATE_LABELS } from "@/domain/fleet/state";
import { useTranslation } from "@/contexts/LocaleContext";
import { hasPosition } from "@/domain/fleet/telemetry";
import {
  selectFreshBuses,
  serverNow,
  subscribeToBuses,
  type LiveBus,
} from "@/services/locationService";

/**
 * Public live-tracking map.
 *
 * This page is deliberately reachable without signing in, which is why the
 * table below shows only an opaque bus label and coordinates. The driver
 * names and email addresses it used to display were personal data on a
 * world-readable page; they are no longer published at all.
 */
const MapPage = () => {
  const { t } = useTranslation();
  const [buses, setBuses] = useState<LiveBus[]>([]);
  /* Empty means the whole fleet, which stays the default. */
  const [routeId, setRouteId] = useState<RouteId | "">("");
  const [checkedAt, setCheckedAt] = useState(() => serverNow());
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  /*
    WCAG 2.2.2. This page auto-updates vehicle information indefinitely
    alongside other content, so it has to offer a way to stop it - for anyone
    reading with a screen magnifier, anyone whose attention the movement takes
    away, and anyone simply trying to write down a bus number before the row
    moves.

    Freezing is a display decision, not a connection one: the subscription
    stays open, so resuming shows the present rather than replaying a backlog.
    The snapshot keeps the instant it was taken, because a frozen view that
    does not say it is frozen is the same lie as a stale one presented as
    current.
  */
  const [frozen, setFrozen] = useState<{ buses: LiveBus[]; at: number } | null>(
    null
  );

  const paused = frozen !== null;

  const announce = useAnnounce();

  const togglePaused = useCallback(() => {
    setFrozen((current) => {
      if (current) return null;

      return { buses, at: checkedAt };
    });

    if (paused) {
      // Resuming jumps to now rather than to whenever the next tick lands.
      setCheckedAt(serverNow());
      announce(t("map.announce.resumed"));
    } else {
      announce(
        t("map.announce.paused", {
          time: serviceClockLabel(new Date(checkedAt)),
        })
      );
    }
  }, [announce, buses, checkedAt, paused, t]);

  /*
    Availability is reported through the error callback rather than checked
    up front, because the Realtime Database SDK is now loaded on demand and
    an effect must return its cleanup synchronously.
  */
  /*
    Re-subscribed when the chosen route changes, and that is the point.
    Positions are sharded by route, so narrowing here narrows what the
    database SENDS - the other routes' buses are never delivered rather than
    delivered and filtered away. On a corridor with eight routes that is most
    of the traffic a passenger watching one of them would otherwise pay for.
  */
  useEffect(() => {
    setLoading(true);

    return subscribeToBuses(
      (next) => {
        setBuses(next);
        setCheckedAt(serverNow());
        setLoading(false);
      },
      () => {
        setFailed(true);
        setLoading(false);
      },
      routeId ? { routeId } : {}
    );
  }, [routeId]);

  /*
    A bus that stops reporting produces no further snapshot, so nothing would
    re-render to retire it. Re-checking against the clock is what makes the
    staleness rule hold while the tab stays open.
  */
  useEffect(() => {
    if (paused) return;

    const interval = setInterval(
      () => setCheckedAt(serverNow()),
      POLLING.BUS_FRESHNESS_MS
    );

    return () => clearInterval(interval);
  }, [paused]);

  /*
    Staleness is judged against the frozen instant too. A paused view is the
    corridor as it stood at that moment, so a bus that was fresh then is still
    shown as fresh - it does not decay while the passenger is reading it.
  */
  const active = useMemo(
    () =>
      frozen
        ? selectFreshBuses(frozen.buses, frozen.at)
        : selectFreshBuses(buses, checkedAt),
    [buses, checkedAt, frozen]
  );

  /*
    Centre on the fleet, falling back to the first stop before any report.

    Only vehicles that actually carry a position count: the contract permits a
    null one, and real feeds publish them, so averaging over the whole fleet
    would drag the centre towards zero.
  */
  const { lat, lng } = useMemo(() => {
    const located = active.filter((vehicle) => hasPosition(vehicle.telemetry));

    if (located.length === 0) return DEFAULT_MAP_CENTER;

    const total = located.reduce(
      (acc, vehicle) => ({
        lat: acc.lat + vehicle.telemetry.lat!,
        lng: acc.lng + vehicle.telemetry.lng!,
      }),
      { lat: 0, lng: 0 }
    );

    return { lat: total.lat / located.length, lng: total.lng / located.length };
  }, [active]);

  const bbox = [
    lng - MAP_CONFIG.BBOX_DELTA_DEG,
    lat - MAP_CONFIG.BBOX_DELTA_DEG,
    lng + MAP_CONFIG.BBOX_DELTA_DEG,
    lat + MAP_CONFIG.BBOX_DELTA_DEG,
  ].join(",");

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main id="main-content" tabIndex={-1} className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-center mb-6 text-primary-deep">
            {t("map.title")}
          </h1>

          {/*
            The control sits above the thing it controls and before it in the
            reading order, so somebody who needs the updates to stop reaches
            the button without first having to get past the content that is
            moving.
          */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <button
              type="button"
              onClick={togglePaused}
              aria-pressed={paused}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/40 bg-white text-primary-deep font-medium transition-colors duration-state hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {paused ? (
                <Play className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Pause className="w-4 h-4" aria-hidden="true" />
              )}
              {t(paused ? "map.resume" : "map.pause")}
            </button>

            {/*
              Narrowing this does more than filter the list. Positions are
              sharded by route in the database, so choosing one changes what
              is SENT - the other routes' buses never arrive. On a corridor
              with eight routes, a passenger watching one of them stops paying
              for the other seven.
            */}
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <span>{t("map.show")}</span>
              <select
                value={routeId}
                onChange={(event) =>
                  setRouteId(event.target.value as RouteId | "")
                }
                className="px-3 py-2 border border-input rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">{t("map.everyRoute")}</option>
                {ROUTE_IDS.map((id) => (
                  <option key={id} value={id}>
                    {getRoute(id).name}
                  </option>
                ))}
              </select>
            </label>

            {/*
              Deliberately NOT its own live region. The app already mounts one
              polite region at the root, present from first paint, and a
              second would compete with it - the same reasoning that keeps
              `ServiceAlerts` cards from carrying their own roles. The state
              change is spoken through `announce`, and `aria-pressed` carries
              it for anyone who focuses the button.
            */}
            <p className="text-sm text-gray-600">
              {paused ? (
                <>
                  {t("map.pausedLead")}{" "}
                  <strong>{serviceClockLabel(new Date(frozen.at))}</strong>
                  {t("about.sentenceEnd")}
                </>
              ) : (
                t("map.updating")
              )}
            </p>
          </div>

          <div className="w-full h-[400px] rounded-xl overflow-hidden shadow mb-4 relative">
            <iframe
              title={t("map.frameTitle")}
              width="100%"
              height="100%"
              loading="lazy"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`}
            />

            <div className="absolute top-3 left-3 bg-white px-3 py-1 rounded shadow text-sm">
              {t("map.activeCount", { count: active.length })}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-primary-deep">
              {t("map.activeHeading")}
            </h2>

            {loading && <p>{t("map.loading")}</p>}

            {!loading && failed && (
              <p className="text-gray-600">
                {t("map.unavailable")}
              </p>
            )}

            {!loading && !failed && active.length === 0 && <p>{t("map.none")}</p>}

            {!loading && !failed && active.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">{t("map.col.bus")}</th>
                    <th className="text-left">{t("map.col.route")}</th>
                    <th className="text-left">{t("map.col.towards")}</th>
                    <th className="text-left">{t("map.col.status")}</th>
                    <th>{t("map.col.lastUpdate")}</th>
                  </tr>
                </thead>
                <tbody>
                  {active.map(({ telemetry, state }) => (
                      <tr key={telemetry.vehicleId} className="border-b">
                        <td className="py-2">
                          {telemetry.vehicleId}
                          {/*
                            A synthetic vehicle says so, every time it is
                            drawn. Unlabelled, it sits beside the operator's
                            real fares and real timetable as though it were a
                            bus.
                          */}
                          {telemetry.simulated && (
                            <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-secondary-foreground">
                              {t("map.simulated")}
                            </span>
                          )}
                        </td>
                        <td>{telemetry.routeId ? getRoute(telemetry.routeId).name : "—"}</td>
                        <td>{telemetry.routeId ? destinationOf(telemetry.routeId) : "—"}</td>
                        <td>
                          {t(STATE_LABELS[state])}
                          <span className="sr-only">
                            {" — "}
                            {t(STATE_DESCRIPTIONS[state])}
                          </span>
                        </td>
                        <td className="text-center">
                          {telemetry.observedAt
                            ? new Date(telemetry.observedAt).toLocaleTimeString()
                            : "—"}
                        </td>
                      </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/*
              The honest limit, said out loud rather than left to be assumed.

              A bus reports a coordinate, and matching that to a stop needs
              surveyed stop positions. Ours are a generated lattice, so any
              "next stop" here would be arbitrary - and it is exactly the kind
              of claim a passenger stands in the road acting on.
            */}
            {!loading && !failed && active.length > 0 && (
              <p className="mt-4 text-xs text-muted-foreground">
                {t("map.noNextStop")}
              </p>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MapPage;
