/**
 * User records and role administration.
 *
 * Runs against the in-memory Firestore mock, so the module's real logic is
 * exercised: permission gating, defensive role narrowing, and the truncation
 * reporting that stops an admin seeing a partial roster as if it were
 * complete.
 *
 * These checks are a convenience layer, not the security boundary. The
 * equivalent rules in `firestore.rules` are what actually enforce this, and
 * they are verified separately against the Firestore emulator.
 */

import { describe, expect, it, vi } from "vitest";
import {
  MAX_USERS_PER_READ,
  createUserRecord,
  ensureUserRecord,
  fetchAllUsers,
  fetchUserRecord,
  toUserProfile,
  updateUserRole,
} from "@/services/userService";
import { AuthorizationError } from "@/domain/auth/errors";
import type { Actor } from "@/types/user";
import { makeUser, readDoc, seedDoc, timestamp } from "../helpers/firebase";
import { REMOTE_PATHS } from "@/constants/config";

const admin: Actor = { uid: "admin-1", role: "admin" };
const passenger: Actor = { uid: "user-1", role: "user" };
const driver: Actor = { uid: "driver-1", role: "driver" };

describe("reading a user record", () => {
  it("returns null when the account has no record yet", async () => {
    expect(await fetchUserRecord("nobody")).toBeNull();
  });

  it("reads back what was stored", async () => {
    seedDoc("users", "user-1", { name: "Rider", email: "r@x.com", role: "driver" });

    const record = await fetchUserRecord("user-1");

    expect(record).toMatchObject({ uid: "user-1", name: "Rider", role: "driver" });
  });

  it("falls back to the least-privileged role for an unrecognised value", async () => {
    // A hand-edited document must not be able to invent a role.
    seedDoc("users", "user-1", { role: "superadmin" });

    expect((await fetchUserRecord("user-1"))?.role).toBe("user");
  });

  it("falls back to the least-privileged role when the field is missing", async () => {
    seedDoc("users", "user-1", { name: "Rider" });

    expect((await fetchUserRecord("user-1"))?.role).toBe("user");
  });
});

describe("creating a user record", () => {
  it("always registers a new account as a passenger", async () => {
    // Self-registration must never be able to mint an administrator.
    const record = await createUserRecord(makeUser({ uid: "new-1" }), "New Rider");

    expect(record.role).toBe("user");
    expect(readDoc("users", "new-1")).toMatchObject({ role: "user" });
  });

  it("keeps the chosen display name", async () => {
    const record = await createUserRecord(makeUser({ uid: "new-1" }), "Chosen Name");

    expect(record.name).toBe("Chosen Name");
  });

  it("creates a record only when one is missing", async () => {
    seedDoc("users", "user-1", { name: "Existing", role: "admin" });

    const record = await ensureUserRecord(makeUser({ uid: "user-1" }));

    // An existing admin must not be silently reset to a passenger.
    expect(record.role).toBe("admin");
    expect(record.name).toBe("Existing");
  });
});

describe("the profile shown to the passenger", () => {
  it("treats notifications as opt-out", async () => {
    const user = makeUser();

    expect(toUserProfile(user, null).notifications_enabled).toBe(true);
    expect(
      toUserProfile(user, { uid: "u", role: "user", notifications_enabled: false })
        .notifications_enabled
    ).toBe(false);
  });

  it("falls back to the auth display name when the record has none", () => {
    const profile = toUserProfile(makeUser({ displayName: "Auth Name" }), null);

    expect(profile.name).toBe("Auth Name");
  });
});

describe("reading the roster", () => {
  it("refuses a passenger", async () => {
    await expect(fetchAllUsers(passenger)).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("refuses a driver", async () => {
    await expect(fetchAllUsers(driver)).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("refuses a signed-out caller", async () => {
    await expect(fetchAllUsers(null)).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("allows an admin", async () => {
    seedDoc("users", "a", { role: "user" });

    const roster = await fetchAllUsers(admin);

    expect(roster.users).toHaveLength(1);
  });

  it("orders newest first", async () => {
    seedDoc("users", "old", { role: "user", createdAt: timestamp(new Date(2020, 0, 1)) });
    seedDoc("users", "new", { role: "user", createdAt: timestamp(new Date(2026, 0, 1)) });

    const roster = await fetchAllUsers(admin);

    expect(roster.users.map((u) => u.uid)).toEqual(["new", "old"]);
  });

  it("does not claim truncation for a small roster", async () => {
    seedDoc("users", "a", { role: "user" });

    expect((await fetchAllUsers(admin)).truncated).toBe(false);
  });

  it("reports truncation rather than showing a partial roster as complete", async () => {
    for (let i = 0; i < MAX_USERS_PER_READ; i++) {
      seedDoc("users", `u${i}`, { role: "user" });
    }

    const roster = await fetchAllUsers(admin);

    expect(roster.users).toHaveLength(MAX_USERS_PER_READ);
    expect(roster.truncated).toBe(true);
  });
});

describe("assigning roles", () => {
  it("refuses a passenger without touching the record", async () => {
    seedDoc("users", "victim", { role: "user" });

    const result = await updateUserRole(passenger, "victim", "admin");

    expect(result.ok).toBe(false);
    expect(readDoc("users", "victim")).toMatchObject({ role: "user" });
  });

  it("refuses a signed-out caller", async () => {
    expect((await updateUserRole(null, "victim", "admin")).ok).toBe(false);
  });

  /*
    `users` keeps only the CURRENT role, so without this entry the transition
    is lost the moment it happens - there is nowhere else in the system that
    records who changed somebody's access, or from what.
  */
  it("records who changed the role, and from what", async () => {
    seedDoc("users", "user-1", { role: "user" });

    await updateUserRole(admin, "user-1", "driver");

    await vi.waitFor(() =>
      expect(readDoc(REMOTE_PATHS.AUDIT_LOG, "generated-1")).toMatchObject({
        actorUid: admin.uid,
        action: "ROLE_CHANGED",
        subject: "user-1",
        detail: "user -> driver",
      })
    );
  });

  /*
    The role has already moved by the time the record is attempted. Reporting
    the whole operation as failed would send an administrator to retry a
    change that already happened.
  */
  it("still reports success when the record cannot be written", async () => {
    seedDoc("users", "user-1", { role: "user" });

    const result = await updateUserRole(admin, "user-1", "driver");

    expect(result.ok).toBe(true);
    expect(readDoc("users", "user-1")).toMatchObject({ role: "driver" });
  });

  it("lets an admin change a role", async () => {
    seedDoc("users", "user-1", { role: "user" });

    const result = await updateUserRole(admin, "user-1", "driver");

    expect(result.ok).toBe(true);
    expect(readDoc("users", "user-1")).toMatchObject({ role: "driver" });
  });

  it("rejects a role the permission model does not know", async () => {
    seedDoc("users", "user-1", { role: "user" });

    const result = await updateUserRole(admin, "user-1", "superadmin");

    expect(result).toEqual({ ok: false, message: "That is not a valid role." });
    expect(readDoc("users", "user-1")).toMatchObject({ role: "user" });
  });

  it("rejects an empty account id", async () => {
    expect((await updateUserRole(admin, "", "driver")).ok).toBe(false);
  });

  it("creates the record when assigning a role to an account without one", async () => {
    const result = await updateUserRole(admin, "ghost", "driver");

    expect(result.ok).toBe(true);
    expect(readDoc("users", "ghost")).toMatchObject({ role: "driver" });
  });
});
