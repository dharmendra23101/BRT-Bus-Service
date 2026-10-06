/**
 * Reporting a vehicle's silence.
 *
 * The classification rules themselves live in `fleet.test.ts`. This covers the
 * part that only matters once a vehicle has stopped being classified at all,
 * because it is no longer sending anything to classify.
 */

import { describe, expect, it } from "vitest";
import { describeLastSeen } from "@/domain/fleet/state";

/*
  Absence, with a time attached.

  "Not reporting" answers a question the operator did not ask; the empty row
  already said that. The one they did ask is "since when?", and it is the
  difference between a bus that stopped an hour into its shift and one that
  never left the depot.
*/
describe("how long ago a vehicle was last heard from", () => {
  const NOW = Date.UTC(2026, 8, 1, 12, 0, 0);
  const MINUTE = 60_000;

  it("says nothing when nothing was ever recorded", () => {
    expect(describeLastSeen(null, NOW)).toBeNull();
    expect(describeLastSeen(undefined, NOW)).toBeNull();
  });

  /*
    A different fact from "just now", and rendering it as one would tell an
    operator a bus was fine moments ago when nothing is known about it at all.
  */
  it("says nothing rather than guessing at a bad value", () => {
    expect(describeLastSeen(Number.NaN, NOW)).toBeNull();
    expect(describeLastSeen("recently" as unknown as number, NOW)).toBeNull();
  });

  it("reports a very recent sighting without a misleading number", () => {
    expect(describeLastSeen(NOW - 20_000, NOW)).toBe("in the last minute");
  });

  it("counts minutes", () => {
    expect(describeLastSeen(NOW - MINUTE, NOW)).toBe("1 minute ago");
    expect(describeLastSeen(NOW - 25 * MINUTE, NOW)).toBe("25 minutes ago");
  });

  it("counts hours once minutes stop being useful", () => {
    expect(describeLastSeen(NOW - 60 * MINUTE, NOW)).toBe("1 hour ago");
    expect(describeLastSeen(NOW - 5 * 60 * MINUTE, NOW)).toBe("5 hours ago");
  });

  it("counts days for a vehicle nobody has seen in a long time", () => {
    expect(describeLastSeen(NOW - 26 * 60 * MINUTE, NOW)).toBe("1 day ago");
    expect(describeLastSeen(NOW - 72 * 60 * MINUTE, NOW)).toBe("3 days ago");
  });

  /*
    The server stamps this value and the reader's clock may disagree with it,
    so a sighting can land slightly in the future. A negative age would read
    as nonsense; the present is the honest rounding.
  */
  it("does not report a negative age when the clocks disagree", () => {
    expect(describeLastSeen(NOW + 30_000, NOW)).toBe("in the last minute");
  });
});
