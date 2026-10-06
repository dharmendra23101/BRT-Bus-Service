import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Clock, Repeat, Search } from "lucide-react";
import Header from "@/components/Header";
import { useTranslation } from "@/contexts/LocaleContext";
import Footer from "@/components/Footer";
import StopField from "@/components/StopField";
import BookingModal from "@/components/BookingModal";
import PaymentModal from "@/components/PaymentModal";
import JourneyShortcuts from "@/components/JourneyShortcuts";
import type { JourneyPair } from "@/domain/journeys";
import { useAuth } from "@/contexts/AuthContext";
import type { JourneySelection } from "@/domain/ticket/types";
import { parseTimeToDate } from "@/domain/time";
import { BOOKING_FAILURE_MESSAGES } from "@/services/ticketService";
import { calculateFare } from "@/domain/transit/fares";
import { transferOptionsFor } from "@/domain/transit/transfers";
import { isInterchange } from "@/domain/transit/routes";
import {
  getAllTrips,
  getCallTime,
  getTripStops,
  hasScheduledService,
  serviceFor,
  type Trip,
} from "@/domain/transit/schedule";
import { tripServesJourney } from "@/domain/transit/departures";
import { findStops, isStopName, type StopName } from "@/domain/transit/stops";

interface JourneyOption {
  trip: Trip;
  departure: string;
  arrival: string;
  minutes: number;
  interchanges: StopName[];
}

const isoDate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

const clockTime = (date: Date): string =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

/**
 * Resolves whatever the passenger typed to a stop.
 *
 * An exact name wins; otherwise a search that narrows to exactly one stop is
 * accepted, so "raipur" resolves but "sector" stays ambiguous.
 */
const resolveStop = (value: string): StopName | null => {
  const trimmed = value.trim();
  if (isStopName(trimmed)) return trimmed;

  const matches = findStops(trimmed);
  return matches.length === 1 ? matches[0]! : null;
};

const minutesBetween = (from: string, to: string): number =>
  Math.round(
    (parseTimeToDate(to).getTime() - parseTimeToDate(from).getTime()) / 60_000
  );

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
};

