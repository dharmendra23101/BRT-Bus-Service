import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import VirtualTicket from "@/components/VirtualTicket";
import { useUser } from "@/contexts/UserContext";

const Dashboard = () => {
  const { user, role, logout, loading } = useUser();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<any>(null);

  useEffect(() => {
    const savedTicket = localStorage.getItem("latestTicket");
    if (savedTicket) setTicket(JSON.parse(savedTicket));
  }, []);

  // 🔥 IMPORTANT FIX
  if (loading) return <div className="p-10 text-center">Loading...</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f4f2ff]">
        <Header />

        <main className="py-24 px-4">
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white rounded-xl p-10 shadow">
              <h2 className="text-xl font-semibold text-[#6b4fa3]">
                Please Log In
              </h2>

              <button
                onClick={() => navigate("/login")}
                className="mt-6 px-6 py-3 rounded-xl bg-purple-600 text-white"
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

  const mappedTicket = ticket
    ? {
        ticketId: ticket.ticketId,
        route: ticket.route,
        fromStop: ticket.from,
        toStop: ticket.to,
        departureTime: ticket.departure,
        arrivalTime: ticket.arrival,
        fare: ticket.fare,
        status: "ACTIVE",
        createdTime: new Date().toISOString(),
        expiryTime: "",
        qrData: JSON.stringify(ticket),
      }
    : null;

  return (
    <div className="min-h-screen bg-[#f4f2ff]">
      <Header />

      <main className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-xl p-10 shadow space-y-8">

            {/* USER INFO */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-[#6b4fa3]">
                  {user.displayName || "User"}
                </h2>
                <p className="text-sm">{user.email}</p>

                {/* 🔥 ROLE SHOW */}
                <p className="text-xs mt-2 text-purple-600">
                  Role: {role}
                </p>
              </div>

              <button
                onClick={logout}
                className="px-4 py-2 border rounded-lg"
              >
                Logout
              </button>
            </div>

            {/* 🔥 DRIVER PANEL */}
            {role === "driver" && (
              <div className="bg-purple-50 p-6 rounded-lg">
                <h3 className="font-semibold text-lg">Driver Panel</h3>
                <p className="text-sm mt-2">
                  Start sharing live bus location
                </p>

                <button
                  onClick={() => navigate("/driver")}
                  className="mt-4 px-5 py-2 bg-purple-600 text-white rounded-lg"
                >
                  Go to Driver Page
                </button>
              </div>
            )}

            {/* ADMIN PANEL */}
            {role === "admin" && (
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="font-semibold text-lg">Admin Panel</h3>
              </div>
            )}

            {/* TICKET */}
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Active Ticket
              </h3>

              {mappedTicket ? (
                <VirtualTicket ticket={mappedTicket} />
              ) : (
                <div className="text-center p-6 border rounded-lg">
                  <p>No active ticket</p>

                  <button
                    onClick={() => navigate("/timetable")}
                    className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg"
                  >
                    Book Ticket
                  </button>
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

export default Dashboard;
