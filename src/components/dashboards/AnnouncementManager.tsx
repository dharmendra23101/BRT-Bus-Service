import { useCallback, useEffect, useId, useState } from "react";
import { Megaphone, Plus, Trash2, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PERMISSIONS, can } from "@/domain/auth/permissions";
import { toSafeMessage } from "@/domain/auth/errors";
import { useTranslation } from "@/contexts/LocaleContext";
import {
  deleteAnnouncement,
  fetchAllAnnouncements,
  publishAnnouncement,
  setAnnouncementActive,
} from "@/services/announcementService";
import {
  ANNOUNCEMENT_SEVERITIES,
  SEVERITY_LABELS,
  type Announcement,
  type AnnouncementSeverity,
} from "@/types/announcement";
import { describeEntities, type InformedEntity } from "@/domain/alerts/targeting";
import { ROUTE_IDS } from "@/domain/transit/routes";
import { STOPS } from "@/domain/transit/stops";

const ANY = "";

/** A `datetime-local` value as milliseconds, or undefined when left blank. */
const toEpoch = (value: string): number | undefined => {
  if (value === "") return undefined;

  const parsed = new Date(value).getTime();

  return Number.isNaN(parsed) ? undefined : parsed;
};

const SEVERITY_STYLES: Record<AnnouncementSeverity, string> = {
  INFO: "bg-blue-100 text-blue-800",
  WARNING: "bg-amber-100 text-amber-800",
  CRITICAL: "bg-destructive/10 text-destructive",
};

