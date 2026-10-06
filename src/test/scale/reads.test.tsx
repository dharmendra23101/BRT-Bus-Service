/**
 * What a page costs the database, counted rather than assumed.
 *
 * `ARCHITECTURE-2.0.md` §9 rests scenario B - the commute-time spike, the one
 * peak that actually happens twice a day - on the claim that the timetable is
 * compiled into the bundle and so costs "CDN bandwidth and nothing else". That
 * is the difference between a free peak and a billed one, and until now it was
 * a claim about the code with nothing holding it in place.
 *
 * It is also fragile in a specific way: the GTFS migration's step 9 moves the
 * feed out of TypeScript, and the obvious implementation - fetch it from
 * Firestore - would quietly turn every commuter into a paying read. These
 * tests are what would notice.
 *
 * WHAT IS COUNTED: reads issued by the page component itself. The app-wide
 * announcements listener lives in `ServiceAlerts` and is mounted once per app
 * load, not per page, so it is measured separately below rather than being
 * folded into each page's figure.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDoc, getDocs } from "firebase/firestore";
import { REMOTE_PATHS } from "@/constants/config";

import Timetable from "@/pages/Timetable";
import Fares from "@/pages/Fares";
import RouteExplorer from "@/pages/RouteExplorer";
import Plan from "@/pages/Plan";
import Search from "@/pages/Search";
import About from "@/pages/About";
import MapPage from "@/pages/MapPage";

import { renderWithProviders, screen, waitFor } from "../helpers/render";
import { enableRtdb, rtdbListenerCount } from "../helpers/firebase";

vi.mock("@/services/userService", async () => {
  const helper = await import("../helpers/userService");
  return helper.userServiceMock();
});

/** The acceptance threshold in ARCHITECTURE-2.0.md §9. */
const READS_PER_SESSION_BUDGET = 20;

const firestoreReads = () =>
  vi.mocked(getDocs).mock.calls.length + vi.mocked(getDoc).mock.calls.length;

/* The mock counts live listeners on the node, not calls that may have detached. */
const realtimeListeners = () => rtdbListenerCount(REMOTE_PATHS.BUS_LOCATIONS);

beforeEach(() => {
  vi.mocked(getDocs).mockClear();
  vi.mocked(getDoc).mockClear();
});

/*
  Every page a passenger reaches without signing in. None of them has any
  reason to touch the database: routes, stops, fares and the timetable are all
  compiled in.
*/
const FREE_PAGES: [string, () => JSX.Element, string][] = [
  ["Timetable", () => <Timetable />, "/timetable"],
  ["Fares", () => <Fares />, "/fares"],
  ["Route explorer", () => <RouteExplorer />, "/routes"],
  ["Planner", () => <Plan />, "/plan?from=HNLU&to=CBD"],
  ["Search", () => <Search />, "/search?q=CBD"],
  ["About", () => <About />, "/about"],
];

describe("the pages a commute-time spike lands on", () => {
  for (const [name, render, route] of FREE_PAGES) {
    it(`${name} reads nothing from the database`, async () => {
      renderWithProviders(render(), { route });

      await waitFor(() => expect(screen.getByRole("main")).toBeInTheDocument());

      expect(firestoreReads()).toBe(0);
      expect(realtimeListeners()).toBe(0);
    });
  }

  /*
    Stated as a budget as well as a zero, because the zero is the architectural
    property and the budget is the threshold the load-test plan accepts.
  */
  it("keeps a whole browsing session inside the read budget", async () => {
    for (const [, render, route] of FREE_PAGES) {
      const { unmount } = renderWithProviders(render(), { route });

      await waitFor(() => expect(screen.getByRole("main")).toBeInTheDocument());

      unmount();
    }

    expect(firestoreReads()).toBeLessThan(READS_PER_SESSION_BUDGET);
  });
});

describe("the one page that does open a connection", () => {
  /*
    The realtime mock is opt-in, so the degraded "live tracking is unavailable"
    path stays exercisable elsewhere; here it has to be on, since the point is
    counting what a working subscription opens.

    The fan-out arithmetic in `capacity.test.ts` assumes each viewer holds
    exactly ONE whole-node listener: every write is multiplied by the number of
    listeners, so a second one per viewer would halve the published ceiling.
    This count is that assumption, held in place.
  */
  it("subscribes once, not once per bus", async () => {
    enableRtdb();

    renderWithProviders(<MapPage />, { route: "/map" });

    await waitFor(() => expect(realtimeListeners()).toBeGreaterThan(0));

    expect(realtimeListeners()).toBe(1);
  });

  it("costs no Firestore read to watch the map", async () => {
    enableRtdb();

    renderWithProviders(<MapPage />, { route: "/map" });

    await waitFor(() => expect(realtimeListeners()).toBeGreaterThan(0));

    expect(firestoreReads()).toBe(0);
  });

  /*
    A leaked listener is a scaling bug rather than a rendering one: it costs
    nothing visible while multiplying the fan-out for as long as the tab
    survives. Asserting the count returns to zero also proves the counter above
    is tracking live listeners rather than reporting a constant.
  */
  it("lets the connection go when the map is closed", async () => {
    enableRtdb();

    const { unmount } = renderWithProviders(<MapPage />, { route: "/map" });

    await waitFor(() => expect(realtimeListeners()).toBe(1));

    unmount();

    await waitFor(() => expect(realtimeListeners()).toBe(0));
  });
});