const Plan = () => {
  const { t } = useTranslation();

  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();

  const today = isoDate(new Date());

  const [from, setFrom] = useState(params.get("from") ?? "");
  const [to, setTo] = useState(params.get("to") ?? "");
  const [date, setDate] = useState(params.get("date") ?? today);
  const [time, setTime] = useState(params.get("time") ?? clockTime(new Date()));

  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [selection, setSelection] = useState<JourneySelection | null>(null);

  const searched = params.has("from") && params.has("to");
  const origin = resolveStop(params.get("from") ?? "");
  const destination = resolveStop(params.get("to") ?? "");
  const searchedDate = params.get("date") ?? today;
  const searchedTime = params.get("time") ?? "00:00";

  const fare =
    origin && destination ? calculateFare(origin, destination) : null;

  const options = useMemo<JourneyOption[]>(() => {
    if (!origin || !destination || origin === destination) return [];

    const [hours = 0, mins = 0] = searchedTime.split(":").map(Number);
    const earliest = hours * 60 + mins;

    return getAllTrips(serviceFor(new Date(`${searchedDate}T00:00:00`)))
      .filter((trip) => tripServesJourney(trip, origin, destination))
      .map((trip) => {
        const departure = getCallTime(trip, origin)!;
        const arrival = getCallTime(trip, destination)!;
        const stops = getTripStops(trip);
        const between = stops.slice(
          stops.indexOf(origin) + 1,
          stops.indexOf(destination)
        );

        return {
          trip,
          departure,
          arrival,
          minutes: minutesBetween(departure, arrival),
          interchanges: between.filter(isInterchange),
        };
      })
      .filter((option) => {
        const at = parseTimeToDate(option.departure);
        return at.getHours() * 60 + at.getMinutes() >= earliest;
      });
  }, [origin, destination, searchedDate, searchedTime]);

  const sameStop = Boolean(origin && destination && origin === destination);
  const unresolved =
    (params.get("from") ?? "") !== "" && (!origin || !destination);
  /*
    Only asked for when nothing direct exists, which is also the only case
    `transferOptionsFor` answers - it returns nothing when a through trip
    runs, so a passenger is never offered a change beside a direct bus.
  */
  const changes = useMemo(
    () =>
      origin && destination
        ? transferOptionsFor(origin, destination, new Date(searchedDate))
        : [],
    [origin, destination, searchedDate]
  );

  const unserved =
    origin && !hasScheduledService(origin)
      ? origin
      : destination && !hasScheduledService(destination)
        ? destination
        : null;
  const bookable = searchedDate === today;

  const handleSearch = () => {
    setParams({ from: from.trim(), to: to.trim(), date, time });
  };

  const handleSwap = () => {
    setFrom(to);
    setTo(from);
  };

  const handlePick = (journey: JourneyPair) => {
    setFrom(journey.from);
    setTo(journey.to);
    setParams({ from: journey.from, to: journey.to, date, time });
  };

  const handleBook = (trip: Trip) => {
    if (!user) {
      toast.info(t(BOOKING_FAILURE_MESSAGES.NOT_AUTHENTICATED));
      navigate("/login", { state: { from: location } });
      return;
    }

    setSelection(null);
    setSelectedTrip(trip);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main id="main-content" tabIndex={-1} className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 animate-fade-in-up">
            <h1 className="text-3xl md:text-4xl font-bold text-primary tracking-tight">
              {t("plan.title")}
            </h1>
            <p className="mt-3 text-muted-foreground">
{t("plan.intro")}
            </p>

            <Link
              to="/nearby"
              className="inline-block mt-3 text-primary font-medium underline underline-offset-2 touch-target"
            >
              {t("plan.browseNearby")}
            </Link>
          </div>

          <div className="brt-search-card animate-fade-in-up animate-stagger-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StopField
                label={t("plan.from")}
                value={from}
                onChange={setFrom}
                exclude={resolveStop(to) ?? ""}
              />

              <StopField
                label={t("plan.to")}
                value={to}
                onChange={setTo}
                exclude={resolveStop(from) ?? ""}
              />

              <div>
                <label
                  htmlFor="plan-date"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  {t("plan.date")}
                </label>
                <input
                  id="plan-date"
                  type="date"
                  value={date}
                  min={today}
                  onChange={(event) => setDate(event.target.value)}
                  className="brt-input touch-target"
                />
              </div>

              <div>
                <label
                  htmlFor="plan-time"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  {t("plan.leavingAfter")}
                </label>
                <input
                  id="plan-time"
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  className="brt-input touch-target"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                type="button"
                onClick={handleSearch}
                className="brt-button flex-1 flex items-center justify-center gap-2 touch-target"
              >
                <Search className="w-4 h-4" aria-hidden="true" />
                {t("plan.search")}
              </button>

              <button
                type="button"
                onClick={handleSwap}
                className="px-6 py-3 rounded-xl border border-border text-foreground font-medium transition-colors duration-state hover:bg-secondary flex items-center justify-center gap-2 touch-target"
              >
                <Repeat className="w-4 h-4" aria-hidden="true" />
                {t("plan.swap")}
              </button>
            </div>
          </div>

          <JourneyShortcuts
            from={searched && !sameStop ? origin : null}
            to={searched && !sameStop ? destination : null}
            onPick={handlePick}
          />

          <div aria-live="polite" className="mt-8">
            {sameStop && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3">
                <p className="text-sm text-destructive font-medium">
                  {t("plan.sameStop")}
                </p>
              </div>
            )}

            {unresolved && !sameStop && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3">
                <p className="text-sm text-destructive font-medium">
{t("plan.unresolved")}
                </p>
              </div>
            )}

            {searched && origin && destination && !sameStop && (
              <>
                <div className="brt-card mb-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-foreground font-semibold">
                      <span>{origin}</span>
                      <ArrowRight
                        className="w-4 h-4 text-primary"
                        aria-hidden="true"
                      />
                      <span>{destination}</span>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {t("plan.officialFare")}
                      </p>
                      <p className="text-2xl font-bold text-primary">
                        {fare === null ? t("plan.notPublished") : `₹${fare}/-`}
                      </p>
                    </div>
                  </div>
                </div>

                {fare === null && (
                  <div className="rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 mb-6">
                    <p className="text-sm text-destructive font-medium">
{t("plan.noFare")}
                    </p>
                  </div>
                )}

                {options.length === 0 && changes.length > 0 ? (
                  <div className="brt-card text-left">
                    <p className="font-semibold text-foreground mb-1">
                      {t("plan.change.title")}
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t("plan.change.intro")}
                    </p>

                    <ol className="space-y-4">
                      {changes.map((option) => (
                        <li
                          key={`${option.first.id}-${option.changeAt}-${option.second.id}`}
                          className="rounded-xl border border-border p-4"
                        >
                          <p className="text-sm">
                            <span className="font-semibold">{origin}</span>{" "}
                            <span className="tabular-nums">{option.departs}</span>
                            {" → "}
                            <span className="font-semibold">{option.changeAt}</span>{" "}
                            <span className="tabular-nums">
                              {option.arrivesAtChange}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t("plan.change.route", {
                              route: option.first.routeId,
                            })}
                          </p>

                          <p className="text-xs font-medium text-primary mt-2">
                            {t("plan.change.changeAt", { stop: option.changeAt })}
                            {" · "}
                            {option.waitMinutes === 0
                              ? t("plan.change.noWait")
                              : t("plan.change.wait", {
                                  minutes: option.waitMinutes,
                                })}
                          </p>

                          <p className="text-sm mt-2">
                            <span className="font-semibold">{option.changeAt}</span>{" "}
                            <span className="tabular-nums">
                              {option.departsChange}
                            </span>
                            {" → "}
                            <span className="font-semibold">{destination}</span>{" "}
                            <span className="tabular-nums">{option.arrives}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t("plan.change.route", {
                              route: option.second.routeId,
                            })}
                          </p>
                        </li>
                      ))}
                    </ol>

                    {/*
                      Said plainly rather than left for a passenger to discover
                      at the second stop: booking issues one ticket for one
                      trip, so a change is two of them.
                    */}
                    <p className="text-sm text-muted-foreground mt-4">
                      {t("plan.change.cannotBook")}
                    </p>
                  </div>
                ) : options.length === 0 ? (
                  <div className="brt-card text-center">
                    <p className="font-semibold text-foreground mb-1">
                      {t("plan.noService")}
                    </p>
                    {unserved ? (
                      <p className="text-sm text-muted-foreground">
{t("plan.unservedStop", { stop: unserved })}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {t("plan.noTrip", {
                          from: origin,
                          to: destination,
                          time: searchedTime,
                        })}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <h2 className="brt-section-title text-left text-primary">
                      {t(
                        options.length === 1
                          ? "plan.departureOne"
                          : "plan.departureMany",
                        { count: options.length }
                      )}
                    </h2>

                    <div className="space-y-4">
                      {options.map((option) => (
                        <div key={option.trip.id} className="brt-card">
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                              <p className="text-lg font-bold text-foreground">
                                {option.departure}
                                <span className="text-muted-foreground font-normal">
                                  {" "}
                                  →{" "}
                                </span>
                                {option.arrival}
                              </p>

                              <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                                {formatDuration(option.minutes)} · Route{" "}
                                {option.trip.routeId}
                              </p>

                              {option.interchanges.length > 0 && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  Connects with other routes at{" "}
                                  {option.interchanges.join(", ")}
                                </p>
                              )}
                            </div>

                            <button
                              type="button"
                              disabled={fare === null || !bookable}
                              onClick={() => handleBook(option.trip)}
                              className="brt-button disabled:opacity-40 disabled:cursor-not-allowed touch-target"
                            >
                              {t("plan.bookTicket")}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {!bookable && (
                      <p className="text-sm text-muted-foreground mt-4">
                        {t("plan.todayOnly")}
                      </p>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />

      {selectedTrip && origin && destination && (
        <BookingModal
          key={selectedTrip.id}
          open
          trip={selectedTrip}
          initialFromStop={origin}
          initialToStop={destination}
          onClose={() => setSelectedTrip(null)}
          onProceedPayment={(next) => {
            setSelection(next);
            setSelectedTrip(null);
          }}
        />
      )}

      {selection && (
        <PaymentModal
          open
          selection={selection}
          onClose={() => setSelection(null)}
          onSuccess={() => navigate("/dashboard")}
        />
      )}
    </div>
  );
};

export default Plan;
