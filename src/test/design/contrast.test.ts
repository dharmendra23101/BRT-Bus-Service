/**
 * Every colour pair the interface actually puts together, measured.
 *
 * `tokens.test.ts` guards that colour goes *through* the token system. It says
 * nothing about whether the resulting colours can be read, which is how the
 * two live WCAG failures P0-8 and P0-9 survived a whole design system: white
 * on `--destructive` measured 3.76:1 and every form border 1.47:1, and nothing
 * in the suite noticed.
 *
 * The ratios are computed here from `index.css` rather than copied from
 * `DESIGN-SYSTEM-RED.md`, so retuning a token to something unreadable fails
 * this file instead of being discovered by somebody who cannot read it.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/index.css", "utf8");

/** The light palette only; a `.dark` block would need its own pass. */
const lightRoot = (() => {
  const start = css.indexOf(":root");
  const dark = css.indexOf(".dark");

  return css.slice(start, dark > start ? dark : css.length);
})();

const TOKENS: Record<string, [number, number, number]> = {};

for (const match of lightRoot.matchAll(
  /--([a-z-]+):\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/g
)) {
  TOKENS[match[1]!] = [Number(match[2]), Number(match[3]), Number(match[4])];
}

/** CSS Color 4 HSL to sRGB, each channel 0-1. */
const toRgb = ([h, s, l]: [number, number, number]): number[] => {
  const sat = s / 100;
  const light = l / 100;
  const a = sat * Math.min(light, 1 - light);
  const k = (n: number) => (n + h / 30) % 12;
  const f = (n: number) =>
    light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

  return [f(0), f(8), f(4)];
};

/** WCAG 2.x relative luminance. */
const luminance = (rgb: number[]): number => {
  const [r, g, b] = rgb.map((channel) =>
    channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4
  ) as [number, number, number];

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string): number => {
  const first = TOKENS[a];
  const second = TOKENS[b];

  if (!first || !second) throw new Error(`Unknown token: ${a} or ${b}`);

  const one = luminance(toRgb(first));
  const two = luminance(toRgb(second));
  const [hi, lo] = one > two ? [one, two] : [two, one];

  return (hi + 0.05) / (lo + 0.05);
};

const round = (value: number) => Math.round(value * 100) / 100;

describe("text a passenger has to read (SC 1.4.3, 4.5:1)", () => {
  const pairs: [string, string][] = [
    ["foreground", "background"],
    ["card-foreground", "card"],
    ["secondary-foreground", "secondary"],
    ["accent-foreground", "accent"],
    ["muted-foreground", "background"],
    ["muted-foreground", "card"],
    /* White on the brand and on the error colour: every button and toast. */
    ["primary-foreground", "primary"],
    ["destructive-foreground", "destructive"],
    /* Brand-coloured text on a page, which headings and links use. */
    ["primary", "background"],
    ["primary-strong", "background"],
    ["primary-deep", "background"],
    ["destructive", "background"],
  ];

  for (const [front, back] of pairs) {
    it(`${front} on ${back}`, () => {
      expect(round(contrast(front, back))).toBeGreaterThanOrEqual(4.5);
    });
  }
});

describe("things that are not text but must still be seen (SC 1.4.11, 3:1)", () => {
  /*
    A form field's boundary is the only thing telling a low-vision user where
    the field is - P0-9 - and the focus ring is the only thing telling a
    keyboard user where they are.
  */
  const pairs: [string, string][] = [
    ["input", "background"],
    ["input", "card"],
    ["input", "secondary"],
    ["ring", "background"],
    ["ring", "card"],
  ];

  for (const [front, back] of pairs) {
    it(`${front} against ${back}`, () => {
      expect(round(contrast(front, back))).toBeGreaterThanOrEqual(3);
    });
  }
});

describe("the two failures this file exists because of", () => {
  /*
    Both were live in the shipped build and are named here so the fix cannot
    quietly regress into "some ratio changed" - these are the exact pairs.
  */
  it("P0-8: white on the error colour is readable", () => {
    expect(contrast("destructive-foreground", "destructive")).toBeGreaterThanOrEqual(4.5);
  });

  it("P0-9: a form border is visible against the page", () => {
    expect(contrast("input", "background")).toBeGreaterThanOrEqual(3);
  });
});

describe("the palette is legible to measure at all", () => {
  it("parses every token the checks above depend on", () => {
    for (const token of [
      "background",
      "foreground",
      "primary",
      "primary-foreground",
      "destructive",
      "destructive-foreground",
      "input",
      "ring",
      "muted-foreground",
    ]) {
      expect(TOKENS[token], `--${token} is missing from :root`).toBeDefined();
    }
  });
});
