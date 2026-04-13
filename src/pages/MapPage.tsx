import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { ref, onValue } from "firebase/database";
import { rtdb } from "@/firebase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "leaflet/dist/leaflet.css";

const FIFTEEN_MIN = 15 * 60 * 1000;

// Fix default marker icon issue with Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapPage = () => {
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any>({});
  const [drivers, setDrivers] = useState<any[]>([]);

  useEffect(() => {
    const map = L.map("map").setView([20.5937, 78.9629], 5);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    const driversRef = ref(rtdb, "drivers");

    const unsubscribe = onValue(driversRef, (snapshot) => {
      const data = snapshot.val();
      const now = Date.now();
      const activeDrivers: any[] = [];

      // Remove old markers
      Object.keys(markersRef.current).forEach((uid) => {
        if (!data || !data[uid] || now - data[uid].timestamp > FIFTEEN_MIN) {
          markersRef.current[uid].remove();
          delete markersRef.current[uid];
        }
      });

      if (data) {
        Object.keys(data).forEach((uid) => {
          const d = data[uid];
          if (now - d.timestamp > FIFTEEN_MIN) return;

          activeDrivers.push(d);

          const pos = [d.latitude, d.longitude];

          // Custom bus icon
          const busIcon = L.divIcon({
            className: "custom-bus-marker",
            html: `
              <div class="bus-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M8 6v6"></path>
                  <path d="M15 6v6"></path>
                  <path d="M2 12h19.6"></path>
                  <path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"></path>
                  <circle cx="7" cy="18" r="2"></circle>
                  <circle cx="16" cy="18" r="2"></circle>
                </svg>
              </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
          });

          if (!markersRef.current[uid]) {
            markersRef.current[uid] = L.marker(pos, { icon: busIcon })
              .addTo(map)
              .bindPopup(`
                <div style="text-align: center;">
                  <strong style="font-size: 14px;">${d.name}</strong><br/>
                  <span style="font-size: 12px; color: #666;">
                    Last update: ${new Date(d.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              `);
          } else {
            markersRef.current[uid].setLatLng(pos);
          }
        });
      }

      setDrivers(activeDrivers);
    });

    return () => {
      unsubscribe();
      if (mapRef.current) {
        mapRef.current.remove();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Page Title */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">Live Driver Locations</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Tracking {drivers.length} active {drivers.length === 1 ? 'bus' : 'buses'}
          </p>
        </div>

        {/* Map Container - Fixed z-index */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-border mb-8 relative" style={{ zIndex: 1 }}>
          <div id="map" className="w-full h-[400px] md:h-[500px] lg:h-[600px]" />
        </div>

        {/* Drivers Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-border">
          <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-primary/10">
            <h3 className="text-lg font-bold text-foreground">Active Drivers</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                    Driver
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                    Latitude
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                    Longitude
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">
                    Last Update
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {drivers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                      No active drivers at the moment
                    </td>
                  </tr>
                ) : (
                  drivers.map((d, i) => (
                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-foreground">
                        {d.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground font-mono">
                        {d.latitude.toFixed(5)}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground font-mono">
                        {d.longitude.toFixed(5)}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {new Date(d.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Footer />

      <style>{`
        .custom-bus-marker {
          background: transparent;
          border: none;
        }

        .bus-icon {
          background: linear-gradient(135deg, hsl(284, 33%, 48%), hsl(284, 33%, 42%));
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2), 0 0 0 3px rgba(255, 255, 255, 0.9);
          cursor: pointer;
          transition: transform 0.2s ease;
        }

        .bus-icon:hover {
          transform: scale(1.1);
        }

        .leaflet-popup-content-wrapper {
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        /* Fix z-index for leaflet map */
        .leaflet-container {
          z-index: 1 !important;
        }

        .leaflet-pane {
          z-index: auto !important;
        }

        .leaflet-top,
        .leaflet-bottom {
          z-index: 2 !important;
        }

        .leaflet-control {
          z-index: 3 !important;
        }

        /* Ensure map doesn't overflow */
        #map {
          position: relative;
          z-index: 1;
        }
      `}</style>
    </div>
  );
};

export default MapPage;