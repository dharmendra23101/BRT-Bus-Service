/**
 * The security rules, checked against the domain they are meant to guard.
 *
 * These are NOT rules-engine tests - that needs the Firebase emulator, which
 * needs a JDK this machine does not have, and is tracked separately. What they
 * catch is the failure that actually happened: the rules and the application
 * drifted apart while both looked correct on their own, and nothing noticed
 * because the repo's Firebase mock enforces no rules at all, so the whole
 * suite stayed green.
 *
 * `database.rules.json` validated `routeId` against `/^(101|102)$/` while the
 * driver screen offered all eight published routes. The consequence is worse
 * than it sounds: a rejected `routeId` does not cost the bus its label, it
 * rejects **the entire position write**, so a driver on route 201 would simply
 * never appear on the map. It was latent only because the rules are not
 * deployed.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ROUTE_IDS } from "@/domain/transit/routes";
import { REMOTE_PATHS } from "@/constants/config";

const rules = JSON.parse(
  readFileSync("database.rules.json", "utf8")
) as Record<string, unknown>;

/*
  Positions are sharded by route, so the route is a PATH SEGMENT rather than a
  field. That is what lets a passenger watching one route receive only that
  route's buses - and it means the route is validated on the shard key, one
  level above the per-field validators.
*/
const routeShard = (() => {
  const root = (rules.rules ?? {}) as Record<string, never>;
  const locations = (root[REMOTE_PATHS.BUS_LOCATIONS] ?? {}) as Record<string, never>;

  return (locations["$routeId"] ?? {}) as Record<string, never>;
})();

/** Walks to the position node's per-field validators, inside its shard. */
const positionRules = (routeShard["$vehicleId"] ?? {}) as Record<
  string,
  Record<string, string>
>;

const routePattern = (() => {
  const validate = (routeShard[".validate"] ?? "") as unknown as string;
  const match = /matches\(\/(.+?)\/\)/.exec(validate);

  return match ? new RegExp(match[1]!) : null;
})();

describe("the published routes a driver may broadcast", () => {
  it("states a routeId pattern at all", () => {
    expect(routePattern, "no routeId .validate found in database.rules.json").not.toBeNull();
  });

  /*
    Derived from ROUTE_IDS rather than listed, so opening a new route fails
    here instead of silently dropping that route's buses off the map.
  */
  it("accepts every route the application publishes", () => {
    for (const id of ROUTE_IDS) {
      expect(routePattern!.test(id), `rules reject route ${id}`).toBe(true);
    }
  });

  it("still refuses a route the application does not publish", () => {
    for (const id of ["999", "abc", "10", "1011", ""]) {
      expect(routePattern!.test(id), `rules accept bogus route "${id}"`).toBe(false);
    }
  });
});

describe("what the rules keep closed", () => {
  /*
    The allowlist is a list of driver UIDs. Publishing it would re-introduce
    exactly the personal-data problem that driver names and emails were
    stripped from the public map to avoid, so it stays unreadable and
    unwritable by every client - and is therefore a console action, not
    something the admin panel can do. `AdminDashboard` says so.
  */
  it("keeps the driver allowlist unreadable and unwritable by clients", () => {
    const root = (rules.rules ?? {}) as Record<string, never>;
    const allowlist = (root.driverAllowlist ?? {}) as Record<string, unknown>;

    expect(allowlist[".read"]).toBe(false);
    expect((allowlist["$uid"] as Record<string, unknown>)?.[".write"]).toBe(false);
  });

  it("gates a position write on the allowlist, not merely on being signed in", () => {
    const write = positionRules[".write"] as unknown as string;

    expect(write).toContain("driverAllowlist");
  });

  /*
    Being allowed to publish is not being allowed to publish as anything. The
    allowlist says the account may write; the assignment says which bus, and
    until when. Without the second term any allowlisted driver could publish
    as any vehicle, indefinitely.
  */
  it("binds a position write to the vehicle the driver was assigned", () => {
    const write = positionRules[".write"] as unknown as string;

    expect(write).toContain("assignments");
    expect(write).toContain("$vehicleId");
    expect(write).toContain("validFrom");
    expect(write).toContain("validTo");
  });

  it("keeps the roster unwritable by the drivers it names", () => {
    const root = (rules.rules ?? {}) as Record<string, never>;
    const assignments = (root.assignments ?? {}) as Record<string, unknown>;
    const perDriver = assignments["$driverUid"] as Record<string, unknown>;

    expect(perDriver?.[".write"]).toBe(false);
  });

  it("refuses any field the position contract does not define", () => {
    expect(positionRules.$other?.[".validate"]).toBe(false);
  });
});
