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
  if (role !== "driver" && role !== "admin") return <Navigate to="/dashboard" />;

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
    intervalRef.current = setInterval(sendLocation, 3000);
    setSharing(true);
  };

  const stopSharing = async () => {
    clearInterval(intervalRef.current);
    await remove(ref(rtdb, "drivers/" + user.uid));
    setSharing(false);
  };

  return (
    <div className="min-h-screen bg-[#f4f2ff]">

      <Header />

      <main className="py-24 px-4">

        <div className="max-w-5xl mx-auto">

          <div className="relative rounded-[34px] bg-[#faf9ff] px-6 md:px-12 py-14 shadow-[0_30px_90px_rgba(0,0,0,0.06)]">

            <div className="absolute inset-0 rounded-[34px] bg-gradient-to-br from-purple-200/30 via-purple-100/20 to-transparent blur-3xl opacity-70"></div>

            <div className="relative">

              <div className="text-center mb-14">
                <h1 className="text-[40px] md:text-[48px] font-semibold text-[#6b4fa3] tracking-tight">
                  Driver Location Sharing
                </h1>
                <p className="mt-4 text-[#7a6aa8] text-[15px] md:text-[16px] max-w-xl mx-auto">
                  Share your location to help passengers track your bus in real-time
                </p>
              </div>

              <div className="relative group mb-10">

                <div className="absolute inset-0 rounded-[26px] bg-gradient-to-br from-purple-300/30 via-purple-200/20 to-transparent blur-2xl opacity-60 group-hover:opacity-90 transition duration-700"></div>

                <div className="relative bg-white/90 backdrop-blur-xl rounded-[26px] px-6 md:px-10 py-12 border border-purple-100 shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition-all duration-500 group-hover:-translate-y-[3px] group-hover:shadow-[0_40px_100px_rgba(0,0,0,0.12)]">

                  {!sharing ? (
                    <button
                      onClick={startSharing}
                      className="w-full flex items-center justify-center gap-3 px-10 py-5 rounded-2xl font-semibold text-white text-lg bg-gradient-to-r from-[#7c5cff] to-[#6b4fa3] shadow-[0_12px_30px_rgba(124,92,255,0.3)] transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_20px_50px_rgba(124,92,255,0.4)]"
                    >
                      <Play className="w-6 h-6" />
                      Start Sharing Location
                    </button>
                  ) : (
                    <button
                      onClick={stopSharing}
                      className="w-full flex items-center justify-center gap-3 px-10 py-5 rounded-2xl font-semibold text-white text-lg bg-gradient-to-r from-red-500 to-red-600 shadow-[0_12px_30px_rgba(239,68,68,0.3)] transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_20px_50px_rgba(239,68,68,0.4)]"
                    >
                      <Square className="w-6 h-6" />
                      Stop Sharing
                    </button>
                  )}

                  <p className="text-center text-[#7a6aa8] text-sm mt-5">
                    {sharing
                      ? "Your location is being shared every 3 seconds"
                      : "Click to start broadcasting your location"}
                  </p>

                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

                <div className="bg-white/90 backdrop-blur-xl rounded-[22px] px-6 py-6 border border-purple-100 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">

                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${sharing ? "bg-green-100" : "bg-gray-100"}`}>
                      <Activity className={`w-6 h-6 ${sharing ? "text-green-600" : "text-gray-600"}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#6b4fa3]">Status</h3>
                      <p className="text-sm text-[#7a6aa8]">
                        {sharing ? "Active - Broadcasting" : "Inactive"}
                      </p>
                    </div>
                  </div>

                </div>

                <div className="bg-white/90 backdrop-blur-xl rounded-[22px] px-6 py-6 border border-purple-100 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">

                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${coords ? "bg-blue-100" : "bg-gray-100"}`}>
                      <MapPin className={`w-6 h-6 ${coords ? "text-blue-600" : "text-gray-600"}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#6b4fa3]">Location</h3>
                      <p className="text-sm text-[#7a6aa8]">
                        {coords ? "Position acquired" : "Not available"}
                      </p>
                    </div>
                  </div>

                </div>

              </div>

              {coords && (

                <div className="bg-white/90 backdrop-blur-xl rounded-[24px] px-6 py-8 border border-purple-100 shadow-[0_15px_40px_rgba(0,0,0,0.08)]">

                  <div className="space-y-6">

                    <div>
                      <p className="text-sm text-[#7a6aa8]">Latitude</p>
                      <p className="text-xl font-mono font-semibold text-[#6b4fa3] mt-1">
                        {coords.latitude.toFixed(6)}
                      </p>
                    </div>

                    <div className="border-t border-purple-100 pt-4">
                      <p className="text-sm text-[#7a6aa8]">Longitude</p>
                      <p className="text-xl font-mono font-semibold text-[#6b4fa3] mt-1">
                        {coords.longitude.toFixed(6)}
                      </p>
                    </div>

                    {sharing && (
                      <div className="border-t border-purple-100 pt-4 flex items-center gap-2 text-green-600">
                        <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
                        <span className="text-sm font-medium">
                          Broadcasting to passengers
                        </span>
                      </div>
                    )}

                  </div>

                </div>

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