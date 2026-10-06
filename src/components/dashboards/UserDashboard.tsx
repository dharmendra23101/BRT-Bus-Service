import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Bell, BookOpen, History, IndianRupee, Route, Ticket } from "lucide-react";
import VirtualTicket from "@/components/VirtualTicket";
import { useAnnounce } from "@/components/a11y/LiveAnnouncer";
import { useAuth } from "@/contexts/AuthContext";
import { useTickets } from "@/contexts/TicketContext";
import { STATUS_LABELS } from "@/domain/ticket/status";
import { DATE_LOCALES } from "@/domain/i18n/strings";
import type { TranslationKey } from "@/domain/i18n/en";
import { useTranslation } from "@/contexts/LocaleContext";
import type { TicketStatus } from "@/domain/ticket/types";
import { formatDate } from "@/domain/time";
import { requestAlertPermission } from "@/services/notificationService";
import { updateNotificationPreference } from "@/services/userService";

type HistoryFilter = "ALL" | "COMPLETED" | "CANCELLED";

const FILTERS: HistoryFilter[] = ["ALL", "COMPLETED", "CANCELLED"];

/*
  A filter's name and the sentence shown when it matches nothing.

  The buttons used to be labelled by title-casing the enum, and the empty
  state by lower-casing it. Both are English spelling rules applied to a value
  that is neither English nor a word.
*/
const FILTER_LABELS: Record<HistoryFilter, TranslationKey> = {
  ALL: "dashboard.filter.all",
  COMPLETED: "ticket.status.completed",
  CANCELLED: "ticket.status.cancelled",
};

const EMPTY_LABELS: Record<HistoryFilter, TranslationKey> = {
  ALL: "dashboard.history.emptyAll",
  COMPLETED: "dashboard.history.emptyCompleted",
  CANCELLED: "dashboard.history.emptyCancelled",
};

const HISTORY_STYLES: Partial<Record<TicketStatus, string>> = {
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-200 text-gray-700",
};

const getInitials = (name?: string | null): string => {
  if (!name) return "U";

  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};

