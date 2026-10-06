/**
 * The fleet overview.
 *
 * This is the one screen that joins an account to a vehicle, so the checks
 * that matter are that the join is right, that a driver who has stopped
 * reporting stops counting as on shift, and that a passenger never sees any
 * of it.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_FRESHNESS } from "@/domain/fleet/state";
import FleetStatus from "@/components/dashboards/FleetStatus";
import { POLLING, REMOTE_PATHS } from "@/constants/config";
import { STOP_COORDS } from "@/domain/transit/stops";

import { act, renderWithProviders, screen, waitFor, within } from "../helpers/render";
import {
  enableRtdb,
  makeUser,
  seedRtdb,
  signInAs,
} from "../helpers/firebase";
import { setMockRole } from "../helpers/userService";
import type { UserRecord } from "@/types/user";

vi.mock("@/services/userService", async () => {
  const helper = await import("../helpers/userService");
  return helper.userServiceMock();
});

const roster: UserRecord[] = [];

const driver = (uid: string, name: string): UserRecord => ({
  uid,
  name,
  email: `${uid}@brt.in`,
  role: "driver",
});

const renderFleet = (loading = false) =>
  renderWithProviders(<FleetStatus users={[...roster]} loading={loading} />);

const asAdmin = () => {
  setMockRole("admin");
  signInAs(makeUser({ uid: "admin-1" }), "admin");
};

const asPassenger = () => {
  setMockRole("user");
  signInAs(makeUser({ uid: "user-1" }), "user");
};

const seedDriver = (uid: string, name: string) => {
  roster.push(driver(uid, name));
};

/** Fixture vehicles. The operator has supplied no fleet list. */
const vehicleFor = (uid: string) => `fixture-${uid.replace("driver-", "")}`;

const HOUR = 60 * 60 * 1000;

/**
 * Puts a driver on shift in a vehicle.
 *
 * Two records, because the model separates them: the assignment says which
 * bus this driver may publish as, and the position says where that bus is.
 * A position with no assignment behind it belongs to no driver, which is
 * exactly what the operator's table now has to show.
 */
const assign = (uid: string, over: Record<string, unknown> = {}) =>
  seedRtdb(`${REMOTE_PATHS.ASSIGNMENTS}/${uid}`, {
    vehicleId: vehicleFor(uid),
    validFrom: Date.now() - HOUR,
    validTo: Date.now() + 7 * HOUR,
    ...over,
  });

/*
  A broadcasting driver is an assigned one - the rules do not permit anything
  else - so seeding a position seeds the assignment that authorises it. Tests
  wanting one without the other call `assign` on its own.
*/
const broadcast = (uid: string, over: Record<string, unknown> = {}) => {
  assign(uid);

  /*
    Positions are sharded by route, so the path carries the route and the
    record does not. `over.routeId` therefore chooses the shard rather than a
    field - which is what the operator's table reads back.
  */
  const { routeId = "101", ...position } = over as { routeId?: string };

  return seedRtdb(
    `${REMOTE_PATHS.BUS_LOCATIONS}/${routeId}/${vehicleFor(uid)}`,
    {
      lat: STOP_COORDS["CBD"]!.lat,
      lng: STOP_COORDS["CBD"]!.lng,
      updatedAt: Date.now(),
      ...position,
    }
  );
};

beforeEach(() => {
  roster.length = 0;
  enableRtdb();
});

afterEach(() => {
  vi.useRealTimers();
});

const rowFor = (name: string) => screen.getByText(name).closest("tr")!;

describe("who may see the fleet", () => {
  it("shows nothing to a passenger", async () => {
    renderFleet();
    asPassenger();

    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Fleet Status" })
      ).not.toBeInTheDocument()
    );
  });

  it("opens for an administrator", async () => {
    renderFleet();
    asAdmin();

    expect(
      await screen.findByRole("heading", { name: "Fleet Status" })
    ).toBeInTheDocument();
  });
});

