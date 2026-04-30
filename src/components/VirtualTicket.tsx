import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { Ticket } from "@/types/ticket";

interface VirtualTicketProps {
  ticket: Ticket;
}

// ✅ ADDED: time parsing
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

// ✅ ADDED: expiry = arrival + 15 min
function getExpiryTime(arrival: string, bookingTime: string) {
  const d = parseTimeToDate(arrival, bookingTime);
  d.setMinutes(d.getMinutes() + 15);
  return d;
}

const VirtualTicket = ({ ticket }: VirtualTicketProps) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpired, setIsExpired] = useState(ticket.status === "EXPIRED");

  useEffect(() => {
    if (ticket.status !== "ACTIVE") {
      setIsExpired(true);
      return;
    }

    const update = () => {
      const now = new Date().getTime();

      // ✅ FIXED: compute expiry dynamically
      const exp = getExpiryTime(ticket.arrivalTime, ticket.bookingTime).getTime();

      const diff = exp - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft("Expired");
        return;
      }

      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);

      setTimeLeft(`${h}h ${m}m ${s}s`);
    };

    update();
    const iv = setInterval(update, 1000);

    return () => clearInterval(iv);
  }, [ticket]);

  return (
    <div className="ticket-card animate-fade-in">
      {/* Header strip */}
      <div className="ticket-header">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-80">BRT Bus Service</p>
            <p className="text-lg font-bold tracking-tight">Route {ticket.route}</p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              isExpired
                ? "bg-red-500/20 text-red-200"
                : "bg-green-500/20 text-green-200"
            }`}
          >
            {isExpired ? "Expired" : "Active"}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">From</p>
            <p className="font-bold text-foreground text-lg">{ticket.fromStop}</p>
          </div>
          <div className="flex items-center px-3 pt-2">
            <span className="text-primary text-xl">→</span>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">To</p>
            <p className="font-bold text-foreground text-lg">{ticket.toStop}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <div>
            <p className="text-xs text-muted-foreground">Departure</p>
            <p className="font-semibold text-foreground text-sm">{ticket.departureTime}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Arrival</p>
            <p className="font-semibold text-foreground text-sm">{ticket.arrivalTime}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Fare Paid</p>
            <p className="font-bold text-primary text-sm">₹{ticket.fare}/-</p>
          </div>
        </div>

        {/* Timer */}
        {!isExpired && (
          <div className="bg-secondary rounded-xl p-3 mb-5 text-center">
            <p className="text-xs text-muted-foreground mb-1">Valid for</p>
            <p className="text-xl font-bold text-primary tabular-nums tracking-wider">
              {timeLeft}
            </p>
          </div>
        )}

        {/* QR Code */}
        <div className="flex flex-col items-center">
          <div className="bg-white p-3 rounded-xl border border-border mb-2">
            <QRCodeSVG value={ticket.qrData} size={120} level="M" />
          </div>
          <p className="text-[10px] text-muted-foreground font-mono">
            {ticket.ticketId}
          </p>
        </div>
      </div>
    </div>
  );
};

export default VirtualTicket;