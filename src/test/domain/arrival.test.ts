/**
 * Arrival-alert rules.
 *
 * These moved out of `notificationService` because that file asks the browser
 * for permission and so touches `window` and `Notification` - which meant the
 * one rule deciding whether to interrupt a passenger could not be reused on
 * any other platform, and would have been copied and left to drift.
 *
 * This file runs in the domain project, with no jsdom, no setup file and no
 * Firebase mocks. It imports nothing from `src/services`, which is the point:
 * everything here is built from domain functions.
 */

import { describe, expect, it } from "vitest";
import { ARRIVAL_RULES, NOTIFICATION_RULES } from "@/constants/config";
import {
  createAlertThrottle,
  selectNearestDistanceKm,
  shouldAlert,
} from "@/domain/alerts/arrival";
import { fromDriverRecord } from "@/domain/fleet/adapters";
import { DEFAULT_FRESHNESS, classifyAll } from "@/domain/fleet/state";
import { STOP_COORDS } from "@/domain/transit/stops";

const NOW = 1_700_000_000_000;
const stop = STOP_COORDS["HNLU"]!;

interface Record {
  busId?: string;
  lat: number;
  lng: number;
  updatedAt?: number;
}

/** Driver records, classified the way the live path classifies them. */
const seen = (...records: Record[]) =>
  classifyAll(
    records.map((record, index) =>
      fromDriverRecord(
        record.busId ?? `BUS-000${index}`,
        {
          busId: record.busId ?? `BUS-000${index}`,
          lat: record.lat,
          lng: record.lng,
          updatedAt: record.updatedAt ?? NOW,
        },
        NOW
      )
    ),
    NOW
  );

const at = (over: Partial<Record> = {}): Record => ({
  lat: stop.lat,
  lng: stop.lng,
  ...over,
});

describe("measuring how close the nearest bus is", () => {
  it("reports no distance when nothing is reporting", () => {
    expect(selectNearestDistanceKm([], stop)).toBeNull();
  });

  /*
    A push notification carries no age at all - it just says the bus is near -
    so alerting on a position that may be minutes old would send somebody
    running for a bus that has already gone. A map may still draw that dot,
    because there the age sits beside it.
  */
  it("reports no distance when every bus is stale", () => {
    const old = at({ updatedAt: NOW - DEFAULT_FRESHNESS.staleMs - 1 });

    expect(selectNearestDistanceKm(seen(old), stop)).toBeNull();
  });

  it("ignores a bus that is merely no longer LIVE or RECENT", () => {
    const recent = at({ updatedAt: NOW - DEFAULT_FRESHNESS.recentMs + 1_000 });
    const staleOnly = at({ updatedAt: NOW - DEFAULT_FRESHNESS.recentMs - 1_000 });

    expect(selectNearestDistanceKm(seen(recent), stop)).toBe(0);
    expect(selectNearestDistanceKm(seen(staleOnly), stop)).toBeNull();
  });

  it("is zero for a bus already at the stop", () => {
    expect(selectNearestDistanceKm(seen(at()), stop)).toBe(0);
  });

  it("picks the nearest bus, not the first", () => {
    const far = at({ busId: "FAR", lat: stop.lat + 0.5, lng: stop.lng + 0.5 });
    const near = at({ busId: "NEAR", lat: stop.lat + 0.01 });

    const withFarFirst = selectNearestDistanceKm(seen(far, near), stop);
    const withNearFirst = selectNearestDistanceKm(seen(near, far), stop);

    expect(withFarFirst).toBe(withNearFirst);
    expect(withFarFirst!).toBeLessThan(selectNearestDistanceKm(seen(far), stop)!);
  });

  it("grows with distance", () => {
    const near = selectNearestDistanceKm(seen(at({ lat: stop.lat + 0.02 })), stop)!;
    const far = selectNearestDistanceKm(seen(at({ lat: stop.lat + 0.2 })), stop)!;

    expect(far).toBeGreaterThan(near);
  });

  /*
    The defect this replaced: distance was divided by an assumed 30 km/h and
    published as minutes. A kilometre reading must stay a kilometre reading.
  */
  it("returns kilometres, not minutes", () => {
    const km = selectNearestDistanceKm(seen(at({ lat: stop.lat + 0.01 })), stop)!;

    expect(km).toBeGreaterThan(1);
    expect(km).toBeLessThan(1.3);
  });
});

describe("deciding whether to interrupt the passenger", () => {
  it("alerts at exactly the published radius", () => {
    expect(shouldAlert(ARRIVAL_RULES.ALERT_RADIUS_KM)).toBe(true);
  });

  it("does not alert beyond it", () => {
    expect(shouldAlert(ARRIVAL_RULES.ALERT_RADIUS_KM + 0.1)).toBe(false);
  });

  it("does not alert when nothing is reporting", () => {
    expect(shouldAlert(null)).toBe(false);
  });
});

describe("not saying the same thing twice", () => {
  it("allows the first alert for a route and stop", () => {
    expect(createAlertThrottle().claim("101", "HNLU", NOW)).toBe(true);
  });

  it("refuses a repeat inside the dedupe window", () => {
    const throttle = createAlertThrottle();

    throttle.claim("101", "HNLU", NOW);

    expect(
      throttle.claim("101", "HNLU", NOW + NOTIFICATION_RULES.DEDUPE_WINDOW_MS - 1)
    ).toBe(false);
  });

  it("allows it again once the window has passed", () => {
    const throttle = createAlertThrottle();

    throttle.claim("101", "HNLU", NOW);

    expect(
      throttle.claim("101", "HNLU", NOW + NOTIFICATION_RULES.DEDUPE_WINDOW_MS)
    ).toBe(true);
  });

  it("keeps routes and stops apart", () => {
    const throttle = createAlertThrottle();

    throttle.claim("101", "HNLU", NOW);

    expect(throttle.claim("102", "HNLU", NOW)).toBe(true);
    expect(throttle.claim("101", "CBD", NOW)).toBe(true);
  });
});
