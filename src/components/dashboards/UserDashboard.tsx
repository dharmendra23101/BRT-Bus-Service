import { useUser } from "@/contexts/UserContext";
import { Ticket, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

interface UserDashboardProps {
  onError?: (error: string) => void;
}

const UserDashboard = ({ onError }: UserDashboardProps) => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<any>(null);

  useEffect(() => {
    const savedTicket = localStorage.getItem("latestTicket");
    if (savedTicket) {
      try {
        setTicket(JSON.parse(savedTicket));
      } catch (err) {
        console.error("Error parsing ticket:", err);
      }
    }
  }, []);

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-2xl p-8 shadow-lg mb-8">
        {/* User Info */}
        <div className="flex items-center gap-6 mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 text-white flex items-center justify-center text-2xl font-bold">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || "User"}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              getInitials(user?.displayName)
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{user?.displayName || "Passenger"}</h1>
            <p className="text-gray-600">{user?.email}</p>
            <p className="text-sm text-purple-600 font-semibold mt-1">👤 Passenger</p>
          </div>
        </div>

        {/* Active Ticket Section */}
        <div className="border-t pt-8">
          <div className="flex items-center gap-2 mb-6">
            <Ticket className="w-6 h-6 text-purple-600" />
            <h2 className="text-2xl font-bold text-gray-900">Your Tickets</h2>
          </div>

          {ticket ? (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-600">Ticket ID</p>
                  <p className="text-lg font-bold text-gray-900">{ticket.ticketId}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Route</p>
                  <p className="text-lg font-bold text-gray-900">{ticket.route}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">From</p>
                  <p className="text-lg font-bold text-gray-900">{ticket.from}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">To</p>
                  <p className="text-lg font-bold text-gray-900">{ticket.to}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center p-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium mb-4">No active tickets</p>
              <button
                onClick={() => navigate("/timetable")}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
              >
                Book a Ticket
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;