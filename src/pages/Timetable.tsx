import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BookingModal from "@/components/BookingModal";
import PaymentModal from "@/components/PaymentModal";
import { useUser } from "@/contexts/UserContext";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "Bus Fares", to: "/fares" },
  { label: "My Dashboard", to: "/dashboard" },
];

const columns = [
  "Route", "HNLU", "Balco Medical Center", "Sector 30", "Sector 29",
  "Sector 27", "South Block", "Indravati Bhavan", "Mahanadi Bhavan",
  "North Block", "Ekatm Path", "CBD", "Sector 15", "Telibandha",
  "DKS Bhavan", "Railway Station",
];

const weekdayRows = [
  ["101","6:25 AM","6:26 AM","6:31 AM","6:34 AM","6:36 AM","6:38 AM","6:42 AM","6:44 AM","6:48 AM","6:49 AM","6:52 AM","6:55 AM","7:18 AM","7:33 AM","7:48 AM"],
  ["101","7:25 AM","7:26 AM","7:31 AM","7:34 AM","7:36 AM","7:38 AM","7:42 AM","7:44 AM","7:48 AM","7:49 AM","7:52 AM","7:55 AM","8:18 AM","8:33 AM","8:48 AM"],

  ["101","7:55 AM","7:56 AM","8:01 AM","8:04 AM","8:06 AM","8:08 AM","8:12 AM","8:14 AM","8:18 AM","8:19 AM","8:22 AM","8:25 AM","8:48 AM","9:03 AM","9:18 AM"],
  ["101","8:25 AM","8:26 AM","8:31 AM","8:34 AM","8:36 AM","8:38 AM","8:42 AM","8:44 AM","8:48 AM","8:49 AM","8:52 AM","8:55 AM","9:18 AM","9:33 AM","9:48 AM"],
  ["101","8:40 AM","8:41 AM","8:46 AM","8:49 AM","8:51 AM","8:53 AM","8:57 AM","8:59 AM","9:03 AM","9:04 AM","9:07 AM","9:10 AM","9:33 AM","9:48 AM","10:03 AM"],
  ["101","8:55 AM","8:56 AM","9:01 AM","9:04 AM","9:06 AM","9:08 AM","9:12 AM","9:14 AM","9:18 AM","9:19 AM","9:22 AM","9:25 AM","9:48 AM","10:03 AM","10:18 AM"],

  ["101","9:10 AM","9:11 AM","9:16 AM","9:19 AM","9:21 AM","9:23 AM","9:27 AM","9:29 AM","9:33 AM","9:34 AM","9:37 AM","9:40 AM","10:03 AM","10:18 AM","10:33 AM"],
  ["101","9:25 AM","9:26 AM","9:31 AM","9:34 AM","9:36 AM","9:38 AM","9:42 AM","9:44 AM","9:48 AM","9:49 AM","9:52 AM","9:55 AM","10:18 AM","10:33 AM","10:48 AM"],

  ["101","9:55 AM","9:56 AM","10:01 AM","10:04 AM","10:06 AM","10:08 AM","10:12 AM","10:14 AM","10:18 AM","10:19 AM","10:22 AM","10:25 AM","10:48 AM","11:03 AM","11:18 AM"],
  ["101","10:25 AM","10:26 AM","10:31 AM","10:34 AM","10:36 AM","10:38 AM","10:42 AM","10:44 AM","10:48 AM","10:49 AM","10:52 AM","10:55 AM","11:18 AM","11:33 AM","11:48 AM"],
  ["101","10:55 AM","10:56 AM","11:01 AM","11:04 AM","11:06 AM","11:08 AM","11:12 AM","11:14 AM","11:18 AM","11:19 AM","11:22 AM","11:25 AM","11:48 AM","12:03 PM","12:18 PM"],

  ["101","11:25 AM","11:26 AM","11:31 AM","11:34 AM","11:36 AM","11:38 AM","11:42 AM","11:44 AM","11:48 AM","11:49 AM","11:52 AM","11:55 AM","12:18 PM","12:33 PM","12:48 PM"],
  ["101","11:55 AM","11:56 AM","12:01 PM","12:04 PM","12:06 PM","12:08 PM","12:12 PM","12:14 PM","12:18 PM","12:19 PM","12:22 PM","12:25 PM","12:48 PM","1:03 PM","1:18 PM"],

  ["101","12:25 PM","12:26 PM","12:31 PM","12:34 PM","12:36 PM","12:38 PM","12:42 PM","12:44 PM","12:48 PM","12:49 PM","12:52 PM","12:55 PM","1:18 PM","1:33 PM","1:48 PM"],
  ["101","12:55 PM","12:56 PM","1:01 PM","1:04 PM","1:06 PM","1:08 PM","1:12 PM","1:14 PM","1:18 PM","1:19 PM","1:22 PM","1:25 PM","1:48 PM","2:03 PM","2:18 PM"],

  ["101","1:25 PM","1:26 PM","1:31 PM","1:34 PM","1:36 PM","1:38 PM","1:42 PM","1:44 PM","1:48 PM","1:49 PM","1:52 PM","1:55 PM","2:18 PM","2:33 PM","2:48 PM"],
  ["101","1:55 PM","1:56 PM","2:01 PM","2:04 PM","2:06 PM","2:08 PM","2:12 PM","2:14 PM","2:18 PM","2:19 PM","2:22 PM","2:25 PM","2:48 PM","3:03 PM","3:18 PM"],

  ["101","2:25 PM","2:26 PM","2:31 PM","2:34 PM","2:36 PM","2:38 PM","2:42 PM","2:44 PM","2:48 PM","2:49 PM","2:52 PM","2:55 PM","3:18 PM","3:33 PM","3:48 PM"],
  ["101","2:55 PM","2:56 PM","3:01 PM","3:04 PM","3:06 PM","3:08 PM","3:12 PM","3:14 PM","3:18 PM","3:19 PM","3:22 PM","3:25 PM","3:48 PM","4:03 PM","4:18 PM"],

  ["101","3:25 PM","3:26 PM","3:31 PM","3:34 PM","3:36 PM","3:38 PM","3:42 PM","3:44 PM","3:48 PM","3:49 PM","3:52 PM","3:55 PM","4:18 PM","4:33 PM","4:48 PM"],
  ["101","3:55 PM","3:56 PM","4:01 PM","4:04 PM","4:06 PM","4:08 PM","4:12 PM","4:14 PM","4:18 PM","4:19 PM","4:22 PM","4:25 PM","4:48 PM","5:03 PM","5:18 PM"],

  ["101","4:25 PM","4:26 PM","4:31 PM","4:34 PM","4:36 PM","4:38 PM","4:42 PM","4:44 PM","4:48 PM","4:49 PM","4:52 PM","4:55 PM","5:18 PM","5:33 PM","5:48 PM"],
  ["101","4:55 PM","4:56 PM","5:01 PM","5:04 PM","5:06 PM","5:08 PM","5:12 PM","5:14 PM","5:18 PM","5:19 PM","5:22 PM","5:25 PM","5:48 PM","6:03 PM","6:18 PM"],

  ["101","5:10 PM","5:11 PM","5:16 PM","5:19 PM","5:21 PM","5:23 PM","5:27 PM","5:29 PM","5:33 PM","5:34 PM","5:37 PM","5:40 PM","6:03 PM","6:18 PM","6:33 PM"],
  ["101","5:25 PM","5:26 PM","5:31 PM","5:34 PM","5:36 PM","5:38 PM","5:42 PM","5:44 PM","5:48 PM","5:49 PM","5:52 PM","5:55 PM","6:18 PM","6:33 PM","6:48 PM"],

  ["101","5:55 PM","5:56 PM","6:01 PM","6:04 PM","6:06 PM","6:08 PM","6:12 PM","6:14 PM","6:18 PM","6:19 PM","6:22 PM","6:25 PM","6:48 PM","7:03 PM","7:18 PM"],
  ["101","6:25 PM","6:26 PM","6:31 PM","6:34 PM","6:36 PM","6:38 PM","6:42 PM","6:44 PM","6:48 PM","6:49 PM","6:52 PM","6:55 PM","7:18 PM","7:33 PM","7:48 PM"],

  ["101","6:55 PM","6:56 PM","7:01 PM","7:04 PM","7:06 PM","7:08 PM","7:12 PM","7:14 PM","7:18 PM","7:19 PM","7:22 PM","7:25 PM","7:48 PM","8:03 PM","8:18 PM"],
  ["101","7:25 PM","7:26 PM","7:31 PM","7:34 PM","7:36 PM","7:38 PM","7:42 PM","7:44 PM","7:48 PM","7:49 PM","7:52 PM","7:55 PM","8:18 PM","8:33 PM","8:48 PM"],

  ["101","7:55 PM","7:56 PM","8:01 PM","8:04 PM","8:06 PM","8:08 PM","8:12 PM","8:14 PM","8:18 PM","8:19 PM","8:22 PM","8:25 PM","8:48 PM","9:03 PM","9:18 PM"],
  ["101","8:25 PM","8:26 PM","8:31 PM","8:34 PM","8:36 PM","8:38 PM","8:42 PM","8:44 PM","8:48 PM","8:49 PM","8:52 PM","8:55 PM","9:12 PM","9:27 PM","9:42 PM"],

  ["101","8:55 PM","8:56 PM","9:01 PM","9:04 PM","9:06 PM","9:08 PM","9:12 PM","9:14 PM","9:18 PM","9:19 PM","9:22 PM","9:25 PM","9:48 PM","10:03 PM","10:18 PM"],
  ["101","9:25 PM","9:26 PM","9:31 PM","9:34 PM","9:36 PM","9:38 PM","9:42 PM","9:44 PM","9:48 PM","9:49 PM","9:52 PM","9:55 PM","10:12 PM","10:27 PM","10:42 PM"]
];

