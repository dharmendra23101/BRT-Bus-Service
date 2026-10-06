/**
 * The journeys block on the landing page.
 *
 * Its whole justification is that it says something true about *this*
 * passenger, so the states that matter are the unwelcome ones: service
 * finished, and no bus running this way at all. A block that only knows how to
 * say "next at 3:25" would quietly say nothing at the times it matters most.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import JourneyOutlook from "@/components/JourneyOutlook";
import { STORAGE_KEYS } from "@/constants/config";
import { renderWithProviders, screen } from "../helpers/render";

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

const at = (iso: string) => vi.setSystemTime(new Date(iso));

const seed = (
  key: string,
  data: { from: string; to: string; at?: number }[]
) => localStorage.setItem(key, JSON.stringify({ v: 2, data }));

const block = () =>
  screen.queryByRole("region", { name: "Your journeys" });

describe("with nothing to say", () => {
  it("renders no block at all", () => {
    at("2026-08-31T09:30:00+05:30");

    renderWithProviders(<JourneyOutlook />, { route: "/" });

    expect(block()).not.toBeInTheDocument();
  });
});

describe("what it tells a passenger about their own journey", () => {
  it("gives the next departure that reaches the destination", () => {
    at("2026-08-31T09:30:00+05:30");
    seed(STORAGE_KEYS.SAVED_JOURNEYS, [{ from: "HNLU", to: "CBD" }]);

    renderWithProviders(<JourneyOutlook />, { route: "/" });

    expect(screen.getByText(/^Next at /)).toBeInTheDocument();
  });

  it("says when the day's service has already gone", () => {
    at("2026-08-31T23:45:00+05:30");
    seed(STORAGE_KEYS.SAVED_JOURNEYS, [{ from: "HNLU", to: "CBD" }]);

    renderWithProviders(<JourneyOutlook />, { route: "/" });

    expect(screen.getByText(/Nothing more today/)).toBeInTheDocument();
  });

  /*
    Different from "finished": a passenger who cannot make this journey at all
    today needs to plan around it, not wait for the next one.
  */
  it("says when no bus runs that way rather than implying one will", () => {
    at("2026-08-31T09:30:00+05:30");
    seed(STORAGE_KEYS.SAVED_JOURNEYS, [
      { from: "Tribal Museum", to: "Muktangan" },
    ]);

    renderWithProviders(<JourneyOutlook />, { route: "/" });

    expect(screen.getByText(/No bus runs this way today/)).toBeInTheDocument();
  });

  it("links each one straight into the planner", () => {
    at("2026-08-31T09:30:00+05:30");
    seed(STORAGE_KEYS.SAVED_JOURNEYS, [{ from: "HNLU", to: "CBD" }]);

    renderWithProviders(<JourneyOutlook />, { route: "/" });

    expect(screen.getByRole("link", { name: /HNLU/ })).toHaveAttribute(
      "href",
      "/plan?from=HNLU&to=CBD"
    );
  });
});

describe("which journeys it chooses", () => {
  it("puts saved journeys before merely recent ones", () => {
    at("2026-08-31T09:30:00+05:30");
    seed(STORAGE_KEYS.SAVED_JOURNEYS, [{ from: "CBD", to: "Telibandha" }]);
    seed(STORAGE_KEYS.RECENT_JOURNEYS, [
      { from: "HNLU", to: "CBD", at: 1 },
      { from: "CBD", to: "Telibandha", at: 2 },
    ]);

    renderWithProviders(<JourneyOutlook />, { route: "/" });

    const links = screen.getAllByRole("link");

    expect(links[0]?.textContent).toContain("Telibandha");
  });

  it("lists a journey once, however it got there", () => {
    at("2026-08-31T09:30:00+05:30");
    seed(STORAGE_KEYS.SAVED_JOURNEYS, [{ from: "HNLU", to: "CBD" }]);
    seed(STORAGE_KEYS.RECENT_JOURNEYS, [{ from: "HNLU", to: "CBD", at: 1 }]);

    renderWithProviders(<JourneyOutlook />, { route: "/" });

    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("does not turn the landing page into a second timetable", () => {
    at("2026-08-31T09:30:00+05:30");
    seed(
      STORAGE_KEYS.RECENT_JOURNEYS,
      ["Sector 27", "Sector 29", "Telibandha", "North Block", "Ekatm Path"].map(
        (from, index) => ({ from, to: "CBD", at: index })
      )
    );

    renderWithProviders(<JourneyOutlook />, { route: "/" });

    expect(screen.getAllByRole("link").length).toBeLessThanOrEqual(3);
  });
});
