/**
 * The passenger help page.
 *
 * Every factual claim on this page is read from the domain at runtime rather
 * than typed as prose, so these tests assert the page against the same source
 * the app behaves from. If a rule changes and the page does not follow, one of
 * these fails rather than the page quietly telling passengers something untrue.
 */

import { describe, expect, it } from "vitest";
import Help from "@/pages/Help";
import { DEFAULT_FRESHNESS } from "@/domain/fleet/state";
import { ARRIVAL_RULES, TICKET_RULES } from "@/constants/config";
import { ROUTE_IDS, getRoute } from "@/domain/transit/routes";
import { STOPS } from "@/domain/transit/stops";
import { SCHEDULED_STOPS } from "@/domain/transit/schedule";
import { STATUS_LABELS } from "@/domain/ticket/status";
import { BOOKING_FAILURE_MESSAGES } from "@/services/ticketService";
import { en } from "@/domain/i18n/en";
import { renderWithProviders, screen } from "../helpers/render";

const renderHelp = () => renderWithProviders(<Help />, { route: "/help" });

describe("finding out how the service works", () => {
  it("introduces itself", () => {
    renderHelp();

    expect(
      screen.getByRole("heading", { level: 1, name: "Passenger Help" })
    ).toBeInTheDocument();
  });

  it("groups the answers under headings a reader can scan", () => {
    renderHelp();

    for (const title of [
      "Planning a journey",
      "Fares",
      "Booking a ticket",
      "Your ticket",
      "Live tracking",
      "Arrival alerts",
      "Your data",
    ]) {
      expect(screen.getByRole("heading", { level: 2, name: title })).toBeInTheDocument();
    }
  });
});

describe("what it says about the network", () => {
  it("names every route that carries passengers", () => {
    renderHelp();

    for (const id of ROUTE_IDS) {
      expect(screen.getAllByText(new RegExp(getRoute(id).name)).length).toBeGreaterThan(0);
    }
  });

  it("reports the real number of stops with published departures", () => {
    renderHelp();

    expect(
      screen.getByText(
        new RegExp(`${SCHEDULED_STOPS.size} of the\\s+${STOPS.length} stops`)
      )
    ).toBeInTheDocument();
  });
});

describe("what it says about booking", () => {
  it("lists the reasons the app actually refuses a booking", () => {
    renderHelp();

    for (const reason of [
      "NOT_AUTHENTICATED",
      "ALREADY_DEPARTED",
      "OVERLAPPING_TICKET",
      "STORAGE_FAILED",
    ] as const) {
      expect(
        screen.getByText(en[BOOKING_FAILURE_MESSAGES[reason]])
      ).toBeInTheDocument();
    }
  });
});

describe("what it says about a ticket", () => {
  it("explains every state a passenger can see", () => {
    renderHelp();

    for (const status of [
      "ACTIVE",
      "BOARDING_SOON",
      "IN_TRANSIT",
      "COMPLETED",
      "CANCELLED",
    ] as const) {
      expect(screen.getByText(en[STATUS_LABELS[status]])).toBeInTheDocument();
    }
  });

  it("quotes the boarding window the status engine uses", () => {
    renderHelp();

    expect(
      screen.getAllByText(
        new RegExp(`${TICKET_RULES.BOARDING_WINDOW_MINUTES} minutes`)
      ).length
    ).toBeGreaterThan(0);
  });

  it("quotes how long a ticket survives its arrival time", () => {
    renderHelp();

    expect(
      screen.getByText(
        new RegExp(`${TICKET_RULES.GRACE_MINUTES} minutes after the\\s+scheduled arrival`)
      )
    ).toBeInTheDocument();
  });

  /*
    This promise was withdrawn in §25 because nothing cached the app shell, and
    restored in §30 once a service worker did. It is deliberately conditional:
    a page never opened has nothing stored to show.
  */
  it("promises offline only for a ticket already opened", () => {
    renderHelp();

    expect(
      screen.getByRole("heading", { name: "Will my ticket work without a signal?" })
    ).toBeInTheDocument();
    expect(screen.getByText(/Yes, once you have opened it/i)).toBeInTheDocument();
    expect(
      screen.getByText(/A page you have never opened will not/i)
    ).toBeInTheDocument();
  });
});

describe("what it says about live tracking", () => {
  it("quotes the staleness window the map applies", () => {
    renderHelp();

    const minutes = Math.round(DEFAULT_FRESHNESS.staleMs / 60_000);

    expect(
      screen.getByText(new RegExp(`not reported for\\s+${minutes} minutes`))
    ).toBeInTheDocument();
  });

  it("quotes the distance at which an alert is raised", () => {
    renderHelp();

    expect(
      screen.getByText(new RegExp(`within\\s+${ARRIVAL_RULES.ALERT_RADIUS_KM} km`))
    ).toBeInTheDocument();
  });

  it("tells the passenger the alert is proximity, not an arrival time", () => {
    renderHelp();

    expect(
      screen.getByText(/proximity alert, not an arrival time/i)
    ).toBeInTheDocument();
  });

  it("promises no driver is identified, which is what the map does", () => {
    renderHelp();

    expect(
      screen.getAllByText(/driver name, email address or account is published/i).length
    ).toBeGreaterThan(0);
  });

  it("does not claim an empty map means the service is suspended", () => {
    renderHelp();

    expect(screen.getByText(/does\s+not mean the service is suspended/i)).toBeInTheDocument();
  });
});

describe("sending the reader somewhere useful", () => {
  it("links to the pages each answer is about", () => {
    renderHelp();

    const destinations = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));

    for (const path of ["/routes", "/fares", "/map", "/login", "/contact"]) {
      expect(destinations).toContain(path);
    }
  });
});

describe("what it says about data", () => {
  it("is clear that passengers are never located", () => {
    renderHelp();

    expect(screen.getByText(/Passengers are never located/i)).toBeInTheDocument();
  });

  it("says positions come from the driver, only while they are sharing", () => {
    renderHelp();

    expect(
      screen.getByText(/only while they have chosen to share it/i)
    ).toBeInTheDocument();
  });

  it("admits that live positions are public, which the map makes them", () => {
    renderHelp();

    expect(screen.getByText(/Live bus positions are public/i)).toBeInTheDocument();
  });

  it("repeats that no driver is identified alongside a vehicle", () => {
    renderHelp();

    expect(
      screen.getAllByText(/no\s+driver name, email address or account is published/i)
        .length
    ).toBeGreaterThan(0);
  });

  it("does not claim an account can be deleted in the app, because it cannot", () => {
    renderHelp();

    expect(screen.getByText(/Not from inside the app/i)).toBeInTheDocument();
  });

  it("says a ticket is held on the device as well as the server", () => {
    renderHelp();

    expect(
      screen.getByText(/kept both on this device and on our servers/i)
    ).toBeInTheDocument();
  });
});