describe("matching a driver to their vehicle", () => {
  it("marks a broadcasting driver as live", async () => {
    seedDriver("driver-1", "Asha Verma");
    broadcast("driver-1");

    renderFleet();
    asAdmin();

    await screen.findByText("Asha Verma");

    await waitFor(() =>
      expect(within(rowFor("Asha Verma")).getByText("Live")).toBeInTheDocument()
    );
  });

  it("shows the bus label passengers see, not the account id", async () => {
    seedDriver("driver-1", "Asha Verma");
    broadcast("driver-1");

    renderFleet();
    asAdmin();

    await screen.findByText("Asha Verma");

    /*
      Waited for, not read once. The driver list comes from Firestore and the
      assignment from the Realtime Database, on separate async paths - so the
      row can exist a tick before it knows which bus it names.
    */
    await waitFor(() =>
      expect(
        within(rowFor("Asha Verma")).getByText(vehicleFor("driver-1"))
      ).toBeInTheDocument()
    );

    expect(screen.queryByText("driver-1")).not.toBeInTheDocument();
  });

  it("says a driver has not started rather than calling them offline", async () => {
    seedDriver("driver-1", "Asha Verma");

    renderFleet();
    asAdmin();

    await screen.findByText("Asha Verma");

    expect(within(rowFor("Asha Verma")).getByText("No shift started")).toBeInTheDocument();
  });

  it("does not credit one driver with another's bus", async () => {
    seedDriver("driver-1", "Asha Verma");
    seedDriver("driver-2", "Ravi Kumar");
    broadcast("driver-1");

    renderFleet();
    asAdmin();

    await screen.findByText("Ravi Kumar");

    await waitFor(() =>
      expect(within(rowFor("Asha Verma")).getByText("Live")).toBeInTheDocument()
    );
    expect(within(rowFor("Ravi Kumar")).getByText("No shift started")).toBeInTheDocument();
  });

  it("leaves passengers out of the driver list", async () => {
    seedDriver("driver-1", "Asha Verma");
    roster.push({
      uid: "user-9",
      name: "Neha Rao",
      email: "neha@example.com",
      role: "user",
    });

    renderFleet();
    asAdmin();

    await screen.findByText("Asha Verma");

    expect(screen.queryByText("Neha Rao")).not.toBeInTheDocument();
  });
});

describe("what the vehicle is doing", () => {
  it("names the route the driver declared", async () => {
    seedDriver("driver-1", "Asha Verma");
    broadcast("driver-1", { routeId: "102" });

    renderFleet();
    asAdmin();

    await screen.findByText("Asha Verma");

    await waitFor(() =>
      expect(within(rowFor("Asha Verma")).getByText("Route 102")).toBeInTheDocument()
    );
  });

  /*
    A bus with no route at all can no longer exist - the route is the path a
    position is published to, and publishing refuses without one. What CAN
    still happen is a route this build has never heard of, opened after the
    app was last deployed. The bus keeps its place in the table and loses only
    its label, because dropping it would show an operator fewer vehicles than
    are running.
  */
  it("says nothing it cannot know about an unrecognised route", async () => {
    seedDriver("driver-1", "Asha Verma");
    broadcast("driver-1", { routeId: "999" });

    renderFleet();
    asAdmin();

    await screen.findByText("Asha Verma");

    await waitFor(() =>
      expect(
        within(rowFor("Asha Verma")).getAllByText("—").length
      ).toBeGreaterThanOrEqual(1)
    );
  });
});

describe("counting the fleet", () => {
  it("separates how many drivers exist from how many are running", async () => {
    seedDriver("driver-1", "Asha Verma");
    seedDriver("driver-2", "Ravi Kumar");
    broadcast("driver-1");

    renderFleet();
    asAdmin();

    await screen.findByText("Asha Verma");

    const drivers = screen.getByText("Driver accounts").closest("div")!;
    const onShift = screen.getByText("Reporting", { selector: "p" }).closest("div")!;

    expect(within(drivers).getByText("2")).toBeInTheDocument();
    await waitFor(() => expect(within(onShift).getByText("1")).toBeInTheDocument());
  });

  it("narrows the list to whoever is running", async () => {
    seedDriver("driver-1", "Asha Verma");
    seedDriver("driver-2", "Ravi Kumar");
    broadcast("driver-1");

    const { user } = renderFleet();
    asAdmin();

    await screen.findByText("Ravi Kumar");

    await waitFor(() =>
      expect(within(rowFor("Asha Verma")).getByText("Live")).toBeInTheDocument()
    );

    await user.click(screen.getByRole("button", { name: "Reporting" }));

    expect(screen.getByText("Asha Verma")).toBeInTheDocument();
    expect(screen.queryByText("Ravi Kumar")).not.toBeInTheDocument();
  });
});

