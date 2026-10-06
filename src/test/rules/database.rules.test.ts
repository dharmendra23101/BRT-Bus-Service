/**
 * The Realtime Database rules, enforced by Firebase rather than read by us.
 *
 * `src/test/security/rules-contract.test.ts` proves the rules JSON agrees with
 * the domain. It cannot prove the evaluator agrees with either, and the two
 * are genuinely different claims: a `.validate` in the wrong node, a cascade
 * that grants where we thought it denied, or a `matches()` anchored wrongly
 * all read as correct and behave differently under the engine.
 *
 * This is the only place the `driverAllowlist` gate is actually exercised.
 * Nothing else can: no client may read that node, the repo's Firebase mock
 * enforces no rules at all, and the rules are not deployed yet.
 *
 * Run with `npm run test:rules`, which starts the emulator around it.
 */

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { get, ref, remove, serverTimestamp, set } from "firebase/database";
import { ROUTE_IDS } from "@/domain/transit/routes";

const DRIVER = "driver-allowed";
const OUTSIDER = "driver-not-allowed";

/*
  Fixture ids, deliberately unlike anything real. The operator has supplied no
  fleet list, so a plausible registration here would be a fabricated claim
  about a bus that exists.
*/
const VEHICLE = "fixture-a";
const OTHER_VEHICLE = "fixture-b";

const OPERATOR = "operator-1";

const HOUR = 60 * 60 * 1000;

let env: RulesTestEnvironment;

/** A telemetry payload the rules should accept, before any field is broken. */
const validPosition = (over: Record<string, unknown> = {}) => ({
  lat: 21.25,
  lng: 81.63,
  updatedAt: Date.now(),
  ...over,
});

/*
  Positions are sharded by route, so the route is part of the path. A bus
  filed under the wrong shard would appear on a route it is not running,
  which is why the write gate has to hold per shard rather than per node.
*/
const ROUTE = "101";

const positionRef = (db: unknown, vehicleId: string, routeId = ROUTE) =>
  ref(
    db as Parameters<typeof ref>[0],
    `busLocationsByRoute/${routeId}/${vehicleId}`
  );

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-brt",
    database: {
      rules: readFileSync("database.rules.json", "utf8"),
      host: "127.0.0.1",
      port: 9000,
    },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearDatabase();

  /*
    Seeded with the rules bypassed, which is the only way it can be: the
    allowlist is unwritable by every client BY DESIGN, because it is a list of
    driver UIDs and publishing it would recreate the personal-data exposure
    that stripping names off the public map was meant to end. In production
    this node is populated from the Firebase console or the Admin SDK.

    That makes this a FIXTURE, not a development driver and not a production
    one. No real UID appears anywhere in this file.
  */
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.database();

    await set(ref(db, `driverAllowlist/${DRIVER}`), true);

    /*
      The second half of the grant. Being on the allowlist says this account
      may publish; the assignment says which bus it may publish AS, and for
      how long. Both are written by the operator, never by a client.
    */
    await set(ref(db, `assignments/${DRIVER}`), {
      vehicleId: VEHICLE,
      validFrom: Date.now() - HOUR,
      validTo: Date.now() + 7 * HOUR,
    });
  });
});

/** Replaces the seeded assignment, bypassing rules as the operator would. */
const assign = (driverUid: string, fields: Record<string, unknown>) =>
  env.withSecurityRulesDisabled(async (context) => {
    await set(ref(context.database(), `assignments/${driverUid}`), fields);
  });

