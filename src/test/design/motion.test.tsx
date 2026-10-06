/**
 * The motion contract.
 *
 * Before this file existed, deleting the reduced-motion rule from `index.css`
 * failed nothing: the `matchMedia` stub answered `false` to every query and
 * its `addEventListener` never called a listener, so no media-query branch in
 * the app was reachable from a test. The app's only motion-accessibility
 * guarantee had no protection at all.
 *
 * The CSS assertions read the stylesheet from disk. jsdom loads no stylesheet
 * and computes no layout, so there is no other way to see any of this.
 */

import { readFileSync } from "node:fs";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Home from "@/pages/Home";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { renderWithProviders, screen } from "../helpers/render";
import { prefersReducedMotion } from "../helpers/media";

vi.mock("@/services/userService", async () => {
  const helper = await import("../helpers/userService");
  return helper.userServiceMock();
});

const SRC = join(process.cwd(), "src");
const CSS = readFileSync(join(SRC, "index.css"), "utf8");

const sourceFiles = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === "test") continue;
      sourceFiles(path, out);
      continue;
    }

    if (/\.(tsx|ts|css)$/.test(entry.name)) out.push(path);
  }

  return out;
};

describe("the reduced-motion guarantee", () => {
  it("is declared at all", () => {
    expect(CSS).toContain("@media (prefers-reduced-motion: reduce)");
  });

  /*
    Collapsed to 0.01ms rather than removed, so anything waiting on
    `animationend` or `transitionend` still fires. Removing the animation
    outright would strand that logic.
  */
  it("collapses durations instead of removing them", () => {
    expect(CSS).toContain("animation-duration: 0.01ms !important");
    expect(CSS).toContain("transition-duration: 0.01ms !important");
  });

  /*
    The clamp that was missing. A staggered card still reported a 500ms delay
    with the durations collapsed, so anything gated on `animationend` waited
    half a second anyway - and a stagger with `animation-fill-mode: both`
    would show a reduced-motion user a blank card for that whole time.
  */
  it("clamps the delays too, not only the durations", () => {
    expect(CSS).toContain("animation-delay: 0.01ms !important");
    expect(CSS).toContain("transition-delay: 0.01ms !important");
  });
});

describe("asking for the preference from JavaScript", () => {
  it("reports the system setting", () => {
    const off = renderHook(() => useReducedMotion());

    expect(off.result.current).toBe(false);

    prefersReducedMotion(true);

    const on = renderHook(() => useReducedMotion());

    expect(on.result.current).toBe(true);
  });

  /*
    The preference can be switched while the tab is open, and a hook that only
    read it once would leave the page animating for the rest of the session.
  */
  it("follows the setting being changed mid-session", () => {
    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(false);

    act(() => prefersReducedMotion(true));

    expect(result.current).toBe(true);

    act(() => prefersReducedMotion(false));

    expect(result.current).toBe(false);
  });
});

describe("motion that a stylesheet cannot reach", () => {
  /*
    The headline cycles for as long as the page is open - auto-starting motion
    in WCAG 2.2.2's sense. It is a timer swapping content, so the CSS rule does
    nothing about it whatever.
  */
  it("stops the rotating headline when motion is reduced", () => {
    prefersReducedMotion(true);
    vi.useFakeTimers({ shouldAdvanceTime: true });

    renderWithProviders(<Home />, { route: "/" });

    const first = screen.getByRole("heading", { level: 1 }).textContent;

    /*
      One tick, not several: the list has four entries on a three-second
      interval, so advancing a multiple of twelve seconds returns to the line
      it started on and the assertion passes whether the guard is there or
      not. It did, until this comment was written.
    */
    act(() => {
      vi.advanceTimersByTime(3_500);
    });

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(first);

    vi.useRealTimers();
  });

  it("still rotates it when motion is not reduced", () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    renderWithProviders(<Home />, { route: "/" });

    const first = screen.getByRole("heading", { level: 1 }).textContent;

    act(() => {
      vi.advanceTimersByTime(3_500);
    });

    expect(screen.getByRole("heading", { level: 1 }).textContent).not.toBe(first);

    vi.useRealTimers();
  });
});

