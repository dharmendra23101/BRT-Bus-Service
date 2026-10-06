import { useId, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { findConflictingTicket } from "@/domain/ticket/conflicts";
import type { JourneySelection } from "@/domain/ticket/types";
import { calculateFare } from "@/domain/transit/fares";
import { useTranslation } from "@/contexts/LocaleContext";
import {
  getCallTime,
  getDestinationsFrom,
  getTripStops,
  type Trip,
} from "@/domain/transit/schedule";
import type { StopName } from "@/domain/transit/stops";
import { parseTimeToDate } from "@/domain/time";
import { useTickets } from "@/contexts/TicketContext";

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  /** The scheduled run the passenger tapped "Book" on. */
  trip: Trip;
  /** Stops the passenger already chose elsewhere, so they are not re-entered. */
  initialFromStop?: StopName;
  initialToStop?: StopName;
  onProceedPayment: (selection: JourneySelection) => void;
}

/**
 * Stop selection for a chosen trip.
 *
 * Built on Radix Dialog rather than a bare overlay so focus is trapped inside
 * the dialog, Escape closes it, focus returns to the "Book" button that
 * opened it, and the page behind cannot be scrolled or tabbed into.
 */
const BookingModal = ({
  open,
  onClose,
  trip,
  initialFromStop,
  initialToStop,
  onProceedPayment,
}: BookingModalProps) => {
  const { tickets } = useTickets();

  const fieldId = useId();
  const fromId = `${fieldId}-from`;
  const toId = `${fieldId}-to`;
  const summaryId = `${fieldId}-summary`;
  const problemId = `${fieldId}-problem`;

  const servedStops = useMemo(() => getTripStops(trip), [trip]);

  const [fromStop, setFromStop] = useState<StopName>(
    () => initialFromStop ?? servedStops[0]!
  );
  const [toStop, setToStop] = useState<StopName | "">(() => initialToStop ?? "");

  const destinations = useMemo(
    () => getDestinationsFrom(trip, fromStop),
    [trip, fromStop]
  );

  const departureTime = getCallTime(trip, fromStop) ?? "";
  const arrivalTime = toStop ? getCallTime(trip, toStop) ?? "" : "";
  const fare = toStop ? calculateFare(fromStop, toStop) : null;
  const { t } = useTranslation();
  const unpriced = toStop !== "" && fare === null;

  const { hasDeparted, conflict } = useMemo(() => {
    if (!toStop) return { hasDeparted: false, conflict: null };

    const departureAt = parseTimeToDate(departureTime);
    const arrivalAt = parseTimeToDate(arrivalTime);

    if (arrivalAt < departureAt) arrivalAt.setDate(arrivalAt.getDate() + 1);

    return {
      hasDeparted: departureAt < new Date(),
      conflict: findConflictingTicket(tickets, departureAt, arrivalAt),
    };
  }, [toStop, departureTime, arrivalTime, tickets]);

  const blocked = !toStop || hasDeparted || conflict !== null || unpriced;
  const hasProblem = hasDeparted || conflict !== null || unpriced;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl tracking-tight">{t("booking.title")}</DialogTitle>
          <DialogDescription>
            {t("booking.description", {
              route: trip.routeId,
              time: departureTime,
            })}
          </DialogDescription>
        </DialogHeader>

        <div>
          <label htmlFor={fromId} className="block text-sm font-medium text-foreground mb-1">
            {t("booking.fromStop")}
          </label>
          <select
            id={fromId}
            value={fromStop}
            onChange={(e) => {
              setFromStop(e.target.value as StopName);
              setToStop("");
            }}
            className="brt-input mb-4"
          >
            {servedStops.map((stop) => (
              <option key={stop} value={stop}>
                {stop}
              </option>
            ))}
          </select>

          <label htmlFor={toId} className="block text-sm font-medium text-foreground mb-1">
            {t("booking.toStop")}
            <span className="text-destructive" aria-hidden="true">
              {" "}
              *
            </span>
            <span className="sr-only">{t("field.required")}</span>
          </label>
          <select
            id={toId}
            value={toStop}
            required
            aria-describedby={hasProblem ? problemId : undefined}
            onChange={(e) => setToStop(e.target.value as StopName)}
            className="brt-input"
          >
            <option value="">{t("booking.selectDestination")}</option>
            {destinations.map((stop) => (
              <option key={stop} value={stop}>
                {stop}
              </option>
            ))}
          </select>
        </div>

        {/*
          Announced politely: changing stops recalculates the fare, and a
          screen reader user needs to hear the new price without having to go
          looking for it.
        */}
        <div id={summaryId} aria-live="polite" aria-atomic="true">
          {toStop && fare !== null && (
            <div className="bg-secondary rounded-xl p-4">
              <dl className="text-sm">
                <div className="flex justify-between mb-1">
                  <dt className="text-muted-foreground">{t("journey.from")}</dt>
                  <dd className="font-medium text-foreground">{fromStop}</dd>
                </div>
                <div className="flex justify-between mb-1">
                  <dt className="text-muted-foreground">{t("journey.to")}</dt>
                  <dd className="font-medium text-foreground">{toStop}</dd>
                </div>
                <div className="flex justify-between mb-1">
                  <dt className="text-muted-foreground">{t("journey.departure")}</dt>
                  <dd className="font-medium text-foreground">{departureTime}</dd>
                </div>
                <div className="flex justify-between mb-1">
                  <dt className="text-muted-foreground">{t("journey.arrival")}</dt>
                  <dd className="font-medium text-foreground">{arrivalTime}</dd>
                </div>
                <div className="flex justify-between pt-2 border-t border-border mt-2">
                  <dt className="font-semibold text-foreground">{t("booking.fare")}</dt>
                  <dd className="font-bold text-primary text-lg">₹{fare}/-</dd>
                </div>
              </dl>
            </div>
          )}
        </div>

        {/* Blocking problems interrupt, because they change what the user can do. */}
        <div id={problemId} role="alert">
          {hasDeparted && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3">
              <p className="text-sm text-destructive font-medium">
                {t("booking.departed")}
              </p>
            </div>
          )}

          {unpriced && !hasDeparted && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3">
              <p className="text-sm text-destructive font-medium">
                {t("booking.unpriced")}
              </p>
            </div>
          )}

          {conflict && !hasDeparted && !unpriced && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3">
              <p className="text-sm text-destructive font-medium">
                {t("booking.conflict", {
                  from: conflict.fromStop,
                  to: conflict.toStop,
                })}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-3 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-foreground font-medium transition-colors duration-state hover:bg-secondary touch-target"
          >
            {t("action.cancel")}
          </button>

          <button
            type="button"
            disabled={blocked}
            onClick={() => {
              if (!toStop || fare === null) return;

              onProceedPayment({
                route: trip.routeId,
                fromStop,
                toStop,
                fare,
                departureTime,
                arrivalTime,
                bookingTime: new Date().toISOString(),
              });
            }}
            className="flex-1 brt-button disabled:opacity-40 disabled:cursor-not-allowed touch-target"
          >
            {t("booking.proceed")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BookingModal;