describe("who may publish a bus position", () => {
  it("lets an allowlisted driver write their own position", async () => {
    const db = env.authenticatedContext(DRIVER).database();

    await assertSucceeds(set(positionRef(db, VEHICLE), validPosition()));
  });

  /*
    The gate the whole design rests on. Being signed in is not enough, and
    holding the Firestore `driver` role is not enough either - Realtime
    Database rules cannot read Firestore, which is exactly why the allowlist
    exists as a separate grant.
  */
  it("refuses a signed-in driver who is not on the allowlist", async () => {
    const db = env.authenticatedContext(OUTSIDER).database();

    await assertFails(set(positionRef(db, OTHER_VEHICLE), validPosition()));
  });

  it("refuses an unauthenticated write", async () => {
    const db = env.unauthenticatedContext().database();

    await assertFails(set(positionRef(db, VEHICLE), validPosition()));
  });

  /*
    Being allowed to publish is not being allowed to publish as anything. The
    allowlist alone could never express this: it says the account may write,
    and says nothing about which bus it is driving.
  */
  it("refuses an allowlisted driver publishing as a bus they were not given", async () => {
    const db = env.authenticatedContext(DRIVER).database();

    await assertFails(set(positionRef(db, OTHER_VEHICLE), validPosition()));
  });

  it("lets a driver clear their own position when service ends", async () => {
    const db = env.authenticatedContext(DRIVER).database();

    await assertSucceeds(set(positionRef(db, VEHICLE), validPosition()));
    await assertSucceeds(remove(positionRef(db, VEHICLE)));
  });

  /*
    Revocation has to bite immediately - removing the allowlist entry is the
    operator's only lever if a device or account is compromised.
  */
  it("stops a driver the moment they are removed from the allowlist", async () => {
    const db = env.authenticatedContext(DRIVER).database();

    await assertSucceeds(set(positionRef(db, VEHICLE), validPosition()));

    await env.withSecurityRulesDisabled(async (context) => {
      await remove(ref(context.database(), `driverAllowlist/${DRIVER}`));
    });

    await assertFails(set(positionRef(db, VEHICLE), validPosition()));
  });

  it("publishes nothing at all while the allowlist is empty", async () => {
    await env.clearDatabase();

    const db = env.authenticatedContext(DRIVER).database();

    await assertFails(set(positionRef(db, VEHICLE), validPosition()));
  });
});

/*
  The assignment, which is the half of the grant the allowlist cannot express.

  The allowlist answers "may this account publish at all?". It cannot answer
  "as which bus, and until when?" - so without this, any allowlisted driver
  could publish as any vehicle, indefinitely.

  The window is the authorisation, and it expires by itself. There is no
  revocation step for an operator to forget: an assignment nobody renews stops
  working, which turns a lost or stolen device from an open-ended problem into
  a bounded one.
*/
describe("which bus a driver may publish as", () => {
  const publish = (vehicleId: string) =>
    set(
      positionRef(env.authenticatedContext(DRIVER).database(), vehicleId),
      validPosition()
    );

  it("allows the vehicle they were assigned", async () => {
    await assertSucceeds(publish(VEHICLE));
  });

  it("refuses a driver with no assignment at all", async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await remove(ref(context.database(), `assignments/${DRIVER}`));
    });

    await assertFails(publish(VEHICLE));
  });

  it("refuses a shift that has not started yet", async () => {
    await assign(DRIVER, {
      vehicleId: VEHICLE,
      validFrom: Date.now() + HOUR,
      validTo: Date.now() + 8 * HOUR,
    });

    await assertFails(publish(VEHICLE));
  });

  /*
    The property the whole design rests on: nobody has to remember to switch
    this off.
  */
  it("refuses a shift that has ended", async () => {
    await assign(DRIVER, {
      vehicleId: VEHICLE,
      validFrom: Date.now() - 9 * HOUR,
      validTo: Date.now() - HOUR,
    });

    await assertFails(publish(VEHICLE));
  });

  /*
    Enforced where it is actually reachable. Assignments are written by the
    Admin SDK, which bypasses rules entirely, so a `.validate` on that node
    would be unreachable decoration. Checking the span at the point of USE
    means a mis-issued year-long assignment still cannot publish.
  */
  it("refuses an assignment issued for longer than a day", async () => {
    await assign(DRIVER, {
      vehicleId: VEHICLE,
      validFrom: Date.now() - HOUR,
      validTo: Date.now() + 48 * HOUR,
    });

    await assertFails(publish(VEHICLE));
  });

  it("allows one issued for exactly a day", async () => {
    const from = Date.now() - HOUR;

    await assign(DRIVER, {
      vehicleId: VEHICLE,
      validFrom: from,
      validTo: from + 24 * HOUR,
    });

    await assertSucceeds(publish(VEHICLE));
  });

  it("still refuses a driver who is assigned but not allowlisted", async () => {
    await assign(OUTSIDER, {
      vehicleId: OTHER_VEHICLE,
      validFrom: Date.now() - HOUR,
      validTo: Date.now() + 7 * HOUR,
    });

    const db = env.authenticatedContext(OUTSIDER).database();

    await assertFails(set(positionRef(db, OTHER_VEHICLE), validPosition()));
  });
});

