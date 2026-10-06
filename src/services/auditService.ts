/**
 * The record of administrative acts.
 *
 * Two things an administrator does leave no other trace. Changing a role
 * overwrites the only copy of it - `users` holds the CURRENT role and nothing
 * about the one before. Publishing an announcement puts words in front of
 * passengers as fact, and editing one overwrites what it said. So without
 * this, "who did that, and when?" has no answer anywhere in the system.
 *
 * WHAT MAKES IT EVIDENCE rather than a diary is that the two fields that
 * matter are not the caller's to choose. `actorUid` is pinned by the rules to
 * the authenticated user, so an entry cannot be attributed to somebody else,
 * and `at` is pinned to the server's clock, so nothing can be backdated into
 * a shift nobody was working. The collection is create-only: an administrator
 * who can edit the log is an administrator with no log.
 *
 * FAILURE IS DELIBERATELY NOT FATAL. The action being recorded has already
 * happened by the time we get here, and refusing to report a successful role
 * change because its audit entry failed would leave the administrator
 * retrying an operation that already worked. A failed write is logged for the
 * error reporter and swallowed.
 *
 * COST: a few hundred writes a day against a 20,000/day free allowance. This
 * is free at this scale and remains free well beyond it.
 */

import { getDb } from "@/firebase";
import type { TranslationKey } from "@/domain/i18n/en";
import { PERMISSIONS, can } from "@/domain/auth/permissions";
import { REMOTE_PATHS } from "@/constants/config";
import type { Actor } from "@/types/user";

/*
  One import of the SDK, shared by every caller - the same memoisation
  `locationService` needed. Two services loading it concurrently is not
  hypothetical: a role change and its audit entry happen in the same tick.
*/
let sdkPromise: Promise<typeof import("firebase/firestore")> | null = null;

/** Loads the Firestore SDK and database handle together. */
const firestore = async () => {
  sdkPromise ??= import("firebase/firestore");

  const [sdk, db] = await Promise.all([sdkPromise, getDb()]);

  return { ...sdk, db };
};

/** The administrative acts worth a permanent record. */
export type AuditAction = "ROLE_CHANGED" | "ANNOUNCEMENT_PUBLISHED";

/** What each recorded act is called on screen. */
export const AUDIT_ACTION_LABELS: Record<AuditAction, TranslationKey> = {
  ROLE_CHANGED: "admin.audit.roleChanged",
  ANNOUNCEMENT_PUBLISHED: "admin.audit.noticePublished",
};

export interface AuditEntry {
  /** What happened. */
  action: AuditAction;
  /** What it happened to - an account id, or an announcement id. */
  subject: string;
  /** Enough to understand the change without another lookup. */
  detail: string;
}

/**
 * Records one administrative act.
 *
 * Returns whether the record was written, which callers may ignore - and all
 * of them do, on purpose. See the note about failure above.
 */
export const recordAudit = async (
  actor: Actor | null,
  entry: AuditEntry
): Promise<boolean> => {
  /*
    Checked here as well as in the rules. The rules are what actually stop a
    forged entry; this stops the app from attempting one it knows will be
    refused, which would otherwise surface as a console error on a screen
    where nothing went wrong.
  */
  if (!can(actor, PERMISSIONS.ASSIGN_ROLES) || !actor) return false;

  try {
    const { addDoc, collection, serverTimestamp, db } = await firestore();

    await addDoc(collection(db, REMOTE_PATHS.AUDIT_LOG), {
      actorUid: actor.uid,
      /*
        The server's clock, matching the rule that requires it. A client
        timestamp would let an entry be placed at a time of the author's
        choosing, which is the one thing an audit trail must not allow.
      */
      at: serverTimestamp(),
      action: entry.action,
      subject: entry.subject,
      detail: entry.detail,
    });

    return true;
  } catch (error) {
    console.error("Could not record an administrative action:", error);

    return false;
  }
};

/** One recorded act, as read back. */
export interface AuditRecord extends AuditEntry {
  id: string;
  actorUid: string;
  /** When the server recorded it, or null if the value is unreadable. */
  at: Date | null;
}

/**
 * The most recent administrative acts, newest first.
 *
 * Capped rather than paged. The point of this list is "what changed lately?",
 * which a screen answers in a few dozen rows; an operator investigating
 * something specific needs a query this collection is not shaped for, and
 * pretending otherwise with an unbounded read would make one screen able to
 * pull the entire history on every visit.
 */
export const MAX_AUDIT_RECORDS = 50;

const toRecord = (id: string, data: Record<string, unknown>): AuditRecord | null => {
  const { actorUid, action, subject, detail, at } = data;

  if (
    typeof actorUid !== "string" ||
    typeof action !== "string" ||
    typeof subject !== "string"
  ) {
    return null;
  }

  /*
    Firestore hands back a Timestamp, but a record written a moment ago and
    read before the server resolved the sentinel has `null` here. That is a
    real state, not an error, and rendering it as the epoch would date an act
    to 1970.
  */
  const stamp = at as { toDate?: () => Date } | null | undefined;
  const when = typeof stamp?.toDate === "function" ? stamp.toDate() : null;

  return {
    id,
    actorUid,
    action: action as AuditAction,
    subject,
    detail: typeof detail === "string" ? detail : "",
    at: when,
  };
};

export const fetchAuditLog = async (
  actor: Actor | null
): Promise<AuditRecord[]> => {
  if (!can(actor, PERMISSIONS.ASSIGN_ROLES)) return [];

  try {
    const { collection, getDocs, limit, orderBy, query, db } = await firestore();

    const snapshot = await getDocs(
      query(
        collection(db, REMOTE_PATHS.AUDIT_LOG),
        orderBy("at", "desc"),
        limit(MAX_AUDIT_RECORDS)
      )
    );

    const records: AuditRecord[] = [];

    snapshot.forEach((entry) => {
      const record = toRecord(entry.id, entry.data() as Record<string, unknown>);

      /*
        A malformed row is skipped rather than failing the whole read. One bad
        record must not be able to hide every good one - the same reasoning as
        the per-element ticket validation.
      */
      if (record) records.push(record);
    });

    return records;
  } catch (error) {
    console.error("Could not read the administrative record:", error);

    return [];
  }
};
