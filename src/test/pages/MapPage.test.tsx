import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_FRESHNESS } from "@/domain/fleet/state";
import MapPage from "@/pages/MapPage";
import { POLLING } from "@/constants/config";
import { STOP_COORDS } from "@/domain/transit/stops";
import { subscribeToBuses, type LiveBus } from "@/services/locationService";
import { act, renderWithProviders, screen, waitFor, within } from "../helpers/render";

vi.mock("@/services/userService", async () => {
  const helper = await import("../helpers/userService");
  return helper.userServiceMock();
});

vi.mock("@/services/locationService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/locationService")>()),
  subscribeToBuses: vi.fn(() => vi.fn()),
}));

const subscribe = vi.mocked(subscribeToBuses);

afterEach(() => {
  vi.useRealTimers();
});

const report = (buses: LiveBus[]) => {
  act(() => subscribe.mock.calls[0]![0](buses));
};

const fail = () => {
  act(() => subscribe.mock.calls[0]![1]!(new Error("unavailable")));
};

describe("waiting for the fleet to report", () => {
  it("says it is still loading", () => {
    renderWithProviders(<MapPage />, { route: "/map" });

    expect(screen.getByText("Loading buses...")).toBeInTheDocument();
  });

  it("says when nothing is running", () => {
    renderWithProviders(<MapPage />, { route: "/map" });

    report([]);

    expect(screen.getByText("No buses active")).toBeInTheDocument();
  });

  it("explains when live tracking cannot be reached", () => {
    renderWithProviders(<MapPage />, { route: "/map" });

    fail();

    expect(
      screen.getByText("Live tracking is unavailable right now. Please try again later.")
    ).toBeInTheDocument();
    expect(screen.queryByText("No buses active")).not.toBeInTheDocument();
  });
});

describe("showing the buses that are running", () => {
  const fleet = (): LiveBus[] => [
    { busId: "BUS-0001", lat: 21, lng: 81, updatedAt: Date.now() },
    { busId: "BUS-0002", lat: 21.5, lng: 81.5, updatedAt: Date.now() },
  ];

  it("lists each one without naming its driver", () => {
    renderWithProviders(<MapPage />, { route: "/map" });

    report(fleet());

    expect(screen.getByText("BUS-0001")).toBeInTheDocument();
    expect(screen.getByText("BUS-0002")).toBeInTheDocument();
    expect(screen.queryByText(/driver-/i)).not.toBeInTheDocument();
  });

  /*
    A record with no timestamp used to render as a permanently active bus that
    nothing could retire - and a test protected it. There is no honest way to
    show one: we do not know when it was there, so it is not shown as running.
  */
  it("does not run a bus that has never reported a time", () => {
    renderWithProviders(<MapPage />, { route: "/map" });

    report([
      { busId: "BUS-0001", lat: 21, lng: 81, updatedAt: Date.now() },
      { busId: "BUS-GHOST", lat: 21.5, lng: 81.5 },
    ]);

    expect(screen.getByText("BUS-0001")).toBeInTheDocument();
    expect(screen.queryByText("BUS-GHOST")).not.toBeInTheDocument();
    expect(screen.getByText(/Active Buses: 1/)).toBeInTheDocument();
  });

  it("says how fresh each position is", () => {
    renderWithProviders(<MapPage />, { route: "/map" });

    report(fleet());

    const row = screen.getByText("BUS-0001").closest("tr")!;

    expect(within(row).getByText("Live")).toBeInTheDocument();
  });

  it("counts the active buses", () => {
    renderWithProviders(<MapPage />, { route: "/map" });

    report(fleet());

    expect(screen.getByText(/Active Buses: 2/)).toBeInTheDocument();
  });

  it("centres the map on the middle of the fleet", () => {
    renderWithProviders(<MapPage />, { route: "/map" });

    report(fleet());

    expect(screen.getByTitle("Live bus locations")).toHaveAttribute(
      "src",
      expect.stringContaining("marker=21.25,81.25")
    );
  });
});

