import { describe, expect, it, vi } from "vitest";
import NearbyPlaces from "@/pages/NearbyPlaces";
import { PLACES } from "@/domain/places";
import { renderWithProviders, screen, within } from "../helpers/render";

vi.mock("@/services/userService", async () => {
  const helper = await import("../helpers/userService");
  return helper.userServiceMock();
});

/** A card, found by its own heading rather than by any stray matching text. */
const cardFor = (name: string): HTMLElement =>
  screen.getByRole("heading", { name }).closest("li")!;

describe("linking a place to the rest of the site", () => {
  it("plans a journey to the nearest stop", () => {
    renderWithProviders(<NearbyPlaces />, { route: "/nearby" });

    expect(
      within(cardFor("Miraj Cinema")).getByRole("link", { name: /plan journey/i })
    ).toHaveAttribute("href", "/plan?to=CBD");
  });

  it("escapes a stop name that contains spaces", () => {
    renderWithProviders(<NearbyPlaces />, { route: "/nearby" });

    expect(
      within(cardFor("Balco Medical Center")).getByRole("link", {
        name: /plan journey/i,
      })
    ).toHaveAttribute("href", "/plan?to=Balco%20Medical%20Center");
  });

  it("opens the route that serves the stop", () => {
    renderWithProviders(<NearbyPlaces />, { route: "/nearby" });

    expect(
      within(cardFor("Nandanvan Jungle Safari")).getByRole("link", { name: "Route" })
    ).toHaveAttribute("href", "/routes?route=feeder-ext-1");

    expect(
      within(cardFor("Miraj Cinema")).getByRole("link", { name: "Route" })
    ).toHaveAttribute("href", "/routes?route=trunk");
  });

  it("opens a page of its own for every place", () => {
    renderWithProviders(<NearbyPlaces />, { route: "/nearby" });

    expect(
      within(cardFor("Miraj Cinema")).getByRole("link", { name: "Miraj Cinema" })
    ).toHaveAttribute("href", "/nearby/miraj-cinema");
  });

  it("does not offer a journey to a stop with no departures", () => {
    renderWithProviders(<NearbyPlaces />, { route: "/nearby" });

    const card = cardFor("Tribal Museum");

    expect(
      within(card).queryByRole("link", { name: /plan journey/i })
    ).not.toBeInTheDocument();
    expect(within(card).getByText(/no departures yet/i)).toBeInTheDocument();
  });

  it("keeps the route and fare links for a stop with no departures", () => {
    renderWithProviders(<NearbyPlaces />, { route: "/nearby" });

    const card = cardFor("Tribal Museum");

    expect(within(card).getByRole("link", { name: "Route" })).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: "Fare" })).toBeInTheDocument();
  });

  it("marks only the places the operator lists itself", () => {
    renderWithProviders(<NearbyPlaces />, { route: "/nearby" });

    expect(
      within(cardFor("Sadbhawna Hospital")).getByText("Official listing")
    ).toBeInTheDocument();

    expect(
      within(cardFor("Tribal Museum")).queryByText("Official listing")
    ).not.toBeInTheDocument();
  });
});

describe("what a card says before you open it", () => {
  it("describes the place rather than only naming it", () => {
    renderWithProviders(<NearbyPlaces />, { route: "/nearby" });

    expect(
      within(cardFor("Purkhouti Muktangan")).getByText(/tribal art/i)
    ).toBeInTheDocument();
  });

  /*
    No photograph of any of these is available under a licence we can use, and
    a broken frame or someone else's picture are both worse than a glyph.
  */
  it("says so when there is no photograph, rather than showing a gap", () => {
    renderWithProviders(<NearbyPlaces />, { route: "/nearby" });

    expect(
      within(cardFor("Miraj Cinema")).getByText(/no photograph available/i)
    ).toBeInTheDocument();
  });
});

describe("finding a place", () => {
  it("narrows by name", async () => {
    const { user } = renderWithProviders(<NearbyPlaces />, { route: "/nearby" });

    await user.type(screen.getByLabelText("Find a place"), "jungle");

    expect(
      screen.getByRole("heading", { name: "Nandanvan Jungle Safari" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Miraj Cinema" })
    ).not.toBeInTheDocument();
  });

  it("narrows by category", async () => {
    const { user } = renderWithProviders(<NearbyPlaces />, { route: "/nearby" });

    await user.click(screen.getByRole("button", { name: "Healthcare" }));

    expect(
      screen.getByRole("heading", { name: "Sadbhawna Hospital" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Tribal Museum" })
    ).not.toBeInTheDocument();
  });

  /*
    The incumbent's own filter cannot reach a third of its catalogue: its
    cards are labelled Schools, Higher Education, Recreation, Hospitals and
    Cinema while the filter offers only Educations, Entertainments and
    Healthcare, so Recreation is unreachable. One taxonomy, used in both.
  */
  it("offers a filter for every category a card can carry", () => {
    renderWithProviders(<NearbyPlaces />, { route: "/nearby" });

    // Derived from the data, so a new category without a filter fails here.
    for (const category of new Set(PLACES.map((place) => place.category))) {
      expect(screen.getByRole("button", { name: category })).toBeInTheDocument();
    }
  });

  it("combines a category with a name", async () => {
    const { user } = renderWithProviders(<NearbyPlaces />, { route: "/nearby" });

    await user.click(screen.getByRole("button", { name: "Education" }));
    await user.type(screen.getByLabelText("Find a place"), "cinema");

    expect(screen.getByText("No places match your search")).toBeInTheDocument();
  });

  it("clears both filters at once", async () => {
    const { user } = renderWithProviders(<NearbyPlaces />, { route: "/nearby" });

    await user.click(screen.getByRole("button", { name: "Recreation" }));
    await user.type(screen.getByLabelText("Find a place"), "zzz");

    await user.click(screen.getByRole("button", { name: /clear filters/i }));

    expect(
      screen.getByRole("heading", { name: "Miraj Cinema" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });
});
