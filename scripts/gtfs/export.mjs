/**
 * Writes the GTFS static feed, or explains exactly what is missing.
 *
 * Run with `npm run gtfs:export`. Reads its operator inputs from
 * `gtfs.config.json` in the repository root, which does not exist yet on
 * purpose - the facts it needs belong to the operator, and this prints the
 * list rather than guessing them.
 *
 * The build is what the domain does; this only supplies inputs and writes
 * files, so the feed can never differ between the export and the tests.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const CONFIG = "gtfs.config.json";
const OUT = "dist-gtfs";

/*
  The exporter is TypeScript with a path alias, so it is loaded through Vite's
  own resolver rather than by node directly. That keeps ONE implementation -
  a re-implementation here would be a second timetable that could disagree
  with the one the application ships.
*/
const loadExporter = async () => {
  const { createServer: createViteServer } = await import("vite");

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "error",
  });

  try {
    return {
      module: await vite.ssrLoadModule("/src/domain/gtfs/export.ts"),
      close: () => vite.close(),
    };
  } catch (error) {
    await vite.close();
    throw error;
  }
};

const readConfig = () => {
  if (!existsSync(CONFIG)) return null;

  try {
    return JSON.parse(readFileSync(CONFIG, "utf8"));
  } catch (error) {
    console.error(`${CONFIG} is not valid JSON: ${String(error)}`);
    process.exit(1);
  }
};

const describeGaps = (gaps) => {
  console.log("The feed cannot be published yet. What is missing:\n");

  for (const gap of gaps) {
    console.log(`  ${gap.kind}`);
    console.log(`    ${gap.detail}`);

    if (gap.kind === "STOP_COORDINATES") {
      console.log(`    ${gap.stops.length} stops need a surveyed position:`);
      console.log(`      ${gap.stops.join(", ")}`);
    }

    console.log("");
  }

  console.log(`Supply these in ${CONFIG}:\n`);
  console.log(
    JSON.stringify(
      {
        agency: {
          id: "<operator id>",
          name: "<operator legal name>",
          url: "<operator public url>",
          timezone: "Asia/Kolkata",
        },
        feedPublisher: {
          name: "<who is publishing this feed - not the operator>",
          url: "<publisher public url>",
        },
        startDate: "YYYYMMDD",
        endDate: "YYYYMMDD",
        stopCoordinates: { "<stop name>": { lat: 0, lng: 0 } },
      },
      null,
      2
    )
  );
};

const main = async () => {
  const { module, close } = await loadExporter();

  try {
    const config = readConfig();

    const feed = module.buildGtfsFeed({
      agency: config?.agency ?? { id: "", name: "", url: "", timezone: "" },
      feedPublisher: config?.feedPublisher ?? { name: "", url: "" },
      stopCoordinates: config?.stopCoordinates ?? {},
      startDate: config?.startDate ?? "",
      endDate: config?.endDate ?? "",
    });

    if (!feed.ok) {
      describeGaps(feed.gaps);

      /*
        Not an error exit. Refusing to publish an incomplete feed is the
        correct outcome today, and a non-zero code would make this look like
        a broken script in any CI that ever ran it.
      */
      return;
    }

    mkdirSync(OUT, { recursive: true });

    for (const [name, contents] of Object.entries(feed.files)) {
      writeFileSync(join(OUT, name), contents);
      console.log(`${name}  ${contents.split("\n").length - 2} rows`);
    }

    console.log(`\nWritten to ${OUT}/. Validate before publishing.`);
  } finally {
    await close();
  }
};

/* Only run when invoked directly, so a future import does not export a feed. */
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