describe("a bus that has stopped reporting", () => {
  const stale = (): LiveBus => ({
    busId: "BUS-STALE",
    lat: 30,
    lng: 90,
    updatedAt: Date.now() - DEFAULT_FRESHNESS.staleMs - 1,
  });

  const running = (): LiveBus => ({
    busId: "BUS-0001",
    lat: 21,
    lng: 81,
    updatedAt: Date.now(),
  });

  it("is left out of the count", () => {
    renderWithProviders(<MapPage />, { route: "/map" });

    report([running(), stale()]);

    expect(screen.getByText(/Active Buses: 1/)).toBeInTheDocument();
  });

  it("is left out of the table", () => {
    renderWithProviders(<MapPage />, { route: "/map" });

    report([running(), stale()]);

    expect(screen.getByText("BUS-0001")).toBeInTheDocument();
    expect(screen.queryByText("BUS-STALE")).not.toBeInTheDocument();
  });

  it("does not drag the map away from the buses that are running", () => {
    renderWithProviders(<MapPage />, { route: "/map" });

    report([running(), stale()]);

    expect(screen.getByTitle("Live bus locations")).toHaveAttribute(
      "src",
      expect.stringContaining("marker=21,81")
    );
  });

  it("leaves the map empty when every bus has gone quiet", () => {
    renderWithProviders(<MapPage />, { route: "/map" });

    report([stale()]);

    expect(screen.getByText("No buses active")).toBeInTheDocument();
    expect(screen.getByText(/Active Buses: 0/)).toBeInTheDocument();
  });

  it("is retired while the map stays open, without a further report", () => {
    const start = Date.now();

    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(start);

    renderWithProviders(<MapPage />, { route: "/map" });

    report([{ busId: "BUS-0001", lat: 21, lng: 81, updatedAt: start }]);

    expect(screen.getByText(/Active Buses: 1/)).toBeInTheDocument();

    act(() => {
      vi.setSystemTime(start + DEFAULT_FRESHNESS.staleMs + 1);
      vi.advanceTimersByTime(POLLING.BUS_FRESHNESS_MS);
    });

    expect(screen.getByText("No buses active")).toBeInTheDocument();
  });
});

describe("leaving the map", () => {
  it("stops listening for positions", () => {
    const { unmount } = renderWithProviders(<MapPage />, { route: "/map" });

    const unsubscribe = subscribe.mock.results[0]!.value as () => void;

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });
});

describe("telling a passenger where a bus is going", () => {
  const onRoute = (): LiveBus[] => [
    {
      busId: "BUS-ROUTE",
      lat: STOP_COORDS["CBD"]!.lat,
      lng: STOP_COORDS["CBD"]!.lng,
      updatedAt: Date.now(),
      routeId: "101",
    },
  ];

  it("names the route it is running", () => {
    renderWithProviders(<MapPage />, { route: "/map" });

    report(onRoute());

    /*
      Scoped to the table. The route selector lists every route by name, so an
      unscoped query now matches an <option> as well as the bus's own row -
      and would keep passing if the row stopped naming the route at all.
    */
    expect(
      within(screen.getByRole("table")).getByText("Route 101")
    ).toBeInTheDocument();
  });

  /*
    It used to name one, matched from the bus's coordinate against
    `STOP_COORDS`. That is a generated lattice whose "HNLU" is about 21 km from
    the real one, so the answer was arbitrary - and "next stop" is precisely
    the claim a passenger stands in the road acting on. The page now says what
    it can know and says why it stops there.
  */
  it("refuses to name the stop it reaches next", () => {
    renderWithProviders(<MapPage />, { route: "/map" });

    report(onRoute());

    expect(screen.queryByText("Next stop")).not.toBeInTheDocument();
    expect(
      screen.getByText(/needs surveyed stop positions/i)
    ).toBeInTheDocument();
  });

  it("names where the journey ends", () => {
    renderWithProviders(<MapPage />, { route: "/map" });

    report(onRoute());

    expect(screen.getByText("Raipur Railway Station")).toBeInTheDocument();
  });

  it("says nothing it cannot know for a bus with no route", () => {
    renderWithProviders(<MapPage />, { route: "/map" });

    report([
      { busId: "BUS-BARE", lat: 21, lng: 81, updatedAt: Date.now() },
    ]);

    const row = screen.getByText("BUS-BARE").closest("tr")!;

    expect(within(row).queryByText("Route 101")).not.toBeInTheDocument();
    expect(within(row).getAllByText("—").length).toBeGreaterThanOrEqual(2);
  });
});

