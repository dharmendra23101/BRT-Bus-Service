import { describe, expect, it, vi } from "vitest";
import RouteExplorer from "@/pages/RouteExplorer";
import { renderWithProviders, screen, within } from "../helpers/render";

vi.mock("@/services/userService", async () => {
  const helper = await import("../helpers/userService");
  return helper.userServiceMock();
});

describe("browsing the network", () => {
  it("lists the official routes", async () => {
    renderWithProviders(<RouteExplorer />, { route: "/routes" });

    expect(
      await screen.findByRole("button", { name: /Trunk Route \(IIM branch\)/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Feeder Route Ext\. 3/ })
    ).toBeInTheDocument();
  });

  it("counts the stops, interchanges and scheduled departures on a route", async () => {
    renderWithProviders(<RouteExplorer />, { route: "/routes" });

    const route = await screen.findByRole("button", {
      name: /Feeder Route Ext\. 2/,
    });

    expect(route).toHaveTextContent("3 stops · 1 interchange");
    expect(route).toHaveTextContent("2 of 3 stops have scheduled departures");
  });

  it("reports a route whose stops are only partly served by the timetable", async () => {
    renderWithProviders(<RouteExplorer />, { route: "/routes" });

    const route = await screen.findByRole("button", { name: /^trunk Trunk Route/ });

    expect(route).toHaveTextContent("14 of 15 stops have scheduled departures");
  });
});

describe("searching for a route", () => {
  it("finds a route by a stop it serves", async () => {
    const { user } = renderWithProviders(<RouteExplorer />, { route: "/routes" });

    await user.type(screen.getByLabelText("Find a route"), "Stadium");

    expect(
      await screen.findByRole("button", { name: /Feeder Route 1/ })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Trunk Route \(IIM branch\)/ })
    ).not.toBeInTheDocument();
  });

  it("says so when nothing matches", async () => {
    const { user } = renderWithProviders(<RouteExplorer />, { route: "/routes" });

    await user.type(screen.getByLabelText("Find a route"), "zzz");

    expect(await screen.findByText(/No routes match/)).toBeInTheDocument();
  });
});

describe("opening a route from a link", () => {
  it("expands the route named in the address", async () => {
    renderWithProviders(<RouteExplorer />, { route: "/routes?route=feeder-ext-2" });

    expect(
      await screen.findByRole("heading", { name: "Feeder Route Ext. 2" })
    ).toBeInTheDocument();
  });

  it("ignores a route id the network does not publish", async () => {
    renderWithProviders(<RouteExplorer />, { route: "/routes?route=not-a-route" });

    await screen.findByRole("button", { name: /Feeder Route Ext\. 2/ });

    expect(
      screen.queryByRole("link", { name: /plan a journey/i })
    ).not.toBeInTheDocument();
  });

  it("collapses the route when it is chosen a second time", async () => {
    const { user } = renderWithProviders(<RouteExplorer />, {
      route: "/routes?route=feeder-ext-2",
    });

    await screen.findByRole("heading", { name: "Feeder Route Ext. 2" });

    await user.click(
      screen.getByRole("button", { name: /Feeder Route Ext\. 2/ })
    );

    expect(
      screen.queryByRole("heading", { name: "Feeder Route Ext. 2" })
    ).not.toBeInTheDocument();
  });
});

/**
 * The network diagram.
 *
 * Its row order is derived from the routes' own stop orders, never from a
 * coordinate - `STOP_COORDS` is a generated lattice, so a geographic map drawn
 * from it would look precise and be fiction. These tests pin the honesty of
 * that as much as the rendering.
 */
