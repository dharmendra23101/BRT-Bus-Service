import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "@/pages/Home";
import { act, renderWithProviders, screen } from "../helpers/render";
import { getTrips } from "@/domain/transit/schedule";
import { tripTimings } from "@/domain/transit/departures";
import { STORAGE_KEYS } from "@/constants/config";

vi.mock("@/services/userService", async () => {
  const helper = await import("../helpers/userService");
  return helper.userServiceMock();
});

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("the front page", () => {
  it("opens on the first strapline", () => {
    renderWithProviders(<Home />, { route: "/" });

    expect(
      screen.getByRole("heading", { name: "Experience the Best BRT Service" })
    ).toBeInTheDocument();
  });

  it("moves to the next strapline on its own", async () => {
    renderWithProviders(<Home />, { route: "/" });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(
      screen.getByRole("heading", { name: "Plan Your Commute with Ease" })
    ).toBeInTheDocument();
  });

  it("describes what the service offers", () => {
    renderWithProviders(<Home />, { route: "/" });

    for (const name of [
      "Published timetable",
      "Live when shared",
      "Official fares",
      "One place to plan",
    ]) {
      expect(screen.getByRole("heading", { name })).toBeInTheDocument();
    }
  });

  /*
    The page previously promised "accurate arrival predictions" - which P0-14
    removed the maths for outright - and vouched for the maintenance of buses
    we neither run nor inspect. Both were on the first page a passenger reads.
  */
  it("claims no arrival prediction it does not make", () => {
    renderWithProviders(<Home />, { route: "/" });

    expect(screen.queryByText(/arrival predictions/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Nothing is predicted/)).toBeInTheDocument();
  });

  it("vouches for nothing about the operator's own vehicles", () => {
    renderWithProviders(<Home />, { route: "/" });

    expect(
      screen.queryByText(/secure and maintained buses/i)
    ).not.toBeInTheDocument();
  });

  it("sends a visitor on to the places they can reach", () => {
    renderWithProviders(<Home />, { route: "/" });

    expect(
      screen.getByRole("link", { name: /explore nearby places/i })
    ).toHaveAttribute("href", "/nearby");
  });
});

/*
  Every test here pins the clock. The block is deliberately about "now", so
  without a fixed instant these assertions would pass or fail depending on the
  time of day CI happened to run - the same trap the ticket factory sets.
*/
describe("what is still to come today", () => {
  const at = (iso: string) => vi.setSystemTime(new Date(iso));

  const firstUpcoming = (service: "weekday" | "weekend", minutes: number) => {
    const trips = getTrips(service);
    const timings = tripTimings(trips, minutes);

    return trips.find((_, index) => timings[index] !== "departed")!;
  };

  it("names the service day it is showing", () => {
    at("2026-08-31T09:30:00+05:30");

    renderWithProviders(<Home />, { route: "/" });

    expect(screen.getByText(/Weekday service/)).toBeInTheDocument();
  });

  it("leads with the next departure rather than the first of the day", () => {
    at("2026-08-31T09:30:00+05:30");

    renderWithProviders(<Home />, { route: "/" });

    const next = firstUpcoming("weekday", 9 * 60 + 30);

    expect(
      screen.getByRole("heading", {
        name: `${next.calls[0]!.time} · Route ${next.routeId}`,
      })
    ).toBeInTheDocument();
  });

  it("does not offer a bus that has already gone", () => {
    at("2026-08-31T09:30:00+05:30");

    renderWithProviders(<Home />, { route: "/" });

    expect(
      screen.queryByRole("heading", { name: /^6:25 AM/ })
    ).not.toBeInTheDocument();
  });

  it("says so once the day's service has finished", () => {
    at("2026-08-31T23:30:00+05:30");

    renderWithProviders(<Home />, { route: "/" });

    expect(screen.getByText(/service has finished/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /check the timetable/i })
    ).toHaveAttribute("href", "/timetable");
  });

  it("shortens a long corridor rather than listing every stop", () => {
    at("2026-08-31T06:00:00+05:30");

    renderWithProviders(<Home />, { route: "/" });

    expect(
      screen.getAllByText(
        "HNLU, Balco Medical Center, Sector 30, Sector 29, … Raipur Railway Station"
      ).length
    ).toBeGreaterThan(0);
  });
});

describe("the journeys this device knows", () => {
  it("offers nothing at all to a first-time visitor", () => {
    renderWithProviders(<Home />, { route: "/" });

    expect(
      screen.queryByRole("heading", { name: "Your journeys" })
    ).not.toBeInTheDocument();
  });

  it("offers a saved journey with what leaves next", () => {
    vi.setSystemTime(new Date("2026-08-31T09:30:00+05:30"));

    localStorage.setItem(
      STORAGE_KEYS.SAVED_JOURNEYS,
      JSON.stringify({ v: 2, data: [{ from: "HNLU", to: "CBD" }] })
    );

    renderWithProviders(<Home />, { route: "/" });

    expect(
      screen.getByRole("heading", { name: "Your journeys" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /HNLU.*CBD.*Next at/s })
    ).toHaveAttribute("href", "/plan?from=HNLU&to=CBD");
  });
});

describe("the hero image", () => {
  it("describes itself and reserves its space", () => {
    renderWithProviders(<Home />, { route: "/" });

    const hero = screen.getByAltText(
      "A BRT bus on the Raipur to Naya Raipur corridor"
    );

    expect(hero).toHaveAttribute("width", "1080");
    expect(hero).toHaveAttribute("height", "572");
  });
});
