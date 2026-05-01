import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useUser } from "@/contexts/UserContext";
import UserDashboard from "@/components/dashboards/UserDashboard";
import DriverDashboard from "@/components/dashboards/DriverDashboard";
import AdminDashboard from "@/components/dashboards/AdminDashboard";
import { AlertCircle, Loader } from "lucide-react";

const Dashboard = () => {
  const { user, role, loading } = useUser();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  // Determine user role with fallback to 'user'
  const userRole = role || "user";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f2ff] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 text-[#874f9c] animate-spin" />
          <p className="text-[#6b4fa3] font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f4f2ff]">
        <Header />
        <main className="py-24 px-4">
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl p-10 shadow-lg border-2 border-purple-100">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-orange-500" />
                <h2 className="text-xl font-semibold text-[#6b4fa3]">
                  Authentication Required
                </h2>
              </div>
              <p className="text-gray-600 mb-6">
                You need to log in to access the dashboard. Please authenticate to continue.
              </p>
              <button
                onClick={() => navigate("/login")}
                className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
              >
                Go to Login
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f4f2ff] to-white">
      <Header />

      <main className="py-8 px-4">
        {error && (
          <div className="max-w-5xl mx-auto mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800 font-medium"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* USER DASHBOARD */}
        {userRole === "user" && <UserDashboard onError={setError} />}

        {/* DRIVER DASHBOARD */}
        {userRole === "driver" && <DriverDashboard onError={setError} />}

        {/* ADMIN DASHBOARD */}
        {userRole === "admin" && <AdminDashboard onError={setError} />}
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
