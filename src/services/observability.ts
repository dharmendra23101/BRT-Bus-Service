/**
 * Catching the errors nobody is watching for.
 *
 * Until now an uncaught error in production was invisible. `ErrorBoundary`
 * shows a fallback for a render that throws, and everything else - a rejected
 * promise inside a `setInterval`, a listener that throws after the component
 * that made it unmounted - simply vanished into a console nobody reads.
 *
 * WHAT THIS DOES NOT DO: send anything anywhere. There is no destination
 * configured and none is invented here. The policy in
 * `domain/observability/reporting` decides what a report may contain and how
 * often it may be sent, and this file applies it to a sink; the sink today
 * writes to the console. Adding a real one is a founder action - it needs an
 * account, and it needs a decision about sending anything at all to a third
 * party - and when it happens the scrubbing and the rate limiting are already
 * in place, which is the order that matters.
 */

import {
  consider,
  emptyReporter,
  toReport,
  type ErrorKind,
  type ErrorReport,
  type ReporterState,
  type ReportLimits,
} from "@/domain/observability/reporting";

/** Where an accepted report goes. */
export type Sink = (report: ErrorReport) => void;

/*
  The default sink, and the honest one: it says the error was captured, not
  that anybody was told. `console.error` rather than `warn`, so it is not
  filtered out of the place a developer actually looks.
*/
const consoleSink: Sink = (report) => {
  console.error(
    `[${report.kind}] ${report.route}: ${report.message}`,
    report.origin ?? ""
  );
};

interface Options {
  sink?: Sink;
  limits?: ReportLimits;
  now?: () => number;
  /** Where the error happened; defaults to the live location. */
  pathname?: () => string;
}

/**
 * Attaches the global handlers. Returns a function that removes them.
 *
 * Idempotent by construction: calling it twice attaches twice, so the caller
 * owns the teardown. `main.tsx` installs it once for the life of the tab.
 */
export const installErrorReporting = ({
  sink = consoleSink,
  limits,
  now = () => Date.now(),
  pathname = () => window.location.pathname,
}: Options = {}): (() => void) => {
  let state: ReporterState = emptyReporter(limits);

  /*
    Guarded against re-entry. A sink that throws would otherwise trigger the
    very handler that called it, and each pass would be a fresh error with a
    fresh fingerprint - a loop that the duplicate cap cannot stop because no
    two iterations look alike.
  */
  let reporting = false;

  const record = (kind: ErrorKind, error: unknown) => {
    if (reporting) return;

    reporting = true;

    try {
      const report = toReport(kind, error, pathname(), now());
      const outcome = consider(state, report);

      state = outcome.state;

      if (outcome.verdict.send) sink(report);
    } catch {
      // Reporting must never be the reason a page breaks.
    } finally {
      reporting = false;
    }
  };

  const onError = (event: globalThis.ErrorEvent) => {
    record("uncaught", event.error ?? event.message);
  };

  const onRejection = (event: PromiseRejectionEvent) => {
    record("unhandled-rejection", event.reason);
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);

  reportCaught = record;

  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
    reportCaught = () => {};
  };
};

/**
 * Reports an error something already caught - `ErrorBoundary`, chiefly.
 *
 * A boundary that renders a fallback has handled the error for the passenger
 * and hidden it from everybody else; this is how it still gets counted. A
 * no-op until the handlers are installed, so nothing has to check first.
 */
export let reportCaught: (kind: ErrorKind, error: unknown) => void = () => {};