/*
  WCAG 2.2.2 (Pause, Stop, Hide). This page auto-updates vehicle information
  for as long as it is open, alongside other content, so it must offer a way
  to stop it. The criterion is one of the few in this area that is legally
  mandatory rather than best practice.

  The requirement these encode is not merely "a button exists": pausing has to
  actually stop the content changing, the frozen view has to SAY it is frozen
  and as of when, and resuming has to show the present rather than the backlog.
*/
describe("stopping the updates", () => {
  const pauseButton = () =>
    screen.getByRole("button", { name: /pause live updates/i });

  const resumeButton = () =>
    screen.getByRole("button", { name: /resume live updates/i });

  it("offers a way to stop the page updating itself", () => {
    renderWithProviders(<MapPage />, { route: "/map" });

    report([{ busId: "BUS-0001", lat: 21, lng: 81, updatedAt: Date.now() }]);

    expect(pauseButton()).toBeInTheDocument();
  });

  it("holds the fleet still once paused", async () => {
    const { user } = renderWithProviders(<MapPage />, { route: "/map" });

    report([{ busId: "BUS-0001", lat: 21, lng: 81, updatedAt: Date.now() }]);
    await user.click(pauseButton());

    // A second bus reports while the passenger is reading the first.
    report([
      { busId: "BUS-0001", lat: 21, lng: 81, updatedAt: Date.now() },
      { busId: "BUS-0002", lat: 21.5, lng: 81.5, updatedAt: Date.now() },
    ]);

    expect(screen.getByText("BUS-0001")).toBeInTheDocument();
    expect(screen.queryByText("BUS-0002")).not.toBeInTheDocument();
  });

  /*
    The honesty requirement. A frozen view that does not say it is frozen is
    the same defect as stale data presented as current - and worse here,
    because the passenger asked for it and may forget.
  */
  it("says that it is paused, and what moment it is showing", async () => {
    const { user } = renderWithProviders(<MapPage />, { route: "/map" });

    report([{ busId: "BUS-0001", lat: 21, lng: 81, updatedAt: Date.now() }]);
    await user.click(pauseButton());

    expect(screen.getByText(/^Paused\./)).toBeInTheDocument();

    const status = screen.getByText(/Showing the corridor as it stood at/);
    expect(status).toHaveTextContent(/\d{1,2}:\d{2}\s?(AM|PM)/i);
  });

  it("describes itself as live when it is", () => {
    renderWithProviders(<MapPage />, { route: "/map" });

    report([{ busId: "BUS-0001", lat: 21, lng: 81, updatedAt: Date.now() }]);

    expect(
      screen.getByText(/Updating automatically as buses report/i)
    ).toBeInTheDocument();
  });

  /*
    Spoken through the app's shared polite region rather than a second one of
    this page's own - see the comment beside the control.
  */
  it("announces the change to a screen reader", async () => {
    const { user } = renderWithProviders(<MapPage />, { route: "/map" });

    report([{ busId: "BUS-0001", lat: 21, lng: 81, updatedAt: Date.now() }]);
    await user.click(pauseButton());

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(/Live updates paused/i)
    );

    await user.click(resumeButton());

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(/Live updates resumed/i)
    );
  });

  /* The state has to be conveyed to somebody who cannot see the button. */
  it("reports its state to assistive technology", async () => {
    const { user } = renderWithProviders(<MapPage />, { route: "/map" });

    report([{ busId: "BUS-0001", lat: 21, lng: 81, updatedAt: Date.now() }]);

    expect(pauseButton()).toHaveAttribute("aria-pressed", "false");

    await user.click(pauseButton());

    expect(resumeButton()).toHaveAttribute("aria-pressed", "true");
  });

  /*
    Resume shows the present, not a replay. The subscription was never closed,
    so there is no backlog to catch up on - which is the whole reason pausing
    is a display decision rather than a connection one.
  */
  it("jumps to the current fleet on resume", async () => {
    const { user } = renderWithProviders(<MapPage />, { route: "/map" });

    report([{ busId: "BUS-0001", lat: 21, lng: 81, updatedAt: Date.now() }]);
    await user.click(pauseButton());

    report([{ busId: "BUS-0002", lat: 21.5, lng: 81.5, updatedAt: Date.now() }]);

    await user.click(resumeButton());

    expect(screen.getByText("BUS-0002")).toBeInTheDocument();
    expect(screen.queryByText("BUS-0001")).not.toBeInTheDocument();
  });

  /*
    A paused view is the corridor as it stood at that instant, so a bus that
    was fresh then must not decay to stale while somebody reads it. Without
    this, pausing would quietly empty the table.
  */
  it("does not let the frozen fleet go stale while it is held", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const { user } = renderWithProviders(<MapPage />, { route: "/map" });

    report([{ busId: "BUS-0001", lat: 21, lng: 81, updatedAt: Date.now() }]);
    await user.click(pauseButton());

    await act(async () => {
      vi.advanceTimersByTime(DEFAULT_FRESHNESS.staleMs + POLLING.BUS_FRESHNESS_MS * 2);
    });

    expect(screen.getByText("BUS-0001")).toBeInTheDocument();
  });
});

