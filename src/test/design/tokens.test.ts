/**
 * The colour system has exactly one source of truth.
 *
 * Before this guard existed the app ran two parallel palettes: a token set in
 * `index.css` and 878 colour values that bypassed it, of which only 37.4%
 * routed through a token. That is why a rebrand could not be done by retuning
 * CSS variables - it would leave most of the screen unchanged.
 *
 * These tests are the thing that stops it rotting back. They read the source
 * from disk rather than rendering anything, because the defect is in what the
 * files say, not in what any single component does.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");

const sourceFiles = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      // Test fixtures may name a colour to assert on it.
      if (entry.name === "test") continue;
      sourceFiles(path, out);
      continue;
    }

    if (/\.(tsx|ts|css)$/.test(entry.name)) out.push(path);
  }

  return out;
};

const FILES = sourceFiles(SRC).map((path) => ({
  path: path.slice(SRC.length + 1).replace(/\\/g, "/"),
  text: readFileSync(path, "utf8"),
}));

/** Every line of every source file matching a pattern, named for the failure. */
const offenders = (pattern: RegExp): string[] =>
  FILES.flatMap(({ path, text }) =>
    text
      .split("\n")
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => pattern.test(line))
      .map(({ line, index }) => `${path}:${index + 1}  ${line.trim().slice(0, 100)}`)
  );

describe("no colour bypasses the token system", () => {
  it("has no hex literals outside the palette definition", () => {
    expect(offenders(/#[0-9a-fA-F]{6}\b/)).toEqual([]);
  });

  /*
    The channel a hex grep misses entirely. `rgba(135, 79, 156, .35)` IS
    #874f9c, and a "find all the purple" sweep that only looks for hexes
    reports done while the app is still purple.

    Only COLOURED literals are a defect. A neutral one - a black drop shadow,
    a white glass overlay - carries no hue, so it survives a rebrand unchanged
    and belongs where it is written.
  */
  it("has no coloured hsl or rgb literal", () => {
    const chromatic = FILES.flatMap(({ path, text }) =>
      text.split("\n").flatMap((line, index) => {
        const found = [
          ...line.matchAll(/hsla?\(\s*[\d.]+\s*,\s*([\d.]+)%/g),
        ]
          .filter((m) => Number(m[1]) !== 0)
          .map((m) => m[0]);

        found.push(
          ...[...line.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)]
            .filter((m) => new Set(m.slice(1, 4)).size > 1)
            .map((m) => m[0])
        );

        return found.map((hit) => `${path}:${index + 1}  ${hit}`);
      })
    );

    expect(chromatic).toEqual([]);
  });

  /*
    The third channel. Tailwind's named palette is a second colour system, and
    a branded UI that reaches into it cannot be rebranded from `index.css`.
  */
  it("uses no named Tailwind hue for brand colour", () => {
    expect(
      offenders(/-(purple|violet|indigo|fuchsia|pink)-\d{2,3}\b/)
    ).toEqual([]);
  });

  /*
    Caught this the hard way. Tailwind's opacity scale runs in steps of five,
    and an off-scale modifier is not an error - the utility simply is not
    generated. For a gradient stop that means the stop falls back to
    `transparent`, so `to-primary-deep/88` rendered the hero's end as
    rgba(125, 35, 23, 0): a colour that silently was not there.
  */
  it("uses only alpha values Tailwind actually generates", () => {
    const COLOUR_UTILITIES =
      /\b(?:bg|text|border|from|via|to|ring|ring-offset|fill|stroke|divide|outline|accent|caret|decoration|placeholder|shadow)-[a-z-]+\/(\d{1,3})\b/g;

    const offScale = FILES.flatMap(({ path, text }) =>
      text.split("\n").flatMap((line, index) =>
        [...line.matchAll(COLOUR_UTILITIES)]
          .filter((m) => Number(m[1]) % 5 !== 0 || Number(m[1]) > 100)
          .map((m) => `${path}:${index + 1}  ${m[0]}`)
      )
    );

    expect(offScale).toEqual([]);
  });
});

describe("the palette is complete", () => {
  const css = FILES.find((f) => f.path === "index.css")!.text;

  it("defines every brand rung the components ask for", () => {
    for (const token of ["--primary", "--primary-strong", "--primary-deep", "--surface-raised"]) {
      expect(css).toContain(`${token}:`);
    }
  });

  /*
    A token that Tailwind does not map is unreachable from a class name, which
    is how `--footer-bg` survived: changing it produced no visible effect and
    read as a rebrand step that had worked.
  */
  it("maps every custom brand token into Tailwind", () => {
    const config = readFileSync(join(process.cwd(), "tailwind.config.ts"), "utf8");
    const declared = [...css.matchAll(/--([a-z-]+):\s*[\d.]+ /g)].map((m) => m[1]!);
    const unmapped = declared.filter(
      (token) => !config.includes(`var(--${token})`) && !token.startsWith("sidebar")
    );

    expect(unmapped).toEqual([]);
  });
});

/**
 * The two assets no stylesheet can reach.
 *
 * A perfect source-level rebrand still leaves the browser tab and the phone's
 * address bar showing the old colour, because neither the favicon nor the
 * `theme-color` meta can read a CSS variable. Nothing else in the suite would
 * notice; this is the only thing standing between a rebrand and a purple tab.
 */
describe("the brand outside the stylesheet", () => {
  const css = FILES.find((f) => f.path === "index.css")!.text;

  const brandHex = (() => {
    const [h, s, l] = /--primary:\s*([\d.]+) ([\d.]+)% ([\d.]+)%/
      .exec(css)!
      .slice(1)
      .map(Number) as [number, number, number];

    const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
    const channel = (n: number) => {
      const k = (n + h / 30) % 12;
      const v = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));

      return Math.round(v * 255)
        .toString(16)
        .padStart(2, "0");
    };

    return `#${channel(0)}${channel(8)}${channel(4)}`.toUpperCase();
  })();

  it("stamps the brand colour on the browser chrome", () => {
    const html = readFileSync(join(process.cwd(), "index.html"), "utf8");

    expect(html).toContain(`name="theme-color" content="${brandHex}"`);
  });

  it("paints the favicon in the same brand colour", () => {
    const svg = readFileSync(join(process.cwd(), "public", "favicon.svg"), "utf8");
    const fills = [...svg.matchAll(/fill="(#[0-9a-fA-F]{6})"/g)].map((m) =>
      m[1]!.toUpperCase()
    );

    // White is the bus body; every other fill is the brand.
    expect(new Set(fills.filter((f) => f !== "#FFFFFF"))).toEqual(
      new Set([brandHex])
    );
  });
});
