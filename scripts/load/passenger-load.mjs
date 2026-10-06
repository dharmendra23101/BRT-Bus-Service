/**
 * Passenger fanout load harness.
 *
 * The fleet harness measures writes. This measures the thing that actually
 * costs money: what the database sends OUT when one bus moves and many
 * passengers are watching.
 *
 * WHY THIS IS THE NUMBER THAT MATTERS. Ingest is small - 250 vehicles at a
 * 15 s cadence is under 17 writes/s. Egress is the metered resource on the
 * free tier (10 GB/month) and simultaneous connections are the hard ceiling
 * (100 on Spark). Every additional passenger multiplies one write into
 * another delivery, so the cost curve is driven by the readers, not the
 * buses. A capacity claim based on write rate alone would be measuring the
 * cheap half.
 *
 * Listeners are opened as server-sent event streams over REST, which is what
 * the SDK's `onValue` is underneath, and lets this run without a browser.
 *
 * WHAT IT IS NOT. The emulator does not enforce the connection ceiling, does
 * not meter bandwidth, and has no network between the parties. What this
 * measures honestly is the SHAPE of the fanout - how many bytes leave per
 * write per listener, and whether the payload is what we think it is. The
 * ceiling itself remains arithmetic, and belongs in COST-AND-SCALE-PLAN.
 *
 * Usage (emulator must be running):
 *   node scripts/load/passenger-load.mjs --listeners 50 --vehicles 20
 *
 * Or:
 *   LOAD_LISTENERS=50 npm run load:passengers
 */

import { readFileSync } from "node:fs";

const HOST = process.env.FIREBASE_DATABASE_EMULATOR_HOST ?? "127.0.0.1:9000";
const PROJECT = process.env.GCLOUD_PROJECT ?? "demo-brt";
const BASE = `http://${HOST}`;
const ADMIN = "owner";

const arg = (name, envName, fallback) => {
  const at = process.argv.indexOf(`--${name}`);

  if (at !== -1) return Number(process.argv[at + 1]);
  if (process.env[envName]) return Number(process.env[envName]);

  return fallback;
};

/**
 * The publish cadence the application actually runs at.
 *
 * Read out of the source rather than restated here. The projection below is
 * entirely a function of this number, and a copy of it silently reported the
 * old cadence's cost for one commit after the app moved to a new one - the
 * label said 15 s while the app published every 30.
 */
const CADENCE_MS = (() => {
  const source = readFileSync("src/constants/config.ts", "utf8");
  const found = /DRIVER_LOCATION_MS:\s*([\d_]+)/.exec(source);

  if (!found) {
    throw new Error(
      "Could not read DRIVER_LOCATION_MS from src/constants/config.ts - the " +
        "projection would be a guess, so it is not going to be printed."
    );
  }

  return Number(found[1].replace(/_/g, ""));
})();

/*
  How many route shards the simulated fleet is spread across.

  This is what sharding is FOR: a listener watching one route receives one
  shard's traffic rather than the whole corridor's. With every vehicle in one
  shard the two modes cost the same, which is exactly what the first version
  of the route-sharded transport did before anything asked for a route.
*/
const SHARDS = arg("shards", "LOAD_SHARDS", 8);

/** Watch a single route instead of the whole fleet. */
const SCOPED = process.env.LOAD_SCOPED === "1";

const LISTENERS = arg("listeners", "LOAD_LISTENERS", 25);
const VEHICLES = arg("vehicles", "LOAD_VEHICLES", 20);
const ROUNDS = arg("rounds", "LOAD_ROUNDS", 3);

/* The published routes, so a shard key is never one the rules would refuse. */
const ROUTES = ["101", "102", "105", "201", "202", "203", "204", "205"];

const routeOf = (n) => ROUTES[n % Math.min(SHARDS, ROUTES.length)];

/** The shard a scoped listener watches. Vehicle 0 lives here. */
const WATCHED_ROUTE = ROUTES[0];

const vehicleId = (n) => `load-${String(n).padStart(4, "0")}`;
const driverUid = (n) => `load-driver-${String(n).padStart(4, "0")}`;

const base64url = (value) =>
  Buffer.from(JSON.stringify(value))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

/* An unsigned emulator token. See fleet-load.mjs for why this shape. */
const idToken = (uid) => {
  const issuedAt = Math.floor(Date.now() / 1000);

  return `${base64url({ alg: "none", typ: "JWT" })}.${base64url({
    iss: `https://securetoken.google.com/${PROJECT}`,
    aud: PROJECT,
    user_id: uid,
    sub: uid,
    iat: issuedAt,
    exp: issuedAt + 3600,
  })}.`;
};

const put = async (path, body, uid) => {
  const asAdmin = uid === undefined;

  const response = await fetch(
    `${BASE}/${path}.json?ns=${PROJECT}${asAdmin ? "" : `&auth=${idToken(uid)}`}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(asAdmin ? { Authorization: `Bearer ${ADMIN}` } : {}),
      },
      body: JSON.stringify(body),
    }
  );

  return response.ok;
};

const installRules = async () => {
  const response = await fetch(`${BASE}/.settings/rules.json?ns=${PROJECT}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ADMIN}`,
    },
    body: readFileSync("database.rules.json", "utf8"),
  });

  if (!response.ok) {
    throw new Error(
      `Could not install the security rules (${response.status}). Refusing ` +
        "to run: an open database would report a meaningless result."
    );
  }
};

const seed = async () => {
  const allowlist = {};
  const assignments = {};
  const now = Date.now();

  for (let n = 0; n < VEHICLES; n += 1) {
    allowlist[driverUid(n)] = true;
    assignments[driverUid(n)] = {
      vehicleId: vehicleId(n),
      validFrom: now - 60_000,
      validTo: now + 8 * 60 * 60 * 1000,
    };
  }

  await put("driverAllowlist", allowlist);
  await put("assignments", assignments);
};

