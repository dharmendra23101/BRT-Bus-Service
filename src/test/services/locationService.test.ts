/**
 * Live bus positions.
 *
 * Two properties matter here. Positions are published to a world-readable
 * node, so nothing identifying may go into the payload; and only a driver may
 * publish at all.
 *
 * The database is switched off by default, which exercises the degraded path
 * the app has to survive when the SDK cannot load. The suites at the end call
 * `enableRtdb` to drive the real subscription and cleanup logic instead.
 */

import { DEFAULT_FRESHNESS } from "@/domain/fleet/state";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  isLiveTrackingAvailable,
  publishLocation,
  classifyBuses,
  resetServerTimeOffset,
  selectFreshBuses,
  serverNow,
  stopPublishing,
  subscribeToBuses,
  type LiveBus,
} from "@/services/locationService";
import { REMOTE_PATHS } from "@/constants/config";
import { AuthorizationError } from "@/domain/auth/errors";
import type { Actor } from "@/types/user";
import {
  dropRtdbConnection,
  enableRtdb,
  failNextRtdbSubscription,
  hasDisconnectCleanup,
  readRtdb,
  rtdbListenerCount,
  seedRtdb,
  disconnectWrite,
  wasServerStamped,
} from "../helpers/firebase";

const driver: Actor = { uid: "driver-1", role: "driver" };
const passenger: Actor = { uid: "user-1", role: "user" };
const admin: Actor = { uid: "admin-1", role: "admin" };

const VEHICLE = "fixture-a";
const ROUTE = "101" as const;

const NOW = 1_770_000_000_000;

const bus = (over: Partial<LiveBus> = {}): LiveBus => ({
  busId: "BUS-0001",
  lat: 21.2514,
  lng: 81.6296,
  updatedAt: NOW,
  ...over,
});

/*
  What identifies a bus on the public node.

  It used to be a hash of the driver's account id - opaque, but a STABLE
  per-person identifier on world-readable data, so anyone watching the map
  could follow one driver across days. It is now the vehicle the operator
  assigned, which has no relationship to any account at all.
*/
describe("what the public node is keyed by", () => {
  beforeEach(() => {
    enableRtdb();
  });

  it("stores a position under the vehicle, not the driver", async () => {
    await publishLocation(driver, { latitude: 21.25, longitude: 81.62 }, VEHICLE, ROUTE);

    expect(readRtdb(`${REMOTE_PATHS.BUS_LOCATIONS}/${ROUTE}/${VEHICLE}`)).toBeDefined();
    expect(
      readRtdb(`${REMOTE_PATHS.BUS_LOCATIONS}/${ROUTE}/${driver.uid}`)
    ).toBeUndefined();
  });

  it("refuses to publish without a vehicle", async () => {
    await expect(
      publishLocation(driver, { latitude: 21.25, longitude: 81.62 }, "", ROUTE)
    ).rejects.toThrow(/vehicle/i);
  });

  it("refuses a vehicle id a database key cannot hold", async () => {
    await expect(
      publishLocation(driver, { latitude: 21.25, longitude: 81.62 }, "a/b", ROUTE)
    ).rejects.toThrow(/vehicle/i);
  });
});

