/**
 * The About page.
 *
 * This is the page an operator or a recruiter reads first, which makes it the
 * easiest page in the app to lie on. These tests hold the two lines that matter:
 * a figure we reproduce from the operator has to keep its attribution, and a
 * capability we have not built has to keep saying so.
 */

import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LOCALES } from "@/domain/i18n/strings";
import { en } from "@/domain/i18n/en";
import About from "@/pages/About";
import {
  OPERATOR,
  OPERATOR_SOURCE,
  SERVICE_FACTS,
  INFRASTRUCTURE_FACTS,
  PUBLISHED_STOPS,
} from "@/domain/transit/operator";
import { STOPS } from "@/domain/transit/stops";
import { TIMETABLE_SOURCE } from "@/domain/transit/timetable";
import { SCHEDULED_STOPS } from "@/domain/transit/schedule";
import {
  DEFAULT_FRESHNESS,
  PASSENGER_VISIBLE,
  STATE_LABELS,
  STATE_DESCRIPTIONS,
} from "@/domain/fleet/state";
import { renderWithProviders, screen } from "../helpers/render";

const { paymentProvider } = vi.hoisted(() => ({
  paymentProvider: { label: "Demonstration", settlesRealMoney: false },
}));

vi.mock("@/services/payment/demoProvider", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/services/payment/demoProvider")>();

  return { ...actual, activePaymentProvider: () => paymentProvider };
});

afterEach(() => {
  paymentProvider.label = "Demonstration";
  paymentProvider.settlesRealMoney = false;
});

const renderAbout = () => renderWithProviders(<About />, { route: "/about" });

const pageText = () => screen.getByRole("main").textContent ?? "";

describe("finding out what this service is", () => {
  it("introduces itself", () => {
    renderAbout();

    expect(
      screen.getByRole("heading", { level: 1, name: "About the BRT corridor" })
    ).toBeInTheDocument();
  });

  it("groups what it says under headings a reader can scan", () => {
    renderAbout();

    for (const title of [
      "What Bus Rapid Transit is",
      "The Nava Raipur service",
      "Stops: what is published, and what we list",
      "Routes and the network",
      "Fares",
      "How to ride",
      "Live tracking, and what it cannot tell you",
      "Digital tickets",
      "Service updates",
      "Accessibility",
      "What we are planning next",
      "Who we are",
    ]) {
      expect(
        screen.getByRole("heading", { level: 2, name: title })
      ).toBeInTheDocument();
    }
  });
});

describe("reproducing the operator's figures", () => {
  it("reports every figure the domain holds", () => {
    renderAbout();

    const text = pageText();

    for (const { label, value } of [
      ...SERVICE_FACTS,
      ...INFRASTRUCTURE_FACTS,
      ...PUBLISHED_STOPS,
    ]) {
      expect(text, `${label} is missing from the page`).toContain(value);
    }
  });

  it("carries the qualification a figure was published with", () => {
    renderAbout();

    const frequency = SERVICE_FACTS.find(({ label }) => label === "Frequency");

    expect(pageText()).toContain(frequency?.caveat ?? "");
  });

  it("cannot show the figures without saying where they came from", () => {
    renderAbout();

    const text = pageText();

    expect(text).toContain(OPERATOR.name);
    expect(text).toContain(OPERATOR_SOURCE.publication);
    expect(text).toContain(OPERATOR_SOURCE.url);
    expect(text).toContain(OPERATOR_SOURCE.retrievedOn);
  });

  it("says the source can no longer be checked", () => {
    renderAbout();

    expect(pageText()).toContain(OPERATOR_SOURCE.unreachableSince);
  });
});

describe("where our data and theirs disagree", () => {
  it("gives our stop counts as ours, beside theirs", () => {
    renderAbout();

    expect(
      screen.getByText(
        new RegExp(
          `registry holds\\s+${STOPS.length} stops, of which\\s+${SCHEDULED_STOPS.size} have published`
        )
      )
    ).toBeInTheDocument();
  });

  it("says plainly that the two do not reconcile", () => {
    renderAbout();

    expect(screen.getByText(/do not reconcile/i)).toBeInTheDocument();
    expect(screen.getByText(/have not\s+deleted stops to force a match/i)).toBeInTheDocument();
  });
});

