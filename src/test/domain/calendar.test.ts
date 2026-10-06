/**
 * The service calendar.
 *
 * The interesting cases are the ones a bare `getDay()` gets wrong: a device in
 * another timezone, and the hours either side of corridor-local midnight.
 */

import { describe, expect, it } from "vitest";
import {
  SERVICE_EXCEPTIONS,
  SERVICE_TIMEZONE,
  serviceDateOf,
  serviceMinutesOf,
  serviceOn,
  serviceWeekdayName,
  serviceWeekdayOf,
} from "@/domain/transit/calendar";

/** An instant expressed in UTC, so the test does not depend on the runner's zone. */
const utc = (iso: string) => new Date(iso);

describe("naming the service that runs", () => {
  it("runs weekday service Monday to Friday", () => {
    // 2026-08-24 is a Monday, 2026-08-28 a Friday. Midday IST avoids edges.
    expect(serviceOn(utc("2026-08-24T06:30:00Z"))).toBe("weekday");
    expect(serviceOn(utc("2026-08-28T06:30:00Z"))).toBe("weekday");
  });

  it("runs weekend service on Saturday and Sunday", () => {
    expect(serviceOn(utc("2026-08-29T06:30:00Z"))).toBe("weekend");
    expect(serviceOn(utc("2026-08-30T06:30:00Z"))).toBe("weekend");
  });
});

describe("answering in the corridor's timezone, not the device's", () => {
  /*
    The defect this guards. IST is UTC+5:30, so between 18:30 and 24:00 UTC the
    corridor is already on the next calendar day. A device reading getDay() in
    UTC sees Friday while Nava Raipur is on Saturday - and shows weekday service
    to someone standing at a stop on a Saturday morning.
  */
  it("treats late-UTC Friday as Saturday, because the corridor already has", () => {
    const lateFridayUtc = utc("2026-08-28T19:00:00Z");

    expect(lateFridayUtc.getUTCDay()).toBe(5);
    expect(serviceWeekdayOf(lateFridayUtc)).toBe(6);
    expect(serviceOn(lateFridayUtc)).toBe("weekend");
  });

  it("treats late-UTC Sunday as Monday, and reopens weekday service", () => {
    const lateSundayUtc = utc("2026-08-30T19:00:00Z");

    expect(lateSundayUtc.getUTCDay()).toBe(0);
    expect(serviceOn(lateSundayUtc)).toBe("weekday");
  });

  it("dates an instant by the corridor's calendar day", () => {
    expect(serviceDateOf(utc("2026-08-28T19:00:00Z"))).toBe("2026-08-29");
    expect(serviceDateOf(utc("2026-08-28T06:30:00Z"))).toBe("2026-08-28");
  });

  it("names the corridor's weekday", () => {
    expect(serviceWeekdayName(utc("2026-08-28T19:00:00Z"))).toBe("Saturday");
  });
});

describe("reading the corridor clock", () => {
  it("counts minutes from corridor-local midnight", () => {
    // 00:30 UTC is 06:00 IST.
    expect(serviceMinutesOf(utc("2026-08-24T00:30:00Z"))).toBe(6 * 60);
  });

  it("wraps at corridor midnight rather than UTC midnight", () => {
    // 18:30 UTC is exactly 00:00 IST the next day.
    expect(serviceMinutesOf(utc("2026-08-24T18:30:00Z"))).toBe(0);
  });
});

describe("holiday exceptions", () => {
  /*
    Deliberately empty. India's public holidays are lunar, so they cannot be
    derived from a date, and which of them NRANVP runs a reduced service on is
    operator information. An entry invented here would publish service that may
    not run.
  */
  it("ships no invented holidays", () => {
    expect(SERVICE_EXCEPTIONS).toEqual([]);
  });

  it("is expressed in the service timezone", () => {
    expect(SERVICE_TIMEZONE).toBe("Asia/Kolkata");
  });
});
