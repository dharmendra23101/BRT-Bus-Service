import { useEffect, useRef } from "react";
import { useUser } from "@/contexts/UserContext";
import { useNotification } from "@/components/NotificationPopup";

const API_URL = "https://location-backend-aqvu.onrender.com/api/location";

const STOP_COORDS: Record<string, { lat: number; lng: number }> = {
  "HNLU": { lat: 21.2514, lng: 81.6296 },
  "Balco Medical Center": { lat: 21.2480, lng: 81.6350 },
  "Sector 30": { lat: 21.2460, lng: 81.6400 },
  "IIM": { lat: 21.2440, lng: 81.6420 },
  "Sector 29": { lat: 21.2420, lng: 81.6450 },
  "Sector 27": { lat: 21.2400, lng: 81.6480 },
  "South Block": { lat: 21.2380, lng: 81.6510 },
  "Indravati Bhavan": { lat: 21.2360, lng: 81.6540 },
  "Mahanadi Bhavan": { lat: 21.2340, lng: 81.6560 },
  "North Block": { lat: 21.2320, lng: 81.6580 },
  "Ekatm Path": { lat: 21.2300, lng: 81.6600 },
  "CBD": { lat: 21.2280, lng: 81.6620 },
  "Sector 15": { lat: 21.2260, lng: 81.6650 },
  "Telibandha": { lat: 21.2230, lng: 81.6680 },
  "DKS Bhavan": { lat: 21.2200, lng: 81.6710 },
  "Railway Station": { lat: 21.2100, lng: 81.6300 },
};

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const ArrivalMonitor = () => {
  const { user, profile, activeTicket } = useUser();
  const { notify } = useNotification();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user || !profile?.notifications_enabled || !activeTicket) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const stopName = activeTicket.from_stop;
    const stopCoord = STOP_COORDS[stopName];
    if (!stopCoord) return;

    const poll = async () => {
      try {
        const res = await fetch(API_URL);
        const data = await res.json();
        if (!data?.latitude || !data?.longitude) return;

        const dist = haversine(data.latitude, data.longitude, stopCoord.lat, stopCoord.lng);
        const avgSpeed = 30;
        const eta = Math.round((dist / avgSpeed) * 60);

        if (eta <= 5) {
          notify(data.busNumber || "101", stopName, eta);
        }
      } catch {}
    };

    poll();
    intervalRef.current = setInterval(poll, 10000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [user, profile?.notifications_enabled, activeTicket, notify]);

  return null;
};

export default ArrivalMonitor;