describe("seeing how the network connects", () => {
  it("draws the network as an image with a description", async () => {
    renderWithProviders(<RouteExplorer />, { route: "/routes" });

    const diagram = await screen.findByRole("img", { name: /network diagram/i });

    expect(diagram).toHaveAccessibleName(/7 routes across 39 stops/i);
    expect(diagram).toHaveAccessibleName(/6 interchanges/i);
  });

  /*
    Distances on a schematic mean nothing, and a rider who assumes otherwise
    plans around a corridor that does not exist. The page says so rather than
    leaving it to be inferred.
  */
  it("says plainly that it is not a map", async () => {
    renderWithProviders(<RouteExplorer />, { route: "/routes" });

    expect(
      await screen.findByText(/a connection diagram, not a map/i)
    ).toBeInTheDocument();
  });

  it("names every route in the legend beside its code", async () => {
    renderWithProviders(<RouteExplorer />, { route: "/routes" });

    const legend = within(
      await screen.findByRole("list", { name: "Diagram legend" })
    );

    expect(
      legend.getByText("Feeder Route Ext. 1").closest("li")!.textContent
    ).toContain("X1");
    expect(legend.getByText("Trunk Route").closest("li")!.textContent).toContain("T");
    expect(legend.getByText("Interchange")).toBeInTheDocument();
  });

  it("offers the same network as a table", async () => {
    const { user } = renderWithProviders(<RouteExplorer />, { route: "/routes" });

    await user.click(await screen.findByRole("button", { name: "Table" }));

    const table = await screen.findByRole("table", {
      name: /every stop in the network/i,
    });

    expect(table).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /network diagram/i })).not.toBeInTheDocument();
  });

  it("names the routes you can change between at an interchange", async () => {
    const { user } = renderWithProviders(<RouteExplorer />, { route: "/routes" });

    await user.click(await screen.findByRole("button", { name: "Table" }));

    const row = (await screen.findByRole("rowheader", { name: /^North Block/ }))
      .closest("tr")!;

    expect(row.textContent).toContain("Interchange");
    expect(row.textContent).toContain("Trunk Route");
    expect(row.textContent).toContain("Feeder Route 1");
    expect(row.textContent).toContain("Feeder Route 2");
  });

  /*
    The row order comes from a topological sort of the routes' own orders, so
    the trunk corridor must read down the table the way the trunk runs.
  */
  it("lists the stops in an order every route agrees with", async () => {
    const { user } = renderWithProviders(<RouteExplorer />, { route: "/routes" });

    await user.click(await screen.findByRole("button", { name: "Table" }));

    const stops = (await screen.findAllByRole("rowheader")).map((cell) =>
      cell.textContent!.replace("Interchange", "").replace(/ - plan a journey.*/, "").trim()
    );

    expect(stops.indexOf("Raipur Railway Station")).toBeLessThan(stops.indexOf("CBD"));
    expect(stops.indexOf("CBD")).toBeLessThan(stops.indexOf("North Block"));
    expect(stops.indexOf("North Block")).toBeLessThan(stops.indexOf("HNLU"));
    expect(stops.indexOf("HNLU")).toBeLessThan(stops.indexOf("Muktangan"));
  });
});

/**
 * Simulated vehicles on the diagram.
 *
 * This is the payoff of building the diagram from topology: a bus can be
 * placed on it the moment telemetry says which stop it is heading for, with
 * no coordinate involved anywhere.
 */
describe("showing a fleet that does not exist", () => {
  const showFleet = async (user: ReturnType<typeof renderWithProviders>["user"]) => {
    await user.click(
      await screen.findByRole("button", { name: /show simulated fleet/i })
    );
  };

  it("offers the fleet only where the simulator is permitted", async () => {
    renderWithProviders(<RouteExplorer />, { route: "/routes" });

    // Vitest runs with `import.meta.env.DEV`, which is where it is allowed.
    expect(
      await screen.findByRole("button", { name: /show simulated fleet/i })
    ).toBeInTheDocument();
  });

  /*
    THE RULE THAT MAKES A SIMULATOR LEGITIMATE. An unlabelled synthetic bus
    beside the operator's real published network is a fabricated claim about a
    real service, made to the one audience able to check it.
  */
  it("says on the page that the buses are not real", async () => {
    const { user } = renderWithProviders(<RouteExplorer />, { route: "/routes" });

    await showFleet(user);

    expect(
      await screen.findByText(/These are not\s+real vehicles/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Simulated bus — not a real vehicle/i)
    ).toBeInTheDocument();
  });

  it("draws nothing until it is asked", async () => {
    renderWithProviders(<RouteExplorer />, { route: "/routes" });

    await screen.findByRole("img", { name: /network diagram/i });

    expect(
      screen.queryByText(/Simulated bus — not a real vehicle/i)
    ).not.toBeInTheDocument();
  });

  it("puts a vehicle marker on the diagram", async () => {
    const { user } = renderWithProviders(<RouteExplorer />, { route: "/routes" });

    const before = screen
      .queryAllByRole("img", { name: /network diagram/i })[0]
      ?.querySelectorAll("rect").length;

    await showFleet(user);

    const after = (
      await screen.findByRole("img", { name: /network diagram/i })
    ).querySelectorAll("rect").length;

    expect(after).toBeGreaterThan(before ?? 0);
  });
});
