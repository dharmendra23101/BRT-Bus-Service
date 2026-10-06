/**
 * Saved and recent journeys.
 *
 * The domain owns the list rules; these cover what only the component can get
 * wrong - that searching writes to storage, that saving survives a remount,
 * and that a passenger can remove what the app recorded about where they go.
 */

import { describe, expect, it, vi } from "vitest";
import JourneyShortcuts from "@/components/JourneyShortcuts";
import { JOURNEY_RULES, STORAGE_KEYS } from "@/constants/config";
import { renderWithProviders, screen, within } from "../helpers/render";

vi.mock("@/services/userService", async () => {
  const helper = await import("../helpers/userService");
  return helper.userServiceMock();
});

const stored = (key: string) => {
  const raw = localStorage.getItem(key);

  return raw ? (JSON.parse(raw) as { data: unknown }).data : null;
};

const seedSaved = (pairs: { from: string; to: string }[]) => {
  localStorage.setItem(
    STORAGE_KEYS.SAVED_JOURNEYS,
    JSON.stringify({ v: 2, data: pairs })
  );
};

const shortcuts = () =>
  renderWithProviders(
    <JourneyShortcuts from="HNLU" to="CBD" onPick={vi.fn()} />
  );

const group = (name: string) =>
  within(
    screen.getByRole("heading", { name, level: 3 }).parentElement!
      .parentElement!
  );

describe("before anything has been searched", () => {
  it("takes up no room at all", () => {
    renderWithProviders(
      <JourneyShortcuts from={null} to={null} onPick={vi.fn()} />
    );

    expect(
      screen.queryByRole("region", { name: /saved and recent journeys/i })
    ).not.toBeInTheDocument();
  });

  it("ignores a pair that goes nowhere", () => {
    renderWithProviders(
      <JourneyShortcuts from="CBD" to="CBD" onPick={vi.fn()} />
    );

    expect(stored(STORAGE_KEYS.RECENT_JOURNEYS)).toBeNull();
  });
});

describe("remembering what was searched", () => {
  it("records the journey on this device", () => {
    shortcuts();

    expect(stored(STORAGE_KEYS.RECENT_JOURNEYS)).toMatchObject([
      { from: "HNLU", to: "CBD" },
    ]);
  });

  it("offers it back as a recent journey", () => {
    shortcuts();

    expect(
      within(screen.getByRole("region", { name: /saved and recent journeys/i }))
        .getAllByText("HNLU to CBD").length
    ).toBeGreaterThan(0);
  });

  it("hands the journey back when one is chosen", async () => {
    const onPick = vi.fn();

    const { user } = renderWithProviders(
      <JourneyShortcuts from="HNLU" to="CBD" onPick={onPick} />
    );

    await user.click(
      group("Recent").getByRole("button", { name: "HNLU to CBD" })
    );

    expect(onPick).toHaveBeenCalledWith({ from: "HNLU", to: "CBD" });
  });
});

describe("saving a journey", () => {
  it("keeps it, and says it is kept", async () => {
    const { user } = shortcuts();

    const toggle = screen.getByRole("button", { name: /^Save HNLU to CBD$/ });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    await user.click(toggle);

    expect(
      screen.getByRole("button", { name: /Saved — remove HNLU to CBD/ })
    ).toHaveAttribute("aria-pressed", "true");
    expect(stored(STORAGE_KEYS.SAVED_JOURNEYS)).toEqual([
      { from: "HNLU", to: "CBD" },
    ]);
  });

  it("stops listing it as merely recent", async () => {
    const { user } = shortcuts();

    await user.click(screen.getByRole("button", { name: /^Save HNLU to CBD$/ }));

    expect(group("Saved").getByText("HNLU to CBD")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Recent", level: 3 })
    ).not.toBeInTheDocument();
  });

  it("gives it back when unsaved", async () => {
    const { user } = shortcuts();

    await user.click(screen.getByRole("button", { name: /^Save HNLU to CBD$/ }));
    await user.click(
      screen.getByRole("button", { name: /Saved — remove HNLU to CBD/ })
    );

    expect(stored(STORAGE_KEYS.SAVED_JOURNEYS)).toEqual([]);
  });

  /*
    Everything in the saved list was put there on purpose, so a full list
    refuses rather than quietly deleting one of the passenger's own choices.
  */
  it("says so when the list is full instead of evicting one", async () => {
    seedSaved(
      Array.from({ length: JOURNEY_RULES.SAVED_LIMIT }, (_, i) => ({
        from: "Sector 27",
        to: i % 2 === 0 ? "CBD" : "HNLU",
      })).map((pair, i) => ({ ...pair, from: i === 0 ? "Sector 29" : pair.from }))
    );

    const { user } = shortcuts();

    await user.click(screen.getByRole("button", { name: /^Save HNLU to CBD$/ }));

    /*
      Scoped to the section: the app mounts a permanent assertive region from
      first paint, so a bare `alert` query matches two nodes.
    */
    const region = within(
      screen.getByRole("region", { name: /saved and recent journeys/i })
    );

    expect(await region.findByRole("alert")).toHaveTextContent(
      `You already have ${JOURNEY_RULES.SAVED_LIMIT} saved journeys`
    );
  });
});

describe("forgetting where somebody goes", () => {
  it("removes one recent journey", async () => {
    const { user } = shortcuts();

    await user.click(
      screen.getByRole("button", { name: "Forget HNLU to CBD" })
    );

    expect(stored(STORAGE_KEYS.RECENT_JOURNEYS)).toEqual([]);
  });

  it("clears the whole history", async () => {
    const { user } = shortcuts();

    await user.click(
      screen.getByRole("button", { name: /clear recent journeys/i })
    );

    expect(localStorage.getItem(STORAGE_KEYS.RECENT_JOURNEYS)).toBeNull();
  });
});