const weekendRows = [
  ["102","7:25 AM","7:26 AM","7:31 AM","7:34 AM","7:36 AM","7:38 AM","","","7:40 AM","7:41 AM","7:44 AM","7:47 AM","8:10 AM","8:25 AM","8:40 AM"],

  ["102","8:25 AM","8:26 AM","8:31 AM","8:34 AM","8:36 AM","8:38 AM","","","8:40 AM","8:43 AM","8:46 AM","8:49 AM","9:12 AM","9:27 AM","9:42 AM"],

  ["102","8:55 AM","8:56 AM","9:01 AM","9:04 AM","9:06 AM","9:08 AM","","","9:10 AM","9:13 AM","9:16 AM","9:19 AM","9:42 AM","9:57 AM","10:12 AM"],

  ["101","9:25 AM","9:26 AM","9:31 AM","9:34 AM","9:36 AM","9:38 AM","9:42 AM","9:44 AM","9:48 AM","9:49 AM","9:52 AM","9:55 AM","10:18 AM","10:33 AM","10:48 AM"],

  ["101","9:55 AM","9:56 AM","10:01 AM","10:04 AM","10:06 AM","10:08 AM","10:12 AM","10:14 AM","10:18 AM","10:19 AM","10:22 AM","10:25 AM","10:48 AM","11:03 AM","11:18 AM"],

  ["101","10:25 AM","10:26 AM","10:31 AM","10:34 AM","10:36 AM","10:38 AM","10:42 AM","10:44 AM","10:48 AM","10:49 AM","10:52 AM","10:55 AM","11:18 AM","11:33 AM","11:48 AM"],

  ["101","10:55 AM","10:56 AM","11:01 AM","11:04 AM","11:06 AM","11:08 AM","11:12 AM","11:14 AM","11:18 AM","11:19 AM","11:22 AM","11:25 AM","11:48 AM","12:03 PM","12:18 PM"],

  ["101","11:25 AM","11:26 AM","11:31 AM","11:34 AM","11:36 AM","11:38 AM","11:42 AM","11:44 AM","11:48 AM","11:49 AM","11:52 AM","11:55 AM","12:18 PM","12:33 PM","12:48 PM"],

  ["102","12:25 PM","12:26 PM","12:31 PM","12:34 PM","12:36 PM","12:38 PM","","","12:40 PM","12:43 PM","12:46 PM","12:49 PM","1:12 PM","1:27 PM","1:42 PM"],

  ["102","1:25 PM","1:26 PM","1:31 PM","1:34 PM","1:36 PM","1:38 PM","","","1:40 PM","1:43 PM","1:46 PM","1:49 PM","2:12 PM","2:27 PM","2:42 PM"],

  ["102","2:25 PM","2:26 PM","2:31 PM","2:34 PM","2:36 PM","2:38 PM","","","2:40 PM","2:43 PM","2:46 PM","2:49 PM","3:12 PM","3:27 PM","3:42 PM"],

  ["102","3:25 PM","3:26 PM","3:31 PM","3:34 PM","3:36 PM","3:38 PM","","","3:40 PM","3:43 PM","3:46 PM","3:49 PM","4:12 PM","4:27 PM","4:42 PM"],

  ["101","3:55 PM","3:56 PM","4:01 PM","4:04 PM","4:06 PM","4:08 PM","4:12 PM","4:14 PM","4:12 PM","4:13 PM","4:16 PM","4:19 PM","4:42 PM","4:57 PM","5:12 PM"],

  ["101","4:25 PM","4:26 PM","4:31 PM","4:34 PM","4:36 PM","4:38 PM","4:42 PM","4:44 PM","4:42 PM","4:43 PM","4:46 PM","4:49 PM","5:12 PM","5:27 PM","5:42 PM"],

  ["101","4:55 PM","4:56 PM","5:01 PM","5:04 PM","5:06 PM","5:08 PM","5:12 PM","5:14 PM","5:12 PM","5:13 PM","5:16 PM","5:19 PM","5:42 PM","5:57 PM","6:12 PM"],

  ["101","5:25 PM","5:26 PM","5:31 PM","5:34 PM","5:36 PM","5:38 PM","5:42 PM","5:44 PM","5:42 PM","5:43 PM","5:46 PM","5:49 PM","6:12 PM","6:27 PM","6:42 PM"],

  ["101","5:55 PM","5:56 PM","6:01 PM","6:04 PM","6:06 PM","6:08 PM","6:12 PM","6:14 PM","6:12 PM","6:13 PM","6:16 PM","6:19 PM","6:42 PM","6:57 PM","7:12 PM"],

  ["102","6:25 PM","6:26 PM","6:31 PM","6:34 PM","6:36 PM","6:38 PM","","","6:40 PM","6:43 PM","6:46 PM","6:49 PM","7:12 PM","7:27 PM","7:42 PM"],

  ["102","6:55 PM","6:56 PM","7:01 PM","7:04 PM","7:06 PM","7:08 PM","","","7:10 PM","7:13 PM","7:16 PM","7:19 PM","7:42 PM","7:57 PM","8:12 PM"],

  ["102","7:25 PM","7:26 PM","7:31 PM","7:34 PM","7:36 PM","7:38 PM","","","7:40 PM","7:43 PM","7:46 PM","7:49 PM","8:12 PM","8:27 PM","8:42 PM"],

  ["102","8:25 PM","8:26 PM","8:31 PM","8:34 PM","8:36 PM","8:38 PM","","","8:40 PM","8:43 PM","8:46 PM","8:49 PM","9:12 PM","9:27 PM","9:42 PM"]
];

