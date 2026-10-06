/**
 * The search page.
 *
 * The domain decides what matches; these tests cover the two things only the
 * page can get wrong - that a result leads somewhere that actually exists, and
 * that finding nothing says so plainly rather than looking like a failure.
 *
 * Everything is scoped to `main`, because the footer contributes its own list
 * and its own links to every one of these queries.
 */

import { describe, expect, it, vi } from "vitest";
import Search from "@/pages/Search";
import { renderWithProviders, screen, within } from "../helpers/render";

vi.mock("@/services/userService", async () => {
  const helper = await import("../helpers/userService");
  return helper.userServiceMock();
});

const renderSearch = (query = "") =>
  renderWithProviders(<Search />, {
    route: query ? `/search?q=${encodeURIComponent(query)}` : "/search",
  });

const results = () => within(screen.getByRole("main"));

const hrefs = () =>
  results()
    .getAllByRole("link")
    .map((link) => link.getAttribute("href"));

describe("looking for something", () => {
  it("introduces itself", () => {
    renderSearch();

    expect(
      screen.getByRole("heading", { level: 1, name: "Search" })
    ).toBeInTheDocument();
  });

  it("offers a search landmark rather than a bare input", () => {
    renderSearch();

    expect(screen.getByRole("search")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Search stops, routes and places")
    ).toBeInTheDocument();
  });

  it("waits to be asked before listing anything", () => {
    renderSearch();

    expect(screen.getByText(/Type a stop, a route or a place/)).toBeInTheDocument();
    expect(results().queryByRole("list")).not.toBeInTheDocument();
  });

  it("reads the query out of the address, so a search can be shared", () => {
    renderSearch("CBD");

    expect(results().getAllByText(/results? for/).length).toBeGreaterThan(0);
    expect(results().getByRole("list")).toBeInTheDocument();
  });

  it("runs a search typed into the box", async () => {
    const { user } = renderSearch();

    await user.type(
      screen.getByLabelText("Search stops, routes and places"),
      "Trunk"
    );
    await user.click(screen.getByRole("button", { name: /search/i }));

    expect(await results().findByText("Trunk Route")).toBeInTheDocument();
  });
});

describe("where a result leads", () => {
  it("starts a journey from a stop", () => {
    renderSearch("CBD");

    expect(hrefs()).toContain("/plan?from=CBD");
  });

  it("opens a network route on the diagram", () => {
    renderSearch("Trunk Route");

    expect(hrefs()).toContain("/routes?route=trunk");
  });

  /*
    A numbered working has no page of its own. It goes to the timetable, which
    is where its departures actually are, rather than to the route diagram,
    which draws the network routes and would not find it.
  */
  it("sends a numbered working to the timetable", () => {
    renderSearch("Route 101");

    expect(results().getByText("Route 101")).toBeInTheDocument();
    expect(hrefs()).toContain("/timetable");
  });

  it("opens a place on its own page", () => {
    renderSearch("Jungle Safari");

    expect(hrefs().some((href) => href?.startsWith("/nearby/"))).toBe(true);
  });

  it("escapes a stop name that would otherwise break the address", () => {
    renderSearch("Office Complex");

    expect(hrefs()).toContain("/plan?from=Office%20Complex%20Block%20A%20B");
  });
});

describe("when nothing matches", () => {
  it("says so rather than showing an empty list", () => {
    renderSearch("qzxvv");

    expect(screen.getByText(/Nothing matches/)).toBeInTheDocument();
    expect(results().queryByRole("list")).not.toBeInTheDocument();
  });

  it("explains that only published names are searched", () => {
    renderSearch("qzxvv");

    expect(
      screen.getByText(/Only names the corridor actually publishes are searched/)
    ).toBeInTheDocument();
  });

  it("offers somewhere to go instead", () => {
    renderSearch("qzxvv");

    expect(
      results().getByRole("link", { name: /browse every route/i })
    ).toHaveAttribute("href", "/routes");
  });
});
