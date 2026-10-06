/**
 * What an error report is allowed to contain, and how often it may be sent.
 *
 * Both halves are tested here rather than at the transport, because both are
 * the kind of mistake you only discover after it has already happened: a
 * passenger's journey sitting in a third party's error log, or a free-tier
 * quota exhausted by a `setInterval` before the interesting error arrives.
 */

import { describe, expect, it } from "vitest";
import {
  consider,
  DEFAULT_LIMITS,
  emptyReporter,
  fingerprint,
  originOf,
  routePatternOf,
  scrub,
  toReport,
  type ErrorReport,
} from "@/domain/observability/reporting";

const report = (over: Partial<ErrorReport> = {}): ErrorReport => ({
  kind: "uncaught",
  message: "Cannot read property of undefined",
  origin: "at Home (Home.tsx:74)",
  route: "/",
  at: 1_000,
  ...over,
});

describe("what never leaves the browser", () => {
  it("removes an email address", () => {
    expect(scrub("Failed for rider@example.com")).toBe("Failed for [email]");
  });

  /*
    `/plan?from=HNLU&to=CBD` names where a person is travelling from and to.
    The path is worth keeping; the query is theirs.
  */
  it("removes the query string that names a journey", () => {
    expect(
      scrub("Failed at https://brt.example/plan?from=HNLU&to=CBD")
    ).toBe("Failed at https://brt.example/plan?[redacted]");
  });

  it("removes a ticket identifier", () => {
    expect(scrub("TICKET-8F2A1C expired")).toBe("[id] expired");
  });

  it("removes a payment identifier", () => {
    expect(scrub("PAY-9K2L unknown")).toBe("[id] unknown");
  });

  /* A phone number, an account number, anything long enough to identify. */
  it("removes a long run of digits", () => {
    expect(scrub("called 9340449412")).toBe("called [number]");
  });

  /* A time or a fare is not identifying, and losing it would cost meaning. */
  it("keeps short numbers that carry meaning", () => {
    expect(scrub("route 101 fare 10")).toBe("route 101 fare 10");
  });

  it("keeps the part of the message that is useful", () => {
    expect(scrub("Cannot read ticketId of undefined")).toBe(
      "Cannot read ticketId of undefined"
    );
  });

  it("caps a runaway message", () => {
    expect(scrub("x".repeat(2_000))).toHaveLength(500);
  });

  it("scrubs the stack frame too", () => {
    expect(
      originOf("Error\n  at load (https://brt.example/x?token=abc)")
    ).toContain("[redacted]");
  });
});

describe("which screen broke, not where somebody was", () => {
  it.each([
    ["/", "/"],
    ["/plan", "/plan"],
    ["/timetable", "/timetable"],
    ["/nearby", "/nearby"],
    ["/nearby/miraj-cinema", "/nearby/:placeId"],
    ["/nearby/tribal-museum", "/nearby/:placeId"],
  ])("maps %s to %s", (pathname, expected) => {
    expect(routePatternOf(pathname)).toBe(expected);
  });

  /*
    Two passengers looking at two different places must produce the same
    route, or the pattern is just the path with extra steps.
  */
  it("gives two different places the same route", () => {
    expect(routePatternOf("/nearby/a")).toBe(routePatternOf("/nearby/b"));
  });
});

describe("building a report", () => {
  it("carries the message, the first frame and the route", () => {
    const error = new Error("Boom");
    error.stack = "Error: Boom\n    at Plan (Plan.tsx:12)\n    at render";

    const built = toReport("uncaught", error, "/plan", 5);

    expect(built).toMatchObject({
      kind: "uncaught",
      message: "Boom",
      route: "/plan",
      at: 5,
    });
    expect(built.origin).toContain("Plan.tsx");
  });

  it("scrubs on the way in, so nothing downstream has to remember", () => {
    const built = toReport(
      "boundary",
      new Error("rider@example.com could not book"),
      "/plan",
      5
    );

    expect(built.message).toBe("[email] could not book");
  });

  /* A rejected promise often carries a string, or something stranger. */
  it("handles a thrown string", () => {
    expect(toReport("unhandled-rejection", "gone wrong", "/", 5).message).toBe(
      "gone wrong"
    );
  });

  it("handles something that is not an error at all", () => {
    expect(toReport("unhandled-rejection", { odd: true }, "/", 5).message).toBe(
      "Non-error thrown"
    );
  });

  it("never produces an empty message", () => {
    expect(toReport("uncaught", new Error(""), "/", 5).message).toBe(
      "Empty error"
    );
  });
});

