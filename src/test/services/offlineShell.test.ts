/**
 * The offline shell's caching policy, executed rather than read.
 *
 * `public/sw.js` is plain JavaScript that talks to `self`, `caches` and
 * `fetch`, so it does not need a service worker runtime to run - it needs
 * those three things. Supplying them by hand is what makes the policy
 * testable, and until now it was not tested at all: the file was reviewed by
 * eye and shipped, and both defects below survived that review.
 *
 * What this cannot check is that a browser wires the events up the way these
 * fakes do. Registration itself is covered in `serviceWorker.test.ts`.
 */

import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ORIGIN = "https://brt.test";

/** Minimal stand-in for a Response: the worker reads `.ok` and clones. */
const responseOf = (body: string, ok = true) => ({
  ok,
  body,
  clone: () => responseOf(body, ok),
});

type FakeResponse = ReturnType<typeof responseOf>;
type Addressable = { url: string } | string;

const urlOf = (request: Addressable) =>
  typeof request === "string" ? request : request.url;

/** Minimal stand-in for CacheStorage, with the stored entries inspectable. */
const cacheStorage = () => {
  const stores = new Map<string, Map<string, FakeResponse>>();

  const open = async (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const entries = stores.get(name)!;

    return {
      match: async (request: Addressable) => entries.get(urlOf(request)),
      put: async (request: Addressable, response: FakeResponse) =>
        void entries.set(urlOf(request), response),
      add: async () => undefined,
    };
  };

  return {
    stores,
    caches: {
      open,
      keys: async () => [...stores.keys()],
      delete: async (name: string) => stores.delete(name),
      match: async (key: string) => {
        for (const entries of stores.values()) {
          const hit = entries.get(key);
          if (hit) return hit;
        }

        return undefined;
      },
    },
  };
};

const loadWorker = (fetchImpl: (request: unknown) => Promise<FakeResponse>) => {
  const source = readFileSync("public/sw.js", "utf8").replace(
    "__BUILD_ID__",
    "testbuild"
  );

  const listeners = new Map<string, (event: unknown) => void>();
  const storage = cacheStorage();

  const self = {
    addEventListener: (type: string, handler: (event: unknown) => void) =>
      void listeners.set(type, handler),
    location: { origin: ORIGIN },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
  };

  const evaluate = new Function("self", "caches", "fetch", "URL", source);
  evaluate(self, storage.caches, fetchImpl, URL);

  const fire = (type: string, event: Record<string, unknown>) => {
    listeners.get(type)!(event);
  };

  /** Runs the fetch handler and returns whatever it chose to respond with. */
  const request = (url: string, init: Record<string, unknown> = {}) => {
    let responded: Promise<FakeResponse> | undefined;

    fire("fetch", {
      request: { url, method: "GET", ...init },
      respondWith: (value: Promise<FakeResponse>) => void (responded = value),
    });

    return responded;
  };

  /** Runs a lifecycle handler and waits for whatever it extended itself with. */
  const lifecycle = async (type: string) => {
    let settled: Promise<unknown> | undefined;

    fire(type, { waitUntil: (value: Promise<unknown>) => void (settled = value) });

    await settled;
  };

  return { fire, request, lifecycle, storage, self };
};

const ASSET = `${ORIGIN}/assets/index-abc123.js`;
const ICON = `${ORIGIN}/icon-192.png`;

let offline: () => Promise<never>;

beforeEach(() => {
  offline = () => Promise.reject(new TypeError("Failed to fetch"));
});

describe("an asset the worker has never seen, with no connection", () => {
  /*
    The defect this exists for. A `.catch(() => cached)` looked like a safe
    fallback and was not: with nothing cached, `cached` is undefined, so the
    handler resolved to undefined, and `respondWith(undefined)` throws a
    TypeError. The request then failed as a fault inside the offline shell
    rather than as the ordinary network error it actually was.
  */
  it("fails as a network error rather than resolving to nothing", async () => {
    const worker = loadWorker(offline);

    const responded = worker.request(ICON);

    expect(responded, "the worker declined to respond at all").toBeDefined();
    await expect(responded).rejects.toThrow(/Failed to fetch/);
  });

  it("never hands the browser a non-response", async () => {
    const worker = loadWorker(offline);

    await expect(worker.request(ASSET)).rejects.toBeInstanceOf(TypeError);
  });
});

