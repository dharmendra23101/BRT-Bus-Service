/**
 * Fleet telemetry load harness.
 *
 * Measures what the ingest path actually does under a fleet-sized write rate,
 * against the Realtime Database emulator. Free, local, and repeatable - no
 * paid project, no billing account, no cloud round trip.
 *
 * WHY REST RATHER THAN THE SDK. The architecture's device path is the REST
 * API on purpose: REST requests do not consume any of the Spark tier's 100
 * simultaneous connections, which is the limit a fleet would otherwise hit
 * long before bandwidth. Loading the SDK here would measure a transport the
 * devices are not going to use.
 *
 * WHAT THIS IS EVIDENCE OF, AND WHAT IT IS NOT. It is evidence about the
 * emulator on this machine: the rules evaluate, the throttle bites, the write
 * shape is accepted, and roughly what latency looks like with N vehicles
 * reporting. It is NOT a production capacity guarantee - the emulator is a
 * single local process with no network, no quota enforcement and no
 * multi-region replication. Treat the numbers as a floor for correctness and
 * a shape for cost modelling, never as a throughput promise.
 *
 * Usage (the emulator must already be running):
 *   node scripts/load/fleet-load.mjs --vehicles 100 --interval 15000 --duration 60
 *
 * Or, starting an emulator around it:
 *   LOAD_VEHICLES=250 npm run load:fleet
 */

import { readFileSync } from "node:fs";

const HOST = process.env.FIREBASE_DATABASE_EMULATOR_HOST ?? "127.0.0.1:9000";
const PROJECT = process.env.GCLOUD_PROJECT ?? "demo-brt";
const BASE = `http://${HOST}`;

/* The emulator accepts this as an admin credential. It is not a secret, it
   does not exist outside the emulator, and it works nowhere else. */
const ADMIN = "owner";

/*
  Environment first, then argv.

  `npm run load:fleet` wraps this in `firebase emulators:exec`, and anything
  after `--` is consumed by the Firebase CLI rather than reaching us - so the
  environment is the option that actually works through the npm script, and
  argv is there for running the file directly against a live emulator.
*/
const arg = (name, envName, fallback) => {
  const at = process.argv.indexOf(`--${name}`);

  if (at !== -1) return Number(process.argv[at + 1]);
  if (process.env[envName]) return Number(process.env[envName]);

  return fallback;
};

const VEHICLES = arg("vehicles", "LOAD_VEHICLES", 50);
const INTERVAL_MS = arg("interval", "LOAD_INTERVAL_MS", 15_000);
const DURATION_S = arg("duration", "LOAD_DURATION_S", 60);

/* Nava Raipur sits near here. Only the SHAPE of the number matters - these
   are not stop coordinates and nothing derives a claim from them. */
const ORIGIN = { lat: 21.25, lng: 81.63 };

const base64url = (value) =>
  Buffer.from(JSON.stringify(value))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

/**
 * An unsigned ID token for one simulated driver.
 *
 * The emulator accepts `alg: none` tokens and reads `user_id` out of them,
 * which is exactly how the rules see `auth.uid`. A bare `?auth=<uid>` is NOT
 * a credential - the emulator answers 401 - and discovering that was the
 * whole difference between measuring the rules and measuring nothing.
 *
 * This works only against an emulator. There is no signing key here because
 * there is nothing to sign with, and a real backend would reject it outright.
 */
const idToken = (uid) => {
  const issuedAt = Math.floor(Date.now() / 1000);

  const claims = {
    iss: `https://securetoken.google.com/${PROJECT}`,
    aud: PROJECT,
    auth_time: issuedAt,
    user_id: uid,
    sub: uid,
    iat: issuedAt,
    exp: issuedAt + 3600,
    firebase: { identities: {}, sign_in_provider: "custom" },
  };

  return `${base64url({ alg: "none", typ: "JWT" })}.${base64url(claims)}.`;
};

