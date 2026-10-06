import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, Info, OctagonAlert } from "lucide-react";
import type { TranslationKey } from "@/domain/i18n/en";
import { useTranslation } from "@/contexts/LocaleContext";
import { fetchActiveAnnouncements } from "@/services/announcementService";
import { useAnnounce } from "@/components/a11y/LiveAnnouncer";
import {
  affectsScope,
  describeEntities,
  isGloballyScoped,
  type AlertScope,
} from "@/domain/alerts/targeting";
import {
  SEVERITY_LABELS,
  type Announcement,
  type AnnouncementSeverity,
} from "@/types/announcement";

const SEVERITY_STYLES: Record<AnnouncementSeverity, string> = {
  INFO: "bg-blue-50 border-blue-200 text-blue-900",
  WARNING: "bg-amber-50 border-amber-200 text-amber-900",
  CRITICAL: "bg-destructive/10 border-destructive/30 text-destructive",
};

const SEVERITY_ICONS: Record<AnnouncementSeverity, typeof Info> = {
  INFO: Info,
  WARNING: AlertTriangle,
  CRITICAL: OctagonAlert,
};

/**
 * What the passenger is currently looking at, read from the URL.
 *
 * `from`/`to` belong to the planner and `route` to the route explorer, which
 * are also the two shapes people share and bookmark - the same links P0-7 was
 * about. Everywhere else there is no scope, and every notice is simply listed.
 *
 * Returns a label as well as a scope because "affects your journey" is only
 * true when the passenger named a journey; on a route page the honest words
 * are different.
 */
const readScope = (
  params: URLSearchParams
): { scope: AlertScope; matchLabel: TranslationKey | null } => {
  const stopIds = [params.get("from"), params.get("to")].filter(
    (value): value is string => value !== null && value !== ""
  );

  const route = params.get("route");
  const routeIds = route ? [route] : [];

  if (stopIds.length > 0) {
    return { scope: { stopIds, routeIds }, matchLabel: "alerts.affectsJourney" };
  }

  if (routeIds.length > 0) {
    return { scope: { routeIds }, matchLabel: "alerts.affectsRoute" };
  }

  return { scope: {}, matchLabel: null };
};

/**
 * Operator notices, shown to everyone.
 *
 * Renders nothing at all when there is nothing to say, so an ordinary day
 * costs the passenger no screen space and no reassurance they did not ask for.
 *
 * Scope orders this list; it never filters it. A notice the passenger's own
 * journey touches is lifted to the top and labelled, but nothing is hidden on
 * the strength of a URL - a passenger who has typed one journey into the
 * planner has not thereby said the rest of the network is none of their
 * business, and a hidden disruption is the one failure this component exists
 * to prevent.
 */
const ServiceAlerts = () => {
  const { t } = useTranslation();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const announce = useAnnounce();
  const [params] = useSearchParams();

  useEffect(() => {
    let stale = false;

    void fetchActiveAnnouncements().then((next) => {
      if (!stale) setAnnouncements(next);
    });

    return () => {
      stale = true;
    };
  }, []);

  const { scope, matchLabel } = useMemo(() => readScope(params), [params]);

  /*
    A globally scoped notice is deliberately not counted as targeted. It does
    affect this passenger, but so does it affect everyone, and badging it
    "affects your journey" would make the badge meaningless on exactly the
    notices where it should mean something.
  */
  const ordered = useMemo(() => {
    const targeted = (announcement: Announcement): boolean =>
      matchLabel !== null &&
      !isGloballyScoped(announcement.informedEntities) &&
      affectsScope(announcement.informedEntities, scope);

    return announcements
      .map((announcement) => ({ announcement, targeted: targeted(announcement) }))
      .sort((a, b) => Number(b.targeted) - Number(a.targeted));
  }, [announcements, scope, matchLabel]);

  /*
    The announcement is routed through the shared live region rather than
    carried by a role on the cards below.

    A live region has to be in the document BEFORE its content changes. These
    cards do not exist until the fetch resolves, so a `role="alert"` on them
    was a region arriving with its message already inside it - which most
    screen readers do not announce at all. The product's most safety-critical
    message was the one being spoken least reliably.

    A critical notice interrupts; anything else waits for a pause.
  */
  useEffect(() => {
    if (announcements.length === 0) return;

    const critical = announcements.filter(
      (announcement) => announcement.severity === "CRITICAL"
    );

    const spoken = (critical.length > 0 ? critical : announcements)
      .map(
        (announcement) =>
          `${t(SEVERITY_LABELS[announcement.severity])}: ${announcement.title}. ${
            announcement.body
          }`
      )
      .join(" ");

    announce(spoken, critical.length > 0 ? "assertive" : "polite");
  }, [announcements, announce]);

  if (announcements.length === 0) return null;

  return (
    <section aria-labelledby="service-alerts-heading" className="px-4 pt-6">
      <h2 id="service-alerts-heading" className="sr-only">
        {t("alerts.title")}
      </h2>

      <div className="max-w-5xl mx-auto space-y-3">
        {ordered.map(({ announcement, targeted }) => {
          const Icon = SEVERITY_ICONS[announcement.severity];
          const affected = describeEntities(announcement.informedEntities);

          return (
            <div
              key={announcement.id}
              className={`flex items-start gap-3 rounded-xl border p-4 ${
                SEVERITY_STYLES[announcement.severity]
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />

              <div className="min-w-0">
                <p className="font-semibold">
                  <span className="sr-only">
                    {t(SEVERITY_LABELS[announcement.severity])}:{" "}
                  </span>
                  {announcement.title}
                </p>
                <p className="text-sm mt-0.5">{announcement.body}</p>

                {affected.length > 0 && (
                  <p className="text-xs mt-2 opacity-90">
                    Affects {affected.join("; ")}
                    {targeted && matchLabel ? ` — ${t(matchLabel)}` : ""}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default ServiceAlerts;
