import { useEffect, useMemo, useState } from "react";
import { Bus, RadioTower } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PERMISSIONS, can } from "@/domain/auth/permissions";
import { useTranslation } from "@/contexts/LocaleContext";
import type { TranslationKey } from "@/domain/i18n/en";
import { POLLING } from "@/constants/config";
import { destinationOf, getRoute } from "@/domain/transit/routes";
import type { VehicleTelemetry } from "@/domain/fleet/telemetry";
import {
  classifyBuses,
  serverNow,
  subscribeToAssignments,
  subscribeToBuses,
  subscribeToVehicleStatus,
  type LiveBus,
} from "@/services/locationService";
import {
  countByState,
  describeLastSeen,
  STATE_DESCRIPTIONS,
  STATE_LABELS,
  type VehicleState,
} from "@/domain/fleet/state";
import type { UserRecord } from "@/types/user";

type Filter = "ALL" | "REPORTING" | "ATTENTION";

const FILTERS: Filter[] = ["ALL", "REPORTING", "ATTENTION"];

const FILTER_LABELS: Record<Filter, TranslationKey> = {
  ALL: "fleet.filter.all",
  REPORTING: "fleet.filter.reporting",
  ATTENTION: "fleet.filter.attention",
};

/** States where the operator is seeing a position they can trust. */
const REPORTING: readonly VehicleState[] = ["LIVE", "RECENT"];

/*
  Every state is spelled out, including the ones at zero.

  A missing row reads as "no problem"; a row showing 0 reads as "checked, and
  there are none". For a fleet-health strip those are different claims, and
  the operator is entitled to the second one.
*/
const STATE_ORDER: readonly VehicleState[] = [
  "LIVE",
  "RECENT",
  "STALE",
  "OFFLINE",
  "UNKNOWN",
];

const STATE_STYLES: Record<VehicleState, string> = {
  LIVE: "bg-green-100 text-green-800",
  RECENT: "bg-emerald-50 text-emerald-800",
  STALE: "bg-amber-100 text-amber-900",
  OFFLINE: "bg-destructive/10 text-destructive",
  UNKNOWN: "bg-gray-200 text-gray-700",
};

const lastSeen = (telemetry: VehicleTelemetry): string =>
  telemetry.observedAt
    ? new Date(telemetry.observedAt).toLocaleTimeString()
    : "—";

interface FleetStatusProps {
  users: UserRecord[];
  loading: boolean;
}

