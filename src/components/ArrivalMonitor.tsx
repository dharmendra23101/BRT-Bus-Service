import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTickets } from "@/contexts/TicketContext";
import { isLiveStatus } from "@/domain/ticket/status";
import { STOP_COORDS } from "@/domain/transit/stops";
import { classifyBuses, subscribeToBuses } from "@/services/locationService";
import { selectNearestDistanceKm, shouldAlert } from "@/domain/alerts/arrival";
import { useNotification } from "@/components/NotificationPopup";

/**
 * Watches live bus positions and tells the passenger when a bus is reporting
 * close to their boarding stop.
 *
 * Proximity, not arrival: the alert says a bus is nearby, never how long it
 * will take to reach the stop. Renders nothing. It only runs for a signed-in
 * passenger who holds a live ticket and has not opted out of notifications, so
 * a signed-out visitor never opens a subscription.
 */
const ArrivalMonitor = () => {
  const { user, profile } = useAuth();
  const { activeTicket } = useTickets();
  const { notify } = useNotification();

  useEffect(() => {
    if (!user || !profile?.notifications_enabled || !activeTicket) return;
    if (!isLiveStatus(activeTicket.status)) return;

    const boardingStop = activeTicket.fromStop;
    const stopCoord = STOP_COORDS[boardingStop];
    if (!stopCoord) return;

    return subscribeToBuses((buses) => {
      const distanceKm = selectNearestDistanceKm(classifyBuses(buses), stopCoord);

      if (shouldAlert(distanceKm)) notify(activeTicket.route, boardingStop);
    });
  }, [user, profile?.notifications_enabled, activeTicket, notify]);

  return null;
};

export default ArrivalMonitor;
