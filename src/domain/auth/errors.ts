/**
 * Security-relevant error types.
 *
 * Two rules govern the messages here:
 *
 *  - The message shown to a user must never reveal whether a record exists,
 *    who owns it, or why precisely a check failed. "You do not have
 *    permission" is the whole answer.
 *  - The detail a developer needs goes to the console, not the UI.
 */

import type { Permission } from "./permissions";
import type { TranslationKey } from "@/domain/i18n/en";

/** Thrown when an actor attempts something their role does not permit. */
export class AuthorizationError extends Error {
  readonly permission: Permission | null;

  constructor(permission: Permission | null = null) {
    super("You do not have permission to perform this action.");
    this.name = "AuthorizationError";
    this.permission = permission;
  }
}

/** Thrown when an operation requires a signed-in user and there is none. */
export class AuthenticationError extends Error {
  constructor() {
    super("Please sign in to continue.");
    this.name = "AuthenticationError";
  }
}

export const isAuthorizationError = (error: unknown): error is AuthorizationError =>
  error instanceof AuthorizationError;

/**
 * Converts any thrown value into something safe to render.
 *
 * Raw Firebase errors carry backend detail (project ids, index hints, rule
 * paths) that should not reach a user, so anything unrecognised collapses to
 * a generic message while the original is logged for the developer.
 */
export const toSafeMessage = (
  error: unknown,
  fallback: TranslationKey = "error.generic"
): TranslationKey => {
  /*
    Matched on the class rather than passed through as `error.message`. A
    thrown Error's message is a developer artefact - it goes to a log and a
    stack trace - and the words a passenger reads are chosen where the
    language is known.
  */
  if (error instanceof AuthorizationError) return "error.noPermission";
  if (error instanceof AuthenticationError) return "error.signInRequired";

  if (typeof error === "object" && error !== null && "code" in error) {
    const code = String((error as { code: unknown }).code);

    // Permission denials are expected when rules do their job; they are not
    // a bug and should read as a plain refusal.
    if (code.includes("permission-denied") || code.includes("PERMISSION_DENIED")) {
      return "error.noPermission";
    }

    if (code.includes("unavailable") || code.includes("network")) {
      return "error.network";
    }
  }

  console.error("Unhandled error:", error);

  return fallback;
};

const authCodeOf = (error: unknown): string =>
  typeof error === "object" && error !== null && "code" in error
    ? String((error as { code: unknown }).code)
    : "";

/**
 * Maps a Firebase Auth failure to a message safe to show a visitor.
 *
 * The important case is sign-in. Firebase distinguishes `auth/user-not-found`
 * from `auth/wrong-password`, and surfacing that difference turns the login
 * form into an account-enumeration oracle: an attacker can discover which
 * email addresses are registered by watching which error comes back. Every
 * credential failure therefore collapses to one indistinguishable message.
 */
export const toAuthMessage = (error: unknown): TranslationKey => {
  const code = authCodeOf(error);

  switch (code) {
    // Deliberately identical - do not split these apart.
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
    case "auth/invalid-email":
      return "auth.error.credentials";

    case "auth/too-many-requests":
      return "auth.error.tooManyAttempts";

    case "auth/user-disabled":
      return "auth.error.disabled";

    case "auth/email-already-in-use":
      return "auth.error.emailInUse";

    case "auth/weak-password":
      return "auth.error.weakPassword";

    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "auth.error.cancelled";

    case "auth/popup-blocked":
      return "auth.error.popupBlocked";

    case "auth/network-request-failed":
      return "auth.error.network";

    default:
      console.error("Unhandled auth error:", error);
      return "auth.error.generic";
  }
};

export const toResetMessage = (error: unknown): TranslationKey | null => {
  switch (authCodeOf(error)) {
    case "auth/user-not-found":
    case "auth/invalid-email":
      return null;

    case "auth/too-many-requests":
      return "auth.error.tooManyAttempts";

    case "auth/network-request-failed":
      return "auth.error.network";

    default:
      console.error("Unhandled password reset error:", error);
      return "auth.error.resetFailed";
  }
};
