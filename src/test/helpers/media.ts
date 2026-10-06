/**
 * A `matchMedia` stub that can actually answer a question.
 *
 * The previous mock hardcoded `matches: false` and gave `addEventListener` a
 * `vi.fn()` that never invoked its listener. That made every media-query
 * branch in the app unreachable from a test: deleting the reduced-motion rule
 * in `index.css` failed nothing at all, which by the standing rule means the
 * app's only motion-accessibility guarantee was unprotected.
 *
 * Queries default to not matching, so `use-mobile`'s `(max-width: …)` keeps
 * answering exactly as it did before. A test opts a query in, and listeners
 * registered against it are really called when it changes - which is the part
 * that lets a component respond to the preference being toggled mid-session.
 */

type ChangeListener = (event: MediaQueryListEvent) => void;

const matching = new Set<string>();
const listeners = new Map<string, Set<ChangeListener>>();

/** The query the reduced-motion contract is written against. */
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const notify = (query: string, matches: boolean) => {
  for (const listener of listeners.get(query) ?? []) {
    listener({ matches, media: query } as MediaQueryListEvent);
  }
};

/** Make a media query answer true or false for the rest of this test. */
export const setMediaQuery = (query: string, matches: boolean): void => {
  const was = matching.has(query);

  if (matches) matching.add(query);
  else matching.delete(query);

  if (was !== matches) notify(query, matches);
};

/** Shorthand for the one query that has a contract written around it. */
export const prefersReducedMotion = (matches = true): void =>
  setMediaQuery(REDUCED_MOTION_QUERY, matches);

export const resetMediaQueries = (): void => {
  matching.clear();
  listeners.clear();
};

export const installMatchMedia = (): void => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string): MediaQueryList => {
      const register = (listener: ChangeListener) => {
        const set = listeners.get(query) ?? new Set<ChangeListener>();
        set.add(listener);
        listeners.set(query, set);
      };

      const unregister = (listener: ChangeListener) => {
        listeners.get(query)?.delete(listener);
      };

      return {
        get matches() {
          return matching.has(query);
        },
        media: query,
        onchange: null,
        addEventListener: (_type: string, listener: ChangeListener) =>
          register(listener),
        removeEventListener: (_type: string, listener: ChangeListener) =>
          unregister(listener),
        // Safari below 14 only has the deprecated pair, and so do some
        // libraries that feature-detect it.
        addListener: register,
        removeListener: unregister,
        dispatchEvent: () => true,
      } as unknown as MediaQueryList;
    },
  });
};