describe("a driver who stops reporting", () => {
  /*
    The distinction this whole component was failing to draw.

    `selectFreshBuses` removed a stale vehicle from the array, so a driver
    whose phone lost signal rendered identically to one who never started a
    shift - and the operator is the only person who could tell the difference
    by ringing them. The fleet is now classified rather than filtered, so the
    evidence survives.
  */
  it("says it stopped reporting rather than that it never started", async () => {
    const start = Date.now();

    seedDriver("driver-1", "Asha Verma");
    broadcast("driver-1", { updatedAt: start });

    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(start);

    renderFleet();
    asAdmin();

    await screen.findByText("Asha Verma");
    await waitFor(() =>
      expect(within(rowFor("Asha Verma")).getByText("Live")).toBeInTheDocument()
    );

    act(() => {
      vi.setSystemTime(start + DEFAULT_FRESHNESS.staleMs + 1);
      vi.advanceTimersByTime(POLLING.BUS_FRESHNESS_MS);
    });

    const row = within(rowFor("Asha Verma"));

    expect(row.getByText("Not reporting")).toBeInTheDocument();
    expect(row.queryByText("No shift started")).not.toBeInTheDocument();
  });

  it("passes through delayed before it gives up on the bus", async () => {
    const start = Date.now();

    seedDriver("driver-1", "Asha Verma");
    broadcast("driver-1", { updatedAt: start });

    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(start);

    renderFleet();
    asAdmin();

    await screen.findByText("Asha Verma");

    act(() => {
      vi.setSystemTime(start + DEFAULT_FRESHNESS.recentMs + 1);
      vi.advanceTimersByTime(POLLING.BUS_FRESHNESS_MS);
    });

    expect(within(rowFor("Asha Verma")).getByText("Delayed report")).toBeInTheDocument();
  });

  /*
    A count the operator can act on: it excludes drivers who never began,
    because there is nothing to chase there.
  */
  it("counts it as needing attention, not merely as absent", async () => {
    const start = Date.now();

    seedDriver("driver-1", "Asha Verma");
    seedDriver("driver-2", "Ravi Kumar");
    broadcast("driver-1", { updatedAt: start });

    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(start);

    renderFleet();
    asAdmin();

    await screen.findByText("Asha Verma");

    act(() => {
      vi.setSystemTime(start + DEFAULT_FRESHNESS.staleMs + 1);
      vi.advanceTimersByTime(POLLING.BUS_FRESHNESS_MS);
    });

    const attention = screen
      .getByText("Needs attention", { selector: "p" })
      .closest("div")!;

    expect(within(attention).getByText("1")).toBeInTheDocument();
  });
});

describe("fleet health at a glance", () => {
  it("names every state, including the ones at zero", async () => {
    seedDriver("driver-1", "Asha Verma");
    broadcast("driver-1");

    renderFleet();
    asAdmin();

    await screen.findByText("Asha Verma");

    const strip = screen.getByLabelText(/vehicles by reporting state/i);

    for (const label of [
      "Live",
      "Recent",
      "Delayed report",
      "Not reporting",
      "Unknown",
    ]) {
      expect(within(strip).getByText(label)).toBeInTheDocument();
    }
  });

  /*
    A missing row reads as "no problem"; a row showing 0 reads as "checked,
    and there are none". For fleet health those are different claims.
  */
  it("shows a zero rather than omitting the state", async () => {
    seedDriver("driver-1", "Asha Verma");
    broadcast("driver-1");

    renderFleet();
    asAdmin();

    await screen.findByText("Asha Verma");

    const strip = screen.getByLabelText(/vehicles by reporting state/i);

    const offline = within(strip).getByText("Not reporting").closest("div")!;

    expect(within(offline).getByText("0")).toBeInTheDocument();
  });
});

describe("when live tracking cannot be reached", () => {
  it("still lists the drivers and says why nobody is on shift", async () => {
    const { resetRtdbMock } = await import("../helpers/firebase");

    resetRtdbMock();
    seedDriver("driver-1", "Asha Verma");

    renderFleet();
    asAdmin();

    expect(await screen.findByText("Asha Verma")).toBeInTheDocument();
    expect(await screen.findByText(/Live tracking is unreachable/i)).toBeInTheDocument();
  });
});
