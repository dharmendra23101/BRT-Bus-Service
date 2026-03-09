import { useState, useRef } from "react";
import { Navigate } from "react-router-dom";
import { ref, set, remove } from "firebase/database";
import { rtdb } from "@/firebase";
import { useUser } from "@/contexts/UserContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Play, Square, MapPin, Activity } from "lucide-react";

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
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const latitude = pos.coords.latitude;
      const longitude = pos.coords.longitude;

      setCoords({ latitude, longitude });

      await set(ref(rtdb, "drivers/" + user.uid), {
        name: user.displayName,
        latitude,
        longitude,
        timestamp: Date.now(),
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
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30 flex flex-col">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 flex-1">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-foreground">
            Driver Location Sharing
          </h1>
          <p className="text-muted-foreground">
            Share your location to help passengers track your bus in real-time
          </p>
        </div>

        {/* Control Panel */}
        <div className="glass-card mb-6">
          <div className="flex flex-col items-center justify-center py-12">
            {!sharing ? (
              <button
                onClick={startSharing}
                className="group relative bg-gradient-to-br from-primary to-primary/80 text-primary-foreground px-12 py-6 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <div className="flex items-center gap-3">
                  <Play className="w-6 h-6" />
                  Start Sharing Location
                </div>
              </button>
            ) : (
              <button
                onClick={stopSharing}
                className="group relative bg-gradient-to-br from-red-500 to-red-600 text-white px-12 py-6 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <div className="flex items-center gap-3">
                  <Square className="w-6 h-6" />
                  Stop Sharing
                </div>
              </button>
            )}

            <p className="text-sm text-muted-foreground mt-4 text-center">
              {sharing
                ? "Your location is being shared every 3 seconds"
                : "Click to start broadcasting your location"}
            </p>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status Card */}
          <div className="glass-card">
            <div className="flex items-start gap-4">
              <div
                className={`p-3 rounded-xl ${
                  sharing ? "bg-green-100" : "bg-gray-100"
                }`}
              >
                <Activity
                  className={`w-6 h-6 ${
                    sharing ? "text-green-600" : "text-gray-600"
                  }`}
                />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">Status</h3>
                <p className="text-sm text-muted-foreground">
                  {sharing ? "Active - Broadcasting" : "Inactive"}
                </p>
              </div>
            </div>
          </div>

          {/* Location Card */}
          <div className="glass-card">
            <div className="flex items-start gap-4">
              <div
                className={`p-3 rounded-xl ${
                  coords ? "bg-blue-100" : "bg-gray-100"
                }`}
              >
                <MapPin
                  className={`w-6 h-6 ${
                    coords ? "text-blue-600" : "text-gray-600"
                  }`}
                />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">
                  Current Location
                </h3>
                <p className="text-sm text-muted-foreground">
                  {coords ? "Position acquired" : "Not available"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Coordinates Display */}
        {coords && (
          <div className="glass-card mt-6 animate-fade-in-up">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Latitude
                </label>
                <p className="text-xl font-mono font-semibold text-foreground mt-1">
                  {coords.latitude.toFixed(6)}
                </p>
              </div>
              <div className="border-t border-border pt-4">
                <label className="text-sm font-medium text-muted-foreground">
                  Longitude
                </label>
                <p className="text-xl font-mono font-semibold text-foreground mt-1">
                  {coords.longitude.toFixed(6)}
                </p>
              </div>
              {sharing && (
                <div className="border-t border-border pt-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
                    <span className="text-sm font-medium">
                      Broadcasting to passengers
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Driver;