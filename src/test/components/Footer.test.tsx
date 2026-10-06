import { describe, expect, it, vi } from "vitest";
import Footer from "@/components/Footer";
import { renderWithProviders, screen, within } from "../helpers/render";

vi.mock("@/services/userService", async () => {
  const helper = await import("../helpers/userService");
  return helper.userServiceMock();
});

const quickLinks = () =>
  screen.getByRole("navigation", { name: "Quick Links" });

describe("finding your way from the footer", () => {
  it("reaches every public page", () => {
    renderWithProviders(<Footer />);

    expect(
      within(quickLinks())
        .getAllByRole("link")
        .map((link) => link.getAttribute("href"))
    ).toEqual([
      "/",
      "/plan",
      "/routes",
      "/nearby",
      "/map",
      "/timetable",
      "/fares",
      "/search",
      "/about",
      "/contact",
      "/help",
    ]);
  });

  it("keeps every destination inside the app", () => {
    renderWithProviders(<Footer />);

    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("href")).toMatch(/^\//);
    }
  });

  it("offers no link that goes nowhere", () => {
    renderWithProviders(<Footer />);

    for (const link of screen.getAllByRole("link")) {
      expect(link).not.toHaveAttribute("href", "#");
    }
  });
});

describe("what else the footer states", () => {
  it("names where the service operates", () => {
    renderWithProviders(<Footer />);

    expect(
      screen.getByText("Sector 24, IIIT Naya Raipur, Chhattisgarh")
    ).toBeInTheDocument();
  });

  it("carries the notice it is given", () => {
    renderWithProviders(<Footer text="© 2026 BRT" />);

    expect(screen.getByText("© 2026 BRT")).toBeInTheDocument();
  });
});
