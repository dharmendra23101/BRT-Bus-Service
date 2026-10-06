/**
 * Every passenger-facing page, audited by axe.
 *
 * This is the difference between "we care about accessibility" and a claim
 * with something behind it. Each page below is rendered and run through
 * axe-core's WCAG 2.1 A and AA rules, so a missing label or a broken heading
 * order fails CI rather than reaching somebody who depends on it.
 *
 * TWO RULES ARE TURNED OFF, AND NEITHER IS A WAIVER.
 *
 * `color-contrast` cannot be evaluated in jsdom: there is no layout, so axe
 * cannot composite a colour against what is actually behind it. It is measured
 * instead, exactly and from the stylesheet, in `design/contrast.test.ts`.
 *
 * `region` (all content inside a landmark) fires because these render a page
 * body without the surrounding document, which is an artefact of rendering a
 * component rather than a defect in the page.
 *
 * Frames are not descended into either - see `iframes` below.
 *
 * Automated rules catch roughly a third to a half of real barriers. Passing
 * here is a floor, not a verdict - the keyboard, focus-visibility, target-size
 * and reflow checks that need a real browser are recorded in ROADMAP-2.0.md.
 */

import { describe, expect, it, vi } from "vitest";
import axe, { type Result } from "axe-core";
import { Route, Routes } from "react-router-dom";

import Home from "@/pages/Home";
import Plan from "@/pages/Plan";
import RouteExplorer from "@/pages/RouteExplorer";
import NearbyPlaces from "@/pages/NearbyPlaces";
import Fares from "@/pages/Fares";
import Timetable from "@/pages/Timetable";
import Contact from "@/pages/Contact";
import Help from "@/pages/Help";
import About from "@/pages/About";
import Search from "@/pages/Search";
import NotFound from "@/pages/NotFound";
import MapPage from "@/pages/MapPage";
import PlaceDetail from "@/pages/PlaceDetail";
import Dashboard from "@/pages/Dashboard";
import AdminDashboard from "@/components/dashboards/AdminDashboard";
import DriverDashboard from "@/components/dashboards/DriverDashboard";

import { act, renderWithProviders } from "../helpers/render";
import { makeUser, signInAs } from "../helpers/firebase";
import { setMockRole } from "../helpers/userService";

vi.mock("@/services/userService", async () => {
  const helper = await import("../helpers/userService");
  return helper.userServiceMock();
});

/*
  The map opens a Realtime Database listener on mount. Auditing the page does
  not need live buses, but it does need that subscription not to reach a real
  SDK, so it is stubbed to a no-op unsubscribe.
*/
vi.mock("@/services/locationService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/locationService")>()),
  subscribeToBuses: vi.fn(() => vi.fn()),
}));

const DISABLED = { "color-contrast": { enabled: false }, region: { enabled: false } };

const describeViolation = (violation: Result) =>
  `${violation.id} (${violation.impact}): ${violation.help}\n` +
  violation.nodes
    .slice(0, 3)
    .map((node) => `    ${node.html.slice(0, 120)}`)
    .join("\n");

/*
  An audit of nothing passes. That is the failure mode this whole file is most
  exposed to - a page that renders empty because a provider was missing or a
  route did not match would report zero violations and look like a pass - so
  every audit asserts it was given something to audit first.
*/
const auditOf = async (container: HTMLElement): Promise<string[]> => {
  expect(
    container.querySelectorAll("*").length,
    "nothing rendered - this audit would have passed vacuously"
  ).toBeGreaterThan(10);

  const results = await axe.run(container, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    rules: DISABLED,

    /*
      Do not descend into frames. The map embeds OpenStreetMap cross-origin,
      and axe cannot reach into a frame jsdom never really loaded - it throws
      rather than reporting a violation. The frame ELEMENT is still audited
      from this side, which is where its accessible name lives; what is not
      audited is OpenStreetMap's own markup, which is not ours to fix.
    */
    iframes: false,
  });

  return results.violations.map(describeViolation);
};

const PAGES: [string, () => JSX.Element, string][] = [
  ["Home", () => <Home />, "/"],
  ["Plan", () => <Plan />, "/plan?from=HNLU&to=CBD"],
  ["Route explorer", () => <RouteExplorer />, "/routes"],
  ["Nearby places", () => <NearbyPlaces />, "/nearby"],
  ["Fares", () => <Fares />, "/fares"],
  ["Timetable", () => <Timetable />, "/timetable"],
  ["Contact", () => <Contact />, "/contact"],
  ["Help", () => <Help />, "/help"],
  ["About", () => <About />, "/about"],
  ["Search", () => <Search />, "/search?q=CBD"],
  ["Not found", () => <NotFound />, "/nowhere"],
  ["Live map", () => <MapPage />, "/map"],
];

describe("every page a passenger can reach", () => {
  for (const [name, render, route] of PAGES) {
    it(`${name} has no accessibility violations`, async () => {
      const { container } = renderWithProviders(render(), { route });

      const violations = await auditOf(container);

      expect(violations.join("\n"), `${name}:\n${violations.join("\n")}`).toBe("");
    }, 30_000);
  }
});

/*
  Two pages that cannot be audited by dropping the component into the tree.

  A place detail page reads its subject from the URL, so it needs the route
  pattern that captures it. Rendered without one it is a not-found page, and
  auditing a not-found page while believing it is the place page is worse than
  not auditing at all.
*/
describe("a page that depends on its route", () => {
  it("Place detail has no accessibility violations", async () => {
    const { container } = renderWithProviders(
      <Routes>
        <Route path="/nearby/:placeId" element={<PlaceDetail />} />
      </Routes>,
      { route: "/nearby/miraj-cinema" }
    );

    const violations = await auditOf(container);

    expect(violations.join("\n"), `Place detail:\n${violations.join("\n")}`).toBe("");
  }, 30_000);
});

/*
  And one that depends on who is looking. The dashboard shows a signed-out
  visitor almost nothing, so an audit of that state would pass by describing
  an empty container - the page a passenger actually uses is the signed-in one.
*/
/*
  The other two dashboards.

  `/dashboard` renders a different component per role, so auditing it while
  signed in as a passenger covers exactly one of three - and the two it misses
  are the ones with the dense tables, the role editor and the administrative
  record, which is where a heading order or a missing label is most likely to
  go wrong.
*/
describe("a page that depends on which role is looking", () => {
  const auditRole = async (
    name: string,
    role: "admin" | "driver",
    element: JSX.Element
  ) => {
    setMockRole(role);

    const { container } = renderWithProviders(element, { route: "/dashboard" });

    await act(async () => {
      signInAs(makeUser({ uid: `${role}-1` }));
    });

    const violations = await auditOf(container);

    expect(violations.join("\n"), `${name}:\n${violations.join("\n")}`).toBe("");
  };

  it("Administrator dashboard has no accessibility violations", async () => {
    await auditRole("Administrator dashboard", "admin", <AdminDashboard />);
  }, 30_000);

  it("Driver dashboard has no accessibility violations", async () => {
    await auditRole("Driver dashboard", "driver", <DriverDashboard />);
  }, 30_000);
});

describe("a page that depends on being signed in", () => {
  it("Dashboard has no accessibility violations", async () => {
    const { container } = renderWithProviders(<Dashboard />, {
      route: "/dashboard",
    });

    await act(async () => {
      signInAs(makeUser({ uid: "user-1" }));
    });

    const violations = await auditOf(container);

    expect(violations.join("\n"), `Dashboard:\n${violations.join("\n")}`).toBe("");
  }, 30_000);
});
