/**
 * The network diagram's model.
 *
 * Every assertion here is about topology. Nothing reads a coordinate, and that
 * is the point: `STOP_COORDS` is a generated lattice, so a diagram drawn from
 * it would look precise and be fiction. Which stops a route serves and in what
 * order is real data, and it is all this needs.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  describeNetwork,
  networkColumnOrder,
  networkGrid,
  routeSegments,
} from "@/domain/transit/network-diagram";
import {
  INTERCHANGES,
  getNetworkRoutes,
  type NetworkRoute,
} from "@/domain/transit/routes";
import type { StopName } from "@/domain/transit/stops";

const routes = getNetworkRoutes();

describe("putting every route on one axis", () => {
  it("finds an order for the published network", () => {
    expect(networkColumnOrder()).not.toBeNull();
  });

  /*
    THE invariant. The diagram draws each route as a line down a shared axis,
    so if the axis disagreed with a route's own order that route would be drawn
    running backwards through its own corridor - the same class of defect the
    timetable's `columnStops` had.
  */
  it("never contradicts a route's own order", () => {
    const order = networkColumnOrder()!;
    const backwards: string[] = [];

    for (const route of routes) {
      const positions = route.servedStops.map((stop) => order.indexOf(stop));

      for (let i = 1; i < positions.length; i += 1) {
        if (positions[i]! <= positions[i - 1]!) {
          backwards.push(
            `${route.id}: ${route.servedStops[i - 1]} before ${route.servedStops[i]}`
          );
        }
      }
    }

    expect(backwards).toEqual([]);
  });

  it("gives every served stop exactly one row, and invents none", () => {
    const order = networkColumnOrder()!;
    const served = new Set(routes.flatMap((route) => route.servedStops));

    expect(new Set(order)).toEqual(served);
    expect(order.length).toBe(served.size);
  });

  /*
    The row order is baked into a module-level constant at load, so a run that
    ordered ties differently would move stops between page loads.
  */
  it("produces the same order every time", () => {
    expect(networkColumnOrder()).toEqual(networkColumnOrder());
  });

  /*
    Two routes running a shared stretch in opposite directions have no correct
    single row, and picking one would contradict a published route. The real
    network has no such pair; this is the branch that catches the one that
    introduces it.
  */
  it("refuses to invent an order when two routes disagree", () => {
    const contradicting: NetworkRoute[] = [
      {
        id: "trunk",
        name: "One way",
        headline: "A to B",
        servedStops: ["CBD", "North Block"] as readonly StopName[],
      },
      {
        id: "feeder-1",
        name: "The other way",
        headline: "B to A",
        servedStops: ["North Block", "CBD"] as readonly StopName[],
      },
    ];

    expect(networkColumnOrder(contradicting)).toBeNull();
    expect(networkGrid(contradicting)).toBeNull();
  });
});

describe("the grid the diagram draws", () => {
  const grid = networkGrid()!;

  it("names the routes calling at each stop", () => {
    const hnlu = grid.rows.find((row) => row.stop === "HNLU")!;

    expect(hnlu.routeIds).toContain("trunk");
    expect(hnlu.routeIds).toContain("feeder-ext-1");
    expect(hnlu.routeIds).not.toContain("feeder-1");
  });

  it("marks exactly the interchanges the network registry declares", () => {
    const marked = grid.rows.filter((row) => row.interchange).map((row) => row.stop);

    expect(new Set(marked)).toEqual(
      new Set(INTERCHANGES.map((interchange) => interchange.stop))
    );
  });

  /*
    A route's line passes rows it does not serve. Joining consecutive served
    rows rather than consecutive rows is what stops the diagram implying a stop
    the bus does not make.
  */
  it("joins a route's stops across the rows it skips", () => {
    const segments = routeSegments(grid, "feeder-ext-1");
    const served = grid.rows
      .map((row, index) => (row.routeIds.includes("feeder-ext-1") ? index : -1))
      .filter((index) => index >= 0);

    expect(segments).toHaveLength(served.length - 1);
    expect(segments.some(([from, to]) => to - from > 1)).toBe(true);
    expect(segments.every(([from, to]) => to > from)).toBe(true);
  });

  it("draws nothing for a route with no stops on the grid", () => {
    expect(routeSegments({ rows: [], routes: [] }, "trunk")).toEqual([]);
  });

  it("describes itself in a sentence a screen reader can use", () => {
    const description = describeNetwork(grid);

    expect(description).toContain(`${grid.routes.length} routes`);
    expect(description).toContain(`${grid.rows.length} stops`);
    expect(description).toMatch(/available as a table/i);
  });
});

