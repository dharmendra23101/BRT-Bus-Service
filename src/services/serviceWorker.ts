/**
 * Turning the offline shell on.
 *
 * Registration is deliberately best-effort: everything the site does works
 * without a service worker, so a browser that refuses one, a private window
 * that blocks it, or a failed fetch of the script must leave the app running
 * normally rather than surfacing an error nobody can act on.
 *
 * Off in development. A service worker sitting in front of the dev server
 * serves yesterday's module graph back to you and makes every subsequent
 * change look like it did not apply - the flag is a parameter rather than a
 * bare `import.meta.env.PROD` read so the behaviour itself stays testable.
 */

export const SERVICE_WORKER_URL = "/sw.js";

export const registerServiceWorker = async (
  enabled: boolean = import.meta.env.PROD
): Promise<ServiceWorkerRegistration | null> => {
  if (!enabled) return null;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    return await navigator.serviceWorker.register(SERVICE_WORKER_URL, {
      scope: "/",
    });
  } catch (error) {
    console.error("Could not register the offline shell:", error);

    return null;
  }
};
