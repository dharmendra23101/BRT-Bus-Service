import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Driver from "@/pages/Driver";
import {
  isLiveTrackingAvailable,
  publishLocation,
  stopPublishing,
  subscribeToAssignment,
} from "@/services/locationService";
import { act, renderWithProviders, screen, waitFor } from "../helpers/render";
import { ROUTE_IDS, getRoute } from "@/domain/transit/routes";
import { POLLING } from "@/constants/config";
import { INTERRUPTION_TOLERANCE } from "@/domain/fleet/sharing";
import { makeUser, signInAs } from "../helpers/firebase";
import { setMockRole } from "../helpers/userService";

vi.mock("@/services/userService", async () => {
  const helper = await import("../helpers/userService");
  return helper.userServiceMock();
});

vi.mock("@/services/locationService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/locationService")>()),
  isLiveTrackingAvailable: vi.fn(async () => true),
  publishLocation: vi.fn(async () => undefined),
  stopPublishing: vi.fn(async () => undefined),
  subscribeToAssignment: vi.fn(() => () => {}),
}));

const available = vi.mocked(isLiveTrackingAvailable);
const publish = vi.mocked(publishLocation);
const stop = vi.mocked(stopPublishing);
const assignment = vi.mocked(subscribeToAssignment);

const VEHICLE = "fixture-a";

/*
  Long enough past a due publish to count as interrupted, derived rather than
  restated. A hardcoded 60 s silently stopped tripping the check when the
  cadence moved to 30 s: the threshold moved with it and the test did not.
*/
const OVERDUE_MS =
  POLLING.DRIVER_LOCATION_MS * INTERRUPTION_TOLERANCE + 5_000;

/*
  Reports an assignment to whatever the page subscribed with. Called before
  render, because the page reads it on mount and the answer decides whether
  there is anything to broadcast as at all.
*/
const assign = (_driverUid: string, vehicleId: string | null) => {
  assignment.mockImplementation((_uid, onAssignment) => {
    onAssignment(vehicleId);

    return () => {};
  });
};

const AT_HNLU = { coords: { latitude: 21.2514, longitude: 81.6296 } };

const locate = vi.fn();

beforeEach(() => {
  /*
    On shift by default, since most of these exercise broadcasting. The test
    for a driver with no bus assigned says so explicitly.
  */
  assign("driver-9", VEHICLE);

  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition: locate },
  });

  available.mockResolvedValue(true);
  locate.mockImplementation((onSuccess: PositionCallback) =>
    onSuccess(AT_HNLU as GeolocationPosition)
  );
});

const asDriver = () => {
  setMockRole("driver");
  signInAs(makeUser({ uid: "driver-9" }), "driver");
};

const startSharing = async (user: ReturnType<typeof renderWithProviders>["user"]) => {
  const button = await screen.findByRole("button", { name: "Start Sharing" });

  await waitFor(() => expect(button).toBeEnabled());
  await user.click(button);
};

describe("who may broadcast", () => {
  it("names the assigned vehicle, never the account it belongs to", async () => {
    renderWithProviders(<Driver />, { route: "/driver" });
    asDriver();

    expect(await screen.findByText(VEHICLE)).toBeInTheDocument();
    expect(screen.queryByText("driver-9")).not.toBeInTheDocument();
  });

  /*
    The state this ships in: nobody has a bus until the operator issues an
    assignment, and each one expires at the end of a shift. Offering a Start
    button here would produce a write the database refuses and an error the
    driver could do nothing about.
  */
  it("says plainly when no bus is assigned", async () => {
    assign("driver-9", null);

    renderWithProviders(<Driver />, { route: "/driver" });
    asDriver();

    expect(
      await screen.findByText(/No bus is assigned to you right now/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /start sharing/i })
    ).toBeDisabled();
  });

  it("refuses a passenger who reached the page anyway", async () => {
    setMockRole("user");
    renderWithProviders(<Driver />, { route: "/driver" });
    signInAs(makeUser({ uid: "user-1" }));

    await screen.findByText("Not sharing");

    expect(screen.getByRole("button", { name: "Start Sharing" })).toBeDisabled();
  });
});

