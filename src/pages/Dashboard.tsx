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

    if (savedTicket) {
      setTicket(JSON.parse(savedTicket));
    }

  }, []);

  if (!user) {

    return (
      <div className="min-h-screen bg-background">

        <Header />

        <main className="py-16 px-4 text-center">

          <div className="brt-container max-w-md mx-auto py-12">

            <h2 className="text-2xl font-bold mb-4">
              Please Log In
            </h2>

            <button
              onClick={() => navigate("/login")}
              className="brt-button"
            >
              Go to Login
            </button>

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

    <div className="min-h-screen bg-background">

      <Header />

      <main className="py-10 px-4 max-w-4xl mx-auto">

        {/* USER INFO */}

        <div className="brt-container mb-8 flex justify-between items-center">

          <div>

            <h2 className="text-xl font-bold">
              {user.displayName || "User"}
            </h2>

            <p className="text-sm text-muted-foreground">
              {user.email}
            </p>

            <p className="text-xs mt-1 text-primary">
              Role: {role}
            </p>

          </div>

          <button
            onClick={logout}
            className="px-4 py-2 border rounded-xl hover:bg-secondary"
          >
            Logout
          </button>

        </div>

        {/* ADMIN PANEL */}

        {role === "admin" && (

          <div className="brt-container mb-6">

            <h3 className="font-bold text-lg">
              Admin Panel
            </h3>

            <p className="text-sm text-muted-foreground">
              Manage buses and drivers
            </p>

          </div>

        )}

        {/* DRIVER PANEL */}

        {role === "driver" && (

          <div className="brt-container mb-6">

            <h3 className="font-bold text-lg">
              Driver Panel
            </h3>

            <p className="text-sm text-muted-foreground">
              Start sharing bus location from the Driver page
            </p>

            <button
              onClick={() => navigate("/driver")}
              className="brt-button mt-3"
            >
              Go to Driver Page
            </button>

          </div>

        )}

        {/* ACTIVE TICKET */}

        <section className="mb-10">

          <h3 className="brt-section-title text-left">
            Active Ticket
          </h3>

          {mappedTicket ? (

            <div className="max-w-sm mx-auto">
              <VirtualTicket ticket={mappedTicket} />
            </div>

          ) : (

            <div className="brt-container text-center py-8">

              <p className="text-muted-foreground">
                No active ticket
              </p>

              <button
                onClick={() => navigate("/timetable")}
                className="brt-button mt-4"
              >
                Book Ticket
              </button>

            </div>

          )}

        </section>

      </main>

      <Footer />

    </div>

  );

};

export default Dashboard;