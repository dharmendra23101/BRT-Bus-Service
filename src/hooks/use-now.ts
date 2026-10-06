import { useEffect, useState } from "react";

/**
 * A clock that re-renders on an interval.
 *
 * Anything that highlights "the next bus" needs this rather than a
 * `new Date()` read at render time. A timetable that is correct when the page
 * mounts and wrong five minutes later is worse than one with no highlight at
 * all, because it looks authoritative while pointing at a bus that has gone.
 */
export const useNow = (intervalMs = 30_000): Date => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    /*
      The first tick waits only until the next boundary, not a whole interval.

      A bare `setInterval` fires on the phase it was mounted at and keeps it
      forever, so a page opened at 10:00:30 ticks at 10:01:30, 10:02:30 - and
      between 10:02:00 and 10:02:30 it is still reporting minute 601 when the
      corridor is in 602. The error never corrects itself, because the phase
      never changes.

      For a clock that only feeds a display that would be cosmetic. This one
      decides which departure is "next", so the drift means a bus is marked as
      the next one for up to a minute after it has left, and marked departed a
      minute after it did. Aligning to the boundary bounds the error at the
      scheduling granularity itself.
    */
    let interval: ReturnType<typeof setInterval> | undefined;

    const tick = () => setNow(new Date());

    const timeout = setTimeout(() => {
      tick();
      interval = setInterval(tick, intervalMs);
    }, intervalMs - (Date.now() % intervalMs));

    return () => {
      clearTimeout(timeout);
      if (interval !== undefined) clearInterval(interval);
    };
  }, [intervalMs]);

  return now;
};
