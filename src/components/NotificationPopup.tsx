import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { NOTIFICATION_RULES } from "@/constants/config";
import { useAnnounce } from "@/components/a11y/LiveAnnouncer";
import { useTranslation } from "@/contexts/LocaleContext";
import { createAlertThrottle } from "@/domain/alerts/arrival";

interface ArrivalNotification {
  id: string;
  routeId: string;
  stop: string;
  timestamp: number;
}

interface NotificationContextValue {
  notify: (routeId: string, stop: string) => void;
}

const NotificationContext = createContext<NotificationContextValue>({
  notify: () => {},
});

export const useNotification = (): NotificationContextValue =>
  useContext(NotificationContext);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<ArrivalNotification[]>([]);
  const announce = useAnnounce();

  /** Suppresses repeat alerts for the same route and stop. */
  const throttleRef = useRef<ReturnType<typeof createAlertThrottle> | null>(null);
  throttleRef.current ??= createAlertThrottle();

  const notify = useCallback(
    (routeId: string, stop: string) => {
      const now = Date.now();

      if (!throttleRef.current!.claim(routeId, stop, now)) return;

      setNotifications((previous) => [
        ...previous,
        { id: `notif-${now}`, routeId, stop, timestamp: now },
      ]);

      // Spoken to screen-reader users, who cannot see the popup appear.
      announce(`Bus ${routeId} is reporting its position near ${stop}.`);

      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Bus nearby", {
          body: `Bus ${routeId} is reporting its position near ${stop}`,
          icon: NOTIFICATION_RULES.ICON_URL,
        });
      }
    },
    [announce]
  );

  useEffect(() => {
    if (notifications.length === 0) return;

    const timer = setTimeout(
      () => setNotifications((previous) => previous.slice(1)),
      NOTIFICATION_RULES.AUTO_DISMISS_MS
    );

    return () => clearTimeout(timer);
  }, [notifications]);

  const dismiss = useCallback(
    (id: string) =>
      setNotifications((previous) => previous.filter((n) => n.id !== id)),
    []
  );

  const { t } = useTranslation();

  const value = useMemo<NotificationContextValue>(() => ({ notify }), [notify]);

  return (
    <NotificationContext.Provider value={value}>
      {children}

      {/*
        The announcement itself goes through the shared live region, so this
        stack is a purely visual affordance. It is aria-hidden to avoid a
        screen reader hearing every alert twice.
      */}
      <div
        className="fixed top-4 right-4 z-[200] flex flex-col gap-3 w-[min(24rem,calc(100vw-2rem))]"
        aria-hidden="true"
      >
        {notifications.map((notification) => (
          <div key={notification.id} className="notification-popup !cursor-default">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">🚌</span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground text-sm">
                  Bus {notification.routeId}
                </p>
                <p className="text-sm text-muted-foreground">
                  Reporting near{" "}
                  <span className="font-medium text-foreground">
                    {notification.stop}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("notification.positionOnly")}
                </p>
              </div>

              {/*
                A real button rather than a decorative glyph, so it can be
                clicked reliably and carries an accessible name. Keyboard
                users dismiss via the surrounding page rather than reaching
                into an aria-hidden stack.
              */}
              <button
                type="button"
                onClick={() => dismiss(notification.id)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                tabIndex={-1}
              >
                <X className="w-4 h-4" />
                <span className="sr-only">{t("notification.dismiss")}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}
