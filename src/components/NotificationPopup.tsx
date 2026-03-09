import { useState, useEffect, useCallback, createContext, useContext, ReactNode, useRef } from "react";

interface Notification {
  id: string;
  busNumber: string;
  stop: string;
  eta: number; // minutes
  timestamp: number;
}

interface NotificationContextType {
  notify: (busNumber: string, stop: string, eta: number) => void;
}

const NotificationContext = createContext<NotificationContextType>({ notify: () => {} });

export const useNotification = () => useContext(NotificationContext);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const lastSentRef = useRef<Record<string, number>>({});

  const notify = useCallback((busNumber: string, stop: string, eta: number) => {
    const key = `${busNumber}-${stop}`;
    const now = Date.now();
    // Spam prevention: only once per stop per 5 minutes
    if (lastSentRef.current[key] && now - lastSentRef.current[key] < 300000) return;
    lastSentRef.current[key] = now;

    const id = `notif-${now}`;
    setNotifications(prev => [...prev, { id, busNumber, stop, eta, timestamp: now }]);

    // Browser push
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Bus Arrival Alert", {
        body: `Bus ${busNumber} arriving at ${stop} in ~${eta} minutes`,
        icon: "https://cdn-icons-png.freepik.com/512/1719/1719609.png",
      });
    }
  }, []);

  // Request permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Auto dismiss after 6s
  useEffect(() => {
    if (notifications.length === 0) return;
    const timer = setTimeout(() => {
      setNotifications(prev => prev.slice(1));
    }, 6000);
    return () => clearTimeout(timer);
  }, [notifications]);

  const dismiss = (id: string) => setNotifications(prev => prev.filter(n => n.id !== id));

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      {/* Floating popups */}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-3 max-w-sm">
        {notifications.map(n => (
          <div
            key={n.id}
            className="notification-popup animate-slide-in-right"
            onMouseEnter={e => e.currentTarget.classList.add("paused")}
            onMouseLeave={e => e.currentTarget.classList.remove("paused")}
            onClick={() => dismiss(n.id)}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">🚌</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground text-sm">Bus {n.busNumber}</p>
                <p className="text-sm text-muted-foreground">
                  Arriving at <span className="font-medium text-foreground">{n.stop}</span>
                </p>
                <p className="text-xs text-primary font-semibold mt-0.5">In approx {n.eta} minutes</p>
              </div>
              <button className="text-muted-foreground hover:text-foreground text-lg leading-none">&times;</button>
            </div>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}
