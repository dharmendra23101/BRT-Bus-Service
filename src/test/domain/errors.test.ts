/**
 * Error messages that reach a user.
 *
 * The sign-in mapping is a security control, not cosmetics: Firebase
 * distinguishes "no such user" from "wrong password", and surfacing that
 * difference turns the login form into an oracle for discovering which email
 * addresses are registered. The first test here is the one that matters.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AuthenticationError,
  AuthorizationError,
  isAuthorizationError,
  toAuthMessage,
  toResetMessage,
  toSafeMessage,
} from "@/domain/auth/errors";
import { PERMISSIONS } from "@/domain/auth/permissions";
import { en } from "@/domain/i18n/en";
import { hi } from "@/domain/i18n/hi";

/*
  The mappers return KEYS, so what a passenger actually reads is one lookup
  further on - and there are two languages to read it in. Every assertion
  about wording therefore goes through the catalogues rather than through the
  mapper's return value, because that is where a regression would live now.
*/
const CATALOGUES = { en, hi } as const;
const rendered = (key: keyof typeof en) =>
  Object.values(CATALOGUES).map((catalogue) => catalogue[key]);

const firebaseError = (code: string) => Object.assign(new Error("raw"), { code });

/*
  These mappers log the real error before returning a safe one, which is the
  point of them - the detail has to survive for whoever debugs it. In a test
  run that logging printed a fixture reading "FIRESTORE (12.0.0) INTERNAL
  ASSERTION FAILED: project brtbus-116fa index missing" on every single run,
  and it was read as evidence that something was reaching a real Firestore.
  Nothing was. Silenced here, and asserted below so it stays real behaviour
  rather than becoming noise nobody checks.
*/
let logged: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  logged.mockRestore();
});

