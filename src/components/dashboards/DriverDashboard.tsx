import { useUser } from "@/contexts/UserContext";
import { Zap, Radio, Users, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

interface DriverDashboardProps {
  onError?: (error: string) => void;
}

const DriverDashboard = ({ onError }: DriverDashboardProps) => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [isLive, setIsLive] = useState(false);

  const getInitials = (name?: string) => {
    if (!name) return "D";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Driver Info */}
      <div className="bg-white rounded-2xl p-8 shadow-lg mb-8">
        <div className="flex items-center gap-6 mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center text-2xl font-bold">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || "Driver"}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              getInitials(user?.displayName)
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{user?.displayName || "Driver"}</h1>
            <p className="text-gray-600">{user?.email}</p>
            <p className="text-sm text-blue-600 font-semibold mt-1">🚌 Driver</p>
          </div>
        </div>

        {/* GO LIVE SECTION */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-8 text-white text-center mb-8">
          <Radio className="w-12 h-12 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-2">Share Live Location</h2>
          <p className="text-blue-100 mb-6">Start broadcasting your bus location to passengers</p>

          <button
            onClick={() => {
              setIsLive(!isLive);
              navigate("/driver");
            }}
            className={`px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2 mx-auto ${
              isLive
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-white text-blue-600 hover:shadow-lg hover:-translate-y-1"
            }`}
          >
            <Zap className="w-5 h-5" />
            {isLive ? "Stop Broadcasting" : "Start Broadcasting"}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-5 h-5 text-blue-600" />
              <p className="text-gray-600 font-medium">Status</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {isLive ? "🟢 Live" : "⚫ Offline"}
            </p>
          </div>

          <div className="bg-green-50 rounded-xl p-6 border border-green-200">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-green-600" />
              <p className="text-gray-600 font-medium">Passengers Today</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">0</p>
          </div>

          <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
            <div className="flex items-center gap-3 mb-2">
              <MapPin className="w-5 h-5 text-purple-600" />
              <p className="text-gray-600 font-medium">Distance Covered</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">0 km</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;