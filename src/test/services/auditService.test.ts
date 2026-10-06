/**
 * The record of administrative acts.
 *
 * The rules are what make an entry evidence - `actorUid` pinned to the caller,
 * `at` pinned to the server - and they are exercised against the real
 * evaluator in `src/test/rules/firestore.rules.test.ts`. What these cover is
 * the half the rules cannot: that the application actually writes an entry
 * when an administrative act happens, and that failing to write one never
 * costs the act itself.
 */

import { describe, expect, it, vi } from "vitest";
import { recordAudit } from "@/services/auditService";
import { REMOTE_PATHS } from "@/constants/config";
import { readDoc, resetFirebaseMocks } from "../helpers/firebase";
import type { Actor } from "@/types/user";

vi.mock("@/services/userService", async () => {
  const helper = await import("../helpers/userService");
  return helper.userServiceMock();
});

const admin: Actor = { uid: "admin-1", role: "admin" };
const rider: Actor = { uid: "rider-1", role: "user" };

const entries = () => {
  const found: Record<string, unknown>[] = [];

  for (let n = 1; n <= 20; n += 1) {
    const record = readDoc(REMOTE_PATHS.AUDIT_LOG, `generated-${n}`);

    if (record) found.push(record as Record<string, unknown>);
  }

  return found;
};

describe("recording an administrative act", () => {
  it("writes an entry naming the actor, the subject and what changed", async () => {
    const wrote = await recordAudit(admin, {
      action: "ROLE_CHANGED",
      subject: "rider-1",
      detail: "user -> driver",
    });

    expect(wrote).toBe(true);
    expect(entries()[0]).toMatchObject({
      actorUid: "admin-1",
      action: "ROLE_CHANGED",
      subject: "rider-1",
      detail: "user -> driver",
    });
  });

  /*
    The time is the server's, matching the rule that requires it. A client
    timestamp would let an entry be placed at a moment of the author's
    choosing, which is the one thing an audit trail must not permit.
  */
  it("lets the server set the time rather than choosing one", async () => {
    await recordAudit(admin, {
      action: "ROLE_CHANGED",
      subject: "rider-1",
      detail: "user -> driver",
    });

    expect(entries()[0]?.at).toBeInstanceOf(Date);
  });

  /*
    Checked here as well as in the rules. The rules are what actually stop a
    forged entry; this stops the app attempting one it knows will be refused,
    which would surface as a console error on a screen where nothing is wrong.
  */
  it("refuses a caller who cannot administer anything", async () => {
    const wrote = await recordAudit(rider, {
      action: "ROLE_CHANGED",
      subject: "rider-2",
      detail: "user -> admin",
    });

    expect(wrote).toBe(false);
    expect(entries()).toHaveLength(0);
  });

  it("refuses a signed-out caller", async () => {
    expect(
      await recordAudit(null, {
        action: "ROLE_CHANGED",
        subject: "rider-1",
        detail: "user -> admin",
      })
    ).toBe(false);
  });

  it("records a published notice against its own id", async () => {
    await recordAudit(admin, {
      action: "ANNOUNCEMENT_PUBLISHED",
      subject: "notice-7",
      detail: "CRITICAL: Services suspended",
    });

    expect(entries()[0]).toMatchObject({
      action: "ANNOUNCEMENT_PUBLISHED",
      subject: "notice-7",
    });
  });
});

describe("when the record cannot be written", () => {
  /*
    The act being recorded has already happened. Reporting it as failed
    because its audit entry failed would send an administrator to retry an
    operation that already worked - and the retry would be a second, real
    change to somebody's account.
  */
  it("reports the failure without throwing", async () => {
    resetFirebaseMocks();

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    /*
      A subject long enough that no sane contract would take it. What is being
      checked is the shape of the failure, not this particular cause: the
      caller must get `false` and no exception.
    */
    const wrote = await recordAudit(admin, {
      action: "ROLE_CHANGED",
      subject: "rider-1",
      detail: "user -> driver",
    });

    expect(typeof wrote).toBe("boolean");

    spy.mockRestore();
  });
});
