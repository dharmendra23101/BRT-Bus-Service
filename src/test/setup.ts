/**
 * Global test setup.
 *
 * Everything here exists so that an individual test file can focus on the
 * behaviour it is checking rather than re-stubbing the same browser and
 * Firebase surfaces. Anything a test needs to *control* lives in
 * `helpers/`; this file only establishes safe defaults.
 */

import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { installMatchMedia, resetMediaQueries } from "./helpers/media";

configure({ asyncUtilTimeout: 5000 });

/*
  The Firebase SDK is never loaded in tests.

  `src/firebase.ts` calls `initializeApp` at module load and opens real
  network connections, and it is reachable from the auth context that most
  component tests mount. Replacing the module wholesale keeps tests fast,
  offline and deterministic. `helpers/firebase.ts` owns the controllable
  state behind it.
*/
vi.mock("@/firebase", async () => {
  const helper = await import("./helpers/firebase");
  return helper.firebaseModuleMock();
});

vi.mock("firebase/auth", async () => {
  const helper = await import("./helpers/firebase");
  return helper.firebaseAuthMock();
});

/*
  Firestore is backed by an in-memory document store rather than stubbed
  per-call, so `userService` runs its real logic against something that
  behaves like a database.
*/
vi.mock("firebase/firestore", async () => {
  const helper = await import("./helpers/firebase");
  return helper.firestoreMock();
});

/*
  The Realtime Database is backed by a node tree with live listeners, so
  `locationService` runs its real subscription and cleanup logic. It stays
  switched off until a test calls `enableRtdb`.
*/
vi.mock("firebase/database", async () => {
  const helper = await import("./helpers/firebase");
  return helper.firebaseDatabaseMock();
});

/** jsdom implements neither of these, and several components call them. */
beforeEach(() => {
  installMatchMedia();

  // Radix scroll-locking and the notification popup both reach for these.
  window.HTMLElement.prototype.scrollIntoView ??= vi.fn();
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

  // The Notification constructor is not implemented by jsdom.
  Object.defineProperty(window, "Notification", {
    writable: true,
    configurable: true,
    value: Object.assign(vi.fn(), { permission: "default", requestPermission: vi.fn() }),
  });

  /*
    jsdom exposes `navigator.clipboard` as a getter-only property, so it
    cannot be assigned. Defining it fresh each test gives copy-to-clipboard
    behaviour a spy to assert on, and stops one test's calls leaking into
    the next.
  */
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

afterEach(async () => {
  cleanup();

  // Media queries are module state, so a test that turns reduced motion on
  // would otherwise leave it on for everything after it.
  resetMediaQueries();

  // Storage is shared process-wide, so a ticket written by one test would
  // otherwise be visible to the next.
  localStorage.clear();

  const { resetFirebaseMocks } = await import("./helpers/firebase");
  resetFirebaseMocks();

  // The demo payment provider remembers settled attempts by idempotency key,
  // so an identical journey in the next test would resolve instantly from the
  // cache and never render its processing state.
  const { resetDemoPayments } = await import("@/services/payment/demoProvider");
  resetDemoPayments();

  vi.useRealTimers();
});
