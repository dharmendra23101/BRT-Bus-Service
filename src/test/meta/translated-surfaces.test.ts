/**
 * Screens that are supposed to be translated, checked against their source.
 *
 * The dictionary tests cannot see this. A key added in English and forgotten
 * in Hindi is a compile error, and a Hindi value left as English fails a test
 * - but a sentence typed straight into JSX never reaches the dictionary at
 * all, so every one of those guards passes while the screen ships English.
 *
 * That is not hypothetical. Sweeping the rendered strings after the
 * component-by-component pass turned up three surfaces still holding English:
 * the error boundary, the arrival popup, and a booking refusal hardcoded in
 * two pages that already existed as a key. This is that sweep, kept.
 *
 * It reads source rather than rendering, deliberately. A rendering test only
 * covers the states it happens to reach - an error branch nobody triggers
 * keeps its English - and these files are full of branches.
 */

import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/*
  Every page and every component, found rather than listed.

  This was a hand-written array, and that is exactly how four surfaces stayed
  English through two translation stages: they were never added to it, so the
  guard reported nothing and the gap looked like completeness. A list of what
  to check is a list that goes stale, and it goes stale silently.

  Enumerated from the directories instead. A new page is covered the day it is
  written, without anybody remembering to say so.
*/
const SURFACES = [
  ...readdirSync("src/pages")
    .filter((name) => name.endsWith(".tsx"))
    .map((name) => `src/pages/${name}`),
  ...componentFiles("src/components"),
];

/*
  Vendored shadcn primitives are excluded: they are third-party building
  blocks with their own copy conventions, none of it ours to translate. Every
  other component is in.
*/
function componentFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;

    if (entry.isDirectory()) return entry.name === "ui" ? [] : componentFiles(path);

    return entry.name.endsWith(".tsx") ? [path] : [];
  });
}

/*
  English that is allowed to stay, per file, each with the reason it is not
  ours to translate.

  Empty, and worth keeping empty. The one entry it held was the wordmark on
  the ticket, and the better fix was to stop writing the name out four times:
  it is `BRAND_NAME` now, so no file contains it as prose and nothing needs
  excusing.
*/
const PUBLISHED: Record<string, string[]> = {};

/** Attributes whose value a person reads or hears. */
const SPOKEN = /(?:aria-label|alt|title|placeholder)="([^"]{4,})"/g;