/*
  When a vehicle was last heard from.

  Rules fire on writes, so a device that goes quiet produces nothing for
  anything to notice - unattended absence detection is the one thing here that
  genuinely needs a server. A dropped SOCKET is different: the database itself
  notices that and runs a write registered in advance. This node is what that
  write lands in, which is why an operator can tell "stopped at 14:32" from
  "never started" hours later with nobody having watched it happen.

  Public to read, because it is a fact about a bus. Written under exactly the
  same gate as a position, because a false "last seen" is a lie about the same
  vehicle.
*/
describe("recording when a vehicle went quiet", () => {
  const statusRef = (db: unknown, vehicleId: string) =>
    ref(db as Parameters<typeof ref>[0], `vehicleStatus/${vehicleId}`);

  it("lets the assigned driver record it", async () => {
    const db = env.authenticatedContext(DRIVER).database();

    await assertSucceeds(
      set(statusRef(db, VEHICLE), { lastSeenAt: serverTimestamp() })
    );
  });

  it("is readable by anyone, including a signed-out visitor", async () => {
    const db = env.unauthenticatedContext().database();

    await assertSucceeds(get(statusRef(db, VEHICLE)));
  });

  /*
    The same gate as a position. Without it, any allowlisted driver could
    backdate another bus into looking recently seen - or freshly seen when it
    has been silent for hours, which is worse than no record at all.
  */
  it("refuses a driver recording it for a bus they were not given", async () => {
    const db = env.authenticatedContext(DRIVER).database();

    await assertFails(
      set(statusRef(db, OTHER_VEHICLE), { lastSeenAt: serverTimestamp() })
    );
  });

  it("refuses an unauthenticated write", async () => {
    const db = env.unauthenticatedContext().database();

    await assertFails(
      set(statusRef(db, VEHICLE), { lastSeenAt: serverTimestamp() })
    );
  });

  it("refuses a driver whose shift has ended", async () => {
    await assign(DRIVER, {
      vehicleId: VEHICLE,
      validFrom: Date.now() - 9 * HOUR,
      validTo: Date.now() - HOUR,
    });

    const db = env.authenticatedContext(DRIVER).database();

    await assertFails(
      set(statusRef(db, VEHICLE), { lastSeenAt: serverTimestamp() })
    );
  });

  it("refuses a time the driver chose rather than the server", async () => {
    const db = env.authenticatedContext(DRIVER).database();

    await assertFails(
      set(statusRef(db, VEHICLE), { lastSeenAt: Date.now() - 60 * 60 * 1000 })
    );
  });

  it("refuses any field the contract does not define", async () => {
    const db = env.authenticatedContext(DRIVER).database();

    await assertFails(
      set(statusRef(db, VEHICLE), {
        lastSeenAt: serverTimestamp(),
        driverName: "Asha Verma",
      })
    );
  });
});

