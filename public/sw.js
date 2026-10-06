/*
  The offline shell.

  Written by hand rather than generated, because what this may and may not
  cache is a correctness question for a transit site and the whole policy needs
  to fit in one readable file.

  Two rules govern everything below.

  ONLY SAME-ORIGIN GET REQUESTS ARE TOUCHED. Firebase auth, Firestore and the
  Realtime Database are cross-origin and pass straight through. A cached
  timetable is a convenience; a cached bus position or a cached sign-in would
  be a lie about the present, and a cached write would be a defect.

  NAVIGATION IS NETWORK-FIRST. The cache is a fallback for having no
  connection, never the preferred answer, so a deploy correcting a departure
  time reaches everybody as soon as they are online rather than whenever their
  cache happens to expire. Stale transit data is not a stale website.
*/

/*
  Stamped at build time from the hash of the emitted bundle, by the
  `stamp-service-worker` plugin in `vite.config.ts`. It has to change when the
  build changes, and for two reasons rather than one.

  A browser only installs a new worker when the BYTES of this file differ. With
  a hand-written constant they never did, so after the first deploy no later
  worker ever installed, `activate` never ran again, and the purge below was
  unreachable code guarding caches that were never superseded anyway - the
  assets cache simply grew, keeping every hashed file ever shipped.

  The literal survives in development, where no worker is registered at all.
*/
const VERSION = "brt-__BUILD_ID__";
const SHELL = `${VERSION}-shell`;
const ASSETS = `${VERSION}-assets`;

/* Every SPA route is served the same document, so one entry covers them all. */
const SHELL_KEY = "/index.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.add(SHELL_KEY))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL && key !== ASSETS)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

const cacheShell = async (response) => {
  if (!response || !response.ok) return;

  const cache = await caches.open(SHELL);
  await cache.put(SHELL_KEY, response.clone());
};

const navigateOrFallBack = async (request) => {
  try {
    const response = await fetch(request);

    await cacheShell(response);

    return response;
  } catch (error) {
    const cached = await caches.match(SHELL_KEY);

    if (cached) return cached;

    throw error;
  }
};

/*
  Built assets carry a content hash in their filename, so a hit can never be
  stale: a changed file is a different URL. Anything else same-origin - the
  icons, the manifest - is revalidated in the background so a replacement is
  picked up on the visit after it lands.
*/
const assetFirst = async (request, immutable) => {
  const cache = await caches.open(ASSETS);
  const cached = await cache.match(request);

  if (cached && immutable) return cached;

  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());

      return response;
    })
    .catch((error) => {
      /*
        Falling back to `cached` here read as harmless and was not: on the
        path where nothing is cached AND the network fails, it resolved to
        `undefined`, and `respondWith(undefined)` is a TypeError. An offline
        request for an asset this worker had never seen therefore failed as a
        fault inside the worker rather than as the ordinary network error it
        is - which is the difference between a browser that retries and a
        console full of exceptions blamed on the offline shell.
      */
      if (cached) return cached;

      throw error;
    });

  return cached ?? network;
};

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(navigateOrFallBack(request));
    return;
  }

  event.respondWith(assetFirst(request, url.pathname.startsWith("/assets/")));
});
