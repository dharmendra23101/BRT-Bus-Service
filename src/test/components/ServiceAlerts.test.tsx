import { describe, expect, it, vi } from "vitest";
import ServiceAlerts from "@/components/ServiceAlerts";
import { SEVERITY_LABELS } from "@/types/announcement";
import { en } from "@/domain/i18n/en";
import { renderWithProviders, screen, waitFor, within } from "../helpers/render";
import { seedDoc } from "../helpers/firebase";

vi.mock("@/services/userService", async () => {
  const helper = await import("../helpers/userService");
  return helper.userServiceMock();
});

const alertsRegion = () =>
  screen.queryByRole("region", { name: /service announcements/i });

const seedAnnouncement = (id: string, over: Record<string, unknown> = {}) =>
  seedDoc("announcements", id, {
    title: "Sector 27 stop closed",
    body: "Board at Sector 29 until further notice.",
    severity: "WARNING",
    active: true,
    ...over,
  });

describe("what a visitor is told", () => {
  it("shows a published notice", async () => {
    seedAnnouncement("a1");

    renderWithProviders(<ServiceAlerts />);

    expect(await screen.findByText("Sector 27 stop closed")).toBeInTheDocument();
    expect(
      screen.getByText("Board at Sector 29 until further notice.")
    ).toBeInTheDocument();
  });

  it("takes up no room when there is nothing to say", async () => {
    renderWithProviders(<ServiceAlerts />);

    await waitFor(() => expect(alertsRegion()).not.toBeInTheDocument());
  });

  it("says nothing about a retired notice", async () => {
    seedAnnouncement("a1", { active: false });

    renderWithProviders(<ServiceAlerts />);

    await waitFor(() => expect(alertsRegion()).not.toBeInTheDocument());
    expect(screen.queryByText("Sector 27 stop closed")).not.toBeInTheDocument();
  });

  /*
    The announcement has to be spoken by a region that was ALREADY in the
    document. These cards do not exist until the fetch resolves, so a role on
    them is a live region arriving with its message already inside it, which
    most screen readers do not announce at all. The app's shared assertive
    region is mounted from the first paint, so it is the one that works.
  */
  it("interrupts a screen reader only for a major disruption", async () => {
    seedAnnouncement("a1", { severity: "CRITICAL", title: "Services suspended" });

    renderWithProviders(<ServiceAlerts />);

    await screen.findByText("Services suspended");

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Services suspended")
    );
  });

  it("speaks it from a region that predates the notice", async () => {
    seedAnnouncement("a1", { severity: "CRITICAL", title: "Services suspended" });

    renderWithProviders(<ServiceAlerts />);

    await screen.findByText("Services suspended");

    // The card carries no live-region role of its own to compete with it.
    expect(within(alertsRegion()!).queryByRole("alert")).not.toBeInTheDocument();
    expect(within(alertsRegion()!).queryByRole("status")).not.toBeInTheDocument();
  });

  it("reports an ordinary notice without interrupting", async () => {
    seedAnnouncement("a1", { severity: "INFO", title: "New timetable published" });

    renderWithProviders(<ServiceAlerts />);

    await screen.findByText("New timetable published");

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "New timetable published"
      )
    );

    expect(screen.getByRole("alert")).toHaveTextContent("");
  });

  it("names the severity for a reader who cannot see the colour", async () => {
    seedAnnouncement("a1", { severity: "CRITICAL" });

    renderWithProviders(<ServiceAlerts />);

    expect(
      await screen.findByText(new RegExp(en[SEVERITY_LABELS.CRITICAL]))
    ).toBeInTheDocument();
  });

  it("shows every current notice, not just the first", async () => {
    seedAnnouncement("a1", { title: "First notice" });
    seedAnnouncement("a2", { title: "Second notice" });

    renderWithProviders(<ServiceAlerts />);

    expect(await screen.findByText("First notice")).toBeInTheDocument();
    expect(screen.getByText("Second notice")).toBeInTheDocument();
  });
});

describe("what a notice says it affects", () => {
  it("names the route and stop a targeted notice is about", async () => {
    seedAnnouncement("a1", {
      informedEntities: [{ routeId: "101", stopId: "CBD" }],
    });

    renderWithProviders(<ServiceAlerts />);

    expect(await screen.findByText(/Affects Route 101 at CBD/)).toBeInTheDocument();
  });

  it("lists each affected thing when a notice covers more than one", async () => {
    seedAnnouncement("a1", {
      informedEntities: [{ routeId: "101" }, { stopId: "CBD" }],
    });

    renderWithProviders(<ServiceAlerts />);

    expect(await screen.findByText(/Affects Route 101; CBD/)).toBeInTheDocument();
  });

  it("adds no scope line to a notice about the whole network", async () => {
    seedAnnouncement("a1");

    renderWithProviders(<ServiceAlerts />);

    await screen.findByText("Sector 27 stop closed");

    expect(screen.queryByText(/^Affects /)).not.toBeInTheDocument();
  });
});

describe("a notice about the journey being planned", () => {
  const seedPair = () => {
    seedAnnouncement("a1", {
      title: "Elsewhere entirely",
      informedEntities: [{ stopId: "Tribal Museum" }],
    });
    seedAnnouncement("a2", {
      title: "On your way",
      informedEntities: [{ stopId: "CBD" }],
    });
  };

  it("lifts it above a notice about somewhere else", async () => {
    seedPair();

    renderWithProviders(<ServiceAlerts />, { route: "/plan?from=HNLU&to=CBD" });

    await screen.findByText("On your way");

    /*
      Scoped to the alerts region, and matched on the whole string rather than
      a substring. An unscoped getAllByText searches the entire document and
      matches any ancestor whose textContent merely contains the title, so it
      counted a wrapper as a third notice under full-suite load while passing
      in isolation.
    */
    const order = within(alertsRegion()!)
      .getAllByText(/^(On your way|Elsewhere entirely)$/)
      .map((node) =>
        node.textContent?.includes("On your way") ? "targeted" : "other"
      );

    expect(order).toEqual(["targeted", "other"]);
  });

  it("says why it is at the top", async () => {
    seedPair();

    renderWithProviders(<ServiceAlerts />, { route: "/plan?from=HNLU&to=CBD" });

    expect(
      await screen.findByText(/Affects CBD .* affects your journey/)
    ).toBeInTheDocument();
  });

  /*
    Ordering, never filtering. A passenger who typed one journey into the
    planner has not said the rest of the network is none of their business,
    and a disruption hidden on the strength of a URL is the failure this
    component exists to prevent.
  */
  it("still shows the notice that is not about them", async () => {
    seedPair();

    renderWithProviders(<ServiceAlerts />, { route: "/plan?from=HNLU&to=CBD" });

    await screen.findByText("On your way");

    expect(screen.getByText("Elsewhere entirely")).toBeInTheDocument();
  });

  it("claims no relevance on a page that names no journey", async () => {
    seedPair();

    renderWithProviders(<ServiceAlerts />);

    await screen.findByText("On your way");

    expect(screen.queryByText(/affects your journey/)).not.toBeInTheDocument();
  });

  it("speaks of a route rather than a journey on the route explorer", async () => {
    seedAnnouncement("a1", {
      title: "Route notice",
      informedEntities: [{ routeId: "101" }],
    });

    renderWithProviders(<ServiceAlerts />, { route: "/routes?route=101" });

    expect(
      await screen.findByText(/Affects Route 101 .* affects this route/)
    ).toBeInTheDocument();
  });
});

describe("a notice that has stopped applying", () => {
  it("disappears on its own once it has ended", async () => {
    seedAnnouncement("a1", { endsAt: Date.now() - 60_000 });

    renderWithProviders(<ServiceAlerts />);

    await waitFor(() => expect(alertsRegion()).not.toBeInTheDocument());
  });

  it("waits for its start rather than warning early", async () => {
    seedAnnouncement("a1", { startsAt: Date.now() + 600_000 });

    renderWithProviders(<ServiceAlerts />);

    await waitFor(() => expect(alertsRegion()).not.toBeInTheDocument());
  });

  it("shows a notice inside its window", async () => {
    seedAnnouncement("a1", {
      startsAt: Date.now() - 60_000,
      endsAt: Date.now() + 600_000,
    });

    renderWithProviders(<ServiceAlerts />);

    expect(await screen.findByText("Sector 27 stop closed")).toBeInTheDocument();
  });
});