describe("starting a shift", () => {
  it("publishes the driver's position", async () => {
    const { user } = renderWithProviders(<Driver />, { route: "/driver" });
    asDriver();

    await startSharing(user);

    await waitFor(() => expect(publish).toHaveBeenCalled());

    expect(publish.mock.calls[0]![1]).toEqual({
      latitude: 21.2514,
      longitude: 81.6296,
    });
    expect(await screen.findByText(/Sharing your live location/)).toBeInTheDocument();
  });

  it("says so when live tracking cannot be reached", async () => {
    available.mockResolvedValue(false);

    const { user } = renderWithProviders(<Driver />, { route: "/driver" });
    asDriver();

    await startSharing(user);

    expect(
      await screen.findByText("Live tracking is unavailable right now.")
    ).toBeInTheDocument();
    expect(publish).not.toHaveBeenCalled();
  });

  it("explains a refused location permission and stands down", async () => {
    locate.mockImplementation(
      (_onSuccess: PositionCallback, onError: PositionErrorCallback) =>
        onError({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError)
    );

    const { user } = renderWithProviders(<Driver />, { route: "/driver" });
    asDriver();

    await startSharing(user);

    expect(
      await screen.findByText(
        "Location permission is required to broadcast your position."
      )
    ).toBeInTheDocument();
    expect(await screen.findByText("Not sharing")).toBeInTheDocument();
  });
});

describe("ending a shift", () => {
  it("clears the published position when the driver stops", async () => {
    const { user } = renderWithProviders(<Driver />, { route: "/driver" });
    asDriver();

    await startSharing(user);
    await screen.findByText(/Sharing your live location/);

    await user.click(screen.getByRole("button", { name: "Stop Sharing" }));

    await waitFor(() => expect(stop).toHaveBeenCalled());

    expect(await screen.findByText("Not sharing")).toBeInTheDocument();
  });

  it("clears the published position when the page is left", async () => {
    const { unmount } = renderWithProviders(<Driver />, { route: "/driver" });
    asDriver();

    await screen.findByText("Not sharing");

    stop.mockClear();
    unmount();

    expect(stop).toHaveBeenCalled();
  });
});

describe("declaring which route is being run", () => {
  const routeField = () => screen.getByLabelText(/route you are running/i);

  it("offers every operational route", async () => {
    renderWithProviders(<Driver />, { route: "/driver" });
    asDriver();

    await waitFor(() => expect(routeField()).toBeInTheDocument());

    for (const id of ROUTE_IDS) {
      expect(
        screen.getByRole("option", { name: new RegExp(getRoute(id).name) })
      ).toBeInTheDocument();
    }
  });

  it("publishes the route the driver chose", async () => {
    const { user } = renderWithProviders(<Driver />, { route: "/driver" });
    asDriver();

    await waitFor(() => expect(routeField()).toBeInTheDocument());
    await user.selectOptions(routeField(), "102");

    await startSharing(user);

    await waitFor(() => expect(publish).toHaveBeenCalled());

    expect(publish.mock.calls[0]![3]).toBe("102");
  });

  it("locks the choice while a shift is under way", async () => {
    const { user } = renderWithProviders(<Driver />, { route: "/driver" });
    asDriver();

    await waitFor(() => expect(routeField()).toBeInTheDocument());
    await startSharing(user);

    await screen.findByText(/Sharing your live location/);

    expect(routeField()).toBeDisabled();
  });

  it("names the route it is broadcasting on", async () => {
    const { user } = renderWithProviders(<Driver />, { route: "/driver" });
    asDriver();

    await waitFor(() => expect(routeField()).toBeInTheDocument());
    await user.selectOptions(routeField(), "102");
    await startSharing(user);

    expect(
      await screen.findByText(/Sharing your live location on Route 102/)
    ).toBeInTheDocument();
  });
});

/**
 * A backgrounded tab.
 *
 * The browser clamps a hidden tab's timers and suspends its geolocation, so
 * the publish loop simply stops. Nothing threw, nothing logged, and the screen
 * kept showing a green "sharing" light - the driver believed passengers could
 * see the bus, and passengers watched it go stale with no explanation.
 */
describe("when the driver's tab goes into the background", () => {
  const setVisibility = (state: DocumentVisibilityState) => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => state,
    });

    document.dispatchEvent(new Event("visibilitychange"));
  };

  /** Geolocation stops answering in a hidden tab, so publishes stop landing. */
  const suspendGeolocation = () => locate.mockImplementation(() => undefined);

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    setVisibility("visible");
    vi.useRealTimers();
  });

  it("stops claiming to share once a publish is overdue", async () => {
    const { user } = renderWithProviders(<Driver />, { route: "/driver" });
    asDriver();

    await startSharing(user);
    await screen.findByText(/Sharing your live location/);

    suspendGeolocation();
    act(() => setVisibility("hidden"));
    act(() => {
      vi.advanceTimersByTime(OVERDUE_MS);
    });

    expect(
      await screen.findByText("Your position is not reaching passengers.")
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Sharing your live location/)
    ).not.toBeInTheDocument();
  });

  /*
    Announced rather than merely coloured: the driver has just looked away -
    that is how it happened - so it has to reach them when they look back.
  */
  it("announces the interruption and names the cause", async () => {
    const { user } = renderWithProviders(<Driver />, { route: "/driver" });
    asDriver();

    await startSharing(user);
    await screen.findByText(/Sharing your live location/);

    suspendGeolocation();
    act(() => setVisibility("hidden"));
    act(() => {
      vi.advanceTimersByTime(OVERDUE_MS);
    });

    // Scoped deliberately: LiveAnnouncer mounts a permanent assertive region,
    // so a bare alert query matches two nodes and throws.
    await waitFor(() =>
      expect(
        screen.getByText(/This tab was in the background/i)
      ).toBeInTheDocument()
    );

    const spoken = document.querySelector('[aria-live="assertive"]')!;

    await waitFor(() => expect(spoken).toHaveTextContent(/background/i));
    expect(spoken).toHaveTextContent(/keep this screen open/i);
  });

  /*
    A throttled interval may not fire for another minute after the driver
    returns, so without publishing on the way back the bus stays missing from
    the map long after they are looking at it again.
  */
  it("publishes again the moment the tab comes back", async () => {
    const { user } = renderWithProviders(<Driver />, { route: "/driver" });
    asDriver();

    await startSharing(user);
    await waitFor(() => expect(publish).toHaveBeenCalled());

    act(() => setVisibility("hidden"));
    publish.mockClear();

    act(() => setVisibility("visible"));

    await waitFor(() => expect(publish).toHaveBeenCalledTimes(1));
  });

  it("recovers once a publish lands again", async () => {
    const { user } = renderWithProviders(<Driver />, { route: "/driver" });
    asDriver();

    await startSharing(user);
    suspendGeolocation();
    act(() => setVisibility("hidden"));
    act(() => {
      vi.advanceTimersByTime(OVERDUE_MS);
    });

    await screen.findByText("Your position is not reaching passengers.");

    locate.mockImplementation((onSuccess: PositionCallback) =>
      onSuccess(AT_HNLU as GeolocationPosition)
    );
    act(() => setVisibility("visible"));

    expect(
      await screen.findByText(/Sharing your live location/)
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Your position is not reaching passengers.")
    ).not.toBeInTheDocument();
  });
});
