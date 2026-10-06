import { useEffect, useMemo, useRef, useState } from "react";
import { onValue, ref } from "firebase/database";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getRtdb } from "@/firebase";

declare global {
  interface Window {
    L: any;
  }
}

interface BusLocation {
  id: string;
  name: string;
  email: string;
  lat: number;
  lng: number;
  updatedAt: number | null;
  [key: string]: unknown;
}

/* ============================================================
   DEFAULT MAP CONSTANTS
   ============================================================ */
const DEFAULT_CENTER: [number, number] = [21.1611, 81.7865]; // Default map center if no buses
const DEFAULT_ZOOM = 13;

/* ============================================================
   HELPERS
   ============================================================ */

const parseBus = (id: string, value: unknown): BusLocation | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const data = value as Record<string, unknown>;

  const lat = typeof data.lat === "number" ? data.lat : Number(data.lat);
  const lng = typeof data.lng === "number" ? data.lng : Number(data.lng);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }

  const email = typeof data.email === "string" ? data.email.trim() : "";

  let name = "";
  if (typeof data.name === "string" && data.name.trim()) {
    name = data.name.trim();
  } else if (email) {
    name = email.split("@")[0] ?? email;
  } else {
    name = `Bus ${id.slice(-5)}`;
  }

  const rawUpdatedAt =
    typeof data.updatedAt === "number"
      ? data.updatedAt
      : Number(data.updatedAt);

  const updatedAt =
    Number.isFinite(rawUpdatedAt) && rawUpdatedAt > 0 ? rawUpdatedAt : null;

  return {
    ...data,
    id,
    name,
    email,
    lat,
    lng,
    updatedAt,
  } as BusLocation;
};

const formatTime = (timestamp: number | null) => {
  if (!timestamp) {
    return "No timestamp";
  }
  return new Date(timestamp).toLocaleString();
};

const isFresh = (bus: BusLocation) => {
  if (!bus.updatedAt) {
    return false;
  }
  /* Mark live if timestamp updated within last 15 seconds */
  return Date.now() - bus.updatedAt < 15_000;
};

