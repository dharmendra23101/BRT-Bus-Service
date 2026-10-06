/**
 * The clock that decides which departure is "next".
 *
 * This looks like a display concern and is not. `Home` and `Timetable` derive
 * the corridor's current service minute from it, and a departure is marked
 * "next" or "departed" by comparing against that number - so an error here is
 * the page telling a passenger to catch a bus that has gone.
 *
 * The defect these cover: a bare `setInterval` fires on whatever phase it was
 * mounted at and keeps it. A page opened at 10:00:30 ticked at 10:01:30 and
 * 10:02:30, so from 10:02:00 it reported minute 601 while the corridor was in
 * 602 - and it never corrected, because the phase never changed.
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useNow } from "@/hooks/use-now";

/** The service minute the app derives from this clock. */
const serviceMinute = (at: Date) => at.getHours() * 60 + at.getMinutes();

const MINUTE = 60_000;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("a clock mounted part-way through a minute", () => {
  /** 10:00:30 - half a minute past the boundary, the worst realistic case. */
  const mountAt = new Date(2026, 8, 1, 10, 0, 30);

  beforeEach(() => {
    vi.setSystemTime(mountAt);
  });

  it("starts at the time it was mounted", () => {
    const { result } = renderHook(() => useNow(MINUTE));

    expect(serviceMinute(result.current)).toBe(600);
  });

  /*
    The assertion that fails without the fix. At 10:01:00 the corridor is in
    minute 601; an unaligned interval would not tick until 10:01:30 and would
    still be reporting 600.
  */
  it("has caught up the moment the minute changes", () => {
    const { result } = renderHook(() => useNow(MINUTE));

    act(() => void vi.advanceTimersByTime(30_000)); // 10:01:00

    expect(serviceMinute(result.current)).toBe(601);
  });

  it("stays on the boundary rather than drifting for the rest of the session", () => {
    const { result } = renderHook(() => useNow(MINUTE));

    act(() => void vi.advanceTimersByTime(30_000)); // 10:01:00
    act(() => void vi.advanceTimersByTime(MINUTE)); // 10:02:00

    expect(serviceMinute(result.current)).toBe(602);

    act(() => void vi.advanceTimersByTime(MINUTE)); // 10:03:00

    expect(serviceMinute(result.current)).toBe(603);
  });

  /*
    The consequence, stated as the passenger would experience it: a departure
    at 10:01 must not still be in the future once 10:01 arrives.
  */
  it("never reports a minute the corridor has already left", () => {
    const { result } = renderHook(() => useNow(MINUTE));

    for (let elapsed = 0; elapsed < 5 * MINUTE; elapsed += 10_000) {
      act(() => void vi.advanceTimersByTime(10_000));

      const trueMinute = serviceMinute(new Date());

      expect(
        serviceMinute(result.current),
        `reported ${serviceMinute(result.current)} while the corridor was in ${trueMinute}`
      ).toBe(trueMinute);
    }
  });
});

describe("a clock mounted exactly on a boundary", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date(2026, 8, 1, 10, 0, 0));
  });

  it("waits a full interval before its first tick", () => {
    const { result } = renderHook(() => useNow(MINUTE));

    act(() => void vi.advanceTimersByTime(MINUTE - 1));
    expect(serviceMinute(result.current)).toBe(600);

    act(() => void vi.advanceTimersByTime(1));
    expect(serviceMinute(result.current)).toBe(601);
  });
});

describe("the finer-grained clock the timetable uses", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date(2026, 8, 1, 10, 0, 20));
  });

  it("aligns to its own interval, not to the minute", () => {
    const { result } = renderHook(() => useNow(30_000));

    act(() => void vi.advanceTimersByTime(10_000)); // 10:00:30

    expect(result.current.getSeconds()).toBe(30);

    act(() => void vi.advanceTimersByTime(30_000)); // 10:01:00

    expect(serviceMinute(result.current)).toBe(601);
  });
});

describe("cleanup", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date(2026, 8, 1, 10, 0, 30));
  });

  /*
    Two timers are in play - the alignment timeout and the interval it starts -
    and unmounting between them must clear the one that has not fired yet.
  */
  it("leaves nothing running when unmounted before the first tick", () => {
    const { unmount } = renderHook(() => useNow(MINUTE));

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });

  it("leaves nothing running when unmounted after it has settled", () => {
    const { unmount } = renderHook(() => useNow(MINUTE));

    act(() => void vi.advanceTimersByTime(30_000 + MINUTE));

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
