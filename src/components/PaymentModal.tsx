import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useUser } from "@/contexts/UserContext";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  fromStop: string;
  toStop: string;
  fare: number;
  departureTime: string;
  arrivalTime: string;
  onSuccess: () => void;
}

type PaymentStatus = "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED";

const generateTicketId = () => {
  return "TICKET-" + Math.random().toString(36).substring(2, 10).toUpperCase();
};

const generatePaymentId = () => {
  return "PAY-" + Math.random().toString(36).substring(2, 10).toUpperCase();
};

const PaymentModal = ({
  open,
  onClose,
  fromStop,
  toStop,
  fare,
  departureTime,
  arrivalTime,
  onSuccess,
}: PaymentModalProps) => {
  const { user } = useUser();
  const [status, setStatus] = useState<PaymentStatus>("PENDING");

  useEffect(() => {
    if (open) setStatus("PENDING");
  }, [open]);

  if (!open) return null;

  const handlePay = async () => {
    if (!user) return;

    setStatus("PROCESSING");

    await new Promise((r) => setTimeout(r, 2000));

    const ticketId = generateTicketId();
    const paymentId = generatePaymentId();

    const ticketData = {
      ticketId,
      paymentId,
      route: "101",
      from: fromStop,
      to: toStop,
      departure: departureTime,
      arrival: arrivalTime,
      fare,
      user: user.email,
    };

    localStorage.setItem("latestTicket", JSON.stringify(ticketData));

    setStatus("SUCCESS");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl p-8 w-full max-w-md mx-4 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {status === "PENDING" && (
          <>
            <h2 className="text-xl font-bold mb-2">Payment</h2>

            <div className="bg-secondary rounded-xl p-4 mb-6">
              <p className="font-semibold">
                {fromStop} → {toStop}
              </p>
              <p className="text-sm">
                {departureTime} - {arrivalTime}
              </p>
              <p className="text-2xl font-bold text-primary mt-2">
                ₹{fare}/-
              </p>
            </div>

            <div className="flex justify-center mb-6">
              <QRCodeSVG
                value={`upi://pay?pa=brtbus@upi&pn=BRT Bus&am=${fare}&cu=INR`}
                size={140}
              />
            </div>

            <button onClick={handlePay} className="w-full brt-button">
              Simulate Payment ₹{fare}
            </button>

            <button
              onClick={onClose}
              className="w-full py-2 mt-2 text-sm text-muted-foreground"
            >
              Cancel
            </button>
          </>
        )}

        {status === "PROCESSING" && (
          <div className="flex flex-col items-center py-8">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
            <p>Processing Payment...</p>
          </div>
        )}

        {status === "SUCCESS" && (
          <div className="flex flex-col items-center py-8">
            <h3 className="text-xl font-bold mb-3">
              Payment Successful 🎉
            </h3>

            <button
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="brt-button"
            >
              View My Ticket
            </button>
          </div>
        )}

        {status === "FAILED" && (
          <div className="flex flex-col items-center py-8">
            <h3 className="text-xl font-bold mb-3 text-red-500">
              Payment Failed
            </h3>

            <button
              onClick={() => setStatus("PENDING")}
              className="brt-button"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentModal;