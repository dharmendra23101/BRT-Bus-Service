import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import VirtualTicket from "@/components/VirtualTicket";
import { useUser } from "@/contexts/UserContext";

function parseTimeToDate(timeStr: string, baseDate: string) {
  const [time, period] = timeStr.split(" ");
  let [h, m] = time.split(":").map(Number);

  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;

  const d = new Date(baseDate);
  d.setHours(h);
  d.setMinutes(m);
  d.setSeconds(0);

  return d;
}

function getExpiryTime(arrival: string, bookingTime: string) {
  const d = parseTimeToDate(arrival, bookingTime);
  d.setMinutes(d.getMinutes() + 15);
  return d;
}

const Dashboard = () => {
  const { user, role, logout, loading } = useUser();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const savedTicket = localStorage.getItem("latestTicket");
    const savedHistory = localStorage.getItem("ticketHistory");

    if (savedTicket) setTicket(JSON.parse(savedTicket));
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  // 🔥 AUTO EXPIRY + MOVE TO HISTORY
  useEffect(() => {
    if (!ticket) return;

    const expiry = getExpiryTime(ticket.arrival, ticket.bookingTime);

    const timeout = setTimeout(() => {
      const updatedHistory = [ticket, ...history].slice(0, 3);

      setHistory(updatedHistory);
      localStorage.setItem("ticketHistory", JSON.stringify(updatedHistory));

      setTicket(null);
      localStorage.removeItem("latestTicket");
    }, expiry.getTime() - Date.now());

    return () => clearTimeout(timeout);
  }, [ticket]);

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
        bookingTime: ticket.bookingTime, // ✅ FIXED
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
                <p className="text-xs mt-2 text-purple-600">
                  Role: {role}
                </p>
              </div>

              <button onClick={logout} className="px-4 py-2 border rounded-lg">
                Logout
              </button>
            </div>

            {/* DRIVER */}
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

            {/* ADMIN */}
            {role === "admin" && (
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="font-semibold text-lg">Admin Panel</h3>
              </div>
            )}

            {/* ACTIVE TICKET */}
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

            {/* 🟣 HISTORY */}
            {history.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  Previous Tickets
                </h3>

                {history.map((t, i) => (
                  <div key={i} className="p-4 border rounded-lg mb-3 opacity-70">
                    <div className="font-medium">
                      {t.from} → {t.to}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t.departure} - {t.arrival}
                    </div>
                    <div className="text-xs text-red-500 mt-1">
                      Expired
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;