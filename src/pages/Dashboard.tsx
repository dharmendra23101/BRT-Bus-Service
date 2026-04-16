import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import VirtualTicket from "@/components/VirtualTicket";
import { useUser } from "@/contexts/UserContext";

const Dashboard = () => {

  const { user, role, logout } = useUser();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<any>(null);

  useEffect(() => {
    const savedTicket = localStorage.getItem("latestTicket");
    if (savedTicket) setTicket(JSON.parse(savedTicket));
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f4f2ff]">

        <Header />

        <main className="py-24 px-4">

          <div className="max-w-md mx-auto text-center">

            <div className="bg-white/90 backdrop-blur-xl rounded-[28px] px-8 py-12 border border-purple-100 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">

              <h2 className="text-[26px] font-semibold text-[#6b4fa3]">
                Please Log In
              </h2>

              <button
                onClick={() => navigate("/login")}
                className="mt-6 px-6 py-3 rounded-xl bg-gradient-to-r from-[#7c5cff] to-[#6b4fa3] text-white font-medium shadow-[0_10px_25px_rgba(124,92,255,0.25)] transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_18px_40px_rgba(124,92,255,0.35)]"
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

          <div className="relative rounded-[34px] bg-[#faf9ff] px-6 md:px-12 py-12 shadow-[0_30px_90px_rgba(0,0,0,0.06)]">

            <div className="absolute inset-0 rounded-[34px] bg-gradient-to-br from-purple-200/30 via-purple-100/20 to-transparent blur-3xl opacity-70"></div>

            <div className="relative space-y-10">

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

                <div>
                  <h2 className="text-[24px] md:text-[26px] font-semibold text-[#6b4fa3]">
                    {user.displayName || "User"}
                  </h2>

                  <p className="text-[#7a6aa8] text-sm mt-1">
                    {user.email}
                  </p>

                  <p className="text-xs mt-2 text-[#8b7bd4]">
                    Role: {role}
                  </p>
                </div>

                <button
                  onClick={logout}
                  className="px-5 py-2.5 rounded-xl border border-purple-200 text-[#6b4fa3] font-medium bg-white/80 backdrop-blur transition-all duration-300 hover:-translate-y-[2px] hover:bg-purple-50 hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
                >
                  Logout
                </button>

              </div>

              {role === "admin" && (

                <div className="bg-white/90 backdrop-blur-xl rounded-[22px] px-6 py-6 border border-purple-100 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">

                  <h3 className="text-[18px] font-semibold text-[#6b4fa3]">
                    Admin Panel
                  </h3>

                  <p className="text-sm text-[#7a6aa8] mt-2">
                    Manage buses and drivers
                  </p>

                </div>

              )}

              {role === "driver" && (

                <div className="bg-white/90 backdrop-blur-xl rounded-[22px] px-6 py-6 border border-purple-100 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">

                  <h3 className="text-[18px] font-semibold text-[#6b4fa3]">
                    Driver Panel
                  </h3>

                  <p className="text-sm text-[#7a6aa8] mt-2">
                    Start sharing bus location from the Driver page
                  </p>

                  <button
                    onClick={() => navigate("/driver")}
                    className="mt-4 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7c5cff] to-[#6b4fa3] text-white font-medium shadow-[0_10px_25px_rgba(124,92,255,0.25)] transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_18px_40px_rgba(124,92,255,0.35)]"
                  >
                    Go to Driver Page
                  </button>

                </div>

              )}

              <div>

                <h3 className="text-[20px] font-semibold text-[#6b4fa3] mb-6">
                  Active Ticket
                </h3>

                {mappedTicket ? (

                  <div className="flex justify-center">
                    <div className="p-[2px] rounded-[24px] bg-gradient-to-br from-purple-200/40 via-purple-100/30 to-transparent">
                      <div className="bg-white/95 backdrop-blur-xl rounded-[24px] p-4 shadow-[0_15px_40px_rgba(0,0,0,0.08)]">
                        <VirtualTicket ticket={mappedTicket} />
                      </div>
                    </div>
                  </div>

                ) : (

                  <div className="text-center bg-white/90 backdrop-blur-xl rounded-[22px] px-6 py-10 border border-purple-100 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">

                    <p className="text-[#7a6aa8]">
                      No active ticket
                    </p>

                    <button
                      onClick={() => navigate("/timetable")}
                      className="mt-5 px-6 py-3 rounded-xl bg-gradient-to-r from-[#7c5cff] to-[#6b4fa3] text-white font-medium shadow-[0_10px_25px_rgba(124,92,255,0.25)] transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_18px_40px_rgba(124,92,255,0.35)]"
                    >
                      Book Ticket
                    </button>

                  </div>

                )}

              </div>

            </div>

          </div>

        </div>

      </main>

      <Footer />

    </div>

  );

};

export default Dashboard;