describe("what it says about live tracking", () => {
  it("describes tracking as more than on or off", () => {
    renderAbout();

    for (const state of PASSENGER_VISIBLE) {
      expect(screen.getByText(en[STATE_LABELS[state]])).toBeInTheDocument();
      expect(
        screen.getByText(en[STATE_DESCRIPTIONS[state]])
      ).toBeInTheDocument();
    }
  });

  it("quotes the staleness window the map actually applies", () => {
    renderAbout();

    const minutes = Math.round(DEFAULT_FRESHNESS.staleMs / 60_000);

    expect(
      screen.getByText(new RegExp(`Past about ${minutes} minutes`))
    ).toBeInTheDocument();
  });

  it("does not claim coverage it cannot guarantee", () => {
    renderAbout();

    expect(screen.getByText(/Coverage is therefore not guaranteed/i)).toBeInTheDocument();
  });
});

describe("what it refuses to promise", () => {
  /*
    Withdrawn in §25 when nothing cached the app shell, restored in §30 once a
    service worker did - and still conditional, because a page never opened has
    nothing stored to show.
  */
  it("promises offline only for a ticket already opened", () => {
    renderAbout();

    expect(
      screen.getByText(/a ticket\s+you have already opened will open again with no connection/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/A page\s+you have never opened will not/i)
    ).toBeInTheDocument();
  });

  it("calls booking a demonstration while no gateway settles money", () => {
    renderAbout();

    expect(screen.getByText(/no money changes hands/i)).toBeInTheDocument();
  });

  it("stops calling it a demonstration the moment a real gateway is wired", () => {
    paymentProvider.settlesRealMoney = true;
    paymentProvider.label = "Some Gateway";

    renderAbout();

    expect(screen.queryByText(/no money changes hands/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Payment is taken through Some Gateway/)).toBeInTheDocument();
  });

  /*
    The timetable is a second quoted source with its own document and its own
    date, and /about exists to say which facts came from where. Naming the
    operator's figures and not the timetable's would leave the larger of the
    two unattributed.
  */
  it("attributes the timetable to the document it was read from", () => {
    renderAbout();

    const shown = document.body.textContent ?? "";

    expect(shown).toContain(TIMETABLE_SOURCE.title);
    expect(shown).toContain(TIMETABLE_SOURCE.publisher);
    expect(shown).toContain(TIMETABLE_SOURCE.document);
  });

  it("marks what is planned as not built", () => {
    renderAbout();

    expect(
      screen.getByText(/These are intentions, not features/i)
    ).toBeInTheDocument();
  });

  /*
    THE FAILURE THIS SECTION IS PRONE TO, and it had already happened twice.

    "Hindi alongside English" and "Installing the site as an app on your phone"
    were both listed as intentions after they had shipped - Hindi three days
    earlier - on the page an operator reads to decide whether to trust the rest
    of it. The test above passed throughout, because it only checked that the
    disclaimer was present and never what was under it.

    Derived from what the app actually has, so it cannot go stale silently
    again: ship a capability and this fails until the promise is removed.
  */
  it("does not promise anything the app already does", () => {
    renderAbout();

    const plan = screen
      .getByRole("heading", { name: "What we are planning next" })
      .closest("section");

    expect(plan).not.toBeNull();

    const promised = plan!.textContent ?? "";

    if (LOCALES.length > 1) {
      expect(promised, "Hindi has shipped").not.toMatch(/hindi/i);
    }

    if (readFileSync("index.html", "utf8").includes('rel="manifest"')) {
      expect(promised, "the app is installable").not.toMatch(/install/i);
    }
  });

  it("states that this is not the operator's own product", () => {
    renderAbout();

    expect(
      screen.getByText(
        new RegExp(`not an\\s+official ${OPERATOR.abbreviation} product`)
      )
    ).toBeInTheDocument();
  });
});