describe("grouping the same failure", () => {
  it("treats the same error from the same frame as one", () => {
    expect(fingerprint(report())).toBe(fingerprint(report({ at: 9_999 })));
  });

  it("separates the same message from a different frame", () => {
    expect(fingerprint(report())).not.toBe(
      fingerprint(report({ origin: "at Plan (Plan.tsx:12)" }))
    );
  });

  it("separates a thrown error from a rejected promise", () => {
    expect(fingerprint(report())).not.toBe(
      fingerprint(report({ kind: "unhandled-rejection" }))
    );
  });
});

describe("how much may be sent", () => {
  const send = (state: ReturnType<typeof emptyReporter>, over: Partial<ErrorReport>) =>
    consider(state, report(over));

  it("sends the first occurrence", () => {
    expect(send(emptyReporter(), {}).verdict).toEqual({ send: true });
  });

  /*
    The case this exists for: an error inside a 15-second interval does not
    happen once, it happens every tick in every open tab.
  */
  it("stops repeating one error after the duplicate cap", () => {
    let state = emptyReporter();

    for (let i = 0; i < DEFAULT_LIMITS.maxPerFingerprint; i++) {
      const next = send(state, { at: 1_000 + i });
      expect(next.verdict.send).toBe(true);
      state = next.state;
    }

    expect(send(state, { at: 1_100 }).verdict).toEqual({
      send: false,
      reason: "duplicate",
    });
  });

  it("still sends a different error while one is being suppressed", () => {
    let state = emptyReporter();

    for (let i = 0; i < 5; i++) state = send(state, { at: 1_000 + i }).state;

    expect(send(state, { message: "Something else", at: 1_100 }).verdict).toEqual({
      send: true,
    });
  });

  /*
    Reported as "duplicate" rather than "rate-limited" deliberately: a storm of
    one error is a loop, a storm of many is a fleet-wide problem, and they need
    different fixes.
  */
  it("calls a storm of one error a duplicate, not a rate limit", () => {
    let state = emptyReporter();

    for (let i = 0; i < 50; i++) state = send(state, { at: 1_000 + i }).state;

    expect(send(state, { at: 1_100 }).verdict).toMatchObject({
      reason: "duplicate",
    });
  });

  it("caps the total across distinct errors", () => {
    let state = emptyReporter();

    for (let i = 0; i < DEFAULT_LIMITS.maxPerWindow; i++) {
      const next = send(state, { message: `Error ${i}`, at: 1_000 + i });
      expect(next.verdict.send).toBe(true);
      state = next.state;
    }

    expect(send(state, { message: "One more", at: 1_100 }).verdict).toEqual({
      send: false,
      reason: "rate-limited",
    });
  });

  it("lets the budget recover once the window has passed", () => {
    let state = emptyReporter();

    for (let i = 0; i < DEFAULT_LIMITS.maxPerWindow; i++) {
      state = send(state, { message: `Error ${i}`, at: 1_000 + i }).state;
    }

    const later = 1_000 + DEFAULT_LIMITS.windowMs + 1;

    expect(send(state, { message: "After the window", at: later }).verdict).toEqual(
      { send: true }
    );
  });

  it("lets a repeated error through again in a later window", () => {
    let state = emptyReporter();

    for (let i = 0; i < DEFAULT_LIMITS.maxPerFingerprint; i++) {
      state = send(state, { at: 1_000 + i }).state;
    }

    const later = 1_000 + DEFAULT_LIMITS.windowMs + 1;

    expect(send(state, { at: later }).verdict).toEqual({ send: true });
  });

  it("counts what it suppressed, so the gap is not silent", () => {
    let state = emptyReporter();

    for (let i = 0; i < 5; i++) state = send(state, { at: 1_000 + i }).state;

    expect(state.suppressed).toBeGreaterThan(0);
  });

  it("forgets the suppressed count once something gets through", () => {
    let state = emptyReporter();

    for (let i = 0; i < 5; i++) state = send(state, { at: 1_000 + i }).state;

    state = send(state, { message: "Different", at: 1_100 }).state;

    expect(state.suppressed).toBe(0);
  });
});
