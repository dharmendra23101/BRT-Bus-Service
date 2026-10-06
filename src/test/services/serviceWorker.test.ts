/**
 * Registering the offline shell.
 *
 * The service worker itself cannot run here - jsdom has no service worker
 * implementation, so its caching behaviour is verified in a real browser and
 * recorded as such. What is testable, and what these cover, is the decision to
 * register at all: everything the site does works without one, so every refusal
 * has to leave the app running rather than throwing into the entry point.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SERVICE_WORKER_URL,
  registerServiceWorker,
} from "@/services/serviceWorker";

const withServiceWorker = (register: ReturnType<typeof vi.fn>) => {
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { register },
  });

  return register;
};

afterEach(() => {
  Reflect.deleteProperty(navigator, "serviceWorker");
  vi.restoreAllMocks();
});

describe("turning the offline shell on", () => {
  it("registers the worker at the root scope", async () => {
    const register = withServiceWorker(
      vi.fn().mockResolvedValue({ scope: "/" })
    );

    await registerServiceWorker(true);

    expect(register).toHaveBeenCalledWith(SERVICE_WORKER_URL, { scope: "/" });
  });

  it("hands back the registration it was given", async () => {
    const registration = { scope: "/" };
    withServiceWorker(vi.fn().mockResolvedValue(registration));

    await expect(registerServiceWorker(true)).resolves.toBe(registration);
  });
});

describe("when it should not or cannot register", () => {
  /*
    A worker in front of the dev server answers with yesterday's module graph
    and makes every later edit look like it never applied.
  */
  it("stays out of the way in development", async () => {
    const register = withServiceWorker(vi.fn());

    await expect(registerServiceWorker(false)).resolves.toBeNull();
    expect(register).not.toHaveBeenCalled();
  });

  it("does nothing in a browser that has no service workers", async () => {
    await expect(registerServiceWorker(true)).resolves.toBeNull();
  });

  /*
    A private window can refuse registration outright. The site works without
    the cache, so this must not reach the caller as a rejection.
  */
  it("survives a refusal rather than throwing into the entry point", async () => {
    withServiceWorker(vi.fn().mockRejectedValue(new Error("denied")));
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(registerServiceWorker(true)).resolves.toBeNull();
    expect(logged).toHaveBeenCalled();
  });
});
