import { useEffect, useState } from "react";

/** The media feature every platform exposes the preference through. */
const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Whether the viewer has asked their system for reduced motion.
 *
 * The stylesheet already collapses CSS animation and transition durations
 * under this preference, and that rule covers every animation the app has
 * today - but only because every one of them is CSS. It reaches neither the
 * Web Animations API nor `requestAnimationFrame`, so the moment anything
 * moves from JavaScript - a map camera, a marker tween, a timer that swaps
 * content on an interval - the guarantee lapses silently. This hook is how
 * that code asks.
 *
 * It is also the only mechanism available on React Native, so building it
 * here means it ports rather than being reinvented.
 *
 * Reduced does not mean deleted: prefer substituting a cross-fade for a
 * slide, or a still frame for a loop, over removing the change entirely -
 * a state change nobody can see is worse than one that moves.
 */
export const useReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.(QUERY).matches ?? false
  );

  useEffect(() => {
    const list = window.matchMedia?.(QUERY);

    if (!list) return;

    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);

    // Re-read on mount: the preference can change between the initial state
    // and this effect, and it can change again while the tab is open.
    setReduced(list.matches);
    list.addEventListener("change", onChange);

    return () => list.removeEventListener("change", onChange);
  }, []);

  return reduced;
};
