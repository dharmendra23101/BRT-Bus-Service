import { useState, useRef } from "react";
import { Navigate } from "react-router-dom";
import { ref, set, remove } from "firebase/database";
import { rtdb } from "@/firebase";
import { useUser } from "@/contexts/UserContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Driver = () => {

  const { user, role, loading } = useUser();

  const intervalRef = useRef<any>(null);

  const [coords, setCoords] = useState<any>(null);
  const [sharing, setSharing] = useState(false);

  if (loading) return null;

  if (!user) return <Navigate to="/login" />;

  if (role !== "driver" && role !== "admin") {
    return <Navigate to="/dashboard" />;
  }

  const sendLocation = () => {

    navigator.geolocation.getCurrentPosition(async pos => {

      const latitude = pos.coords.latitude;
      const longitude = pos.coords.longitude;

      setCoords({ latitude, longitude });

      await set(ref(rtdb, "drivers/" + user.uid), {
        name: user.displayName,
        latitude,
        longitude,
        timestamp: Date.now()
      });

    });

  };

  const startSharing = () => {

    sendLocation();

    intervalRef.current = setInterval(() => {
      sendLocation();
    }, 3000);

    setSharing(true);

  };

  const stopSharing = async () => {

    clearInterval(intervalRef.current);

    await remove(ref(rtdb, "drivers/" + user.uid));

    setSharing(false);

  };

  return (

    <div className="min-h-screen bg-background">

      <Header />

      <main className="p-10">

        <h1 className="text-2xl font-bold mb-6">
          Driver Location Sharing
        </h1>

        {!sharing ? (
          <button onClick={startSharing} className="brt-button">
            Start Sharing Location
          </button>
        ) : (
          <button onClick={stopSharing} className="brt-button bg-red-500">
            Stop Sharing
          </button>
        )}

        {coords && (

          <div className="mt-6 p-4 border rounded">

            <p>Latitude: {coords.latitude}</p>
            <p>Longitude: {coords.longitude}</p>

            <p className="text-green-600">
              Sending location every 3 seconds
            </p>

          </div>

        )}

      </main>

      <Footer />

    </div>

  );

};

export default Driver;