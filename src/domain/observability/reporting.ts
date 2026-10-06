/**
 * What we would send if something broke, and what we refuse to send.
 *
 * Today an error in production is invisible: the app catches what it can,
 * shows a fallback, and nobody ever finds out. This module is the decision
 * layer for fixing that - it turns a raw browser error into a report, and
 * decides whether that report is worth sending at all.
 *
 * It is deliberately pure and deliberately built BEFORE any destination
 * exists, because the two hard parts have to be right first and neither is
 * about transport:
 *
 * SCRUBBING. A transit app's URLs carry a passenger's journey - `/plan` alone
 * names where somebody is travelling from and to. Error messages carry ticket
 * ids and email addresses. Any of that would leave the browser attached to an
 * error report, to a third party, without the passenger ever being asked.
 *
 * VOLUME. Six `setInterval` sites drive this app. An error inside one of them
 * does not happen once, it happens every tick for every open tab - which is
 * how a free-tier quota is exhausted in an afternoon and how the one report
 * that mattered gets dropped for being over budget.
 *
 * No transport lives here, and none is wired: nothing is sent anywhere yet.
 */

export type ErrorKind = "uncaught" | "unhandled-rejection" | "boundary";

/** A report, after scrubbing, ready for a sink that does not exist yet. */
export interface ErrorReport {
  kind: ErrorKind;
  message: string;
  /** The first stack frame only - enough to group by, small enough to read. */
  origin: string | null;
  /** The route pattern, never the actual URL. */
  route: string;
  at: number;
}

export interface ReportLimits {
  /** Length of the sliding window. */
  windowMs: number;
  /** Most reports to send in one window, across all errors. */
  maxPerWindow: number;
  /** Most times one distinct error may be sent in one window. */
  maxPerFingerprint: number;
}

/*
  A minute is short enough that a burst is still visible as a burst, and long
  enough that a `setInterval` firing every 15 s cannot slip four copies of the
  same failure past the duplicate cap.
*/
export const DEFAULT_LIMITS: ReportLimits = {
  windowMs: 60_000,
  maxPerWindow: 10,
  maxPerFingerprint: 2,
};

export type Verdict =
  | { send: true }
  | { send: false; reason: "duplicate" | "rate-limited" };

export interface ReporterState {
  readonly limits: ReportLimits;
  /** Send times within the current window, oldest first. */
  readonly sentAt: readonly number[];
  /** Per-fingerprint send times within the current window. */
  readonly byFingerprint: Readonly<Record<string, readonly number[]>>;
  /** Reports suppressed since the last send, for the record. */
  readonly suppressed: number;
}

export const emptyReporter = (
  limits: ReportLimits = DEFAULT_LIMITS
): ReporterState => ({
  limits,
  sentAt: [],
  byFingerprint: {},
  suppressed: 0,
});

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const LONG_DIGITS = /\b\d{6,}\b/g;
const TICKET = /\b(?:TICKET|PAY|VAL)-[A-Z0-9]+\b/g;
const URL_WITH_QUERY = /(https?:\/\/[^\s?]+)\?[^\s]*/g;

/**
 * Removes anything that identifies a person or their journey.
 *
 * Redacting rather than dropping the whole message: `"Cannot read ticketId of
 * undefined"` is the useful half and `"TICKET-8F2A1C"` is the half that
 * belongs to somebody. A report with no message is not worth sending.
 */
export const scrub = (message: string): string =>
  message
    .replace(URL_WITH_QUERY, "$1?[redacted]")
    .replace(EMAIL, "[email]")
    .replace(TICKET, "[id]")
    .replace(LONG_DIGITS, "[number]")
    .slice(0, 500);

/**
 * The route pattern a path belongs to, never the path itself.
 *
 * `/nearby/miraj-cinema` becomes `/nearby/:placeId`. The distinction matters:
 * the pattern says which screen broke, the path says where a particular
 * person was looking.
 */
export const routePatternOf = (pathname: string): string => {
  const [, first = "", second] = pathname.split("/");

  if (first === "nearby" && second) return "/nearby/:placeId";
  if (first === "") return "/";

  return `/${first}`;
};

/** The first stack frame, with any query string already gone. */
export const originOf = (stack: string | undefined): string | null => {
  const line = stack?.split("\n")[1]?.trim();

  return line ? scrub(line).slice(0, 200) : null;
};

/**
 * Groups reports that are the same failure.
 *
 * Message plus first frame, not the whole stack: a minified stack differs
 * between builds and a full stack differs between call paths, so either would
 * make every occurrence look distinct and defeat the duplicate cap entirely.
 */
export const fingerprint = (report: ErrorReport): string =>
  `${report.kind}|${report.message}|${report.origin ?? ""}`;

const within = (times: readonly number[], now: number, windowMs: number) =>
  times.filter((time) => now - time < windowMs);

/**
 * Decides whether a report may be sent, and returns the state that follows.
 *
 * A reducer rather than a class with a timer, so the whole policy is testable
 * without a clock and runs in the portable domain suite.
 */
export const consider = (
  state: ReporterState,
  report: ErrorReport
): { state: ReporterState; verdict: Verdict } => {
  const { limits } = state;
  const now = report.at;
  const key = fingerprint(report);

  const sentAt = within(state.sentAt, now, limits.windowMs);
  const forKey = within(state.byFingerprint[key] ?? [], now, limits.windowMs);

  const refuse = (reason: "duplicate" | "rate-limited") => ({
    state: {
      ...state,
      sentAt,
      byFingerprint: { ...state.byFingerprint, [key]: forKey },
      suppressed: state.suppressed + 1,
    },
    verdict: { send: false as const, reason },
  });

  /*
    The duplicate cap is checked first, so a storm of one error reports as
    "duplicate" rather than as "rate-limited". They call for different fixes -
    one is a loop, the other is a fleet-wide problem - and the distinction is
    lost if the order is reversed.
  */
  if (forKey.length >= limits.maxPerFingerprint) return refuse("duplicate");
  if (sentAt.length >= limits.maxPerWindow) return refuse("rate-limited");

  return {
    state: {
      ...state,
      sentAt: [...sentAt, now],
      byFingerprint: { ...state.byFingerprint, [key]: [...forKey, now] },
      suppressed: 0,
    },
    verdict: { send: true },
  };
};

/**
 * Builds a report from what a browser hands us.
 *
 * Everything that leaves this function has been scrubbed; nothing else in the
 * pipeline is trusted to remember.
 */
export const toReport = (
  kind: ErrorKind,
  error: unknown,
  pathname: string,
  at: number
): ErrorReport => {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Non-error thrown";

  return {
    kind,
    message: scrub(raw) || "Empty error",
    origin: error instanceof Error ? originOf(error.stack) : null,
    route: routePatternOf(pathname),
    at,
  };
};
