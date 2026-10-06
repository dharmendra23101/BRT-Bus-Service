/**
 * The timetable page.
 *
 * The founder's sharpest ask was that the page should already know what day it
 * is. These tests are about that: the right service opens without being asked,
 * the override is available but never lets a passenger book a bus that is not
 * running, and the next-bus card says "Scheduled" rather than implying it has
 * seen a bus.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Timetable from "@/pages/Timetable";
import { TIMETABLE_SOURCE } from "@/domain/transit/timetable";
import { renderWithProviders, screen, within } from "../helpers/render";

vi.mock("@/services/userService", async () => {
  const helper = await import("../helpers/userService");
  return helper.userServiceMock();
});

/** A corridor-local instant. IST is UTC+5:30. */
const istInstant = (iso: string) => new Date(iso);

const MONDAY_MORNING = istInstant("2026-08-24T03:30:00Z"); // 09:00 IST, Monday
const SATURDAY_MORNING = istInstant("2026-08-29T03:30:00Z"); // 09:00 IST, Saturday
const MONDAY_LATE = istInstant("2026-08-24T18:00:00Z"); // 23:30 IST, Monday

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

const renderAt = (when: Date) => {
  vi.setSystemTime(when);

  return renderWithProviders(<Timetable />, { route: "/timetable" });
};

/*
  Which timetable this is.

  The page shows departures to the minute and said nothing about where they
  came from or how old they are, so a passenger had no way to tell a current
  timetable from one the operator has since reprinted. Read from
  `TIMETABLE_SOURCE` rather than typed, so the assertion cannot outlive the
  data it describes.
*/
describe("saying which timetable this is", () => {
  it("names the publisher and the date it was read", async () => {
    renderAt(new Date("2026-08-31T09:00:00"));

    await screen.findByRole("table");

    const shown = document.body.textContent ?? "";

    expect(shown).toContain(TIMETABLE_SOURCE.publisher);
    expect(shown).toContain("2026");
  });
});

describe("knowing what day it is without being asked", () => {
  it("opens on the weekday timetable on a Monday", async () => {
    renderAt(MONDAY_MORNING);

    expect(
      await screen.findByRole("region", { name: /Weekdays/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: /Weekends/i })
    ).not.toBeInTheDocument();
  });

  it("opens on the weekend timetable on a Saturday", async () => {
    renderAt(SATURDAY_MORNING);

    expect(
      await screen.findByRole("region", { name: /Weekends/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: /Weekdays/i })
    ).not.toBeInTheDocument();
  });

  it("names the day it is showing", async () => {
    renderAt(MONDAY_MORNING);

    expect(await screen.findByText(/Monday/)).toBeInTheDocument();
  });
});

describe("looking at the other timetable on purpose", () => {
  it("switches when asked", async () => {
    const { user } = renderAt(MONDAY_MORNING);

    await user.click(await screen.findByRole("button", { name: /^weekend$/i }));

    expect(
      await screen.findByRole("region", { name: /Weekends/i })
    ).toBeInTheDocument();
  });

  it("marks the switch so a screen reader knows which is selected", async () => {
    renderAt(MONDAY_MORNING);

    expect(
      await screen.findByRole("button", { name: /^weekday/i })
    ).toHaveAttribute("aria-pressed", "true");
  });
});

describe("the next bus", () => {
  it("labels the time as scheduled, never as live", async () => {
    renderAt(MONDAY_MORNING);

    // Scoped to the card: the page header also links to the live map.
    const card = await screen.findByRole("region", { name: /next from/i });

    expect(within(card).getByText(/Scheduled/)).toBeInTheDocument();
    expect(within(card).queryByText(/\blive\b/i)).not.toBeInTheDocument();
  });

  it("says service has finished rather than showing nothing", async () => {
    renderAt(MONDAY_LATE);

    expect(
      await screen.findByText(/service has finished for today/i)
    ).toBeInTheDocument();
  });

  /*
    End of service must roll to the service the next day actually runs, not to
    "tomorrow, same timetable".
  */
  it("says when service resumes, and on which timetable", async () => {
    renderAt(MONDAY_LATE);

    expect(await screen.findByText(/Resumes Tuesday/i)).toBeInTheDocument();
  });

  it("is hidden while viewing a day that is not today", async () => {
    const { user } = renderAt(MONDAY_MORNING);

    await user.click(await screen.findByRole("button", { name: /^weekend$/i }));

    expect(screen.queryByText(/Next from/i)).not.toBeInTheDocument();
  });
});

