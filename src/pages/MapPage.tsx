import { useEffect, useState } from "react";
import { rtdb } from "@/firebase";
import { ref, onValue, off } from "firebase/database";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// ✅ Type for bus
type Bus = {
  lat: number;
  lng: number;
  name: string;
  email: string;
};

const MapPage = () => {
  const [buses, setBuses] = useState<Record<string, Bus>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const busRef = ref(rtdb, "busLocations");

    const handleValue = (snapshot: any) => {
      if (snapshot.exists()) {
        setBuses(snapshot.val());
      } else {
        setBuses({});
      }
      setLoading(false);
    };

    const handleError = (err: any) => {
      console.error("FIREBASE ERROR:", err);
      setLoading(false);
    };

    onValue(busRef, handleValue, handleError);

    return () => off(busRef, "value", handleValue);
  }, []);

  // ✅ Convert to array safely
  const busArray = Object.values(buses) as Bus[];

  // ✅ Default center (Raipur)
  let lat = 21.2514;
  let lng = 81.6296;

  // ✅ Auto-center using all buses
  if (busArray.length > 0) {
    const sumLat = busArray.reduce((acc, b) => acc + b.lat, 0);
    const sumLng = busArray.reduce((acc, b) => acc + b.lng, 0);

    lat = sumLat / busArray.length;
    lng = sumLng / busArray.length;
  }

  return (
    <div className="min-h-screen bg-[#f4f2ff]">
      <Header />

      <main className="py-20 px-4">
        <div className="max-w-6xl mx-auto">

          <h1 className="text-2xl font-bold text-center mb-6 text-[#6b4fa3]">
            Live Bus Tracking
          </h1>

          {/* 🔥 SIMPLE MAP */}
          <div className="w-full h-[400px] rounded-xl overflow-hidden shadow mb-8">
            <iframe
              width="100%"
              height="100%"
              loading="lazy"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.02},${lat - 0.02},${lng + 0.02},${lat + 0.02}&layer=mapnik&marker=${lat},${lng}`}
            />
          </div>

          {/* 🔥 TABLE */}
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-[#6b4fa3]">
              Active Buses
            </h2>

            {loading && <p>Loading buses...</p>}

            {!loading && busArray.length === 0 && (
              <p>No buses active</p>
            )}

            {!loading && busArray.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Driver</th>
                    <th>Email</th>
                    <th>Latitude</th>
                    <th>Longitude</th>
                  </tr>
                </thead>
                <tbody>
                  {busArray.map((bus, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-2">{bus.name}</td>
                      <td>{bus.email}</td>
                      <td>{bus.lat}</td>
                      <td>{bus.lng}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MapPage;