/*
  Choosing a route is not a filter over data already received.

  Positions are sharded by route, so the choice changes what the database
  sends. That is the whole saving: on an eight-route corridor, a passenger
  watching one route stops paying for the other seven. A test that only
  checked the rendered list would pass just as happily against a client-side
  filter, which costs exactly as much as showing everything.
*/
describe("watching one route instead of the whole fleet", () => {
  const selectRoute = async (
    user: ReturnType<typeof renderWithProviders>["user"],
    name: RegExp
  ) => {
    await user.selectOptions(screen.getByRole("combobox", { name: /show/i }), [
      screen.getByRole("option", { name }),
    ]);
  };

  it("watches every route until one is chosen", () => {
    renderWithProviders(<MapPage />, { route: "/map" });

    expect(subscribe.mock.calls[0]![2]).toEqual({});
  });

  it("asks the database for one route, rather than filtering afterwards", async () => {
    const { user } = renderWithProviders(<MapPage />, { route: "/map" });

    await selectRoute(user, /^Route 102/);

    await waitFor(() =>
      expect(subscribe.mock.calls.at(-1)![2]).toEqual({ routeId: "102" })
    );
  });

  it("goes back to the whole fleet when the choice is cleared", async () => {
    const { user } = renderWithProviders(<MapPage />, { route: "/map" });

    await selectRoute(user, /^Route 102/);
    await waitFor(() => expect(subscribe.mock.calls.length).toBeGreaterThan(1));

    await user.selectOptions(
      screen.getByRole("combobox", { name: /show/i }),
      [screen.getByRole("option", { name: "Every route" })]
    );

    await waitFor(() => expect(subscribe.mock.calls.at(-1)![2]).toEqual({}));
  });

  /*
    A narrowed subscription starts empty and fills, so the map must not go on
    showing the previous route's buses while the new shard arrives.
  */
  it("drops the previous route's buses while the new one loads", async () => {
    const { user } = renderWithProviders(<MapPage />, { route: "/map" });

    report([
      {
        busId: "bus-1",
        lat: STOP_COORDS["CBD"]!.lat,
        lng: STOP_COORDS["CBD"]!.lng,
        updatedAt: Date.now(),
        routeId: "101",
      },
    ]);

    await screen.findByText(/bus-1/);

    await selectRoute(user, /^Route 102/);

    await waitFor(() =>
      expect(screen.queryByText(/bus-1/)).not.toBeInTheDocument()
    );
  });
});