/*
  Two different credentials, and they are not interchangeable.

  The emulator treats ANY `Authorization: Bearer` value as the owner - so a
  driver token sent that way is silently promoted to admin and every rule is
  bypassed. A user identity has to travel in the `auth` query parameter
  instead. Getting this wrong is invisible: the writes all succeed, and the
  harness reports a healthy fleet against a database enforcing nothing.
*/
const put = async (path, body, uid) => {
  const started = performance.now();

  const asAdmin = uid === undefined;
  const query = asAdmin ? "" : `&auth=${idToken(uid)}`;

  const response = await fetch(`${BASE}/${path}.json?ns=${PROJECT}${query}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(asAdmin ? { Authorization: `Bearer ${ADMIN}` } : {}),
    },
    body: JSON.stringify(body),
  });

  return {
    ms: performance.now() - started,
    ok: response.ok,
    status: response.status,
  };
};

/*
  Positions are sharded by route, so the route is part of the path and no
  longer a field in the record. One shard is enough to measure the ingest
  path; the passenger harness is where the shard count actually matters.
*/
const ROUTE = "101";

const vehicleId = (n) => `load-${String(n).padStart(4, "0")}`;
const driverUid = (n) => `load-driver-${String(n).padStart(4, "0")}`;

/**
 * Uploads the real security rules to this namespace.
 *
 * Without this the harness measures nothing that matters. A fresh emulator
 * namespace starts with permissive defaults, and `emulators:exec` does not
 * apply `database.rules.json` to it - so every write is accepted, including
 * an unauthenticated one carrying a route that does not exist. The first
 * version of this file reported 100% acceptance at a 3-second interval and
 * called it a passing throttle; it was measuring an open database.
 *
 * The rules-unit-testing suite does the same upload, which is why it has
 * always been enforcing them while this was not.
 */
const installRules = async () => {
  const rules = readFileSync("database.rules.json", "utf8");

  /* The admin endpoint wants a bearer token; `?auth=` is refused with a 403. */
  const response = await fetch(`${BASE}/.settings/rules.json?ns=${PROJECT}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ADMIN}`,
    },
    body: rules,
  });

  if (!response.ok) {
    throw new Error(
      `Could not install the security rules (${response.status}). ` +
        "Refusing to run: an open database would report a meaningless result."
    );
  }
};

/**
 * Proves the rules are actually being enforced before measuring anything.
 *
 * A load run against an open database looks identical to a fast one, so this
 * asserts a write the rules must refuse is in fact refused.
 */
const assertRulesEnforced = async () => {
  /* Route 999 is not published, and this account is on no allowlist. */
  const probe = await put(
    "busLocationsByRoute/999/rules-probe",
    { lat: 1, lng: 1, updatedAt: { ".sv": "timestamp" } },
    "not-a-driver"
  );

  if (probe.ok) {
    throw new Error(
      "The database accepted a write the rules forbid. Every number this " +
        "harness could produce would be meaningless, so it is not going to " +
        "produce any."
    );
  }
};

/**
 * Puts every simulated vehicle on shift.
 *
 * Written with the admin credential because that is how it works in
 * production too: the allowlist and the roster are the operator's to write,
 * and no client may touch either.
 */
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

const percentile = (sorted, p) =>
  sorted.length === 0 ? 0 : sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];

const main = async () => {
  console.log(
    `fleet load: ${VEHICLES} vehicles, every ${INTERVAL_MS} ms, for ${DURATION_S} s`
  );
  console.log(`target: ${BASE} (ns=${PROJECT})\n`);

  await installRules();
  await assertRulesEnforced();
  await seed();

  const latencies = [];
  let accepted = 0;
  let refused = 0;
  let failed = 0;
  const refusalStatuses = new Map();

  const startedAt = Date.now();
  const endsAt = startedAt + DURATION_S * 1000;

  /*
    Each vehicle keeps its own timer, which is what a real fleet does - they
    are not synchronised, and a synchronised burst would measure a thundering
    herd rather than a steady rate.
  */
  const runVehicle = async (n) => {
    await new Promise((resolve) =>
      setTimeout(resolve, Math.random() * INTERVAL_MS)
    );

    while (Date.now() < endsAt) {
      const result = await put(
        `busLocationsByRoute/${ROUTE}/${vehicleId(n)}`,
        {
          lat: ORIGIN.lat + (Math.random() - 0.5) * 0.05,
          lng: ORIGIN.lng + (Math.random() - 0.5) * 0.05,
          updatedAt: { ".sv": "timestamp" },
        },
        driverUid(n)
      );

      latencies.push(result.ms);

      if (result.ok) accepted += 1;
      else if (result.status === 401 || result.status === 403) {
        refused += 1;
        refusalStatuses.set(
          result.status,
          (refusalStatuses.get(result.status) ?? 0) + 1
        );
      } else {
        failed += 1;
        refusalStatuses.set(
          result.status,
          (refusalStatuses.get(result.status) ?? 0) + 1
        );
      }

      await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
    }
  };

  await Promise.all(
    Array.from({ length: VEHICLES }, (_, n) => runVehicle(n))
  );

  const elapsedS = (Date.now() - startedAt) / 1000;
  const sorted = [...latencies].sort((a, b) => a - b);
  const total = accepted + refused + failed;

  console.log(`elapsed        : ${elapsedS.toFixed(1)} s`);
  console.log(`writes attempted: ${total}`);
  console.log(`accepted       : ${accepted}`);
  console.log(`refused by rules: ${refused}`);
  console.log(`other failures : ${failed}`);
  console.log(`write rate     : ${(accepted / elapsedS).toFixed(2)} /s`);
  console.log(`latency p50    : ${percentile(sorted, 0.5).toFixed(1)} ms`);
  console.log(`latency p95    : ${percentile(sorted, 0.95).toFixed(1)} ms`);
  console.log(`latency p99    : ${percentile(sorted, 0.99).toFixed(1)} ms`);

  if (refusalStatuses.size > 0) {
    console.log(
      `statuses       : ${[...refusalStatuses]
        .map(([status, count]) => `${status}x${count}`)
        .join(", ")}`
    );
  }

  /*
    A run where everything was refused looks like a fast run if only the rate
    is read. Fail loudly instead - the harness exists to produce evidence, and
    evidence that nothing got through is a different result from a fast one.
  */
  if (accepted === 0) {
    console.error("\nNOTHING WAS ACCEPTED - the rules refused every write.");
    process.exitCode = 1;
  }
};

await main();