describe("what is allowed to animate", () => {
  /*
    `transition-all` animates layout-affecting properties by accident, forcing
    style recalculation on exactly the low-end hardware this product targets.
    There were 32 of them across 15 files.
  */
  it("never animates every property at once", () => {
    const offenders = sourceFiles(SRC).flatMap((path) =>
      readFileSync(path, "utf8")
        .split("\n")
        .map((line, index) => ({ line, index }))
        .filter(({ line }) => line.includes("transition-all"))
        .map(({ index }) => `${path.slice(SRC.length + 1)}:${index + 1}`)
    );

    expect(offenders).toEqual([]);
  });

  /*
    Never `width`, `height`, `top`, `left`, `margin` or `padding` - they force
    layout every frame. The nav underline used to animate `width` on hover for
    every item in the bar.
  */
  it("never animates a layout property", () => {
    const LAYOUT = /\b(width|height|top|left|right|bottom|margin|padding)\b/;

    // Both spellings: the Tailwind utility and a hand-written CSS declaration.
    const DECLARATIONS =
      /transition-\[([^\]]*)\]|transition(?:-property)?:\s*([^;]*);/g;

    const offenders = sourceFiles(SRC).flatMap((path) =>
      readFileSync(path, "utf8")
        .split("\n")
        .flatMap((line, index) =>
          [...line.matchAll(DECLARATIONS)]
            .map((m) => m[1] ?? m[2] ?? "")
            .filter((properties) => LAYOUT.test(properties))
            .map(() => `${path.slice(SRC.length + 1)}:${index + 1}`)
        )
    );

    expect(offenders).toEqual([]);
  });

  it("keeps every duration in the stylesheet on a token", () => {
    for (const token of [
      "--motion-duration-state: 150ms",
      "--motion-duration-enter: 200ms",
      "--motion-duration-settle: 400ms",
      "--motion-ease:",
    ]) {
      expect(CSS).toContain(token);
    }

    // Anything hand-written in the component layer bypasses the tokens.
    const raw = CSS.split("\n").filter((line) =>
      /transition:[^;]*\b\d+(\.\d+)?m?s\b/.test(line)
    );

    expect(raw).toEqual([]);
  });
});

/*
  The gap the stylesheet check could not see.

  `keeps every duration in the stylesheet on a token` reads `index.css` only,
  and Tailwind's `duration-*` utilities never reach it - they emit literal
  milliseconds straight into the component layer. So the app shipped 300ms,
  500ms and 700ms transitions that matched no token, and the guard passed.

  The tokens are now spellable as class names (`duration-state`,
  `duration-enter`, `duration-settle`, see `tailwind.config.ts`), which makes a
  raw duration a thing to reject rather than the only option available.

  `components/ui` is exempt: it is vendored shadcn, and rewriting it on every
  upgrade to satisfy our token names would cost more than it protects.
*/
describe("the component layer is on the same tokens", () => {
  const OWN_CODE = sourceFiles(SRC).filter(
    (file) => !file.replace(/\\/g, "/").includes("/components/ui/")
  );

  const offenders = (pattern: RegExp) =>
    OWN_CODE.flatMap((file) => {
      const matches = readFileSync(file, "utf8").match(pattern) ?? [];

      return matches.map((match) => `${file.replace(SRC, "src")}: ${match}`);
    });

  it("finds source files to check at all", () => {
    expect(OWN_CODE.length).toBeGreaterThan(20);
  });

  it("spells no duration as a raw number", () => {
    expect(offenders(/\bduration-(?:\d+|\[[^\]]+\])/g)).toEqual([]);
  });

  it("spells no delay as a raw number", () => {
    expect(offenders(/\bdelay-(?:\d+|\[[^\]]+\])/g)).toEqual([]);
  });

  /*
    Proves the replacement is actually reachable rather than merely absent -
    a rule satisfied by deleting all motion would be no rule at all.
  */
  it("uses the token utilities instead", () => {
    expect(
      offenders(/\bduration-(?:state|enter|settle)/g).length
    ).toBeGreaterThan(10);
  });
});

/*
  MOTION-6, the dependency tripwire.

  The decision not to add an animation library was reasoned about at length
  and recorded in a private document, which is exactly where a decision goes
  to die: the first contributor who hits a jank complaint runs `npm i motion`
  and nothing objects. The reasoning is summarised here because a test is the
  only part of the argument that survives contact with a new contributor.
*/
describe("no animation library", () => {
  const manifest = JSON.parse(
    readFileSync(join(process.cwd(), "package.json"), "utf8")
  ) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };

  const installed = Object.keys({
    ...manifest.dependencies,
    ...manifest.devDependencies,
  });

  /*
    The app's motion is three CSS tokens and a reduced-motion block. A runtime
    animation library would add a bundle to the initial load, and - the part
    that matters - it would animate through WAAPI, which the CSS
    reduced-motion override in `index.css` does not reach. The accessibility
    guarantee asserted at the top of this file would silently stop applying.
  */
  it("is installed", () => {
    const banned = [
      "motion",
      "framer-motion",
      "gsap",
      "react-spring",
      "@react-spring/web",
      "animejs",
      "popmotion",
      "auto-animate",
      "@formkit/auto-animate",
    ];

    const found = installed.filter((name) => banned.includes(name));

    expect(
      found,
      `${found.join(", ")} would animate through WAAPI, which the ` +
        "reduced-motion rule in index.css cannot override. If this is a " +
        "deliberate reversal, the reduced-motion guarantee needs rebuilding " +
        "in JS first."
    ).toEqual([]);
  });
});

/*
  The tripwire. An exit-animation library, a second layout wrapper or a
  duplicated page shell all show up as a second `#main-content`, which
  silently points the skip link at the wrong page.
*/
describe("the skip link still has exactly one target", () => {
  it("finds one main-content on a page", () => {
    renderWithProviders(<Home />, { route: "/" });

    expect(document.querySelectorAll("#main-content")).toHaveLength(1);
  });
});
