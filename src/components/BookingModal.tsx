import { useState } from "react";
import { STOPS, calculateFare } from "@/types/ticket";

function parseTimeToDate(timeStr: string) {
	const now = new Date();
	const [time, modifier] = timeStr.split(" ");
	let [hours, minutes] = time.split(":").map(Number);

	if (modifier === "PM" && hours !== 12) hours += 12;
	if (modifier === "AM" && hours === 12) hours = 0;

	const date = new Date(now);
	date.setHours(hours);
	date.setMinutes(minutes);
	date.setSeconds(0);

	return date;
}

interface BookingModalProps {
	open: boolean;
	onClose: () => void;
	departureTime: string;
	onProceedPayment: (
		fromStop: string,
		toStop: string,
		fare: number,
		departureTime: string,
		arrivalTime: string,
		bookingTime: string, // ✅ ADDED
	) => void;
	rowData: string[];
	columns: string[];
}

const BookingModal = ({
	open,
	onClose,
	departureTime,
	onProceedPayment,
	rowData,
	columns,
}: BookingModalProps) => {
	const [fromStop, setFromStop] = useState("HNLU");
	const [toStop, setToStop] = useState("");

	if (!open) return null;

	const fromIdx = STOPS.indexOf(fromStop);

	const fromColIdx = columns.indexOf(fromStop);
	const dynamicDepartureTime =
		fromColIdx >= 0 && rowData[fromColIdx]
			? rowData[fromColIdx]
			: departureTime;

	const availableTo = fromIdx >= 0 ? STOPS.slice(fromIdx + 1) : [];

	const fare = toStop ? calculateFare(fromStop, toStop) : 0;

	const toColIdx = columns.indexOf(toStop);
	const arrivalTime =
		toColIdx >= 0 && rowData[toColIdx] ? rowData[toColIdx] : departureTime;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
			onClick={onClose}
		>
			<div
				className="bg-card rounded-2xl p-8 w-full max-w-md mx-4 animate-scale-in"
				style={{ boxShadow: "0 16px 48px hsla(284,33%,30%,0.15)" }}
				onClick={(e) => e.stopPropagation()}
			>
				<h2 className="text-xl font-bold text-foreground mb-1 tracking-tight">
					Book Your Ticket
				</h2>

				<p className="text-sm text-muted-foreground mb-6">
					Route 101 · {dynamicDepartureTime} departure
				</p>

				<label className="block text-sm font-medium text-foreground mb-1">
					From Stop
				</label>
				<select
					value={fromStop}
					onChange={(e) => {
						setFromStop(e.target.value);
						setToStop("");
					}}
					className="brt-input mb-4"
				>
					{STOPS.map((s) => (
						<option key={s} value={s}>
							{s}
						</option>
					))}
				</select>

				<label className="block text-sm font-medium text-foreground mb-1">
					To Stop
				</label>
				<select
					value={toStop}
					onChange={(e) => setToStop(e.target.value)}
					className="brt-input mb-6"
					disabled={!fromStop}
				>
					<option value="">Select destination</option>
					{availableTo.map((s) => (
						<option key={s} value={s}>
							{s}
						</option>
					))}
				</select>

				{toStop && (
					<div className="bg-secondary rounded-xl p-4 mb-6">
						<div className="flex justify-between text-sm mb-1">
							<span className="text-muted-foreground">From</span>
							<span className="font-medium text-foreground">
								{fromStop}
							</span>
						</div>
						<div className="flex justify-between text-sm mb-1">
							<span className="text-muted-foreground">To</span>
							<span className="font-medium text-foreground">
								{toStop}
							</span>
						</div>
						<div className="flex justify-between text-sm mb-1">
							<span className="text-muted-foreground">
								Departure
							</span>
							<span className="font-medium text-foreground">
								{dynamicDepartureTime}
							</span>
						</div>
						<div className="flex justify-between text-sm mb-1">
							<span className="text-muted-foreground">
								Arrival
							</span>
							<span className="font-medium text-foreground">
								{arrivalTime}
							</span>
						</div>
						<div className="flex justify-between text-sm pt-2 border-t border-border mt-2">
							<span className="font-semibold text-foreground">
								Fare
							</span>
							<span className="font-bold text-primary text-lg">
								₹{fare}/-
							</span>
						</div>
					</div>
				)}

				<div className="flex gap-3">
					<button
						onClick={onClose}
						className="flex-1 py-2.5 rounded-xl border border-border text-foreground font-medium transition-all duration-300 hover:bg-secondary"
					>
						Cancel
					</button>

					<button
						disabled={!toStop}
						onClick={() => {
							const now = new Date();
							const departureDate =
								parseTimeToDate(dynamicDepartureTime);

							if (departureDate < now) {
								alert("This bus has already departed!");
								return;
							}

							onProceedPayment(
								fromStop,
								toStop,
								fare,
								dynamicDepartureTime,
								arrivalTime,
								new Date().toISOString(),
							);
						}}
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