describe("who may see an assignment", () => {
  it("lets a driver read their own", async () => {
    const db = env.authenticatedContext(DRIVER).database();

    await assertSucceeds(get(ref(db, `assignments/${DRIVER}`)));
  });

  /*
    A driver reading the roster would learn who else is on shift and in which
    bus. That is staff scheduling, and it is not theirs to see.
  */
  it("refuses a driver reading somebody else's", async () => {
    const db = env.authenticatedContext(DRIVER).database();

    await assertFails(get(ref(db, `assignments/${OUTSIDER}`)));
  });

  it("refuses a driver listing the whole roster", async () => {
    const db = env.authenticatedContext(DRIVER).database();

    await assertFails(get(ref(db, "assignments")));
  });

  /*
    The operator's own view has to answer "who is in which bus?", and RTDB
    rules cannot read a Firestore role to decide who that is - the same
    limitation that makes `driverAllowlist` a separate node. So operators get
    their own allowlist, written the same way and by the same hand.
  */
  it("lets an allowlisted operator read the roster", async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await set(ref(context.database(), `operatorAllowlist/${OPERATOR}`), true);
    });

    const db = env.authenticatedContext(OPERATOR).database();

    await assertSucceeds(get(ref(db, "assignments")));
  });

  it("refuses an operator who is not on that allowlist", async () => {
    const db = env.authenticatedContext(OPERATOR).database();

    await assertFails(get(ref(db, "assignments")));
  });

  it("keeps the operator allowlist itself closed", async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await set(ref(context.database(), `operatorAllowlist/${OPERATOR}`), true);
    });

    const db = env.authenticatedContext(OPERATOR).database();

    await assertFails(get(ref(db, "operatorAllowlist")));
    await assertFails(set(ref(db, `operatorAllowlist/${DRIVER}`), true));
  });

  it("refuses a signed-out visitor entirely", async () => {
    const db = env.unauthenticatedContext().database();

    await assertFails(get(ref(db, `assignments/${DRIVER}`)));
  });

  /* Assignments are the operator's to issue, never a client's to claim. */
  it("refuses a driver assigning themselves a bus", async () => {
    const db = env.authenticatedContext(DRIVER).database();

    await assertFails(
      set(ref(db, `assignments/${DRIVER}`), {
        vehicleId: OTHER_VEHICLE,
        validFrom: Date.now(),
        validTo: Date.now() + HOUR,
      })
    );
  });
});

describe("the routes a position may claim", () => {
  /*
    Derived from ROUTE_IDS, so opening a route without widening the rules
    fails here. The failure mode is severe and silent: a rejected field
    rejects the ENTIRE write, so the bus does not appear mislabelled, it does
    not appear at all - while the driver's app reports it is sharing.
  */
  it.each([...ROUTE_IDS])("accepts published route %s", async (routeId) => {
    const db = env.authenticatedContext(DRIVER).database();

    await assertSucceeds(
      set(positionRef(db, VEHICLE, routeId), validPosition())
    );
  });

  it.each(["999", "10", "1011", "abc", "", "101x"])(
    "refuses unpublished route %s",
    async (routeId) => {
      const db = env.authenticatedContext(DRIVER).database();

      await assertFails(
        set(positionRef(db, VEHICLE, routeId), validPosition())
      );
    }
  );
});

