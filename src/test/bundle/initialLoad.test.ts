/**
 * What a first-time visitor actually downloads.
 *
 * Every other test here reads source. This one weighs the build, because the
 * gap between the two is where this project has been caught before: a dynamic
 * `import()` in `src/firebase.ts` looked correct while a thin re-export
 * wrapper dragged the whole Firestore SDK back into the entry chunk as a
 * static dependency. The source said lazy; the bytes said otherwise.
 *
 * The initial graph is read out of `dist/index.html` rather than assumed - the
 * entry script plus everything the build asks the browser to preload, which is
 * exactly the set that must arrive before the first paint.
 *
 * Sizes are gzipped, since that is what crosses the network. Budgets are a
 * ratchet in the same spirit as the coverage thresholds: set just above what
 * the build currently produces, so drift fails here and is raised
 * deliberately rather than discovered on a phone.
 */

import { gzipSync } from "node:zlib";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { en } from "@/domain/i18n/en";
import { LOCALES, loadCatalogue } from "@/domain/i18n/strings";

const DIST = "dist";
const KB = 1024;

/*
  A missing build fails rather than skips. This gate runs after `npm run
  build` in both `verify` and CI; if `dist/` is absent something is wrong with
  the sequence, and a size guard that silently skips is not a guard.
*/
const html = (() => {
  const file = path.join(DIST, "index.html");

  if (!existsSync(file)) {
    throw new Error(
      "dist/index.html is missing - run `npm run build` before `npm run test:bundle`."
    );
  }

  return readFileSync(file, "utf8");
})();

/** The entry script and every chunk the document tells the browser to preload. */
const initialScripts = [
  ...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.js)"/g),
].map((match) => match[1]!);

const initialStyles = [
  ...html.matchAll(/href="(\/assets\/[^"]+\.css)"/g),
].map((match) => match[1]!);

const gzippedKb = (assets: string[]) =>
  assets.reduce(
    (total, asset) =>
      total + gzipSync(readFileSync(path.join(DIST, asset))).length,
    0
  ) / KB;

/** Every emitted chunk, whether or not the entry pulls it. */
const chunkNames = initialScripts.map((asset) => path.basename(asset));

/** The bytes of the initial graph, for asking what is inside them. */
const entryCode = initialScripts
  .map((asset) => readFileSync(path.join(DIST, asset), "utf8"))
  .join("\n");

describe("the first load", () => {
  it("is described by the built document", () => {
    expect(initialScripts.length).toBeGreaterThan(0);
    expect(initialStyles.length).toBeGreaterThan(0);
  });

  /*
    177.6 kB at the time of writing. The ceiling is not a target - it is the
    point at which somebody has to look at what was added and decide it was
    worth it.
  */
  it("keeps the initial javascript under budget", () => {
    const size = gzippedKb(initialScripts);

    expect(
      size,
      `initial JS is ${size.toFixed(1)} kB gzipped across ${initialScripts.length} chunks`
    ).toBeLessThan(200);
  });

  it("keeps the initial stylesheet under budget", () => {
    const size = gzippedKb(initialStyles);

    expect(size, `initial CSS is ${size.toFixed(1)} kB gzipped`).toBeLessThan(20);
  });
});

describe("what must not be in the first load", () => {
  /*
    The specific regression this file exists for. Firestore is 388 kB raw and
    is reached only after a passenger does something that reads data; the
    Realtime Database only on the map and the driver screen. Both are loaded
    through a dynamic import, and both have been pulled back into the entry by
    a chunking change that nothing noticed.
  */
  it("does not ship the firestore sdk before anything asks for data", () => {
    expect(chunkNames.join(" ")).not.toMatch(/firestore/);
  });

  it("does not ship the realtime database before anything tracks a bus", () => {
    expect(chunkNames.join(" ")).not.toMatch(/firebase-database/);
  });

  /*
    Route code is lazy, so no page's chunk belongs in the entry graph. Named
    after the two heaviest: the dashboard pulls in QR rendering, the map its
    tile layer.
  */
  it("does not ship a route's code before that route is visited", () => {
    expect(chunkNames.join(" ")).not.toMatch(/Dashboard|MapView|Timetable/);
  });

  /*
    Every language except English.

    The header and footer are in the shell, so a dictionary they can reach is
    in the entry graph for every visitor - including the ones who will never
    read it. One extra language was affordable; the fourth is not, and the
    cost lands on exactly the phones least able to pay it.

    Asked of the CATALOGUES rather than of the chunk filenames, so that a
    renamed chunk, an inlined one, or a language added later cannot slip past
    a pattern that was written before it existed.
  */
  it("does not ship a language nobody has chosen", async () => {
    for (const locale of LOCALES.filter((candidate) => candidate !== "en")) {
      const { strings } = await loadCatalogue(locale);

      for (const key of ["nav.timetable", "nav.fares"] as const) {
        expect(
          entryCode,
          `${locale} copy for ${key} is in the entry graph`
        ).not.toContain(strings[key]);
      }
    }
  });

  /*
    And the check that stops the one above from passing for the wrong reason.
    If `entryCode` were ever empty - a renamed asset directory, a changed
    markup convention - every absence above would hold vacuously while the
    guard measured nothing.
  */
  it("is reading the entry graph it claims to be reading", () => {
    expect(entryCode).toContain(en["nav.timetable"]);
    expect(entryCode.length).toBeGreaterThan(100_000);
  });
});
