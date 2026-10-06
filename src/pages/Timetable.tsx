import { Fragment, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Header from "@/components/Header";
import { useTranslation } from "@/contexts/LocaleContext";
import { DATE_LOCALES, type TranslationKey } from "@/domain/i18n/strings";
import { TIMETABLE_SOURCE } from "@/domain/transit/timetable";
import { formatDate } from "@/domain/time";

/** Service days, as interface copy rather than as the domain's English labels. */
const SERVICE_KEYS = {
  weekday: "service.weekday",
  weekend: "service.weekend",
} as const satisfies Record<string, TranslationKey>;
import Footer from "@/components/Footer";
import BookingModal from "@/components/BookingModal";
import PaymentModal from "@/components/PaymentModal";
import { useAuth } from "@/contexts/AuthContext";
import type { JourneySelection } from "@/domain/ticket/types";
import { useNow } from "@/hooks/use-now";
import {
  serviceClockLabel,
  serviceMinutesOf,
  serviceOn,
  serviceWeekdayName,
} from "@/domain/transit/calendar";
import { BOOKING_FAILURE_MESSAGES } from "@/services/ticketService";
import { outlookFor, tripTimings } from "@/domain/transit/departures";
import {
  getCallTime,
  getTrips,
  type ServiceDay,
  type StopCall,
  type Trip,
} from "@/domain/transit/schedule";
import { DIRECTION_LABELS, type Direction } from "@/domain/transit/timetable";
import { type StopName } from "@/domain/transit/stops";

const SERVICES: Array<{ day: ServiceDay; labelKey: TranslationKey }> = [
  { day: "weekday", labelKey: "service.weekday.short" },
  { day: "weekend", labelKey: "service.weekend.short" },
];

const DIRECTIONS: readonly Direction[] = ["outbound", "inbound"];

/**
 * Where a direction starts, taken from the timetable rather than declared.
 *
 * The return working does not begin where the outbound one ends in the naive
 * sense - it is a separate service with its own numbering - so the origin has
 * to come from the trips that actually run.
 */
const originOf = (service: ServiceDay, direction: Direction): StopName | null =>
  getTrips(service, direction)[0]?.calls[0]?.stop ?? null;

/** Where a direction ends, read off the longest published working. */
const terminusOf = (service: ServiceDay, direction: Direction): StopName | null =>
  getTrips(service, direction)
    .reduce<readonly StopCall[]>(
      (best, trip) => (trip.calls.length > best.length ? trip.calls : best),
      []
    )
    .at(-1)?.stop ?? null;

/** The translator, passed to helpers that render outside a component. */
type Translate = ReturnType<typeof useTranslation>["t"];

const captionFor = (
  service: ServiceDay,
  direction: Direction,
  t: Translate
): string =>
  t("timetable.caption", {
    direction: DIRECTION_LABELS[direction],
    service: t(
      service === "weekday" ? "service.weekdays" : "service.weekends"
    ),
  });

/**
 * What is leaving the corridor origin next.
 *
 * Schedule only. It says "Scheduled" in as many words because the app also has
 * a live layer, and a passenger must be able to tell which one they are
 * reading without knowing the product.
 */
/*
  Scoped to the direction on screen. Without it the inbound tab answered with
  an outbound bus ARRIVING at the terminus and presented it as the next return
  departure - the stop is served both ways, so "what leaves here next" is the
  wrong question once a direction is being shown.
*/
const NextBusCard = ({
  now,
  origin,
  direction,
}: {
  now: Date;
  origin: StopName;
  direction: Direction;
}) => {
  const { t } = useTranslation();

  const outlook = outlookFor(origin, now, direction);

  if (outlook.kind === "no-service") return null;

  return (
    <section
      aria-labelledby="next-bus-heading"
      className="max-w-5xl mx-auto mb-6 rounded-2xl border border-border bg-card p-5"
    >
      <h2 id="next-bus-heading" className="text-sm text-muted-foreground">
        {t("timetable.nextFrom", { stop: origin })}
      </h2>

      {outlook.kind === "upcoming" ? (
        <>
          <p className="text-3xl font-bold tabular-nums mt-1">{outlook.next.time}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {t("timetable.scheduled", { route: outlook.next.trip.routeId })}
          </p>

          {outlook.following.length > 0 && (
            <p className="text-sm mt-3">
              <span className="text-muted-foreground">{t("timetable.then")} </span>
              <span className="tabular-nums">
                {outlook.following.map((departure) => departure.time).join(", ")}
              </span>
            </p>
          )}
        </>
      ) : (
        <>
          <p className="text-xl font-semibold mt-1">{t("timetable.finished")}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {t("timetable.resumes", { weekday: outlook.resumesWeekday })}{" "}
            <span className="tabular-nums">{outlook.first.time}</span>{" "}
            {t("timetable.onThe", { service: t(SERVICE_KEYS[outlook.resumesOn]) })}
          </p>
        </>
      )}
    </section>
  );
};

interface TimetableTableProps {
  caption: string;
  trips: readonly Trip[];
  available: boolean;
  /**
   * Corridor-local minutes since midnight, or null when the day on screen is
   * not the day it actually is - a Tuesday view of the weekend timetable has
   * no "now" to mark.
   */
  nowMinutes: number | null;
  nowLabel: string;
  onBook: (trip: Trip) => void;
}

/**
 * The departure columns for a set of trips, in travel order.
 *
 * Order comes from the trips themselves, never from the stop registry. The
 * registry is fixed in outbound order, so using it to lay out the return
 * working would print its stops backwards - the bus would appear to run from
 * its destination to its origin.
 *
 * The last call of each trip is excluded here and rendered in its own Arrival
 * column, mirroring how the operator's own timetable is laid out. That is also
 * what makes the return working representable at all: it calls at HNLU twice,
 * once mid-route and again as its terminus, and a single HNLU column could
 * only ever show one of them.
 */
const columnStops = (trips: readonly Trip[]): readonly StopName[] => {
  const longest = trips.reduce<readonly StopCall[]>(
    (best, trip) => (trip.calls.length > best.length ? trip.calls : best),
    []
  );

  const order: StopName[] = [];
  const seen = new Set<StopName>();

  for (const call of longest.slice(0, -1)) {
    if (seen.has(call.stop)) continue;
    seen.add(call.stop);
    order.push(call.stop);
  }

  // A shorter working may reach a stop the longest one skips.
  for (const trip of trips) {
    for (const call of trip.calls.slice(0, -1)) {
      if (seen.has(call.stop)) continue;
      seen.add(call.stop);
      order.push(call.stop);
    }
  }

  return order;
};

/** The time a trip finishes, which the operator prints as its own column. */
const arrivalOf = (trip: Trip): string => trip.calls.at(-1)?.time ?? "";

const CELL = "px-2 py-1.5 text-[10px] lg:text-xs whitespace-nowrap border-b border-border";

const HEAD_CELL = `${CELL} sticky top-0 bg-primary text-primary-foreground font-semibold border-b-0`;

/*
  The departure column is pinned so it survives a sideways scroll: on a
  seventeen-stop grid the times in view mean nothing without the departure they
  belong to. Its background has to be opaque for the same reason - it paints
  over the cells passing beneath it.
*/
const STICKY_COLUMN = "sticky left-0 shadow-[2px_0_4px_-3px_hsla(0,0%,0%,0.35)]";

/** How each row is shaded once "now" is known. */
const ROW_TINT = {
  departed: "row-departed text-muted-foreground",
  next: "row-next text-foreground font-semibold",
  later: "",
} as const;

/**
 * Renders trips as a stop-per-column grid.
 *
 * A trip that does not call at a stop simply has no entry for it, which is
 * how the express route's skipped stops render as blanks without the data
 * needing empty-string placeholders.
 *
 * The scroll container is bounded on purpose. `overflow-x-auto` makes an
 * element a scroll container in BOTH axes, so a sticky heading inside an
 * unbounded one resolves against a box that never scrolls vertically and stays
 * glued to the top of the table. Giving the container a height is what lets
 * the stop names actually stick. `border-separate` goes with it: sticky cells
 * lose their borders under `border-collapse` in Chromium. And `isolate` keeps
 * every z-index below contained, so a pinned heading cannot paint over the app
 * header or the context strip above.
 */
const TimetableTable = ({
  caption,
  trips,
  available,
  nowMinutes,
  nowLabel,
  onBook,
}: TimetableTableProps) => {
  const { t } = useTranslation();
  const stops = columnStops(trips);
  /*
    A day that is not today has no "now", so nothing is marked. Passing a
    sentinel minute instead would highlight the first departure of a timetable
    the passenger is only browsing.
  */
  const timings = nowMinutes === null ? [] : tripTimings(trips, nowMinutes);
  const totalColumns = stops.length + 3;

  return (
    /*
      The scroll container is focusable and labelled so a keyboard user can
      scroll this wide table without a pointer, which WCAG 2.1.1 requires for
      any scrollable region.
    */
    <div
      role="region"
      aria-label={caption}
      tabIndex={0}
      className="isolate overflow-auto max-h-[70vh] max-w-full rounded-2xl border border-border bg-card shadow-[0_4px_16px_hsl(var(--primary-deep)/0.10),0_12px_32px_hsl(var(--primary-deep)/0.06)]"
    >
      <table className="w-full border-separate border-spacing-0">
        <caption className="sr-only">
          {caption}. Scroll sideways to see all stops. Each row is one
          departure.
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              className={`${HEAD_CELL} ${STICKY_COLUMN} z-30 text-left`}
            >
              {t("timetable.departs")}
            </th>
            {stops.map((stop) => (
              <th key={stop} scope="col" className={`${HEAD_CELL} z-20 text-center`}>
                {stop}
              </th>
            ))}
            <th scope="col" className={`${HEAD_CELL} z-20 text-center`}>
              {t("journey.arrival")}
            </th>
            <th scope="col" className={`${HEAD_CELL} z-20 text-center`}>
              {t("booking.book")}
            </th>
          </tr>
        </thead>
        <tbody>
          {trips.map((trip, index) => {
            const departure = trip.calls[0]?.time ?? "";
            const timing = timings[index] ?? "later";
            const zebra = index % 2 === 0 ? "bg-card" : "bg-secondary";
            const tint = ROW_TINT[timing] || zebra;

            return (
              <Fragment key={trip.id}>
                {/*
                  The current-time rule sits above the next departure rather
                  than beside it, so the split between what has gone and what
                  is still to come reads as one horizontal line instead of a
                  colour the passenger has to decode.
                */}
                {timing === "next" && index > 0 && (
                  <tr>
                    <td colSpan={totalColumns} className="p-0 border-b border-border">
                      <div className="relative h-6 bg-card">
                        <div
                          aria-hidden="true"
                          className="absolute inset-x-0 top-1/2 h-px bg-primary/40"
                        />
                        <span className="sticky left-0 inline-flex items-center ml-2 mt-0.5 rounded-full bg-primary px-2 py-0.5 text-[9px] lg:text-[10px] font-semibold text-primary-foreground">
                          Now {nowLabel}
                        </span>
                      </div>
                    </td>
                  </tr>
                )}

                <tr>
                  <th
                    scope="row"
                    className={`${CELL} ${STICKY_COLUMN} ${tint} z-10 text-left font-normal border-l-4 ${
                      timing === "next" ? "border-l-primary" : "border-l-transparent"
                    }`}
                  >
                    <span className="tabular-nums font-semibold">{departure}</span>
                    <span className="ml-1.5 opacity-70">{trip.routeId}</span>

                    {timing === "next" && (
                      <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground">
                        {t("timetable.next")}
                      </span>
                    )}

                    {/*
                      Colour alone cannot carry "this one has gone"
                      (WCAG 1.4.1), and the wording is precise: the bus has left
                      the row's own first stop, which is not the same as being
                      unreachable further along the corridor.
                    */}
                    {timing === "departed" && (
                      <span className="sr-only"> (already departed)</span>
                    )}
                  </th>

                  {stops.map((stop) => (
                    <td key={stop} className={`${CELL} ${tint} text-center tabular-nums`}>
                      {getCallTime(trip, stop) ?? ""}
                    </td>
                  ))}

                  <td className={`${CELL} ${tint} text-center tabular-nums font-medium`}>
                    {arrivalOf(trip)}
                  </td>

                  <td className={`${CELL} ${tint} text-center`}>
                    <button
                      type="button"
                      disabled={!available}
                      onClick={() => onBook(trip)}
                      className="px-2 py-1.5 text-[10px] lg:text-xs bg-primary text-primary-foreground rounded-md hover:-translate-y-0.5 transition-[transform,box-shadow] duration-state hover:shadow-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {t("booking.book")}
                      {/*
                        Every row's button would otherwise read as just "Book",
                        leaving a screen-reader user unable to tell them apart.
                      */}
                      <span className="sr-only">
                        {" "}
                        {t("booking.bookTrip", {
                          route: trip.routeId,
                          time: departure,
                        })}
                      </span>
                    </button>
                  </td>
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const Timetable = () => {
  const { locale, t } = useTranslation();
  const dateLocale = DATE_LOCALES[locale];

  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [selection, setSelection] = useState<JourneySelection | null>(null);

  const now = useNow();
  const today = serviceOn(now);

  /*
    Booking availability is pinned to the REAL service day, never the one being
    viewed. Otherwise switching to the weekend timetable on a Tuesday would
    offer a passenger a ticket for a bus that is not running.
  */
  const [viewing, setViewing] = useState<ServiceDay | null>(null);
  const [direction, setDirection] = useState<Direction>("outbound");
  const shown = viewing ?? today;

  const trips = getTrips(shown, direction);
  const origin = originOf(shown, direction);
  const terminus = terminusOf(shown, direction);
  const isToday = shown === today;

  const handleBook = (trip: Trip) => {
    if (!user) {
      // Replaces a blocking window.alert(). A toast conveys the same thing
      // without stealing focus or freezing the page.
      toast.info(t(BOOKING_FAILURE_MESSAGES.NOT_AUTHENTICATED));
      navigate("/login", { state: { from: location } });
      return;
    }

    setSelection(null);
    setSelectedTrip(trip);
  };

  const handleProceedPayment = (next: JourneySelection) => {
    setSelection(next);
    setSelectedTrip(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main id="main-content" tabIndex={-1} className="py-10 px-4">
        <h1 className="sr-only">{t("timetable.title")}</h1>

        <div className="max-w-5xl mx-auto mb-4">
          <p className="text-sm text-muted-foreground">
            {serviceWeekdayName(now, dateLocale)} &middot; {t(SERVICE_KEYS[today])}
          </p>

          <div
            role="group"
            aria-label="Direction"
            className="flex flex-col sm:flex-row gap-2 mt-3"
          >
            {DIRECTIONS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={direction === option}
                onClick={() => setDirection(option)}
                className={`flex-1 px-4 py-3 rounded-xl border text-sm font-medium text-left touch-target transition-colors ${
                  direction === option
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border hover:bg-secondary"
                }`}
              >
                {DIRECTION_LABELS[option]}
              </button>
            ))}
          </div>

          <div
            role="group"
            aria-label={t("timetable.serviceDay")}
            className="inline-flex mt-3 rounded-full border border-border overflow-hidden"
          >
            {SERVICES.map(({ day, labelKey }) => (
              <button
                key={day}
                type="button"
                aria-pressed={shown === day}
                onClick={() => setViewing(day)}
                className={`px-4 py-2 text-sm font-medium touch-target transition-colors ${
                  shown === day
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground hover:bg-secondary"
                }`}
              >
                {t(labelKey)}
                {day === today && <span className="sr-only">{t("timetable.today")}</span>}
              </button>
            ))}
          </div>

          {shown !== today && (
            <p role="status" className="text-sm mt-3">
              {t("timetable.showing", {
                shown: t(SERVICE_KEYS[shown]),
                today: t(SERVICE_KEYS[today]),
              })}
            </p>
          )}
        </div>

        {isToday && origin && (
          <NextBusCard now={now} origin={origin} direction={direction} />
        )}

        <div className="max-w-5xl mx-auto mb-10">
          {/*
            Orientation that survives the scroll. Once the controls above have
            gone past, this strip is the only thing still saying which working
            and which service day the grid below belongs to. It pins under the
            app header (h-16 / lg:h-20) and stays under the mobile drawer's
            backdrop at z-40.
          */}
          <div className="sticky top-16 lg:top-20 z-30 -mx-4 px-4 sm:mx-0 sm:px-0 pb-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl border border-border bg-card/95 backdrop-blur px-4 py-2.5">
              {terminus && (
                <p className="text-sm font-semibold text-foreground">
                  {t("timetable.towards", { terminus })}
                </p>
              )}

              <p className="text-xs text-muted-foreground">
                {origin && t("timetable.fromStop", { stop: origin })}
                {t(SERVICE_KEYS[shown])}
                {isToday ? t("timetable.alsoToday") : ""}
              </p>

              {/*
                Hidden on a phone, where it would cost the strip a whole line
                to repeat the clock already in the status bar and the rule
                drawn across the grid itself.
              */}
              {isToday && (
                <p className="hidden sm:block ml-auto text-xs text-muted-foreground tabular-nums">
                  {t("timetable.now", { time: serviceClockLabel(now) })}
                </p>
              )}
            </div>
          </div>

          <h2 className="text-lg font-bold text-foreground mb-3 tracking-tight">
            {captionFor(shown, direction, t)}
          </h2>

          {!isToday && (
            <p className="text-sm font-medium text-muted-foreground mb-3">
              {t("timetable.notToday")}
            </p>
          )}

          {trips.length === 0 ? (
            /*
              Unreachable with the published timetable - all four
              service/direction pairs run - but a suspended direction would
              otherwise render a grid of column headings above no rows.
            */
            <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
{t("timetable.noneForDirection", { service: t(SERVICE_KEYS[shown]) })}
            </p>
          ) : (
            <TimetableTable
              key={`${shown}-${direction}`}
              caption={captionFor(shown, direction, t)}
              trips={trips}
              available={isToday}
              nowMinutes={isToday ? serviceMinutesOf(now) : null}
              nowLabel={serviceClockLabel(now)}
              onBook={handleBook}
            />
          )}

          {/*
            Which timetable this is. The page shows times to the minute and
            said nothing about where they came from or how old they are - so a
            passenger had no way to tell a current timetable from a stale one,
            and neither did we.
          */}
          <p className="text-xs text-muted-foreground mt-4">
            {t("timetable.source", {
              publisher: TIMETABLE_SOURCE.publisher,
              date: formatDate(TIMETABLE_SOURCE.extractedOn, DATE_LOCALES[locale]),
            })}
          </p>
        </div>
      </main>

      <Footer />

      {/*
        Keyed on the trip so each booking starts from a clean stop selection
        rather than inheriting the previous trip's choice.
      */}
      {selectedTrip && (
        <BookingModal
          key={selectedTrip.id}
          open
          trip={selectedTrip}
          onClose={() => setSelectedTrip(null)}
          onProceedPayment={handleProceedPayment}
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

export default Timetable;