const FleetStatus = ({ users, loading }: FleetStatusProps) => {
  const { t } = useTranslation();
  const { actor } = useAuth();

  const mayView = can(actor, PERMISSIONS.READ_ALL_USERS);

  const [buses, setBuses] = useState<LiveBus[]>([]);
  const [checkedAt, setCheckedAt] = useState(() => serverNow());
  const [trackingFailed, setTrackingFailed] = useState(false);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [lastSeenAt, setLastSeenAt] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<Filter>("ALL");

  const drivers = useMemo(
    () => users.filter((entry) => entry.role === "driver"),
    [users]
  );

  useEffect(() => {
    if (!mayView) return;

    return subscribeToBuses(
      (next) => {
        setBuses(next);
        setCheckedAt(serverNow());
      },
      () => setTrackingFailed(true)
    );
  }, [mayView]);

  /*
    The roster, which an operator may read and a driver may not. RTDB rules
    cannot consult a Firestore role, so this is gated on its own allowlist -
    the same reason `driverAllowlist` exists as a separate node. An operator
    who is not on it simply sees no assignments, which reads correctly as
    "nobody is on shift" rather than as an error.
  */
  useEffect(() => {
    if (!mayView) return;

    return subscribeToAssignments(setAssignments);
  }, [mayView]);

  /*
    Written by the database on disconnect rather than by any client, which is
    the only reason it is trustworthy when nobody was watching.
  */
  useEffect(() => {
    if (!mayView) return;

    return subscribeToVehicleStatus(setLastSeenAt);
  }, [mayView]);

  useEffect(() => {
    if (!mayView) return;

    const interval = setInterval(
      () => setCheckedAt(serverNow()),
      POLLING.BUS_FRESHNESS_MS
    );

    return () => clearInterval(interval);
  }, [mayView]);

  /*
    Classified, NOT filtered - the difference this component exists to fix.

    `selectFreshBuses` drops STALE and OFFLINE vehicles, which is right for the
    public map: a position several minutes old should not be drawn as if the
    bus were there. It is wrong here. Filtering deletes the only evidence that
    a bus HAS stopped reporting, so a driver whose phone lost signal looked
    exactly like one who never started a shift - to the one person who could
    ring them and ask.
  */
  const fleet = useMemo(() => classifyBuses(buses, checkedAt), [buses, checkedAt]);

  const counts = useMemo(() => countByState(fleet), [fleet]);

  const byBusId = useMemo(
    () => new Map(fleet.map((vehicle) => [vehicle.telemetry.vehicleId, vehicle])),
    [fleet]
  );

  /*
    Which bus each driver is in, read from the roster rather than derived.

    It used to be a hash of the driver's account id - a label invented here so
    that something could be shown. It matched whatever the driver app happened
    to publish under, and it meant the operator's roster and the public map
    agreed only because both sides ran the same function. Now the assignment
    is the answer, and a driver with none is a driver with no bus.
  */
  const rows = useMemo(
    () =>
      drivers.map((driver) => {
        const vehicleId = assignments[driver.uid] ?? null;

        return {
          driver,
          vehicleId,
          bus: vehicleId ? (byBusId.get(vehicleId) ?? null) : null,
          lastReported: vehicleId
            ? describeLastSeen(lastSeenAt[vehicleId], checkedAt)
            : null,
        };
      }),
    [drivers, byBusId, assignments, lastSeenAt, checkedAt]
  );

  const visible = useMemo(() => {
    if (filter === "REPORTING") {
      return rows.filter((row) => row.bus && REPORTING.includes(row.bus.state));
    }

    if (filter === "ATTENTION") {
      return rows.filter((row) => row.bus && !REPORTING.includes(row.bus.state));
    }

    return rows;
  }, [filter, rows]);

  const reporting = rows.filter(
    (row) => row.bus && REPORTING.includes(row.bus.state)
  ).length;

  /*
    A vehicle that HAS reported and then stopped. A driver who never began a
    shift is not in this number - there is nothing to chase.
  */
  const needsAttention = rows.filter(
    (row) => row.bus && !REPORTING.includes(row.bus.state)
  ).length;

  if (!mayView) return null;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <RadioTower className="w-6 h-6 text-primary" aria-hidden="true" />
          <h2 className="text-2xl font-bold text-gray-900">Fleet Status</h2>
        </div>

        <div className="flex gap-2" role="group" aria-label={t("fleet.filterLabel")}>
          {FILTERS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              aria-pressed={filter === option}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                filter === option
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t(FILTER_LABELS[option])}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-secondary rounded-xl p-4 border border-border">
          <p className="text-xs text-gray-600 mb-1">Driver accounts</p>
          <p className="text-2xl font-bold text-gray-900">{drivers.length}</p>
        </div>

        <div className="bg-secondary rounded-xl p-4 border border-border">
          <p className="text-xs text-gray-600 mb-1">Reporting</p>
          <p className="text-2xl font-bold text-gray-900">{reporting}</p>
        </div>

        <div className="bg-secondary rounded-xl p-4 border border-border">
          <p className="text-xs text-gray-600 mb-1">Needs attention</p>
          <p className="text-2xl font-bold text-gray-900">{needsAttention}</p>
        </div>
      </div>

      {/*
        Fleet health in one line. A table of thirty vehicles does not answer
        "is the feed healthy?"; this does, and it is the reason `countByState`
        was written.
      */}
      <dl
        className="flex flex-wrap gap-2 mb-6"
        aria-label={t("fleet.byState")}
      >
        {STATE_ORDER.map((state) => (
          <div
            key={state}
            className={`rounded-lg px-3 py-2 ${STATE_STYLES[state]}`}
          >
            <dt className="text-xs font-semibold">{t(STATE_LABELS[state])}</dt>
            <dd className="text-lg font-bold">{counts[state]}</dd>
          </div>
        ))}
      </dl>

      {trackingFailed && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-sm text-amber-800">
            {t("fleet.unreachable")}
          </p>
        </div>
      )}

      {loading && <p className="text-gray-600 text-sm">Loading the driver list…</p>}

      {!loading && drivers.length === 0 && (
        <p className="text-gray-600 text-sm">
          {t("fleet.noDrivers")}
        </p>
      )}

      {!loading && drivers.length > 0 && visible.length === 0 && (
        <p className="text-gray-600 text-sm">Nobody is broadcasting a position.</p>
      )}

      {!loading && visible.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">
              {t("fleet.roster")}
            </caption>
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Driver</th>
                <th className="text-left">Bus</th>
                <th className="text-left">Status</th>
                <th className="text-left">Route</th>
                <th className="text-left">Towards</th>
                <th className="text-left">Last report</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(({ driver, vehicleId, bus, lastReported }) => {
                return (
                  <tr key={driver.uid} className="border-b">
                    <td className="py-2">
                      <span className="font-medium text-gray-900">
                        {driver.name || "Unnamed driver"}
                      </span>
                      <span className="block text-xs text-gray-500">
                        {driver.email}
                      </span>
                    </td>

                    <td className="font-mono text-xs">{vehicleId ?? "—"}</td>

                    {/*
                      The badge names the state and carries its explanation as
                      the accessible title. Colour alone cannot do this - the
                      design system measured on-time against delayed at a
                      luminance ratio of 1.05 for a red-green viewer - so the
                      words are the signal and the colour is the reinforcement.

                      "No shift started" is deliberately distinct from every
                      reporting state: it means nothing was ever received, not
                      that something was received and went quiet.
                    */}
                    <td>
                      <span
                        title={
                          bus
                            ? t(STATE_DESCRIPTIONS[bus.state])
                            : "This driver has not started broadcasting."
                        }
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          bus ? STATE_STYLES[bus.state] : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        <Bus className="w-3 h-3" aria-hidden="true" />
                        {bus ? t(STATE_LABELS[bus.state]) : t("fleet.noShift")}
                      </span>

                    </td>

                    <td>
                      {bus?.telemetry.routeId
                        ? getRoute(bus.telemetry.routeId).name
                        : "—"}
                    </td>

                    {/* The route's published terminus, not a coordinate match. */}
                    <td>
                      {bus?.telemetry.routeId
                        ? destinationOf(bus.telemetry.routeId)
                        : "—"}
                    </td>

                    {/*
                      A live bus reports its own observation time. A quiet one
                      has none - and "—" answers a question the operator did
                      not ask, leaving the one they did ("since when?")
                      unanswered. The fallback is recorded by the database
                      itself when the socket drops, so it survives nobody
                      being logged in to see it happen.
                    */}
                    <td>
                      {bus
                        ? lastSeen(bus.telemetry)
                        : (lastReported ?? "—")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default FleetStatus;
