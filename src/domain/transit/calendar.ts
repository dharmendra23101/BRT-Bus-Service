/**
 * Which service runs on a given date.
 *
 * This replaces a bare `getDay()` check, for two reasons that both produce
 * wrong answers for a real passenger.
 *
 * The first is timezone. The corridor runs on Asia/Kolkata whatever the device
 * is set to, and `getDay()` answers in the browser's zone - so a phone left on
 * UTC after a flight reads Sunday's service as Saturday's for five and a half
 * hours every week. Every date question here is asked in the service timezone.
 *
 * The second is holidays. `weekday | weekend` derived from the day of the week
 * cannot express "Diwali runs a Sunday service", and India's public holidays
 * are lunar - Diwali, Holi and Eid are not computable from a Date. They have to
 * be data. The exception mechanism below exists for exactly that, and is
 * deliberately empty: which holidays NRANVP runs a reduced service on is
 * operator information, and guessing it would put invented service on a public
 * timetable.
 */

import type { ServiceDay } from "./schedule";

/** The timezone the corridor's calendar is expressed in. */
export const SERVICE_TIMEZONE = "Asia/Kolkata";

/** A date that does not run the service its weekday implies. */
export interface ServiceException {
  /** Calendar date in the service timezone, `YYYY-MM-DD`. */
  date: string;
  /** The service that actually runs. */
  service: ServiceDay;
  /** Why, in words that can be shown to a passenger. */
  reason: string;
}

/**
 * Dates whose service differs from their weekday.
 *
 * EMPTY BY DESIGN. Populating this needs the operator's holiday calendar.
 * Adding a guess here would publish a service that may not run.
 */
export const SERVICE_EXCEPTIONS: readonly ServiceException[] = [];

const EXCEPTIONS_BY_DATE = new Map(
  SERVICE_EXCEPTIONS.map((exception) => [exception.date, exception])
);

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SERVICE_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/*
  Pinned to en-US on purpose: its output keys `WEEKDAY_INDEX` below. This is
  not a display formatter and must never follow the interface language - see
  `serviceWeekdayName` for the one that does.
*/
const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SERVICE_TIMEZONE,
  weekday: "short",
});

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** The corridor-local calendar date of an instant, as `YYYY-MM-DD`. */
export const serviceDateOf = (at: Date): string => dateFormatter.format(at);

/** The corridor-local day of the week, 0 = Sunday. */
export const serviceWeekdayOf = (at: Date): number =>
  WEEKDAY_INDEX[weekdayFormatter.format(at)] ?? 0;

/** Whether a corridor-local weekday falls at the weekend. */
const isWeekendDay = (weekday: number): boolean => weekday === 0 || weekday === 6;

/** The exception covering this date, if one is published. */
export const serviceExceptionOn = (at: Date): ServiceException | null =>
  EXCEPTIONS_BY_DATE.get(serviceDateOf(at)) ?? null;

/**
 * The service that runs on a date.
 *
 * An exception wins over the weekday, which is the whole point of having one.
 */
export const serviceOn = (at: Date): ServiceDay =>
  serviceExceptionOn(at)?.service ??
  (isWeekendDay(serviceWeekdayOf(at)) ? "weekend" : "weekday");

/** How a service day should be named to a passenger. */
export const SERVICE_LABELS: Record<ServiceDay, string> = {
  weekday: "Weekday service",
  weekend: "Weekend service",
};

/**
 * The corridor-local weekday name, for showing which day is being displayed.
 *
 * DISPLAY ONLY, and the distinction is load-bearing. `weekdayFormatter` above
 * is pinned to `en-US` because its output is a KEY into `WEEKDAY_INDEX` -
 * localising that one would return Sunday for every day of the week, and a
 * Hindi reader would be shown weekend service on a Tuesday. This one is read
 * by a person, so it follows their language.
 */
export const serviceWeekdayName = (at: Date, locale = "en-GB"): string =>
  new Intl.DateTimeFormat(locale, {
    timeZone: SERVICE_TIMEZONE,
    weekday: "long",
  }).format(at);

const clockFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: SERVICE_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/**
 * Minutes since corridor-local midnight.
 *
 * The reference point for "has this departure gone?" - and it has to be
 * corridor-local for the same reason the service day does.
 */
export const serviceMinutesOf = (at: Date): number => {
  const [hours, minutes] = clockFormatter.format(at).split(":");

  return Number(hours) * 60 + Number(minutes);
};

/** The next calendar date after this one, in the service timezone. */
export const nextServiceDate = (at: Date): Date =>
  new Date(at.getTime() + 24 * 60 * 60 * 1000);

const displayClockFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SERVICE_TIMEZONE,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/**
 * The corridor-local time of day, in the shape the timetable prints it.
 *
 * The narrow no-break space ICU puts before AM/PM is replaced with an ordinary
 * one, so this string sits next to a timetable time - which comes from the
 * operator's document and uses a plain space - without the two looking
 * subtly different.
 */
export const serviceClockLabel = (at: Date): string =>
  displayClockFormatter.format(at).replace(/\u202f/g, " ");
