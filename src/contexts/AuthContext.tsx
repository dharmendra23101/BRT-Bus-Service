/**
 * Authentication state and actions.
 *
 * Security responsibilities of this provider:
 *
 *  - `role` is only ever derived from a Firestore read of the signed-in
 *    user's own document. It is never read from storage, a URL, or anything
 *    else the visitor can edit.
 *  - `loading` stays true until the role is resolved, so guards never see a
 *    signed-in user with an unknown role and let them through.
 *  - Responses that arrive after the session has moved on are discarded, so a
 *    slow read for account A cannot publish A's role into account B's session.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth, googleProvider } from "@/firebase";
import { toAuthMessage, toResetMessage } from "@/domain/auth/errors";
import { signInSchema, signUpSchema } from "@/domain/validation/schemas";
import { isTranslationKey } from "@/domain/i18n/strings";
import type { TranslationKey } from "@/domain/i18n/en";
import {
  createUserRecord,
  ensureUserRecord,
  toUserProfile,
} from "@/services/userService";
import { purgeLegacyKeys } from "@/services/storageService";
import type { Actor, UserProfile, UserRole } from "@/types/user";

interface AuthContextValue {
  user: FirebaseUser | null;
  role: UserRole | null;
  profile: UserProfile | null;
  /** True until the session AND its role are fully resolved. */
  loading: boolean;
  /** Identity to pass to services performing privileged operations. */
  actor: Actor | null;
  signUp: (name: string, email: string, password: string) => Promise<TranslationKey | null>;
  signIn: (email: string, password: string) => Promise<TranslationKey | null>;
  signInWithGoogle: () => Promise<TranslationKey | null>;
  resetPassword: (email: string) => Promise<TranslationKey | null>;
  logout: () => Promise<void>;
  /**
   * Re-reads the signed-in user's record and republishes role and profile.
   *
   * A Firestore write does not fire `onAuthStateChanged`, so without this a
   * role change would not take effect until a full page reload.
   */
  refreshUserRecord: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Auth state is deliberately persisted in this tab and shared across tabs, so
// signing out anywhere signs out everywhere. Failure is non-fatal: the SDK
// falls back to its default persistence.
void setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Could not set auth persistence:", error);
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Monotonic session counter.
   *
   * Every auth transition claims a number; an async result may only publish
   * if its number is still current. This is what makes fast sign-out /
   * sign-in-as-someone-else safe.
   */
  const sessionRef = useRef(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      const session = ++sessionRef.current;

      if (!nextUser) {
        setUser(null);
        setRole(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setUser(nextUser);
      setLoading(true);

      // Remove anything an older build may have cached, including any
      // localStorage copy of a role.
      purgeLegacyKeys();

      try {
        const record = await ensureUserRecord(nextUser);

        if (session !== sessionRef.current) return;

        setRole(record.role);
        setProfile(toUserProfile(nextUser, record));
      } catch (error) {
        if (session !== sessionRef.current) return;

        // Fail closed: an unreadable record must not be treated as elevated.
        console.error("Could not resolve user record; defaulting to no role.", error);
        setRole(null);
        setProfile(toUserProfile(nextUser, null));
      } finally {
        if (session === sessionRef.current) setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const signUp = useCallback(
    async (name: string, email: string, password: string): Promise<TranslationKey | null> => {
      const parsed = signUpSchema.safeParse({ name, email, password });

      if (!parsed.success) {
        const issue = parsed.error.issues[0]?.message;

        return isTranslationKey(issue) ? issue : "validation.generic";
      }

      try {
        const credential = await createUserWithEmailAndPassword(
          auth,
          parsed.data.email,
          parsed.data.password
        );

        await updateProfile(credential.user, { displayName: parsed.data.name });

        // Written explicitly so the chosen display name wins over the default
        // the auth listener would otherwise create.
        const record = await createUserRecord(credential.user, parsed.data.name);

        setRole(record.role);
        setProfile(toUserProfile(credential.user, record));

        return null;
      } catch (error) {
        return toAuthMessage(error);
      }
    },
    []
  );

  const signIn = useCallback(
    async (email: string, password: string): Promise<TranslationKey | null> => {
      const parsed = signInSchema.safeParse({ email, password });

      // A malformed local value is reported as a credential failure so the
      // form cannot be used to probe which addresses are registered.
      if (!parsed.success) return "auth.error.credentials";

      try {
        await signInWithEmailAndPassword(auth, parsed.data.email, parsed.data.password);
        return null;
      } catch (error) {
        return toAuthMessage(error);
      }
    },
    []
  );

  const signInWithGoogle = useCallback(async (): Promise<TranslationKey | null> => {
    try {
      await signInWithPopup(auth, googleProvider);
      return null;
    } catch (error) {
      return toAuthMessage(error);
    }
  }, []);

  const resetPassword = useCallback(
    async (email: string): Promise<TranslationKey | null> => {
      try {
        await sendPasswordResetEmail(auth, email);
        return null;
      } catch (error) {
        return toResetMessage(error);
      }
    },
    []
  );

  /**
   * Ends the session.
   *
   * Local state is cleared even when the network sign-out fails, so a request
   * that never lands cannot leave a signed-out visitor looking signed in.
   */
  const logout = useCallback(async (): Promise<void> => {
    sessionRef.current += 1;

    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign out request failed; clearing local session anyway.", error);
    } finally {
      setUser(null);
      setRole(null);
      setProfile(null);
      setLoading(false);
      purgeLegacyKeys();
    }
  }, []);

  /**
   * Reads `auth.currentUser` rather than the `user` state so this stays
   * referentially stable and does not churn its consumers' dependencies.
   */
  const refreshUserRecord = useCallback(async (): Promise<void> => {
    const current = auth.currentUser;
    if (!current) return;

    const session = sessionRef.current;

    try {
      const record = await ensureUserRecord(current);

      if (session !== sessionRef.current) return;

      setRole(record.role);
      setProfile(toUserProfile(current, record));
    } catch (error) {
      console.error("Failed to refresh user record:", error);
    }
  }, []);

  const actor = useMemo<Actor | null>(
    () => (user ? { uid: user.uid, role } : null),
    [user, role]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role,
      profile,
      loading,
      actor,
      signUp,
      signIn,
      signInWithGoogle,
      resetPassword,
      logout,
      refreshUserRecord,
    }),
    [
      user,
      role,
      profile,
      loading,
      actor,
      signUp,
      signIn,
      signInWithGoogle,
      resetPassword,
      logout,
      refreshUserRecord,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) throw new Error("useAuth must be used within an AuthProvider");

  return context;
};