/**
 * The coordinate quarantine.
 *
 * `locateOnRoute` is correct code reading incorrect data: `STOP_COORDS` is a
 * generated lattice whose "HNLU" sits about 21 km from the real one, so the
 * stop nearest a genuine GPS fix is effectively arbitrary. It stays in the
 * domain, tested, for the day surveyed coordinates land - but a warning in a
 * comment is advice, and this is the thing that actually holds.
 */
describe("nothing shows a passenger a coordinate-matched position", () => {
  const sourceFiles = (dir: string, out: string[] = []): string[] => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === "test" || entry.name === "domain") continue;
        sourceFiles(path, out);
        continue;
      }

      if (/\.(tsx|ts)$/.test(entry.name)) out.push(path);
    }

    return out;
  };

  it("keeps locateOnRoute out of every component and page", () => {
    const src = join(process.cwd(), "src");

    const importers = sourceFiles(src)
      .filter((path) => readFileSync(path, "utf8").includes("locateOnRoute"))
      .map((path) => path.slice(src.length + 1).split("\\").join("/"));

    expect(importers).toEqual([]);
  });

  /*
    The diagram is the alternative to a geographic map, so it must never grow
    one quietly.
  */
  it("builds the diagram without reading a coordinate", () => {
    const source = readFileSync(
      join(process.cwd(), "src", "domain", "transit", "network-diagram.ts"),
      "utf8"
    );

    // Comments stripped: the module explains at length why it avoids
    // `STOP_COORDS`, and naming the thing you refuse to use is not using it.
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

    expect(code).not.toMatch(/STOP_COORDS|haversine|\blat\b|\blng\b/);
  });
});

/**
 * Two different questions, deliberately given two different answers.
 *
 * "Which routes call here?" is topology and is derived. "Where can you usefully
 * change buses?" is a judgement, and it is curated - because the trunk and its
 * IIM branch share their first thirteen stops, and nobody changes between a
 * service and its own branch at Telibandha.
 */
describe("calling at a stop is not the same as changing there", () => {
  const grid = networkGrid()!;

  it("finds far more shared stops than it calls interchanges", () => {
    const shared = grid.rows.filter((row) => row.routeIds.length > 1);
    const declared = grid.rows.filter((row) => row.interchange);

    expect(shared.length).toBeGreaterThan(declared.length);
  });

  /*
    The nine stops that are shared but not interchanges are all trunk plus its
    own IIM branch. If a stop ever becomes shared by two genuinely different
    services without being declared, it will not be in that pair and this
    fails.
  */
  it("only leaves a shared stop undeclared when the routes are one corridor", () => {
    const undeclared = grid.rows.filter(
      (row) => row.routeIds.length > 1 && !row.interchange
    );

    const surprising = undeclared.filter(
      (row) => !row.routeIds.every((id) => id === "trunk" || id === "trunk-iim")
    );

    expect(undeclared.length).toBeGreaterThan(0);
    expect(surprising.map((row) => row.stop)).toEqual([]);
  });

  /*
    The table is headed "Routes calling here", so it must answer the derived
    question in full - including the branch the curated list leaves out.
  */
  it("reports every calling route, including one the curated list omits", () => {
    const northBlock = grid.rows.find((row) => row.stop === "North Block")!;

    expect(northBlock.routeIds).toContain("trunk-iim");
    expect(
      INTERCHANGES.find((interchange) => interchange.stop === "North Block")!.routes
    ).not.toContain("trunk-iim");
  });
});