describe("choosing a direction", () => {
  const headers = () =>
    screen.getAllByRole("columnheader").map((cell) => cell.textContent?.trim());

  const goInbound = async (user: ReturnType<typeof renderAt>["user"]) => {
    await user.click(
      await screen.findByRole("button", { name: /Raipur Railway Station to HNLU/i })
    );
  };

  it("opens on the outbound working", async () => {
    renderAt(MONDAY_MORNING);

    expect(
      await screen.findByRole("button", { name: /HNLU to Raipur Railway Station/i })
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("switches to the return working", async () => {
    const { user } = renderAt(MONDAY_MORNING);

    await goInbound(user);

    expect(
      await screen.findByRole("region", { name: /Raipur Railway Station to HNLU/i })
    ).toBeInTheDocument();
  });

  /*
    The trap this exists for. The stop registry is fixed in outbound order, so
    laying the return working out against it would print its stops backwards -
    the bus would appear to run from its destination to its origin. Column
    order must come from the trips.
  */
  it("lays the return working out in travel order, not registry order", async () => {
    const { user } = renderAt(MONDAY_MORNING);

    await screen.findByRole("region", { name: /HNLU to Raipur Railway Station/i });
    expect(headers()[1]).toBe("HNLU");

    await goInbound(user);
    await screen.findByRole("region", { name: /Raipur Railway Station to HNLU/i });

    expect(headers()[1]).toBe("Raipur Railway Station");
  });

  it("reaches the stops only the return working serves", async () => {
    const { user } = renderAt(MONDAY_MORNING);

    await goInbound(user);
    await screen.findByRole("region", { name: /Raipur Railway Station to HNLU/i });

    expect(headers()).toContain("Muktangan");
  });

  /*
    The return working calls at HNLU twice - mid-route and again as its
    terminus - so the final call gets its own column, exactly as the operator's
    printed timetable does.
  */
  it("gives the terminus its own arrival column", async () => {
    const { user } = renderAt(MONDAY_MORNING);

    await goInbound(user);
    await screen.findByRole("region", { name: /Raipur Railway Station to HNLU/i });

    const cols = headers();

    expect(cols.at(-2)).toBe("Arrival");
    expect(cols.filter((c) => c === "HNLU")).toHaveLength(1);
  });

  it("reports the next bus from the direction being viewed", async () => {
    const { user } = renderAt(MONDAY_MORNING);

    expect(await screen.findByText(/Next from HNLU/i)).toBeInTheDocument();

    await goInbound(user);

    expect(
      await screen.findByText(/Next from Raipur Railway Station/i)
    ).toBeInTheDocument();
  });
});

/*
  MONDAY_MORNING is 9:00 AM on the weekday outbound working, where the 8:55
  has gone, the 9:10 is next and the 9:25 follows. Every assertion below is
  pinned to that shape rather than to row indices.
*/
describe("knowing where the day has got to", () => {
  const rowHeaders = () =>
    screen.getAllByRole("rowheader").map((cell) => cell.textContent ?? "");

  const rowFor = (departure: string) =>
    rowHeaders().find((text) => text.startsWith(departure)) ?? "";

  const grid = () => screen.findByRole("region", { name: /Weekdays/i });

  it("marks the departure that is next", async () => {
    renderAt(MONDAY_MORNING);
    await grid();

    expect(rowFor("9:10 AM")).toContain("Next");
  });

  it("marks exactly one, so there is no ambiguity about which bus to catch", async () => {
    renderAt(MONDAY_MORNING);
    await grid();

    expect(rowHeaders().filter((text) => text.includes("Next"))).toHaveLength(1);
  });

  /*
    Dimming alone would leave a screen-reader user reading a departed bus as a
    live option (WCAG 1.4.1), and the wording is deliberate: the bus has left
    this row's own first stop, which is not the same as being uncatchable
    further down the corridor.
  */
  it("says in words which departures have gone", async () => {
    renderAt(MONDAY_MORNING);
    await grid();

    expect(rowFor("6:25 AM")).toContain("already departed");
    expect(rowFor("9:25 AM")).not.toContain("already departed");
  });

  it("rules the current time across the grid between the two", async () => {
    renderAt(MONDAY_MORNING);

    expect(within(await grid()).getByText(/Now 9:00 AM/)).toBeInTheDocument();
  });

  /*
    A timetable being browsed out of curiosity has no "now" to mark. Marking
    one would point at a bus that is not running today.
  */
  it("marks nothing on a service day that is not today", async () => {
    const { user } = renderAt(MONDAY_MORNING);

    await user.click(await screen.findByRole("button", { name: /^weekend$/i }));
    const weekend = await screen.findByRole("region", { name: /Weekends/i });

    expect(rowHeaders().filter((text) => text.includes("Next"))).toHaveLength(0);
    expect(within(weekend).queryByText(/^Now /)).not.toBeInTheDocument();
  });

  it("shows no current-time rule once the last bus has gone", async () => {
    renderAt(MONDAY_LATE);

    expect(within(await grid()).queryByText(/^Now /)).not.toBeInTheDocument();
  });
});

describe("staying oriented while scrolling", () => {
  it("names the direction being read, from the trips rather than a label", async () => {
    renderAt(MONDAY_MORNING);

    expect(
      await screen.findByText("Towards Raipur Railway Station")
    ).toBeInTheDocument();
  });

  it("follows the direction selector", async () => {
    const { user } = renderAt(MONDAY_MORNING);

    await user.click(
      await screen.findByRole("button", { name: /Raipur Railway Station to HNLU/i })
    );

    expect(await screen.findByText("Towards HNLU")).toBeInTheDocument();
  });

  it("names the origin and the service day alongside it", async () => {
    renderAt(MONDAY_MORNING);

    expect(
      await screen.findByText(/from HNLU · Weekday service · today/)
    ).toBeInTheDocument();
  });

  it("keeps the departure time in the row heading, not buried in a stop column", async () => {
    renderAt(MONDAY_MORNING);
    await screen.findByRole("region", { name: /Weekdays/i });

    expect(screen.getAllByRole("rowheader")[0]!.textContent).toMatch(/^6:25 AM/);
  });
});

/*
  Sticky positioning cannot be observed in jsdom - there is no layout and no
  Tailwind stylesheet - so these assert the three container properties that
  `ARCHITECTURE-2.0.md` §3.4 records as silently breaking it. Each one looks
  harmless in isolation, which is exactly why it needs pinning: an unbounded
  scroll container resolves sticky against a box that never scrolls, an
  `overflow-hidden` table clips the pinned cells, and `border-collapse` drops
  their borders in Chromium.
*/
describe("the scroll container the sticky headings depend on", () => {
  const region = () => screen.findByRole("region", { name: /Weekdays/i });

  it("is bounded, so a pinned heading has something to stick to", async () => {
    renderAt(MONDAY_MORNING);

    expect((await region()).className).toMatch(/max-h-/);
  });

  it("does not clip its own pinned cells", async () => {
    renderAt(MONDAY_MORNING);

    expect((await region()).querySelector("table")!.className).not.toMatch(
      /overflow-hidden/
    );
  });

  it("separates borders, which sticky cells need in Chromium", async () => {
    renderAt(MONDAY_MORNING);

    const table = (await region()).querySelector("table")!;

    expect(table.className).toContain("border-separate");
    expect(table.className).not.toContain("border-collapse");
  });

  /*
    booking-flow.test.tsx asserts on these too. They are the WCAG 2.1.1
    affordance that lets a keyboard user scroll a wide grid with no pointer.
  */
  it("stays reachable from the keyboard", async () => {
    renderAt(MONDAY_MORNING);

    expect(await region()).toHaveAttribute("tabindex", "0");
  });
});