const AnnouncementManager = () => {
  const { t } = useTranslation();
  const { actor } = useAuth();

  const mayManage = can(actor, PERMISSIONS.MANAGE_ANNOUNCEMENTS);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [severity, setSeverity] = useState<AnnouncementSeverity>("INFO");
  const [entities, setEntities] = useState<InformedEntity[]>([]);
  const [draftRoute, setDraftRoute] = useState(ANY);
  const [draftStop, setDraftStop] = useState(ANY);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const ids = useId();
  const titleId = `${ids}-title`;
  const bodyId = `${ids}-body`;
  const severityId = `${ids}-severity`;
  const routeId = `${ids}-route`;
  const stopId = `${ids}-stop`;
  const startsId = `${ids}-starts`;
  const endsId = `${ids}-ends`;

  const load = useCallback(async () => {
    if (!mayManage) {
      setLoading(false);
      return;
    }

    try {
      setAnnouncements(await fetchAllAnnouncements(actor));
    } catch (err) {
      setError(t(toSafeMessage(err, "error.loadAnnouncements")));
    } finally {
      setLoading(false);
    }
  }, [actor, mayManage, t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!mayManage) return null;

  /*
    One affected thing at a time, because the two dimensions do not combine the
    way a pair of tick-lists would suggest. Route and stop inside a single row
    mean "route 101, at CBD"; two rows mean "route 101, or CBD". Offering two
    independent multi-selects would let an administrator express the first while
    believing they had said the second, and nothing downstream could tell.
  */
  const addEntity = () => {
    if (draftRoute === ANY && draftStop === ANY) return;

    const entity: InformedEntity = {
      ...(draftRoute === ANY ? {} : { routeId: draftRoute }),
      ...(draftStop === ANY ? {} : { stopId: draftStop }),
    };

    setEntities((previous) => [...previous, entity]);
    setDraftRoute(ANY);
    setDraftStop(ANY);
  };

  const removeEntity = (index: number) => {
    setEntities((previous) => previous.filter((_, at) => at !== index));
  };

  const publish = async (event: React.FormEvent) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setSaving(true);

    const result = await publishAnnouncement(actor, {
      title,
      body,
      severity,
      informedEntities: entities.length > 0 ? entities : undefined,
      startsAt: toEpoch(startsAt),
      endsAt: toEpoch(endsAt),
    });

    setSaving(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setAnnouncements((previous) => [result.announcement, ...previous]);
    setTitle("");
    setBody("");
    setSeverity("INFO");
    setEntities([]);
    setStartsAt("");
    setEndsAt("");
    setSuccess(t("notice.published"));
  };

  const toggle = async (announcement: Announcement) => {
    setError("");

    const result = await setAnnouncementActive(
      actor,
      announcement.id,
      !announcement.active
    );

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setAnnouncements((previous) =>
      previous.map((entry) =>
        entry.id === announcement.id ? { ...entry, active: !entry.active } : entry
      )
    );
  };

  const remove = async (announcementId: string) => {
    setError("");

    const result = await deleteAnnouncement(actor, announcementId);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setAnnouncements((previous) =>
      previous.filter((entry) => entry.id !== announcementId)
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
      <div className="flex items-center gap-2 mb-6">
        <Megaphone className="w-6 h-6 text-primary" aria-hidden="true" />
        <h2 className="text-2xl font-bold text-gray-900">Passenger Announcements</h2>
      </div>

      <p className="text-sm text-gray-600 mb-6">
        {t("notice.warning")}
      </p>

      {error && (
        <div role="alert" className="mb-4 bg-destructive/10 border border-destructive/30 rounded-lg p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {success && (
        <div role="status" className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      <form onSubmit={publish} noValidate className="space-y-4 mb-8">
        <div>
          <label htmlFor={titleId} className="block text-sm font-medium text-gray-700 mb-1">
            {t("notice.title")}
          </label>
          <input
            id={titleId}
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full bg-gray-50 rounded-lg px-4 py-2.5 border-2 border-input focus:border-primary transition-colors"
          />
        </div>

        <div>
          <label htmlFor={bodyId} className="block text-sm font-medium text-gray-700 mb-1">
            {t("notice.message")}
          </label>
          <textarea
            id={bodyId}
            rows={3}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            className="w-full bg-gray-50 rounded-lg px-4 py-2.5 border-2 border-input focus:border-primary transition-colors"
          />
        </div>

        <div>
          <label
            htmlFor={severityId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {t("notice.severity")}
          </label>
          <select
            id={severityId}
            value={severity}
            onChange={(event) => setSeverity(event.target.value as AnnouncementSeverity)}
            className="w-full bg-gray-50 rounded-lg px-4 py-2.5 border-2 border-input focus:border-primary transition-colors"
          >
            {ANNOUNCEMENT_SEVERITIES.map((option) => (
              <option key={option} value={option}>
                {t(SEVERITY_LABELS[option])}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="border border-border rounded-lg p-4">
          <legend className="text-sm font-medium text-gray-700 px-1">
            {t("notice.affects")}
          </legend>

          <p className="text-xs text-gray-600 mb-3">
            {t("notice.affectsHint")}
          </p>

          {entities.length > 0 && (
            <ul className="space-y-2 mb-3">
              {describeEntities(entities).map((label, index) => (
                <li
                  key={`${label}-${index}`}
                  className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2"
                >
                  <span className="text-sm text-gray-800">{label}</span>
                  <button
                    type="button"
                    onClick={() => removeEntity(index)}
                    className="text-gray-500 hover:text-destructive transition-colors"
                    aria-label={`Remove ${label}`}
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div>
              <label
                htmlFor={routeId}
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                {t("notice.route")}
              </label>
              <select
                id={routeId}
                value={draftRoute}
                onChange={(event) => setDraftRoute(event.target.value)}
                className="w-full bg-gray-50 rounded-lg px-3 py-2 border-2 border-input focus:border-primary transition-colors"
              >
                <option value={ANY}>Any route</option>
                {ROUTE_IDS.map((option) => (
                  <option key={option} value={option}>
                    Route {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor={stopId}
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                {t("notice.stop")}
              </label>
              <select
                id={stopId}
                value={draftStop}
                onChange={(event) => setDraftStop(event.target.value)}
                className="w-full bg-gray-50 rounded-lg px-3 py-2 border-2 border-input focus:border-primary transition-colors"
              >
                <option value={ANY}>Any stop</option>
                {STOPS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={addEntity}
              disabled={draftRoute === ANY && draftStop === ANY}
              className="flex items-center justify-center gap-1 px-4 py-2 rounded-lg border-2 border-input text-sm font-medium text-gray-700 hover:border-primary transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              {t("notice.add")}
            </button>
          </div>
        </fieldset>

        <fieldset className="border border-border rounded-lg p-4">
          <legend className="text-sm font-medium text-gray-700 px-1">
            {t("notice.when")}
          </legend>

          <p className="text-xs text-gray-600 mb-3">
            Optional. A notice with no dates shows until you retire it; one with an
            end date stops showing on its own.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor={startsId}
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                {t("notice.starts")}
              </label>
              <input
                id={startsId}
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
                className="w-full bg-gray-50 rounded-lg px-3 py-2 border-2 border-input focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor={endsId}
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                {t("notice.ends")}
              </label>
              <input
                id={endsId}
                type="datetime-local"
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
                className="w-full bg-gray-50 rounded-lg px-3 py-2 border-2 border-input focus:border-primary transition-colors"
              />
            </div>
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-strong transition-colors font-semibold disabled:opacity-50"
        >
          {t(saving ? "notice.publishing" : "notice.publish")}
        </button>
      </form>

      <div className="border-t pt-6">
        <h3 className="font-semibold text-gray-900 mb-4">Published</h3>

        {loading && <p className="text-gray-600 text-sm">Loading announcements…</p>}

        {!loading && announcements.length === 0 && (
          <p className="text-gray-600 text-sm">
            {t("notice.none")}
          </p>
        )}

        {!loading && announcements.length > 0 && (
          <ul className="space-y-3">
            {announcements.map((announcement) => (
              <li
                key={announcement.id}
                className="flex flex-wrap items-start justify-between gap-3 p-4 rounded-xl border border-gray-200 bg-gray-50"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        SEVERITY_STYLES[announcement.severity]
                      }`}
                    >
                      {t(SEVERITY_LABELS[announcement.severity])}
                    </span>

                    {!announcement.active && (
                      <span className="text-xs text-gray-500">Retired</span>
                    )}
                  </div>

                  <p className="font-semibold text-gray-900">{announcement.title}</p>
                  <p className="text-sm text-gray-600">{announcement.body}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void toggle(announcement)}
                    aria-pressed={announcement.active}
                    className="px-3 py-2 rounded-lg text-xs font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                  >
                    {t(announcement.active ? "notice.retire" : "notice.restore")}
                    <span className="sr-only"> {announcement.title}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void remove(announcement.id)}
                    className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                    <span className="sr-only">Delete {announcement.title}</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AnnouncementManager;