const UserDashboard = () => {
  const { user, profile, refreshUserRecord } = useAuth();
  const { activeTicket, ticketHistory, stats, cancelTicket } = useTickets();
  const navigate = useNavigate();
  const { t, locale } = useTranslation();
  const announce = useAnnounce();

  const [filter, setFilter] = useState<HistoryFilter>("ALL");
  const [savingAlerts, setSavingAlerts] = useState(false);

  const alertsEnabled = profile?.notifications_enabled !== false;

  /**
   * Permission is asked for here rather than on page load, so the browser
   * prompt follows the passenger's own choice to switch alerts on.
   */
  const handleToggleAlerts = useCallback(async () => {
    if (!user) return;

    const next = !alertsEnabled;

    setSavingAlerts(true);

    try {
      if (next) await requestAlertPermission();

      await updateNotificationPreference(user.uid, next);
      await refreshUserRecord();

      announce(
        t(next ? "dashboard.alerts.switchedOn" : "dashboard.alerts.switchedOff")
      );
    } catch {
      toast.error(t("dashboard.alerts.failed"));
    } finally {
      setSavingAlerts(false);
    }
  }, [user, alertsEnabled, refreshUserRecord, announce, t]);

  /**
   * Cancelling removes the ticket from view, so without an explicit
   * confirmation the only feedback is that something vanished.
   */
  const handleCancel = useCallback(
    async (ticketId: string) => {
      const cancelled = await cancelTicket(ticketId);

      if (!cancelled) {
        const message = t("dashboard.cancel.failed");

        toast.error(message);
        announce(message, "assertive");

        return;
      }

      toast.success(t("dashboard.cancel.done"));
      announce(t("dashboard.cancel.announced"));
    },
    [cancelTicket, announce, t]
  );

  const visibleHistory = useMemo(
    () =>
      filter === "ALL"
        ? ticketHistory
        : ticketHistory.filter((ticket) => ticket.status === filter),
    [filter, ticketHistory]
  );

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-2xl p-8 shadow-lg mb-8">
        <div className="flex items-center gap-6 mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary-deep text-white flex items-center justify-center text-2xl font-bold">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || t("dashboard.avatarAlt")}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              getInitials(user?.displayName)
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {user?.displayName || t("dashboard.passenger")}
            </h1>
            <p className="text-gray-600">{user?.email}</p>
            <p className="text-sm text-primary font-semibold mt-1">
              👤 {t("dashboard.passenger")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-secondary rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <History className="w-4 h-4 text-primary" />
              <p className="text-xs text-gray-600">{t("dashboard.tripsCompleted")}</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.tripsCompleted}</p>
          </div>

          <div className="bg-secondary rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <IndianRupee className="w-4 h-4 text-primary" />
              <p className="text-xs text-gray-600">{t("dashboard.totalSpent")}</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">₹{stats.totalSpent}/-</p>
          </div>

          <div className="bg-secondary rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <Route className="w-4 h-4 text-primary" />
              <p className="text-xs text-gray-600">{t("dashboard.favouriteRoute")}</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.favouriteRoute ?? "—"}
            </p>
          </div>
        </div>

        <div className="border-t pt-8">
          <div className="flex items-center gap-2 mb-6">
            <Ticket className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-gray-900">{t("dashboard.yourTicket")}</h2>
          </div>

          {activeTicket ? (
            <VirtualTicket ticket={activeTicket} onCancel={handleCancel} />
          ) : (
            <div className="text-center p-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium mb-1">{t("dashboard.noActiveTickets")}</p>
              <p className="text-sm text-gray-500 mb-4">
                {t("dashboard.bookPrompt")}
              </p>
              <button
                onClick={() => navigate("/timetable")}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-strong transition-colors font-semibold"
              >
                {t("dashboard.bookCta")}
              </button>
            </div>
          )}
        </div>

        <div className="border-t pt-8 mt-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Bell className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-bold text-gray-900">{t("dashboard.alerts.title")}</h2>
              </div>
              <p className="text-sm text-gray-600">
                {t("dashboard.alerts.body")}
              </p>
            </div>

            <button
              type="button"
              onClick={handleToggleAlerts}
              disabled={savingAlerts}
              aria-pressed={alertsEnabled}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60 ${
                alertsEnabled
                  ? "bg-primary text-white hover:bg-primary-strong"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {t(alertsEnabled ? "dashboard.alerts.on" : "dashboard.alerts.off")}
              <span className="sr-only">{t("dashboard.alerts.suffix")}</span>
            </button>
          </div>
        </div>

        <div className="border-t pt-8 mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2">
              <History className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-gray-900">{t("dashboard.history.title")}</h2>
            </div>

            {/*
              A single-select group: aria-pressed tells a screen reader which
              filter is currently applied, which colour alone cannot.
            */}
            <div className="flex gap-2" role="group" aria-label={t("dashboard.history.filterLabel")}>
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

          {visibleHistory.length ? (
            <ul className="space-y-3">
              {visibleHistory.map((ticket) => (
                <li
                  key={ticket.ticketId}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-gray-200 bg-gray-50"
                >
                  <div>
                    <p className="font-semibold text-gray-900">
                      {ticket.fromStop} → {ticket.toStop}
                    </p>
                    <p className="text-xs text-gray-500 font-mono">
                      {ticket.ticketId}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-gray-700">
                      {ticket.departureTime} - {ticket.arrivalTime}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(ticket.travelDate, DATE_LOCALES[locale])}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900">₹{ticket.fare}/-</span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        HISTORY_STYLES[ticket.status] ?? "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {t(STATUS_LABELS[ticket.status])}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center p-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
              <History className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">
                {t(EMPTY_LABELS[filter])}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