/*
  The load-bearing change of the ingest design (ARCHITECTURE-2.0 SS11.6).

  Until now `updatedAt` was whatever the publishing device said it was, and
  every freshness decision in the product rested on it. A device with a wrong
  clock - or a hostile one - could pin itself permanently fresh, and no amount
  of care on the reading side could detect that.

  The rules now require the claimed time to sit inside a narrow window around
  the SERVER's clock, which `ServerValue.TIMESTAMP` satisfies by construction
  and a guessed value does not. That removes the device clock from the trust
  model, and it is what makes the throttle below possible at all: a rate limit
  measured in times the client controls is not a rate limit.
*/
describe("whose clock decides when a position was taken", () => {
  const publish = (payload: Record<string, unknown>) => {
    const db = env.authenticatedContext(DRIVER).database();

    return set(positionRef(db, VEHICLE), payload);
  };

  it("accepts a server-stamped time", async () => {
    await assertSucceeds(
      publish(validPosition({ updatedAt: serverTimestamp() }))
    );
  });

  it("accepts a client clock that agrees with the server", async () => {
    await assertSucceeds(publish(validPosition({ updatedAt: Date.now() })));
  });

  /*
    The permanently-fresh attack. `locationService` judges staleness by
    comparing `updatedAt` to now, so a timestamp in the future never ages -
    the bus would sit on the public map indefinitely, at a position nobody is
    at any more.
  */
  it("refuses a clock running ahead of the server", async () => {
    await assertFails(publish(validPosition({ updatedAt: Date.now() + 30_000 })));
  });

  it("refuses a clock running behind the server", async () => {
    await assertFails(publish(validPosition({ updatedAt: Date.now() - 30_000 })));
  });

  it("refuses a position back-dated to look older than it is", async () => {
    await assertFails(publish(validPosition({ updatedAt: 1 })));
  });
});

/*
  A server-enforced throttle, which the free tier provides nowhere else.

  Drivers publish every 15 s, so a 5 s floor never touches ordinary jitter.
  What it stops is a device - or a harvested token replayed against the REST
  API - writing thousands of times a second into a world-readable node, which
  is the one abuse no client-side check can prevent and the one that would
  actually cost money.
*/
describe("how often a bus may report", () => {
  const publish = () => {
    const db = env.authenticatedContext(DRIVER).database();

    return set(
      positionRef(db, VEHICLE),
      validPosition({ updatedAt: serverTimestamp() })
    );
  };

  it("refuses a second position immediately after the first", async () => {
    await assertSucceeds(publish());
    await assertFails(publish());
  });

  it("allows the next one once the floor has passed", async () => {
    await assertSucceeds(publish());

    await new Promise((resolve) => setTimeout(resolve, 5_200));

    await assertSucceeds(publish());
  }, 20_000);

  /*
    Stopping a shift must never be throttled. A driver who finishes and
    cannot clear their position leaves a phantom bus on the public map, which
    is worse than any write they could have made.
  */
  it("never throttles clearing a position", async () => {
    const db = env.authenticatedContext(DRIVER).database();

    await assertSucceeds(publish());
    await assertSucceeds(remove(positionRef(db, VEHICLE)));
  });

  it("lets a driver start again straight after stopping", async () => {
    const db = env.authenticatedContext(DRIVER).database();

    await assertSucceeds(publish());
    await assertSucceeds(remove(positionRef(db, VEHICLE)));
    await assertSucceeds(publish());
  });
});

/*
  The shard a bus is filed under.

  Sharding is what makes a route-scoped subscription cheaper than a filtered
  one - the other routes' buses are never sent. That only holds if a bus
  cannot file itself under a route it is not running, so the write gate has to
  be enforced per shard rather than once per vehicle.
*/
describe("which route shard a bus may write into", () => {
  it("accepts the driver's own vehicle in a published route", async () => {
    const db = env.authenticatedContext(DRIVER).database();

    await assertSucceeds(set(positionRef(db, VEHICLE, "205"), validPosition()));
  });

  it("still refuses a vehicle the driver was not assigned, in any shard", async () => {
    const db = env.authenticatedContext(DRIVER).database();

    await assertFails(
      set(positionRef(db, OTHER_VEHICLE, "205"), validPosition())
    );
  });

  it("refuses a shard that is not a published route", async () => {
    const db = env.authenticatedContext(DRIVER).database();

    await assertFails(set(positionRef(db, VEHICLE, "999"), validPosition()));
  });

  /*
    The whole fleet in one read is still one listener, so a map showing every
    bus costs no more connections than before - only a route-scoped viewer
    gets the saving, and nobody pays for it.
  */
  it("lets anyone read the whole sharded tree", async () => {
    const db = env.unauthenticatedContext().database();

    await assertSucceeds(get(ref(db, "busLocationsByRoute")));
  });

  it("lets anyone read a single route's shard", async () => {
    const db = env.unauthenticatedContext().database();

    await assertSucceeds(get(ref(db, `busLocationsByRoute/${ROUTE}`)));
  });
});

