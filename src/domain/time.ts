/**
 * Time parsing and formatting shared across the transit domain.
 *
 * Timetable times are authored as 12-hour display strings ("6:25 AM"), so
 * every module that needs to reason about them has to parse them the same
 * way. This is the only place that knows how.
 */

/**
 * Resolves a 12-hour display time onto a calendar date.
 *
 * @param timeStr Display time, e.g. "6:25 AM".
 * @param baseDate ISO date supplying the day; defaults to today.
 */
export const parseTimeToDate = (timeStr: string, baseDate?: string): Date => {
  const [time = "", modifier] = timeStr.split(" ");
  const [rawHours = 0, minutes = 0] = time.split(":").map(Number);

  let hours = rawHours;
  if (modifier === "PM" && hours !== 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;

  const date = baseDate ? new Date(baseDate) : new Date();
  date.setHours(hours, minutes, 0, 0);

  return date;
};

/** A copy of `date` shifted by `minutes`. */
export const addMinutes = (date: Date, minutes: number): Date => {
  const next = new Date(date);
  next.setMinutes(next.getMinutes() + minutes);
  return next;
};

/** Formats a positive duration as "1h 4m 12s". */
export const formatCountdown = (ms: number): string => {
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);

  return `${hours}h ${minutes}m ${seconds}s`;
};

/**
 * A date for a person to read, e.g. "22/07/2026".
 *
 * Takes the locale rather than reading the device's. Without it a passenger
 * who chose Hindi on an American phone got a Hindi interface printing
 * `7/22/2026`, which follows a setting they did not touch instead of the one
 * they did.
 */
export const formatDate = (iso: string, locale = "en-GB"): string =>
  new Date(iso).toLocaleDateString(locale);
