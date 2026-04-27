import { useEffect, useState } from "react";
import { rtdb } from "@/firebase";
import { ref, set, remove } from "firebase/database";
import { useUser } from "@/contexts/UserContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Driver = () => {
  const { user, role } = useUser();

  const [isSharing, setIsSharing] = useState(false);
  const [coords, setCoords] = useState<any>(null);

  useEffect(() => {
  if (!user || role !== "driver") return;

  let interval: any;

  if (isSharing) {
    interval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;

          setCoords({ latitude, longitude });

          set(ref(rtdb, `busLocations/${user.uid}`), {
            lat: latitude,
            lng: longitude,
            name: user.displayName || "Driver",
            email: user.email,
            updatedAt: Date.now(),
          });
        },
        (err) => console.log(err),
        { enableHighAccuracy: true }
      );
    }, 3000); // 🔥 every 3 sec
  }

  return () => clearInterval(interval);
}, [user, role, isSharing]);

  const stopSharing = async () => {
    if (!user) return;
    await remove(ref(rtdb, `busLocations/${user.uid}`));
    setIsSharing(false);
  };

  if (role !== "driver") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-xl shadow text-center">
          <h2 className="text-xl font-semibold text-red-500">
            Access Denied
          </h2>
          <p className="mt-2 text-gray-600">
            You are not authorized to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f2ff]">
      <Header />

      <main className="py-20 px-4">
        <div className="max-w-xl mx-auto">

          <div className="bg-white rounded-2xl shadow-lg p-8 text-center space-y-6">

            <h1 className="text-2xl font-bold text-[#6b4fa3]">
              Driver Live Tracking
            </h1>

            {/* STATUS */}
            <div className="flex justify-center items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  isSharing ? "bg-green-500 animate-pulse" : "bg-gray-400"
                }`}
              />
              <span className="text-sm font-medium">
                {isSharing ? "Sharing Live Location" : "Not Sharing"}
              </span>
            </div>

            {/* COORDS */}
            {coords && (
              <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700">
                <p>Latitude: {coords.latitude}</p>
                <p>Longitude: {coords.longitude}</p>
              </div>
            )}

            {/* BUTTONS */}
            <div className="flex justify-center gap-4">

              {!isSharing ? (
                <button
                  onClick={() => setIsSharing(true)}
                  className="px-6 py-3 rounded-xl bg-green-600 text-white font-medium shadow hover:bg-green-700 transition"
                >
                  Start Sharing
                </button>
              ) : (
                <button
                  onClick={stopSharing}
                  className="px-6 py-3 rounded-xl bg-red-500 text-white font-medium shadow hover:bg-red-600 transition"
                >
                  Stop Sharing
                </button>
              )}

            </div>

          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Driver;
