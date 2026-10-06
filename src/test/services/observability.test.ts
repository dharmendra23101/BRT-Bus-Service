/**
 * The global error handlers.
 *
 * The policy they apply is covered in the portable suite; what these cover is
 * the wiring, and the two ways a reporter can be worse than no reporter at
 * all: throwing on its way to reporting a throw, or looping.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  installErrorReporting,
  reportCaught,
  type Sink,
} from "@/services/observability";
import type { ErrorReport } from "@/domain/observability/reporting";

let teardown: (() => void) | null = null;

const install = (sink: Sink, pathname = "/plan") => {
  let clock = 1_000;

  teardown = installErrorReporting({
    sink,
    now: () => (clock += 1),
    pathname: () => pathname,
  });
};

/*
  Cancelled at dispatch, not by the reporter.

  jsdom escalates an uncancelled `ErrorEvent` on window into a genuine uncaught
  exception, which vitest then reports against whichever file was running. The
  cancelling belongs here rather than in `installErrorReporting`: calling
  `preventDefault` in production would suppress the browser's own console
  logging of the error, and losing that to make reporting tidy would be a bad
  trade.
*/
const throwUncaught = (error: unknown) => {
  const cancel = (event: Event) => event.preventDefault();

  window.addEventListener("error", cancel);

  try {
    window.dispatchEvent(
      new window.ErrorEvent("error", {
        error,
        message: error instanceof Error ? error.message : String(error),
        cancelable: true,
      })
    );
  } finally {
    window.removeEventListener("error", cancel);
  }
};

const rejectUnhandled = (reason: unknown) => {
  const event = new Event("unhandledrejection") as Event & { reason: unknown };
  event.reason = reason;

  window.dispatchEvent(event);
};

afterEach(() => {
  teardown?.();
  teardown = null;
  vi.restoreAllMocks();
});

describe("errors nobody else is watching for", () => {
  it("captures an uncaught error", () => {
    const sink = vi.fn();
    install(sink);

    throwUncaught(new Error("Boom"));

    expect(sink).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "uncaught", message: "Boom" })
    );
  });

  /*
    The failure this exists for. A rejected promise inside one of the app's
    intervals produces no visible symptom at all - it does not break a render,
    so no boundary sees it.
  */
  it("captures a rejected promise nobody handled", () => {
    const sink = vi.fn();
    install(sink);

    rejectUnhandled(new Error("Firestore unreachable"));

    expect(sink).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "unhandled-rejection" })
    );
  });

  it("captures what a boundary already handled", () => {
    const sink = vi.fn();
    install(sink);

    reportCaught("boundary", new Error("Render failed"));

    expect(sink).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "boundary", message: "Render failed" })
    );
  });

  it("records which screen it happened on", () => {
    const sink = vi.fn();
    install(sink, "/nearby/miraj-cinema");

    throwUncaught(new Error("Boom"));

    expect(sink).toHaveBeenCalledWith(
      expect.objectContaining({ route: "/nearby/:placeId" })
    );
  });

  it("scrubs before the sink ever sees it", () => {
    const sink = vi.fn();
    install(sink);

    throwUncaught(new Error("rider@example.com failed"));

    expect((sink.mock.calls[0]![0] as ErrorReport).message).toBe(
      "[email] failed"
    );
  });
});

describe("when reporting itself goes wrong", () => {
  /*
    A sink that throws inside the `error` handler would re-enter that same
    handler. Each pass is a new error with a new fingerprint, so the duplicate
    cap cannot stop it - only the re-entry guard can.
  */
  it("does not loop when the sink throws", () => {
    const sink = vi.fn(() => {
      throw new Error("Sink is down");
    });

    install(sink);

    expect(() => throwUncaught(new Error("Boom"))).not.toThrow();
    expect(sink).toHaveBeenCalledTimes(1);
  });

  it("keeps working after a sink failure", () => {
    let fail = true;
    const sink = vi.fn(() => {
      if (fail) throw new Error("Sink is down");
    });

    install(sink);
    throwUncaught(new Error("First"));

    fail = false;
    throwUncaught(new Error("Second"));

    expect(sink).toHaveBeenCalledTimes(2);
  });

  /*
    The case the re-entry guard is actually for, and the only one that reaches
    it: a sink that itself causes an error event while it is running. The
    try/catch handles a sink that merely throws - that failure never escapes
    the listener - but a sink that DISPATCHES re-enters the handler
    synchronously, and every pass is a fresh error with a fresh fingerprint,
    so the duplicate cap cannot stop it. Only the guard can.
  */
  it("does not re-enter when the sink causes another error", () => {
    const sink = vi.fn(() => {
      if (sink.mock.calls.length < 20) throwUncaught(new Error("Sink exploded"));
    });

    install(sink);

    throwUncaught(new Error("First"));

    expect(sink).toHaveBeenCalledTimes(1);
  });

  /* Reporting must never be the reason a page breaks. */
  it("swallows its own failure rather than surfacing it", () => {
    install(() => {
      throw new Error("Sink is down");
    });

    expect(() => reportCaught("boundary", new Error("Boom"))).not.toThrow();
  });
});

describe("volume", () => {
  /*
    The quota case, end to end: an error inside a 15-second interval fires on
    every tick, in every open tab.
  */
  it("stops repeating one error, however often it fires", () => {
    const sink = vi.fn();
    install(sink);

    for (let i = 0; i < 40; i++) throwUncaught(new Error("Same failure"));

    expect(sink.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it("still reports a different error during a storm", () => {
    const sink = vi.fn();
    install(sink);

    for (let i = 0; i < 40; i++) throwUncaught(new Error("Same failure"));

    sink.mockClear();
    throwUncaught(new Error("Something new"));

    expect(sink).toHaveBeenCalledTimes(1);
  });
});

describe("teardown", () => {
  it("stops listening once removed", () => {
    const sink = vi.fn();
    install(sink);

    teardown?.();
    teardown = null;

    throwUncaught(new Error("Boom"));

    expect(sink).not.toHaveBeenCalled();
  });

  it("makes the caught-error hook inert again", () => {
    const sink = vi.fn();
    install(sink);

    teardown?.();
    teardown = null;

    expect(() => reportCaught("boundary", new Error("Boom"))).not.toThrow();
    expect(sink).not.toHaveBeenCalled();
  });
});
