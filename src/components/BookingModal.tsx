import { useState } from "react";
import { STOPS_IN_ORDER, calculateFare } from "@/types/ticket";

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  departureTime: string;
  onProceedPayment: (fromStop: string, toStop: string, fare: number, departureTime: string, arrivalTime: string) => void;
  rowData: string[];
  columns: string[];
}

const BookingModal = ({ open, onClose, departureTime, onProceedPayment, rowData, columns }: BookingModalProps) => {
  const [fromStop, setFromStop] = useState("HNLU");
  const [toStop, setToStop] = useState("");

  if (!open) return null;

  const fromIdx = STOPS_IN_ORDER.indexOf(fromStop);

  const availableTo = fromIdx >= 0 ? STOPS_IN_ORDER.slice(fromIdx + 1) : [];

  const fare = toStop ? calculateFare(fromStop, toStop) : 0;

  const toColIdx = columns.indexOf(toStop);
  const arrivalTime = toColIdx >= 0 && rowData[toColIdx] ? rowData[toColIdx] : departureTime;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card rounded-2xl p-8 w-full max-w-md mx-4 animate-scale-in"
        style={{ boxShadow: "0 16px 48px hsla(284,33%,30%,0.15)" }}
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-foreground mb-1 tracking-tight">Book Your Ticket</h2>
        <p className="text-sm text-muted-foreground mb-6">Route 101 · {departureTime} departure</p>

        <label className="block text-sm font-medium text-foreground mb-1">From Stop</label>
        <select
          value={fromStop}
          onChange={e => { setFromStop(e.target.value); setToStop(""); }}
          className="brt-input mb-4"
        >
          {STOPS_IN_ORDER.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <label className="block text-sm font-medium text-foreground mb-1">To Stop</label>
        <select
          value={toStop}
          onChange={e => setToStop(e.target.value)}
          className="brt-input mb-6"
          disabled={!fromStop}
        >
          <option value="">Select destination</option>
          {availableTo.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {toStop && (
          <div className="bg-secondary rounded-xl p-4 mb-6">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">From</span>
              <span className="font-medium text-foreground">{fromStop}</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">To</span>
              <span className="font-medium text-foreground">{toStop}</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Departure</span>
              <span className="font-medium text-foreground">{departureTime}</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Arrival</span>
              <span className="font-medium text-foreground">{arrivalTime}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-border mt-2">
              <span className="font-semibold text-foreground">Fare</span>
              <span className="font-bold text-primary text-lg">₹{fare}/-</span>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border text-foreground font-medium transition-all duration-300 hover:bg-secondary">
            Cancel
          </button>
          <button
            disabled={!toStop}
            onClick={() => onProceedPayment(fromStop, toStop, fare, departureTime, arrivalTime)}
            className="flex-1 brt-button disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Proceed to Pay
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingModal;