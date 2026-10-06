import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "@/App";
import { seedDoc } from "../helpers/firebase";

vi.mock("@/services/userService", async () => {
  const helper = await import("../helpers/userService");
  return helper.userServiceMock();
});

const seedCriticalNotice = () =>
  seedDoc("announcements", "critical-1", {
    title: "Corridor closed at North Block",
    body: "Trunk services are terminating at CBD until 6 PM.",
    severity: "CRITICAL",
    active: true,
  });

const renderAppAt = (path: string) => {
  window.history.pushState({}, "", path);
  return render(<App />);
};

const alertsRegion = () =>
  screen.findByRole("region", { name: /service announcements/i });

describe("a disruption notice reaches passengers who never open the home page", () => {
  it("shows on the timetable", async () => {
    seedCriticalNotice();

    renderAppAt("/timetable");

    expect(
      await screen.findByText("Corridor closed at North Block")
    ).toBeInTheDocument();
  });

  it("shows on a deep-linked journey plan", async () => {
    seedCriticalNotice();

    renderAppAt("/plan?from=HNLU&to=CBD");

    expect(
      await screen.findByText("Corridor closed at North Block")
    ).toBeInTheDocument();
  });

  /*
    Reaching the screen is not the same as reaching a screen-reader user. The
    notice is spoken through the app's permanent assertive region, which is in
    the document from the first paint - a role on the card itself would be a
    live region arriving with its message already inside it.
  */
  it("is spoken, not just displayed, wherever it appears", async () => {
    seedCriticalNotice();

    renderAppAt("/routes");

    await alertsRegion();

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Corridor closed at North Block"
      )
    );
  });
});