/**
 * One passenger watching the whole fleet.
 *
 * This is the real subscription shape: the map opens exactly ONE listener on
 * `busLocations` rather than one per bus, which is why a passenger costs one
 * connection no matter how large the fleet gets.
 */
const openListener = async (stats) => {
  const controller = new AbortController();

  const path = SCOPED
    ? `busLocationsByRoute/${WATCHED_ROUTE}`
    : "busLocationsByRoute";

  const response = await fetch(
    `${BASE}/${path}.json?ns=${PROJECT}`,
    { headers: { Accept: "text/event-stream" }, signal: controller.signal }
  );

  if (!response.ok || !response.body) {
    throw new Error(`Listener refused: ${response.status}`);
  }

  const reader = response.body.getReader();

  void (async () => {
    try {
      for (;;) {
        const { done, value } = await reader.read();

        if (done) break;

        stats.bytes += value.byteLength;

        /* Each delivery is an SSE frame; count the data lines, not the keepalives. */
        const text = Buffer.from(value).toString("utf8");

        stats.events += (text.match(/^event: (put|patch)$/gm) ?? []).length;
      }
    } catch {
      /* Aborted at the end of the run. Not a failure. */
    }
  })();

  return () => controller.abort();
};

const main = async () => {
  console.log(
    `passenger fanout: ${LISTENERS} listeners, ${VEHICLES} vehicles across ` +
      `${Math.min(SHARDS, ROUTES.length)} route(s), ${ROUNDS} rounds`
  );
  console.log(
    SCOPED
      ? `mode: scoped to route ${WATCHED_ROUTE}`
      : "mode: whole fleet (set LOAD_SCOPED=1 to watch one route)"
  );
  console.log(`target: ${BASE} (ns=${PROJECT})\n`);

  await installRules();
  await seed();

  const stats = { bytes: 0, events: 0 };
  const closers = [];

  for (let n = 0; n < LISTENERS; n += 1) {
    closers.push(await openListener(stats));
  }

  /* Let the initial snapshots arrive before measuring the deltas. */
  await new Promise((resolve) => setTimeout(resolve, 500));

  const afterSnapshot = { bytes: stats.bytes, events: stats.events };

  let writes = 0;

  for (let round = 0; round < ROUNDS; round += 1) {
    for (let n = 0; n < VEHICLES; n += 1) {
      const ok = await put(
        `busLocationsByRoute/${routeOf(n)}/${vehicleId(n)}`,
        {
          lat: 21.25 + Math.random() * 0.01,
          lng: 81.63 + Math.random() * 0.01,
          updatedAt: { ".sv": "timestamp" },
        },
        driverUid(n)
      );

      if (ok) writes += 1;
    }

    /* Above the 5 s server-side floor, so the throttle is not what is measured. */
    await new Promise((resolve) => setTimeout(resolve, 5_500));
  }

  await new Promise((resolve) => setTimeout(resolve, 1_000));

  closers.forEach((close) => close());

  const deltaBytes = stats.bytes - afterSnapshot.bytes;
  const deltaEvents = stats.events - afterSnapshot.events;

  console.log(`initial snapshot : ${afterSnapshot.bytes} bytes to ${LISTENERS} listeners`);
  console.log(`writes accepted  : ${writes}`);
  console.log(`deliveries       : ${deltaEvents}`);
  console.log(`egress on updates: ${deltaBytes} bytes`);

  if (writes > 0) {
    console.log(
      `per write        : ${(deltaBytes / writes).toFixed(1)} bytes across ${LISTENERS} listeners`
    );
    console.log(
      `per write/listener: ${(deltaBytes / writes / LISTENERS).toFixed(1)} bytes`
    );
  }

  /*
    The projection this exists to support. Egress is the metered resource, and
    it scales with listeners x writes - so this is the number a capacity claim
    has to be built on, not the write rate.
  */
  if (writes > 0 && deltaBytes > 0) {
    const perWritePerListener = deltaBytes / writes / LISTENERS;
    const writesPerDay = (VEHICLES * 24 * 60 * 60) / (CADENCE_MS / 1000);
    const gbPerMonth = (perWritePerListener * writesPerDay * 30) / 1024 ** 3;

    console.log(`\nprojection at ${VEHICLES} vehicles on a ${CADENCE_MS / 1000} s cadence:`);
    console.log(
      `  held open all month : ${gbPerMonth.toFixed(2)} GB per listener` +
        `  (~${Math.floor(10 / gbPerMonth)} exhaust the 10 GB free tier)`
    );

    /*
      The line above is a worst case nobody produces. A passenger opens the map
      to see where their bus is and closes it; ten minutes a day is already
      generous. Reporting only the continuous figure would suggest the free
      tier collapses at about twenty users - wrong in the direction that kills
      a project on somebody else's spreadsheet.
    */
    const minutesPerDay = 10;
    const realisticGb = (gbPerMonth * minutesPerDay) / (24 * 60);

    console.log(
      `  used ${minutesPerDay} min a day  : ${realisticGb.toFixed(4)} GB per passenger` +
        `  (~${Math.floor(10 / realisticGb)} such passengers a month)`
    );
    console.log(
      `\nEgress scales with listeners x writes, so fleet size and cadence cost` +
        ` every viewer at once. That is the lever, not the connection count.`
    );
  }

  if (deltaEvents === 0) {
    console.error("\nNO DELIVERIES OBSERVED - the listeners received nothing.");
    process.exitCode = 1;
  }
};

await main();