/*
  A JSX line that is prose: no code punctuation anywhere on it, starting with
  a capital and carrying at least two words.

  The first attempt required the WHOLE line to be words separated by single
  spaces, which quietly excluded every sentence containing a full stop -
  "This bus has already departed. Please choose a later service." went
  straight through it. That was found by putting the string back and watching
  the guard pass, which is the only way that class of hole is ever found.
*/
const CODE = /[{}<>=[\];"`]/;

const isProse = (line: string): boolean => {
  if (CODE.test(line)) return false;
  if (!/^[A-Z]/.test(line)) return false;
  /* `INFO: Info,` is a map entry, not a sentence. */
  if (/^[A-Za-z_][A-Za-z_0-9]*:[ \t]/.test(line)) return false;

  return line.split(/\s+/).filter((word) => /^[A-Za-z]{2,}/.test(word)).length >= 2;
};

/*
  Comments come out first. This codebase writes block comments as plain
  indented prose rather than with leading asterisks, which is exactly the
  shape being looked for - without this the guard reports its own
  explanations and gets switched off within a day.
*/
const withoutComments = (source: string): string =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");

/*
  Copy hiding inside a JSX expression.

  `{n === 1 ? "departure" : "departures"}` is a sentence a passenger reads, and
  the line check above cannot see it: the line has braces, so it reads as code.
  Two of these survived four translation stages - a plural on the route
  explorer and the mobile menu's own aria-label.

  Only the two-sided form is looked for, because that is what a conditional
  string looks like and because it keeps the rule narrow enough to stay on.
*/
const TERNARY = /\?\s*"([A-Za-z][A-Za-z ,'\u2019-]{2,})"\s*:\s*"([A-Za-z][A-Za-z ,'\u2019-]{2,})"/g;

/*
  Values that are not copy even though they are quoted words: HTML input
  types, ARIA politeness, and Tailwind class lists. A class list is every
  token carrying a hyphen or a variant colon, which is what separates
  "bg-card" from "interchange".
*/
const TECHNICAL = new Set([
  "text",
  "password",
  "polite",
  "assertive",
  "button",
  "submit",
  "search",
  "on",
  "off",
  "auto",
  "none",
  "true",
  "false",
]);

const isClassList = (value: string) =>
  value.split(/\s+/).every((token) => token.includes("-") || token.includes(":"));

const isConditionalCopy = (value: string) =>
  !TECHNICAL.has(value) && !value.includes(".") && !isClassList(value);

const englishIn = (file: string): string[] => {
  const source = withoutComments(readFileSync(file, "utf8"));
  const allowed = PUBLISHED[file] ?? [];
  const found: string[] = [];

  for (const match of source.matchAll(SPOKEN)) {
    const value = match[1]!;

    if (/\s/.test(value) && /^[A-Z]/.test(value)) found.push(value);
  }

  for (const raw of source.split("\n")) {
    const line = raw.trim();

    if (isProse(line)) found.push(line);
  }

  for (const match of source.matchAll(TERNARY)) {
    for (const value of [match[1]!, match[2]!]) {
      if (isConditionalCopy(value)) found.push(value);
    }
  }

  return found.filter((value) => !allowed.includes(value));
};

describe("screens that are supposed to be translated", () => {
  it.each(SURFACES)("holds no untranslated copy: %s", (file) => {
    expect(englishIn(file)).toEqual([]);
  });

  /*
    And the check that stops the one above passing for the wrong reason. If a
    path were wrong, `readFileSync` would throw - but if the patterns stopped
    matching anything at all, every file would pass while nothing was
    inspected. This asserts the detector still finds what it is looking for.
  */
  it("detects copy when there is copy to detect", () => {
    const sample = [
      `  This bus has already departed. Please choose a later service.`,
      `  Reload the page`,
      `<button aria-label="Dismiss notification">`,
    ].join("\n");

    const detected: string[] = [];

    for (const match of sample.matchAll(SPOKEN)) detected.push(match[1]!);
    for (const raw of sample.split("\n")) {
      const line = raw.trim();

      if (isProse(line)) detected.push(line);
    }

    expect(detected).toContain("Dismiss notification");
    expect(detected).toContain("Reload the page");
    expect(detected).toContain(
      "This bus has already departed. Please choose a later service."
    );
  });

  it("detects copy hiding in a conditional", () => {
    const sample = '{n === 1 ? "departure" : "departures"}';
    const found: string[] = [];

    for (const match of sample.matchAll(TERNARY)) {
      for (const value of [match[1]!, match[2]!]) {
        if (isConditionalCopy(value)) found.push(value);
      }
    }

    expect(found).toEqual(["departure", "departures"]);
  });

  /*
    And leaves the things that only look like copy. A guard that flagged every
    Tailwind class would be switched off within the hour.
  */
  it("leaves class lists, input types and aria values alone", () => {
    for (const sample of [
      '{on ? "bg-card" : "bg-secondary"}',
      '{show ? "text" : "password"}',
      '{urgent ? "assertive" : "polite"}',
      '{a ? "fill-card stroke-primary" : "fill-primary stroke-primary"}',
    ]) {
      for (const match of sample.matchAll(TERNARY)) {
        for (const value of [match[1]!, match[2]!]) {
          expect(isConditionalCopy(value), value).toBe(false);
        }
      }
    }
  });

  /*
    The list is derived now, so the thing worth asserting is that it found a
    plausible number of files. An empty or near-empty enumeration would make
    every check above pass while inspecting nothing.
  */
  it("finds every page and component", () => {
    expect(SURFACES.length).toBeGreaterThan(25);
    expect(SURFACES.filter((file) => file.startsWith("src/pages/")).length)
      .toBeGreaterThan(10);

    for (const file of SURFACES) {
      expect(readFileSync(file, "utf8").length).toBeGreaterThan(200);
    }
  });
});
