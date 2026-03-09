import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { ref, onValue } from "firebase/database";
import { rtdb } from "@/firebase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const FIFTEEN_MIN = 15 * 60 * 1000;

const MapPage = () => {

  const mapRef = useRef<any>(null);
  const markersRef = useRef<any>({});
  const [drivers, setDrivers] = useState<any[]>([]);

  useEffect(() => {

    const map = L.map("map").setView([20.5937, 78.9629], 5);

    mapRef.current = map;

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      { attribution: "© OpenStreetMap contributors" }
    ).addTo(map);

    const driversRef = ref(rtdb, "drivers");

    onValue(driversRef, (snapshot) => {

      const data = snapshot.val();
      const now = Date.now();

      const activeDrivers: any[] = [];
      const activeUIDs: string[] = [];

      if (data) {

        Object.keys(data).forEach(uid => {

          const d = data[uid];

          if (now - d.timestamp > FIFTEEN_MIN) return;

          activeDrivers.push(d);
          activeUIDs.push(uid);

          const pos = [d.latitude, d.longitude];

          if (!markersRef.current[uid]) {

            markersRef.current[uid] =
              L.marker(pos).addTo(map).bindPopup(d.name);

          } else {

            markersRef.current[uid].setLatLng(pos);

          }

        });

      }

      setDrivers(activeDrivers);

    });

  }, []);

  return (

    <div className="min-h-screen bg-background">

      <Header />

      <main className="p-10">

        <h2 className="text-xl font-bold mb-6">
          Live Driver Locations
        </h2>

        <div id="map" style={{ height: "400px" }} />

        <table className="w-full mt-8 border">

          <thead>
            <tr>
              <th>Driver</th>
              <th>Latitude</th>
              <th>Longitude</th>
              <th>Last Update</th>
            </tr>
          </thead>

          <tbody>

            {drivers.map((d, i) => (

              <tr key={i}>
                <td>{d.name}</td>
                <td>{d.latitude.toFixed(5)}</td>
                <td>{d.longitude.toFixed(5)}</td>
                <td>{new Date(d.timestamp).toLocaleTimeString()}</td>
              </tr>

            ))}

          </tbody>

        </table>

      </main>

      <Footer />

    </div>
  );

};

export default MapPage;