describe("who may publish a position", () => {
  it("refuses a passenger", async () => {
    await expect(
      publishLocation(passenger, { latitude: 21.25, longitude: 81.62 }, VEHICLE, ROUTE)
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("refuses an admin, who does not hold this capability", async () => {
    await expect(
      publishLocation(admin, { latitude: 21.25, longitude: 81.62 }, VEHICLE, ROUTE)
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("refuses a signed-out caller", async () => {
    await expect(
      publishLocation(null, { latitude: 21.25, longitude: 81.62 }, VEHICLE, ROUTE)
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("allows a driver, and degrades quietly when tracking is unavailable", async () => {
    // The permission check passes; the write is skipped because the mocked
    // environment has no Realtime Database.
    await expect(
      publishLocation(driver, { latitude: 21.25, longitude: 81.62 }, VEHICLE, ROUTE)
    ).resolves.toBeUndefined();
  });
});

describe("when live tracking is unavailable", () => {
  it("reports itself as unavailable rather than throwing", async () => {
    expect(await isLiveTrackingAvailable()).toBe(false);
  });

  it("tells the subscriber instead of leaving it loading forever", async () => {
    const onBuses = vi.fn();
    const onError = vi.fn();

    subscribeToBuses(onBuses, onError);

    await vi.waitFor(() => expect(onError).toHaveBeenCalled());
    expect(onBuses).toHaveBeenCalledWith([]);
  });

  it("returns an unsubscribe that is safe to call immediately", () => {
    // A component that mounts and unmounts before the SDK resolves must not
    // leave a listener attached or throw on cleanup.
    const unsubscribe = subscribeToBuses(vi.fn());

    expect(() => unsubscribe()).not.toThrow();
  });

  it("stops publishing without error", async () => {
    await expect(stopPublishing(driver, VEHICLE, ROUTE)).resolves.toBeUndefined();
  });

  it("ignores a stop request from a signed-out caller", async () => {
    await expect(stopPublishing(null, VEHICLE, ROUTE)).resolves.toBeUndefined();
  });
});

describe("which positions still count as live", () => {
  it("keeps a position that reported recently", () => {
    expect(selectFreshBuses([bus()], NOW)).toHaveLength(1);
  });

  it("keeps a position reporting exactly on the threshold", () => {
    const edge = bus({ updatedAt: NOW - DEFAULT_FRESHNESS.staleMs });

    expect(selectFreshBuses([edge], NOW)).toHaveLength(1);
  });

  it("drops a position older than the staleness window", () => {
    const old = bus({ updatedAt: NOW - 10 * 60 * 1000 });

    expect(selectFreshBuses([old], NOW)).toEqual([]);
  });

  /*
    THIS TEST USED TO ASSERT THE OPPOSITE, and in doing so protected a live
    bug: a record with no timestamp was kept forever, so a single write with no
    `updatedAt` produced a permanently active bus on a public map that nothing
    could retire. The honest answer is UNKNOWN - we do not know when it was
    there - and UNKNOWN is not shown as running.
  */
  it("does not keep a position with no timestamp as a live bus", () => {
    expect(selectFreshBuses([bus({ updatedAt: undefined })], NOW)).toEqual([]);

    const classified = classifyBuses([bus({ updatedAt: undefined })], NOW);

    expect(classified).toHaveLength(1);
    expect(classified[0]!.state).toBe("UNKNOWN");
  });

  it("keeps only the fresh half of a mixed fleet", () => {
    const fleet = [
      bus({ busId: "BUS-FRESH" }),
      bus({
        busId: "BUS-STALE",
        updatedAt: NOW - 10 * 60 * 1000,
      }),
    ];

    expect(
      selectFreshBuses(fleet, NOW).map((entry) => entry.telemetry.vehicleId)
    ).toEqual(["BUS-FRESH"]);
  });

  /*
    The point of the five-state model: a bus that stops reporting is not
    deleted, it is classified. "Not running" and "not reporting" are different
    facts to somebody standing at a stop, and the old filter destroyed the
    difference.
  */
  it("keeps an offline bus in the fleet, carrying why", () => {
    const fleet = classifyBuses(
      [bus({ busId: "BUS-GONE", updatedAt: NOW - 10 * 60 * 1000 })],
      NOW
    );

    expect(fleet).toHaveLength(1);
    expect(fleet[0]!.state).toBe("OFFLINE");
    expect(fleet[0]!.ageMs).toBe(10 * 60 * 1000);
  });
});

describe("publishing to a database that is reachable", () => {
  const node = `${REMOTE_PATHS.BUS_LOCATIONS}/${ROUTE}/${VEHICLE}`;

  beforeEach(() => {
    enableRtdb();
  });

  it("writes the position to the driver's own node", async () => {
    await publishLocation(driver, { latitude: 21.25, longitude: 81.62 }, VEHICLE, ROUTE);

    expect(readRtdb(node)).toMatchObject({ lat: 21.25, lng: 81.62 });
  });

  it("puts nothing about the account into public data", async () => {
    await publishLocation(driver, { latitude: 21.25, longitude: 81.62 }, VEHICLE, ROUTE);

    const published = readRtdb(node) as Record<string, unknown>;

    /*
      `busId` is gone from the payload: the node's key already answers which
      bus this is, and a field that could disagree with it would be a second,
      contradictory answer.
    */
    expect(Object.keys(published).sort()).toEqual(["lat", "lng", "updatedAt"]);
    expect(JSON.stringify(published)).not.toContain(driver.uid);
  });

  it("refuses a coordinate that could not exist", async () => {
    const refused = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await publishLocation(driver, { latitude: 91, longitude: 81.62 }, VEHICLE, ROUTE);

    expect(readRtdb(node)).toBeUndefined();

    refused.mockRestore();
  });

  /*
    The route is the path, not a field. That is what lets a passenger watching
    one route receive only that route's buses, and it removes the possibility
    of a payload claiming a route different from the shard it sits in.
  */
  it("files the position under the route the driver declared", async () => {
    await publishLocation(driver, { latitude: 21.25, longitude: 81.62 }, VEHICLE, "102");

    expect(
      readRtdb(`${REMOTE_PATHS.BUS_LOCATIONS}/102/${VEHICLE}`)
    ).toMatchObject({ lat: 21.25 });
    expect(readRtdb(`${REMOTE_PATHS.BUS_LOCATIONS}/${ROUTE}/${VEHICLE}`)).toBeUndefined();
  });

  it("carries no route inside the record to contradict the path", async () => {
    await publishLocation(driver, { latitude: 21.25, longitude: 81.62 }, VEHICLE, ROUTE);

    expect(readRtdb(node)).not.toHaveProperty("routeId");
  });

  /*
    A bus with no declared route has no shard to live in. The driver screen
    already makes the choice up front, so this refuses rather than inventing
    a default that would file the bus under somebody else's route.
  */
  it("refuses to publish without a route", async () => {
    await expect(
      publishLocation(
        driver,
        { latitude: 21.25, longitude: 81.62 },
        VEHICLE,
        undefined as unknown as typeof ROUTE
      )
    ).rejects.toThrow(/route/i);
  });

  it("clears the position when the driver stops", async () => {
    await publishLocation(driver, { latitude: 21.25, longitude: 81.62 }, VEHICLE, ROUTE);
    await stopPublishing(driver, VEHICLE, ROUTE);

    expect(readRtdb(node)).toBeUndefined();
  });
});

describe("a driver who drops off the network", () => {
  const node = `${REMOTE_PATHS.BUS_LOCATIONS}/${ROUTE}/${VEHICLE}`;

  beforeEach(() => {
    enableRtdb();
  });

  it("asks the server to clear the position if the connection dies", async () => {
    await publishLocation(driver, { latitude: 21.25, longitude: 81.62 }, VEHICLE, ROUTE);

    expect(hasDisconnectCleanup(node)).toBe(true);
  });

  it("is taken off the map without anyone stopping deliberately", async () => {
    await publishLocation(driver, { latitude: 21.25, longitude: 81.62 }, VEHICLE, ROUTE);

    expect(readRtdb(node)).toBeDefined();

    dropRtdbConnection();

    expect(readRtdb(node)).toBeUndefined();
  });

  it("leaves nothing behind in a world-readable database", async () => {
    await publishLocation(driver, { latitude: 21.25, longitude: 81.62 }, VEHICLE, ROUTE);

    dropRtdbConnection();

    const onBuses = vi.fn();
    subscribeToBuses(onBuses);

    await vi.waitFor(() => expect(onBuses).toHaveBeenCalledWith([]));
  });
});

describe("watching the fleet", () => {
  /*
    The clock is pinned to the fixtures' own `NOW`. It did not need to be while
    the subscription passed records straight through, but the telemetry gate
    rejects an observation more than a day old - so a fixture dated months ago
    against a real wall clock is now, correctly, not believed.
  */
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
    enableRtdb();
  });

  it("reports every position that is reporting", async () => {
    seedRtdb(`${REMOTE_PATHS.BUS_LOCATIONS}/${ROUTE}/driver-9`, {
      lat: 21.25,
      lng: 81.62,
      updatedAt: NOW,
          });

    const onBuses = vi.fn();
    subscribeToBuses(onBuses);

    await vi.waitFor(() =>
      expect(onBuses).toHaveBeenCalledWith([
        { lat: 21.25, lng: 81.62, updatedAt: NOW, busId: "driver-9", routeId: ROUTE },
      ])
    );
  });

  it("carries the route through to the subscriber", async () => {
    seedRtdb(`${REMOTE_PATHS.BUS_LOCATIONS}/102/driver-9`, {
      lat: 21.25,
      lng: 81.62,
      updatedAt: NOW,
    });

    const onBuses = vi.fn();
    subscribeToBuses(onBuses);

    await vi.waitFor(() =>
      expect(onBuses).toHaveBeenCalledWith([
        expect.objectContaining({ routeId: "102" }),
      ])
    );
  });

  /*
    This used to assert that the bus was dropped, and that was the defect.

    On the web an unknown route cannot happen: a deploy updates every client at
    once, so no client is ever behind the data. An installed app is different -
    users do not update. The day a new route opens, every phone still running
    an older build would drop those buses entirely, and a passenger would see
    fewer buses than exist with nothing anywhere saying so.

    So an unrecognised route costs the bus its label, never its place on the
    map. Contract changes have to be additive and tolerant.
  */
  /*
    A shard this build has never heard of - a route opened after the app was
    last deployed. The buses still reach the map; they simply arrive without a
    label. Dropping them would mean an installed app silently showing fewer
    buses than exist, which is the version-skew failure the inbound schema was
    made tolerant for.
  */
  it("keeps a bus on a route this build does not know, without its label", async () => {
    seedRtdb(`${REMOTE_PATHS.BUS_LOCATIONS}/999/driver-9`, {
      lat: 21.25,
      lng: 81.62,
      updatedAt: NOW,
    });

    const onBuses = vi.fn();
    subscribeToBuses(onBuses);

    await vi.waitFor(() =>
      expect(onBuses).toHaveBeenCalledWith([
        expect.objectContaining({ busId: expect.any(String), routeId: undefined }),
      ])
    );
  });

  /*
    The saving, stated as behaviour. A viewer scoped to one route is
    subscribed to that route's shard, so another route's buses are not
    filtered out after arriving - they never arrive, and their bytes are
    never spent.
  */
  it("never receives a bus from a route it is not watching", async () => {
    seedRtdb(`${REMOTE_PATHS.BUS_LOCATIONS}/999/driver-9`, {
      lat: 21.25,
      lng: 81.62,
      updatedAt: NOW,
    });

    const onBuses = vi.fn();
    subscribeToBuses(onBuses, undefined, { routeId: "101" });

    await vi.waitFor(() => expect(onBuses).toHaveBeenCalledWith([]));
  });

  it("receives the buses on the route it is watching", async () => {
    seedRtdb(`${REMOTE_PATHS.BUS_LOCATIONS}/101/bus-a`, {
      lat: 21.25,
      lng: 81.62,
      updatedAt: NOW,
    });
    seedRtdb(`${REMOTE_PATHS.BUS_LOCATIONS}/205/bus-b`, {
      lat: 21.26,
      lng: 81.64,
      updatedAt: NOW,
    });

    const onBuses = vi.fn();
    subscribeToBuses(onBuses, undefined, { routeId: "101" });

    await vi.waitFor(() =>
      expect(onBuses).toHaveBeenCalledWith([
        expect.objectContaining({ busId: "bus-a", routeId: "101" }),
      ])
    );
  });

  it("labels a vehicle that never published one", async () => {
    seedRtdb(`${REMOTE_PATHS.BUS_LOCATIONS}/${ROUTE}/driver-9`, {
      lat: 21.25,
      lng: 81.62,
      updatedAt: NOW,
    });

    const onBuses = vi.fn();
    subscribeToBuses(onBuses);

    await vi.waitFor(() =>
      expect(onBuses).toHaveBeenCalledWith([
        expect.objectContaining({ busId: "driver-9" }),
      ])
    );
  });

  it("drops a hostile entry without losing the rest of the fleet", async () => {
    seedRtdb(`${REMOTE_PATHS.BUS_LOCATIONS}/${ROUTE}/good`, {
      lat: 21.25,
      lng: 81.62,
      updatedAt: NOW,
          });
    seedRtdb(`${REMOTE_PATHS.BUS_LOCATIONS}/${ROUTE}/bad`, {
      lat: "not a latitude",
      lng: 81.62,
    });

    const onBuses = vi.fn();
    subscribeToBuses(onBuses);

    await vi.waitFor(() =>
      expect(onBuses).toHaveBeenCalledWith([
        expect.objectContaining({ busId: "good" }),
      ])
    );
  });

  it("reports an empty fleet when nothing is running", async () => {
    const onBuses = vi.fn();
    subscribeToBuses(onBuses);

    await vi.waitFor(() => expect(onBuses).toHaveBeenCalledWith([]));
  });

  it("delivers a position that arrives after the subscription", async () => {
    const onBuses = vi.fn();
    subscribeToBuses(onBuses);

    await vi.waitFor(() => expect(onBuses).toHaveBeenCalledWith([]));

    seedRtdb(`${REMOTE_PATHS.BUS_LOCATIONS}/${ROUTE}/driver-9`, {
      lat: 21.25,
      lng: 81.62,
      updatedAt: NOW,
          });

    await vi.waitFor(() =>
      expect(onBuses).toHaveBeenLastCalledWith([
        expect.objectContaining({ busId: "driver-9" }),
      ])
    );
  });

  it("detaches the listener when the caller unsubscribes", async () => {
    const unsubscribe = subscribeToBuses(vi.fn());

    await vi.waitFor(() =>
      expect(rtdbListenerCount(REMOTE_PATHS.BUS_LOCATIONS)).toBe(1)
    );

    unsubscribe();

    expect(rtdbListenerCount(REMOTE_PATHS.BUS_LOCATIONS)).toBe(0);
  });

  it("reports a refused subscription rather than showing a stale fleet", async () => {
    const refused = vi.spyOn(console, "error").mockImplementation(() => undefined);

    failNextRtdbSubscription();

    const onBuses = vi.fn();
    const onError = vi.fn();

    subscribeToBuses(onBuses, onError);

    await vi.waitFor(() => expect(onError).toHaveBeenCalled());
    expect(onBuses).toHaveBeenCalledWith([]);

    refused.mockRestore();
  });
});

/**
 * The gate, from the subscription's side.
 *
 * `busLocations` is world-readable, and until the rules are deployed it is
 * writable by any signed-in account. Anything the UI can be driven with from
 * that node has to be stopped here, before a component ever sees it.
 */
describe("what a hostile record cannot do", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
    enableRtdb();
  });

  const received = async (records: Record<string, unknown>) => {
    const onBuses = vi.fn();

    subscribeToBuses(onBuses);
    await Promise.resolve();
    await Promise.resolve();

    /*
      Seeded inside a route shard, because that is where positions live now.
      Writing them at the fleet root would make each vehicle id look like a
      route, and the subscription would correctly find no buses at all.
    */
    seedRtdb(`${REMOTE_PATHS.BUS_LOCATIONS}/${ROUTE}`, records);

    await vi.waitFor(() => expect(onBuses).toHaveBeenCalled());

    return onBuses.mock.calls[onBuses.mock.calls.length - 1]![0] as LiveBus[];
  };

  it("does not reach the map with a timestamp from the future", async () => {
    const buses = await received({
      "uid-good": { lat: 21.1, lng: 81.8, updatedAt: Date.now() },
      "uid-bad": {
        busId: "BUS-FUTURE",
        lat: 21.1,
        lng: 81.8,
        updatedAt: Date.now() + 10 * 60 * 1000,
      },
    });

    expect(buses.map((bus) => bus.busId)).toEqual(["uid-good"]);
  });

  it("does not reach the map from the null island sentinel", async () => {
    const buses = await received({
      "uid-bad": { busId: "BUS-ZERO", lat: 0, lng: 0, updatedAt: Date.now() },
    });

    expect(buses).toEqual([]);
  });
});

/*
  Whose clock decides how fresh a bus looks.

  Everything downstream classifies a vehicle by comparing `updatedAt` against
  now, so this is not a detail of transport - it is the input to every LIVE,
  STALE and OFFLINE decision the product makes. Two devices are involved and
  neither is trustworthy: the driver's phone, which writes the timestamp, and
  the passenger's, which reads it.
*/
describe("the clock a position is judged by", () => {
  const node = `${REMOTE_PATHS.BUS_LOCATIONS}/${ROUTE}/${VEHICLE}`;

  beforeEach(() => {
    enableRtdb();
    resetServerTimeOffset();
  });

  /*
    The driver's clock is removed from the trust model entirely. A phone
    running fast would otherwise report itself permanently current and hold a
    marker on a public map at a place nobody is, with nothing on the reading
    side able to tell.
  */
  it("asks the database to stamp the time rather than sending our own", async () => {
    await publishLocation(driver, { latitude: 21.25, longitude: 81.62 }, VEHICLE, ROUTE);

    /*
      Asserted on the sentinel, not on the resolved value. The database turns
      the request into an ordinary number, so a stored timestamp looks
      identical whether the client chose it or the server did - and that
      difference is the whole point.
    */
    expect(wasServerStamped(node)).toBe(true);
  });

  it("still stores a plain number, as every reader expects", async () => {
    await publishLocation(driver, { latitude: 21.25, longitude: 81.62 }, VEHICLE, ROUTE);

    expect(typeof (readRtdb(node) as { updatedAt: unknown }).updatedAt).toBe(
      "number"
    );
  });

  it("falls back to this device's clock until the offset is known", () => {
    expect(serverNow()).toBeCloseTo(Date.now(), -2);
  });

  /*
    And the passenger's clock is corrected rather than trusted. A phone ten
    minutes fast would show every bus as stale; one running slow would show a
    stale bus as live.
  */
  it("applies the offset the database reports", async () => {
    seedRtdb(".info/serverTimeOffset", 600_000);

    const stop = subscribeToBuses(() => {});

    // The listener attaches only once the SDK import resolves.
    await vi.waitFor(() =>
      expect(serverNow() - Date.now()).toBeGreaterThan(500_000)
    );

    stop();
  });

  it("ignores an offset the database could not give", async () => {
    seedRtdb(".info/serverTimeOffset", "not a number");

    const stop = subscribeToBuses(() => {});
    await vi.waitFor(() => expect(readRtdb(".info/serverTimeOffset")).toBeDefined());

    expect(serverNow()).toBeCloseTo(Date.now(), -2);
    stop();
  });
});

/*
  What the server records when nobody is watching.

  Rules fire on writes, so a device that simply goes quiet produces nothing for
  anything to notice. A dropped socket is the exception the free tier does
  handle: the database runs a write registered in advance. That is the only
  reason an operator opening the dashboard hours later can tell "stopped
  reporting at 14:32" from "never started".
*/
describe("recording that a vehicle went quiet", () => {
  const position = `${REMOTE_PATHS.BUS_LOCATIONS}/${ROUTE}/${VEHICLE}`;
  const status = `${REMOTE_PATHS.VEHICLE_STATUS}/${VEHICLE}`;

  beforeEach(() => {
    enableRtdb();
  });

  it("asks the server to record the sighting if the connection drops", async () => {
    await publishLocation(driver, { latitude: 21.25, longitude: 81.62 }, VEHICLE, ROUTE);

    expect(disconnectWrite(status)).toBeDefined();
  });

  it("still clears the position, so no ghost is left on the map", async () => {
    await publishLocation(driver, { latitude: 21.25, longitude: 81.62 }, VEHICLE, ROUTE);

    expect(hasDisconnectCleanup(position)).toBe(true);
  });

  /*
    The behaviour, run rather than inspected: what the database would actually
    do to these nodes if the driver's phone lost signal mid-shift.
  */
  it("leaves a time behind after the connection is lost", async () => {
    await publishLocation(driver, { latitude: 21.25, longitude: 81.62 }, VEHICLE, ROUTE);

    dropRtdbConnection();

    expect(readRtdb(position)).toBeUndefined();
    expect(readRtdb(status)).toMatchObject({
      lastSeenAt: expect.any(Number) as unknown as number,
    });
  });

  it("records the sighting when a driver stops deliberately", async () => {
    await publishLocation(driver, { latitude: 21.25, longitude: 81.62 }, VEHICLE, ROUTE);
    await stopPublishing(driver, VEHICLE, ROUTE);

    expect(readRtdb(position)).toBeUndefined();
    expect(readRtdb(status)).toMatchObject({
      lastSeenAt: expect.any(Number) as unknown as number,
    });
  });

  /*
    Not written on every publish, deliberately. A reporting bus already
    carries its own timestamp; a second write would say the same thing and
    double the write rate the whole fleet is sized against.
  */
  it("does not write a second record while the bus is reporting", async () => {
    await publishLocation(driver, { latitude: 21.25, longitude: 81.62 }, VEHICLE, ROUTE);

    expect(readRtdb(status)).toBeUndefined();
  });
});
