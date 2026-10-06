/**
 * Firestore access for user records and roles.
 *
 * The Firestore SDK is imported on demand rather than at module load. This
 * module is reachable from the auth context, which every page mounts, so a
 * static import would put ~243 kB of Firestore into the first byte a visitor
 * downloads even if they never sign in.
 *
 * The permission checks below are the SECOND line of defence. They exist so
 * the UI fails fast and predictably, and so a privileged call is never
 * attempted without intent. They are not what keeps data safe - the matching
 * rules in `firestore.rules` are, because a service function running in the
 * browser can always be called with whatever arguments the caller likes.
 *
 * Read that file alongside this one: every function here has a corresponding
 * rule, and the rule is the authoritative version.
 */

import type { User as FirebaseUser } from "firebase/auth";
import { getDb } from "@/firebase";
import { REMOTE_PATHS } from "@/constants/config";
import { recordAudit } from "@/services/auditService";
import { AuthorizationError } from "@/domain/auth/errors";
import { PERMISSIONS, can } from "@/domain/auth/permissions";
import { userRoleSchema } from "@/domain/validation/schemas";
import {
  DEFAULT_ROLE,
  isTimestampLike,
  type Actor,
  type UserProfile,
  type UserRecord,
} from "@/types/user";

/**
 * Client-side bound on a roster read.
 *
 * This is a blast-radius limit, not a rule constraint - the `list` rule
 * authorises admins without capping the query. It exists so a bug or a very
 * large collection cannot pull an unbounded document set into the browser.
 * Because it can truncate, `fetchAllUsers` reports when it did rather than
 * silently showing a partial roster.
 */
export const MAX_USERS_PER_READ = 500;

/** Loads the Firestore SDK and database handle together. */
const firestore = async () => {
  const [sdk, db] = await Promise.all([import("firebase/firestore"), getDb()]);
  return { ...sdk, db };
};

/**
 * Narrows a stored role.
 *
 * An unrecognised value becomes the least-privileged role rather than being
 * trusted, so a hand-written document cannot invent a role the app then
 * treats as special.
 */
const toRole = (value: unknown) => {
  const parsed = userRoleSchema.safeParse(value);

  if (!parsed.success && value !== undefined) {
    console.warn("Ignoring unrecognised role value on a user record.");
  }

  return parsed.success ? parsed.data : DEFAULT_ROLE;
};

const toRecord = (uid: string, data: Record<string, unknown>): UserRecord => ({
  uid,
  name: typeof data.name === "string" ? data.name : undefined,
  email: typeof data.email === "string" ? data.email : undefined,
  role: toRole(data.role),
  createdAt: isTimestampLike(data.createdAt) ? data.createdAt : undefined,
  photoURL: typeof data.photoURL === "string" ? data.photoURL : undefined,
  notifications_enabled:
    typeof data.notifications_enabled === "boolean"
      ? data.notifications_enabled
      : undefined,
});

/** Reads a user's stored record, or null when they have none yet. */
export const fetchUserRecord = async (uid: string): Promise<UserRecord | null> => {
  const { doc, getDoc, db } = await firestore();

  const snap = await getDoc(doc(db, REMOTE_PATHS.USERS, uid));

  return snap.exists() ? toRecord(uid, snap.data()) : null;
};

/**
 * Creates the Firestore record that backs a newly registered account.
 *
 * The role is hardcoded to the default and never taken from a caller. The
 * corresponding rule enforces the same thing, so even a direct API call
 * cannot self-register as an administrator.
 *
 * `createdAt` is written as a plain Date; Firestore stores it as a Timestamp
 * and reads it back as one, which avoids needing the Timestamp class here.
 */
export const createUserRecord = async (
  user: FirebaseUser,
  name?: string
): Promise<UserRecord> => {
  const { doc, setDoc, db } = await firestore();

  const displayName = name ?? user.displayName ?? "User";
  const createdAt = new Date();

  await setDoc(doc(db, REMOTE_PATHS.USERS, user.uid), {
    name: displayName,
    email: user.email,
    role: DEFAULT_ROLE,
    createdAt,
    photoURL: user.photoURL ?? null,
  });

  return {
    uid: user.uid,
    name: displayName,
    email: user.email ?? undefined,
    role: DEFAULT_ROLE,
    createdAt: { toDate: () => createdAt },
    photoURL: user.photoURL ?? undefined,
  };
};

/**
 * Returns a user's record, creating a default one if it is missing.
 *
 * Accounts predating the users collection - and Google sign-ins, which never
 * pass through registration - land here on first login.
 */