describe("sign-in failures cannot be used to enumerate accounts", () => {
  it("returns one identical message for every credential failure", () => {
    const codes = [
      "auth/user-not-found",
      "auth/wrong-password",
      "auth/invalid-credential",
      "auth/invalid-email",
    ];

    const keys = new Set(codes.map((code) => toAuthMessage(firebaseError(code))));

    // A single distinct message across all four is the whole point.
    expect(keys.size).toBe(1);
    expect([...keys][0]).toBe("auth.error.credentials");
  });

  /*
    And it has to stay one message in EVERY language, which the key alone does
    not guarantee. Hindi distinguishes "यह खाता मौजूद नहीं है" from "पासवर्ड
    ग़लत है" as naturally as English does; a translator improving the prose that
    way would rebuild the oracle in the language the mapper never sees.
  */
  it("stays one message in every language", () => {
    for (const text of rendered("auth.error.credentials")) {
      expect(text.length).toBeGreaterThan(0);
      expect(text).not.toMatch(/not found|no such|unknown account|मौजूद नहीं/i);
    }
  });

  it("never leaks the underlying Firebase code", () => {
    const key = toAuthMessage(firebaseError("auth/user-not-found"));

    for (const text of rendered(key)) {
      expect(text).not.toMatch(/auth\//);
      expect(text).not.toMatch(/firebase/i);
    }
  });
});

describe("other sign-in failures are explained usefully", () => {
  it.each([
    ["auth/too-many-requests", "auth.error.tooManyAttempts", /too many attempts/i],
    ["auth/user-disabled", "auth.error.disabled", /disabled/i],
    ["auth/weak-password", "auth.error.weakPassword", /at least 6 characters/i],
    ["auth/popup-closed-by-user", "auth.error.cancelled", /cancelled/i],
    ["auth/popup-blocked", "auth.error.popupBlocked", /popup/i],
    ["auth/network-request-failed", "auth.error.network", /network/i],
  ] as const)("maps %s to something actionable", (code, key, english) => {
    expect(toAuthMessage(firebaseError(code))).toBe(key);
    expect(en[key]).toMatch(english);
  });

  /*
    Every code maps to a key the catalogues answer for. Without this the
    mapper could name a key nobody wrote and a passenger would read
    `auth.error.somethingNew` - which compiles, because the key type is only
    as good as the catalogue it was derived from.
  */
  it("only ever names a key that exists in both languages", () => {
    const codes = [
      "auth/user-not-found",
      "auth/too-many-requests",
      "auth/user-disabled",
      "auth/email-already-in-use",
      "auth/weak-password",
      "auth/popup-blocked",
      "auth/network-request-failed",
      "auth/something-new",
    ];

    for (const code of codes) {
      for (const text of rendered(toAuthMessage(firebaseError(code)))) {
        expect(text, code).toBeTruthy();
      }
    }
  });

  it("falls back to a generic message for an unrecognised code", () => {
    expect(toAuthMessage(firebaseError("auth/something-new"))).toBe(
      "auth.error.generic"
    );
  });

  it("handles a thrown value that is not a Firebase error at all", () => {
    expect(toAuthMessage("just a string")).toBe("auth.error.generic");
  });
});

describe("authorization errors", () => {
  it("says nothing about what was being protected", () => {
    const error = new AuthorizationError(PERMISSIONS.ASSIGN_ROLES);

    // The permission is available to the developer but absent from the text.
    expect(error.permission).toBe(PERMISSIONS.ASSIGN_ROLES);
    expect(error.message).toBe("You do not have permission to perform this action.");
    expect(error.message).not.toMatch(/users:/);
  });

  it("is recognisable to callers", () => {
    expect(isAuthorizationError(new AuthorizationError())).toBe(true);
    expect(isAuthorizationError(new Error("nope"))).toBe(false);
  });
});

describe("turning any thrown value into something safe to show", () => {
  it("passes through our own authorization message", () => {
    expect(toSafeMessage(new AuthorizationError())).toBe("error.noPermission");
    expect(en["error.noPermission"]).toMatch(/do not have permission/i);
  });

  it("passes through our own authentication message", () => {
    expect(toSafeMessage(new AuthenticationError())).toBe("error.signInRequired");
    expect(en["error.signInRequired"]).toMatch(/sign in/i);
  });

  it("reads a rules rejection as a plain refusal", () => {
    // Permission denied is the rules doing their job, not a bug.
    expect(toSafeMessage(firebaseError("permission-denied"))).toBe(
      "error.noPermission"
    );
  });

  it("distinguishes a network problem so the user knows to retry", () => {
    expect(toSafeMessage(firebaseError("unavailable"))).toBe("error.network");
    expect(en["error.network"]).toMatch(/network/i);
  });

  it("collapses anything unrecognised rather than leaking backend detail", () => {
    const leaky = new Error(
      "FIRESTORE (12.0.0) INTERNAL ASSERTION FAILED: project brtbus-116fa index missing"
    );

    const message = toSafeMessage(leaky);

    expect(message).toBe("error.generic");
    expect(en[message]).not.toMatch(/brtbus/);
    expect(hi[message]).not.toMatch(/brtbus/);
  });

  /*
    Redacting for the user must not mean discarding for the developer. If this
    ever stops holding, an unmapped failure becomes invisible everywhere.
  */
  it("still logs the real error for whoever has to debug it", () => {
    const leaky = new Error("FIRESTORE INTERNAL ASSERTION FAILED: index missing");

    toSafeMessage(leaky);

    expect(logged).toHaveBeenCalledWith(expect.stringContaining("Unhandled"), leaky);
  });

  it("accepts a caller-supplied fallback", () => {
    expect(toSafeMessage(new Error("x"), "error.loadUsers")).toBe(
      "error.loadUsers"
    );
    expect(en["error.loadUsers"]).toBe("Could not load users.");
  });
});

describe("a password reset cannot be used to enumerate accounts", () => {
  it("reports nothing to show when the address has no account", () => {
    expect(toResetMessage(firebaseError("auth/user-not-found"))).toBeNull();
  });

  it("treats an address the backend rejects the same way", () => {
    expect(toResetMessage(firebaseError("auth/invalid-email"))).toBeNull();
  });

  it("still reports rate limiting, which reveals nothing about an account", () => {
    expect(toResetMessage(firebaseError("auth/too-many-requests"))).toBe(
      "auth.error.tooManyAttempts"
    );
    expect(en["auth.error.tooManyAttempts"]).toMatch(/too many attempts/i);
  });

  it("distinguishes a network problem so the user knows to retry", () => {
    expect(toResetMessage(firebaseError("auth/network-request-failed"))).toBe(
      "auth.error.network"
    );
    expect(en["auth.error.network"]).toMatch(/network/i);
  });

  it("collapses anything unrecognised rather than leaking backend detail", () => {
    const message = toResetMessage(new Error("PROJECT brtbus-116fa rule /users/{id}"));

    expect(message).toBe("auth.error.resetFailed");
    expect(message).not.toMatch(/brtbus/);
  });
});