/* Create custom HTML marker for Leaflet */
const createCustomMarkerIcon = (
  bus: BusLocation,
  isSelected: boolean,
  isLive: boolean
) => {
  if (!window.L) return null;

  const html = `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -50%); cursor: pointer;">
      <div style="position: relative; display: flex; align-items: center; justify-content: center;">
        ${
          isLive
            ? '<span style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background-color: #4ade80; opacity: 0.75; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>'
            : ""
        }
        <div style="
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 2px solid ${isSelected ? "#1e3a8a" : isLive ? "#16a34a" : "#9ca3af"};
          background-color: ${isSelected ? "#2563eb" : "#ffffff"};
          color: ${isSelected ? "#ffffff" : "#1f2937"};
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
          font-size: 18px;
          transition: transform 0.2s;
          ${isSelected ? "transform: scale(1.15);" : ""}
        ">
          🚌
        </div>
      </div>
      <div style="
        margin-top: 4px;
        padding: 2px 8px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 700;
        white-space: nowrap;
        box-shadow: 0 2px 4px rgba(0,0,0,0.15);
        background-color: ${isSelected ? "#1e3a8a" : "#ffffff"};
        color: ${isSelected ? "#ffffff" : "#111827"};
        border: 1px solid ${isSelected ? "#172554" : "#d1d5db"};
        display: flex;
        align-items: center;
        gap: 5px;
      ">
        <span style="width: 7px; height: 7px; border-radius: 50%; background-color: ${
          isLive ? "#22c55e" : "#9ca3af"
        };"></span>
        <span>${bus.name}</span>
      </div>
    </div>
  `;

  return window.L.divIcon({
    html,
    className: "custom-bus-leaflet-icon",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

const MapPage = () => {
  const [buses, setBuses] = useState<BusLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(true);
  const [showLiveOnly, setShowLiveOnly] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});

  /* Re-render timer for continuous freshness checks */
  const [, setTick] = useState(0);

  /* ==========================================================
     DYNAMICALLY LOAD LEAFLET MAP LIBRARY
     ========================================================== */

  useEffect(() => {
    if (window.L) {
      setLeafletLoaded(true);
      return;
    }

    const cssLink = document.createElement("link");
    cssLink.rel = "stylesheet";
    cssLink.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(cssLink);

    const jsScript = document.createElement("script");
    jsScript.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    jsScript.async = true;
    jsScript.onload = () => {
      setLeafletLoaded(true);
    };
    document.head.appendChild(jsScript);
  }, []);

  /* ==========================================================
     FIREBASE REALTIME DATABASE LISTENER
     ========================================================== */

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const start = async () => {
      try {
        const db = await getRtdb();

        if (!db) {
          throw new Error("Realtime Database unavailable.");
        }

        const locationsRef = ref(db, "busLocations");

        unsubscribe = onValue(
          locationsRef,
          (snapshot) => {
            const result: BusLocation[] = [];

            snapshot.forEach((child) => {
              const bus = parseBus(child.key ?? "", child.val());
              if (bus) {
                result.push(bus);
              }
            });

            /* Sort by newest timestamp first */
            result.sort(
              (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
            );

            setBuses(result);
            setLoading(false);
            setError("");
          },
          (firebaseError) => {
            console.error("Firebase map error:", firebaseError);
            setError(firebaseError.message);
            setLoading(false);
          }
        );
      } catch (err) {
        console.error("Firebase connection failed:", err);
        setError(
          err instanceof Error ? err.message : "Could not load buses."
        );
        setLoading(false);
      }
    };

    void start();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  /* Freshness Interval */
  useEffect(() => {
    const timer = window.setInterval(() => {
      setTick((value) => value + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  /* Filtered lists */
  const liveBuses = useMemo(() => {
    return buses.filter(isFresh);
  }, [buses]);

  const activeBuses = showLiveOnly ? liveBuses : buses;

  const selectedBus = selectedId
    ? buses.find((bus) => bus.id === selectedId) ?? null
    : null;

  const displayedBuses = selectedBus ? [selectedBus] : activeBuses;

  /* ==========================================================
     INITIALIZE & UPDATE LEAFLET MAP
     ========================================================== */

  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current || loading) return;

    // Initialize Map if not already created
    if (!mapInstanceRef.current) {
      const map = window.L.map(mapContainerRef.current, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: true,
      });

      window.L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }
      ).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const currentMarkerIds = new Set(displayedBuses.map((b) => b.id));

    // Remove markers that are no longer displayed
    Object.keys(markersRef.current).forEach((id) => {
      if (!currentMarkerIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // Add or update markers for displayed buses
    displayedBuses.forEach((bus) => {
      const live = isFresh(bus);
      const selected = selectedId === bus.id;
      const icon = createCustomMarkerIcon(bus, selected, live);

      if (markersRef.current[bus.id]) {
        // Update existing marker position & icon
        const marker = markersRef.current[bus.id];
        marker.setLatLng([bus.lat, bus.lng]);
        if (icon) marker.setIcon(icon);
      } else if (icon) {
        // Create new marker
        const marker = window.L.marker([bus.lat, bus.lng], { icon }).addTo(map);
        marker.on("click", () => {
          setSelectedId((prev) => (prev === bus.id ? null : bus.id));
        });
        markersRef.current[bus.id] = marker;
      }
    });

    // Auto-fit bounds or pan to selected bus
    if (selectedBus) {
      map.setView([selectedBus.lat, selectedBus.lng], 16, { animate: true });
    } else if (displayedBuses.length > 0) {
      const bounds = window.L.latLngBounds(
        displayedBuses.map((b) => [b.lat, b.lng])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [leafletLoaded, loading, displayedBuses, selectedId, selectedBus]);

  const selectBus = (id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1 py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* HEADER BAR */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border shadow-sm">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                🚌 Live Bus Tracking Dashboard
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Real-time tracking for {buses.length} registered vehicle
                {buses.length !== 1 ? "s" : ""} ({liveBuses.length} currently live)
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowLiveOnly((prev) => !prev)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition ${
                  showLiveOnly
                    ? "bg-green-600 text-white border-green-700"
                    : "bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                {showLiveOnly ? "Showing: Live Only" : "Showing: All Vehicles"}
              </button>

              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 border text-sm font-medium flex items-center gap-2 transition"
              >
                <span>{menuOpen ? "Hide Table" : "Show Table"}</span>
                <span>{menuOpen ? "▲" : "▼"}</span>
              </button>
            </div>
          </div>

          {/* ERROR ALERT */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          {/* MAP DISPLAY (ALWAYS RENDERED) */}
          <div className="relative w-full h-[520px] rounded-xl border shadow-md overflow-hidden bg-gray-100">
            {/* Map Container */}
            <div ref={mapContainerRef} className="w-full h-full z-10" />

            {/* LOADING OVERLAY */}
            {loading && (
              <div className="absolute inset-0 z-30 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="font-medium">Loading live bus coordinates...</p>
                </div>
              </div>
            )}

            {/* EMPTY DRIVERS OVERLAY BADGE */}
            {!loading && buses.length === 0 && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-white/95 backdrop-blur-md px-4 py-2 rounded-full border shadow-lg flex items-center gap-2 text-xs font-semibold text-gray-700">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span>No active drivers online — Showing default map view</span>
              </div>
            )}

            {/* MAP OVERLAY STATS */}
            {!loading && buses.length > 0 && (
              <div className="absolute top-3 left-3 z-20 bg-white/95 backdrop-blur-sm rounded-lg shadow-md px-3.5 py-2 text-xs font-semibold text-gray-800 border flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                <span>{liveBuses.length} Active Live</span>
                <span className="text-gray-400">|</span>
                <span className="text-gray-500">{buses.length} Total</span>
              </div>
            )}
          </div>

          {/* DATA TABLE SECTION */}
          {menuOpen && (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    All Bus Location Data
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Live telemetry entries from Realtime Database under{" "}
                    <code className="bg-gray-200 text-gray-800 px-1.5 py-0.5 rounded font-mono">
                      busLocations
                    </code>
                  </p>
                </div>

                {selectedBus && (
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800 underline"
                  >
                    Clear Selected Filter
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 text-gray-700 uppercase text-[11px] tracking-wider border-b">
                    <tr>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Firebase ID</th>
                      <th className="px-4 py-3">Latitude</th>
                      <th className="px-4 py-3">Longitude</th>
                      <th className="px-4 py-3">Updated At</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200">
                    {buses.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-6 py-12 text-center text-gray-500"
                        >
                          No bus location records found in Firebase RTDB.
                        </td>
                      </tr>
                    ) : (
                      buses.map((bus) => {
                        const live = isFresh(bus);
                        const selected = selectedId === bus.id;

                        return (
                          <tr
                            key={bus.id}
                            className={`transition ${
                              selected
                                ? "bg-blue-50/80 font-medium"
                                : "hover:bg-gray-50"
                            }`}
                          >
                            {/* STATUS */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                                  live
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    live ? "bg-green-600" : "bg-gray-400"
                                  }`}
                                />
                                {live ? "Live" : "Offline"}
                              </span>
                            </td>

                            {/* NAME */}
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">🚌</span>
                                <span className="font-semibold text-gray-900">
                                  {bus.name}
                                </span>
                              </div>
                            </td>

                            {/* EMAIL */}
                            <td className="px-4 py-3.5 text-gray-600 truncate max-w-[200px]">
                              {bus.email || "—"}
                            </td>

                            {/* ID */}
                            <td className="px-4 py-3.5 whitespace-nowrap font-mono text-xs">
                              <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded border">
                                {bus.id}
                              </span>
                            </td>

                            {/* LAT */}
                            <td className="px-4 py-3.5 font-mono text-xs text-gray-800">
                              {bus.lat.toFixed(6)}
                            </td>

                            {/* LNG */}
                            <td className="px-4 py-3.5 font-mono text-xs text-gray-800">
                              {bus.lng.toFixed(6)}
                            </td>

                            {/* UPDATED AT */}
                            <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-500">
                              {formatTime(bus.updatedAt)}
                            </td>

                            {/* ACTION */}
                            <td className="px-4 py-3.5 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => selectBus(bus.id)}
                                className={`px-3 py-1.5 rounded text-xs font-medium border transition ${
                                  selected
                                    ? "bg-blue-600 text-white border-blue-700"
                                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                                }`}
                              >
                                {selected ? "Focusing" : "Focus Map"}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* SELECTED SUMMARY BAR */}
              {selectedBus && (
                <div className="border-t bg-blue-50 p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📍</span>
                    <div>
                      <p className="text-sm font-bold text-blue-900">
                        Focused on {selectedBus.name}
                      </p>
                      <p className="text-xs text-blue-700">
                        Map zoomed to coordinates: {selectedBus.lat.toFixed(5)},{" "}
                        {selectedBus.lng.toFixed(5)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="px-3 py-1.5 bg-white border border-blue-300 hover:bg-blue-100 text-blue-900 text-xs font-medium rounded-md shadow-sm transition"
                  >
                    Show All Buses
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MapPage;