export const ensureUserRecord = async (
  user: FirebaseUser,
  name?: string
): Promise<UserRecord> =>
  (await fetchUserRecord(user.uid)) ?? (await createUserRecord(user, name));

/** Builds the display profile shown to the signed-in passenger. */
export const toUserProfile = (
  user: FirebaseUser,
  record: UserRecord | null
): UserProfile => ({
  name: record?.name ?? user.displayName ?? "Passenger",
  email: record?.email ?? user.email ?? "",
  // Opt-out, not opt-in: only an explicit `false` silences alerts.
  notifications_enabled: record?.notifications_enabled !== false,
});

export interface UserRoster {
  users: UserRecord[];
  /**
   * True when the read hit `MAX_USERS_PER_READ` and the roster may therefore
   * be incomplete. Surfaced in the UI so an admin is never shown a partial
   * list that looks complete.
   */
  truncated: boolean;
}

/**
 * The user roster. Requires READ_ALL_USERS.
 *
 * No `orderBy` is applied deliberately: Firestore excludes documents missing
 * the ordered field entirely, so ordering on `createdAt` would silently hide
 * any record written without one. Sorting happens client-side instead.
 */
export const fetchAllUsers = async (actor: Actor | null): Promise<UserRoster> => {
  if (!can(actor, PERMISSIONS.READ_ALL_USERS)) {
    throw new AuthorizationError(PERMISSIONS.READ_ALL_USERS);
  }

  const { collection, getDocs, limit, query, db } = await firestore();

  const snapshot = await getDocs(
    query(collection(db, REMOTE_PATHS.USERS), limit(MAX_USERS_PER_READ))
  );

  const users = snapshot.docs.map((entry) => toRecord(entry.id, entry.data()));

  const createdAtMs = (record: UserRecord): number =>
    record.createdAt ? record.createdAt.toDate().getTime() : 0;

  return {
    users: users.sort((a, b) => createdAtMs(b) - createdAtMs(a)),
    truncated: users.length >= MAX_USERS_PER_READ,
  };
};

/** Switches the signed-in passenger's own arrival alerts on or off. */
export const updateNotificationPreference = async (
  uid: string,
  enabled: boolean
): Promise<void> => {
  const { doc, updateDoc, db } = await firestore();

  await updateDoc(doc(db, REMOTE_PATHS.USERS, uid), {
    notifications_enabled: enabled,
    updatedAt: new Date(),
  });
};

export type RoleUpdateResult = { ok: true } | { ok: false; message: string };

/**
 * Changes a user's role. Requires ASSIGN_ROLES.
 *
 * The target role is validated before it is written, so an unexpected value
 * from the UI cannot create a role the permission table has no entry for.
 */
export const updateUserRole = async (
  actor: Actor | null,
  userId: string,
  newRole: unknown
): Promise<RoleUpdateResult> => {
  if (!can(actor, PERMISSIONS.ASSIGN_ROLES)) {
    return { ok: false, message: new AuthorizationError().message };
  }

  const parsed = userRoleSchema.safeParse(newRole);

  if (!parsed.success) return { ok: false, message: "That is not a valid role." };

  if (!userId || typeof userId !== "string") {
    return { ok: false, message: "That is not a valid account." };
  }

  try {
    const { doc, getDoc, setDoc, updateDoc, db } = await firestore();

    const ref = doc(db, REMOTE_PATHS.USERS, userId);
    const snap = await getDoc(ref);
    const now = new Date();

    const previous = snap.exists()
      ? ((snap.data() as { role?: unknown }).role ?? "unknown")
      : "none";

    if (snap.exists()) {
      await updateDoc(ref, { role: parsed.data, updatedAt: now });
    } else {
      await setDoc(ref, { role: parsed.data, createdAt: now, updatedAt: now });
    }

    /*
      Recorded after the change, and its failure deliberately ignored.

      The role has already moved by this point. Reporting the whole operation
      as failed because its record could not be written would send an
      administrator to retry something that already worked - and the retry
      would be a second, identical change.

      The previous role is captured because `users` keeps only the current
      one, so this is the only place the transition survives at all.
    */
    void recordAudit(actor, {
      action: "ROLE_CHANGED",
      subject: userId,
      detail: `${String(previous)} -> ${parsed.data}`,
    });

    return { ok: true };
  } catch (error) {
    console.error("Failed to update user role:", error);

    // Firestore's own message can name rule paths and project internals.
    return { ok: false, message: "Could not update that role. Please try again." };
  }
};