describe("what a position must look like", () => {
  const rejects = async (over: Record<string, unknown>) => {
    const db = env.authenticatedContext(DRIVER).database();

    await assertFails(set(positionRef(db, VEHICLE), validPosition(over)));
  };

  it("refuses a position with no latitude", async () => {
    const db = env.authenticatedContext(DRIVER).database();
    const { lat: _lat, ...withoutLat } = validPosition();

    await assertFails(set(positionRef(db, VEHICLE), withoutLat));
  });

  it("refuses a latitude off the planet", () => rejects({ lat: 91 }));
  it("refuses a longitude off the planet", () => rejects({ lng: -181 }));
  it("refuses a latitude that is not a number", () => rejects({ lat: "21.25" }));

  /*
    A device with a wrong clock could otherwise pin itself permanently fresh:
    the staleness rule in `locationService` compares `updatedAt` to now, so a
    timestamp far in the future would read as a bus that never goes stale.
  */
  it("refuses a timestamp far in the future", () =>
    rejects({ updatedAt: Date.now() + 600_000 }));

  it("refuses a bus id longer than the contract allows", () =>
    rejects({ busId: "B".repeat(17) }));

  /*
    `$other: false` is what keeps the payload from growing into a channel for
    anything else - a driver name, a phone number, a passenger count nobody
    verified.
  */
  it("refuses a field the contract does not define", () =>
    rejects({ passengerCount: 30 }));

  it("refuses a driver's name smuggled into the payload", () =>
    rejects({ driverName: "Someone Real" }));
});

describe("who may read what", () => {
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (context) => {
      await set(
        ref(context.database(), `busLocations/${DRIVER}`),
        validPosition()
      );
    });
  });

  /*
    Public by design: the map has to work for a passenger who has not signed
    in, and the payload carries no personal data precisely so it can be.
  */
  it("lets a signed-out passenger read bus positions", async () => {
    const db = env.unauthenticatedContext().database();

    await assertSucceeds(get(ref(db, "busLocationsByRoute")));
  });

  it("keeps the driver allowlist unreadable, even to a driver on it", async () => {
    const db = env.authenticatedContext(DRIVER).database();

    await assertFails(get(ref(db, "driverAllowlist")));
  });

  it("keeps a single allowlist entry unreadable too", async () => {
    const db = env.authenticatedContext(DRIVER).database();

    await assertFails(get(ref(db, `driverAllowlist/${DRIVER}`)));
  });

  it("refuses to let anyone add themselves to the allowlist", async () => {
    const db = env.authenticatedContext(OUTSIDER).database();

    await assertFails(set(ref(db, `driverAllowlist/${OUTSIDER}`), true));
  });

  it("refuses to let anyone replace the whole allowlist", async () => {
    const db = env.authenticatedContext(DRIVER).database();

    await assertFails(set(ref(db, "driverAllowlist"), { [OUTSIDER]: true }));
  });

  /* Deny by default: anything not named in the rules is closed. */
  it("refuses reads and writes outside the two declared nodes", async () => {
    const db = env.authenticatedContext(DRIVER).database();

    await assertFails(get(ref(db, "anythingElse")));
    await assertFails(set(ref(db, "anythingElse/x"), true));
  });
});

describe("the rules file these tests ran against", () => {
  /*
    Guards the harness itself. If the emulator were ever handed different
    rules than the repo's - a stale copy, a wrong path - every assertion above
    would still pass or fail for reasons unrelated to what ships.
  */
  it("is the one the application deploys", () => {
    const rules = readFileSync("database.rules.json", "utf8");

    expect(rules).toContain("driverAllowlist");
    expect(JSON.parse(rules)).toHaveProperty("rules.busLocationsByRoute");
  });
});