describe("an asset the worker has already cached", () => {
  const seed = async (
    worker: ReturnType<typeof loadWorker>,
    url: string,
    body: string
  ) => {
    const cache = await worker.storage.caches.open("brt-testbuild-assets");

    await cache.put(url, responseOf(body));
  };

  it("serves it with no connection", async () => {
    const worker = loadWorker(offline);
    await seed(worker, ASSET, "cached bundle");

    await expect(worker.request(ASSET)).resolves.toMatchObject({
      body: "cached bundle",
    });
  });

  /*
    A hashed filename is content-addressed, so a hit cannot be stale and going
    to the network would only cost a round trip.
  */
  it("does not go to the network for a hashed filename", async () => {
    const fetchImpl = vi.fn(async () => responseOf("network"));
    const worker = loadWorker(fetchImpl);
    await seed(worker, ASSET, "cached bundle");

    await worker.request(ASSET);

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  /* An unhashed name can change under the same URL, so it is revalidated. */
  it("revalidates an unhashed name in the background", async () => {
    const fetchImpl = vi.fn(async () => responseOf("fresh icon"));
    const worker = loadWorker(fetchImpl);
    await seed(worker, ICON, "old icon");

    await expect(worker.request(ICON)).resolves.toMatchObject({
      body: "old icon",
    });
    expect(fetchImpl).toHaveBeenCalled();
  });
});

describe("what the worker refuses to touch", () => {
  it("passes a cross-origin request straight through", () => {
    const worker = loadWorker(offline);

    expect(
      worker.request("https://firestore.googleapis.com/v1/x")
    ).toBeUndefined();
  });

  it("passes a write straight through", () => {
    const worker = loadWorker(offline);

    expect(
      worker.request(`${ORIGIN}/anything`, { method: "POST" })
    ).toBeUndefined();
  });
});

describe("a navigation", () => {
  const seedShell = async (
    worker: ReturnType<typeof loadWorker>,
    body: string
  ) => {
    const cache = await worker.storage.caches.open("brt-testbuild-shell");

    await cache.put("/index.html", responseOf(body));
  };

  it("prefers the network so a corrected timetable arrives", async () => {
    const worker = loadWorker(async () => responseOf("fresh page"));
    await seedShell(worker, "stale page");

    await expect(
      worker.request(`${ORIGIN}/timetable`, { mode: "navigate" })
    ).resolves.toMatchObject({ body: "fresh page" });
  });

  it("falls back to the cached shell with no connection", async () => {
    const worker = loadWorker(offline);
    await seedShell(worker, "shell");

    await expect(
      worker.request(`${ORIGIN}/timetable`, { mode: "navigate" })
    ).resolves.toMatchObject({ body: "shell" });
  });
});

describe("superseding an earlier deploy", () => {
  /*
    The second defect. This purge is correct, and with a hand-written version
    constant it could never run: a browser installs a new worker only when the
    file's bytes differ, and they never did. The build now stamps the version
    from the bundle hash, so the caches a previous deploy left behind carry a
    different name and this deletes them.
  */
  it("deletes the caches a previous version left behind", async () => {
    const worker = loadWorker(offline);

    await worker.storage.caches.open("brt-oldbuild-assets");
    await worker.storage.caches.open("brt-oldbuild-shell");
    await worker.storage.caches.open("brt-testbuild-assets");

    await worker.lifecycle("activate");

    expect([...worker.storage.stores.keys()]).toEqual(["brt-testbuild-assets"]);
  });

  it("takes over open pages once it has", async () => {
    const worker = loadWorker(offline);

    await worker.lifecycle("activate");

    expect(worker.self.clients.claim).toHaveBeenCalled();
  });
});
