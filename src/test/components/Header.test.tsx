import { describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router-dom";
import Header from "@/components/Header";
import { renderWithProviders, screen, waitFor, within } from "../helpers/render";
import { makeUser, signInAs } from "../helpers/firebase";

vi.mock("@/services/userService", async () => {
  const helper = await import("../helpers/userService");
  return helper.userServiceMock();
});

const mainNav = () => screen.getByRole("navigation", { name: "Main" });

const menuButton = () => screen.getByRole("button", { name: /navigation menu/i });

const profileButton = () =>
  screen.getByRole("button", { name: /account menu for/i });

const controlledBy = (trigger: HTMLElement): HTMLElement =>
  document.getElementById(trigger.getAttribute("aria-controls")!)!;

const withOutside = (
  <>
    <Header />
    <button type="button">somewhere else</button>
  </>
);

describe("finding your way around", () => {
  it("marks the page you are already on", () => {
    renderWithProviders(<Header />, { route: "/fares" });

    expect(
      within(mainNav()).getByRole("link", { name: "Fares" })
    ).toHaveAttribute("aria-current", "page");

    expect(
      within(mainNav()).getByRole("link", { name: "Home" })
    ).not.toHaveAttribute("aria-current");
  });

  it("reaches every public page from the main navigation", () => {
    renderWithProviders(<Header />, { route: "/" });

    const destinations = within(mainNav())
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));

    expect(destinations).toEqual([
      "/",
      "/plan",
      "/routes",
      "/nearby",
      "/map",
      "/timetable",
      "/fares",
      "/contact",
      "/help",
    ]);
  });

  it("offers the same destinations in the drawer", () => {
    renderWithProviders(<Header />, { route: "/" });

    const drawer = controlledBy(menuButton());

    expect(
      within(drawer).getAllByRole("link", { hidden: true }).map((link) =>
        link.getAttribute("href")
      )
    ).toEqual(
      expect.arrayContaining([
        "/",
        "/plan",
        "/routes",
        "/nearby",
        "/map",
        "/timetable",
        "/fares",
        "/contact",
      ])
    );
  });

  it("offers a visitor a way to sign in", () => {
    renderWithProviders(<Header />, { route: "/" });

    for (const link of screen.getAllByRole("link", { name: "Login" })) {
      expect(link).toHaveAttribute("href", "/login");
    }
  });
});

describe("the account menu", () => {
  it("stays shut until the avatar is used", async () => {
    renderWithProviders(<Header />, { route: "/" });
    signInAs(makeUser());

    await waitFor(() => expect(profileButton()).toHaveAttribute("aria-expanded", "false"));

    expect(controlledBy(profileButton())).toBeNull();
  });

  it("opens on the avatar", async () => {
    const { user } = renderWithProviders(<Header />, { route: "/" });
    signInAs(makeUser());

    await waitFor(() => expect(profileButton()).toBeInTheDocument());
    await user.click(profileButton());

    expect(profileButton()).toHaveAttribute("aria-expanded", "true");
    expect(
      within(controlledBy(profileButton())).getByText("rider@example.com")
    ).toBeInTheDocument();
  });

  it("closes when something else is clicked", async () => {
    const { user } = renderWithProviders(withOutside, { route: "/" });
    signInAs(makeUser());

    await waitFor(() => expect(profileButton()).toBeInTheDocument());
    await user.click(profileButton());
    await user.click(screen.getByRole("button", { name: "somewhere else" }));

    expect(profileButton()).toHaveAttribute("aria-expanded", "false");
  });

  it("closes on Escape without stranding the keyboard", async () => {
    const { user } = renderWithProviders(<Header />, { route: "/" });
    signInAs(makeUser());

    await waitFor(() => expect(profileButton()).toBeInTheDocument());
    await user.click(profileButton());
    await user.keyboard("{Escape}");

    expect(profileButton()).toHaveAttribute("aria-expanded", "false");
    expect(profileButton()).toHaveFocus();
  });
});

describe("the drawer on a small screen", () => {
  it("keeps its links out of the tab order while shut", () => {
    renderWithProviders(<Header />, { route: "/" });

    expect(controlledBy(menuButton())).toHaveAttribute("inert");
  });

  it("releases them once opened", async () => {
    const { user } = renderWithProviders(<Header />, { route: "/" });

    await user.click(menuButton());

    expect(controlledBy(menuButton())).not.toHaveAttribute("inert");
    expect(menuButton()).toHaveAttribute("aria-expanded", "true");
  });

  it("holds the page behind it still, then lets it go", async () => {
    const { user } = renderWithProviders(<Header />, { route: "/" });

    await user.click(menuButton());
    expect(document.body).toHaveStyle({ overflow: "hidden" });

    await user.click(menuButton());
    expect(document.body).not.toHaveStyle({ overflow: "hidden" });
  });

  it("closes on Escape without stranding the keyboard", async () => {
    const { user } = renderWithProviders(<Header />, { route: "/" });

    await user.click(menuButton());
    await user.keyboard("{Escape}");

    expect(menuButton()).toHaveAttribute("aria-expanded", "false");
    expect(menuButton()).toHaveFocus();
  });

  it("gets out of the way once a link is followed", async () => {
    const { user } = renderWithProviders(<Header />, { route: "/" });

    await user.click(menuButton());

    const drawer = controlledBy(menuButton());
    await user.click(within(drawer).getByRole("link", { name: "Fares" }));

    await waitFor(() =>
      expect(menuButton()).toHaveAttribute("aria-expanded", "false")
    );
    expect(controlledBy(menuButton())).toHaveAttribute("inert");
  });
});

describe("naming the signed-in passenger", () => {
  it("uses their initials", async () => {
    renderWithProviders(<Header />, { route: "/" });
    signInAs(makeUser());

    expect(
      await screen.findByRole("button", { name: "Account menu for Test Rider" })
    ).toBeInTheDocument();
    expect(screen.getAllByText("TR").length).toBeGreaterThan(0);
  });

  it("falls back when the account has no name", async () => {
    renderWithProviders(<Header />, { route: "/" });
    signInAs(makeUser({ displayName: null }));

    expect(
      await screen.findByRole("button", { name: "Account menu for User" })
    ).toBeInTheDocument();
    expect(screen.getAllByText("U").length).toBeGreaterThan(0);
  });
});

describe("signing out", () => {
  it("ends the session and returns to sign in", async () => {
    const { user } = renderWithProviders(
      <Routes>
        <Route path="/dashboard" element={<Header />} />
        <Route path="/login" element={<p>sign in page</p>} />
      </Routes>,
      { route: "/dashboard" }
    );
    signInAs(makeUser());

    await waitFor(() => expect(menuButton()).toBeInTheDocument());

    const drawer = controlledBy(menuButton());
    await user.click(within(drawer).getByRole("button", { name: /logout/i }));

    expect(await screen.findByText("sign in page")).toBeInTheDocument();
  });
});

describe("naming money the way India does", () => {
  /*
    Nav icons are aria-hidden, so no accessible query can reach them and the
    glyph could change - or silently fail to change - with the whole suite
    still green. The class lucide emits is the only handle there is.
  */
  it("marks Fares with a rupee, never a dollar", () => {
    renderWithProviders(<Header />, { route: "/" });

    const fares = within(mainNav()).getByRole("link", { name: "Fares" });

    expect(fares.querySelector("svg")).toHaveClass("lucide-indian-rupee");
  });

  it("leaves no dollar sign anywhere in the chrome", () => {
    renderWithProviders(<Header />, { route: "/" });

    expect(document.querySelector(".lucide-dollar-sign")).toBeNull();
  });
});