const TimetableTable = ({ caption, rows, onBook }: { caption: string; rows: string[][]; onBook: (row: string[], depTime: string) => void }) => (
  <div className="overflow-x-auto mx-auto max-w-full mb-10">
    <table className="w-full border-collapse rounded-2xl overflow-hidden" style={{ boxShadow: "0 4px 16px hsla(284,33%,30%,0.06), 0 12px 32px hsla(284,33%,30%,0.04)" }}>
      <caption className="text-lg font-bold text-foreground mb-4 tracking-tight">{caption}</caption>
      <thead>
        <tr className="bg-primary text-primary-foreground">
          {columns.map((col) => (
            <th key={col} className="px-2 py-2.5 text-[10px] lg:text-xs font-semibold whitespace-nowrap text-center">{col}</th>
          ))}
          <th className="px-2 py-2.5 text-[10px] lg:text-xs font-semibold text-center">Book</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className={`transition-colors duration-200 ${i % 2 === 0 ? "bg-card" : "bg-secondary"} hover:bg-accent/50`}>
            {row.map((cell, j) => (
              <td key={j} className="px-2 py-1.5 text-[10px] lg:text-xs text-center whitespace-nowrap text-foreground border-b border-border">{cell}</td>
            ))}
            <td className="px-2 py-1.5 border-b border-border text-center">
              <button
                onClick={() => onBook(row, row[1])}
                className="px-2 py-1 text-[10px] lg:text-xs bg-primary text-primary-foreground rounded-md hover:-translate-y-0.5 transition-all duration-200 hover:shadow-md active:scale-95"
              >
                Book
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const Timetable = () => {
  const { user, activeTicket } = useUser();
  const navigate = useNavigate();

  const [bookingOpen, setBookingOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const [selectedRow, setSelectedRow] = useState<string[]>([]);
  const [selectedDep, setSelectedDep] = useState("");

  // ✅ added bookingTime here
  const [paymentData, setPaymentData] = useState({
    from: "",
    to: "",
    fare: 0,
    dep: "",
    arr: "",
    bookingTime: ""
  });

  const handleBook = (row: string[], depTime: string) => {
    if (!user) {
      alert("Please log in first to book a ticket.");
      navigate("/login");
      return;
    }

    if (activeTicket) {
      alert("You already have an active ticket. Please wait for it to expire or check your dashboard.");
      return;
    }

    setSelectedRow(row);
    setSelectedDep(depTime);
    setBookingOpen(true);
  };

  // ✅ updated function (added bookingTime)
  const handleProceedPayment = (
    from: string,
    to: string,
    fare: number,
    dep: string,
    arr: string,
    bookingTime: string
  ) => {
    setPaymentData({ from, to, fare, dep, arr, bookingTime });
    setBookingOpen(false);
    setPaymentOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title="Bus Time Table" navLinks={navLinks} />

      <main className="py-10 px-4">
        <TimetableTable
          caption="BRT Service - HNLU to Raipur Railway Station (Weekdays)"
          rows={weekdayRows}
          onBook={handleBook}
        />
        <TimetableTable
          caption="BRT Service – HNLU to Raipur Railway Station (Weekends)"
          rows={weekendRows}
          onBook={handleBook}
        />
      </main>

      <Footer />

      <BookingModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        departureTime={selectedDep}
        onProceedPayment={handleProceedPayment}
        rowData={selectedRow}
        columns={columns}
      />

      <PaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        fromStop={paymentData.from}
        toStop={paymentData.to}
        fare={paymentData.fare}
        departureTime={paymentData.dep}
        arrivalTime={paymentData.arr}
        bookingTime={paymentData.bookingTime}   // ✅ added
        onSuccess={() => navigate("/dashboard")}
      />
    </div>
  );
};

export default Timetable;