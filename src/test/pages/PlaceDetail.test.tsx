/**
 * A place's own page.
 *
 * The point of this page is not the description - it is the "About this
 * information" section. A dataset that reproduces the operator's own defects
 * and then says so on screen is the difference between claiming better data
 * and having it.
 */

import { describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router-dom";
import PlaceDetail from "@/pages/PlaceDetail";
import { renderWithProviders, screen, within } from "../helpers/render";

vi.mock("@/services/userService", async () => {
  const helper = await import("../helpers/userService");
  return helper.userServiceMock();
});

const openPlace = (id: string) =>
  renderWithProviders(
    <Routes>
      <Route path="/nearby/:placeId" element={<PlaceDetail />} />
    </Routes>,
    { route: `/nearby/${id}` }
  );

const section = (name: RegExp) => screen.getByRole("region", { name });

describe("what the page tells a rider", () => {
  it("names the place and describes it", async () => {
    openPlace("miraj-cinema");

    expect(
      await screen.findByRole("heading", { level: 1, name: "Miraj Cinema" })
    ).toBeInTheDocument();
    expect(screen.getByText(/multiplex cinema/i)).toBeInTheDocument();
  });

  /*
    Derived from the stop registry and the timetable, never written as prose.
    The operator's own free-text directions have already rotted.
  */
  it("derives getting there from the network, not from prose", async () => {
    openPlace("miraj-cinema");

    const there = within(section(/getting there/i));

    expect(await there.findByText("CBD")).toBeInTheDocument();
    expect(there.getByText(/Trunk/i)).toBeInTheDocument();
    expect(there.getByText(/journey can be planned/i)).toBeInTheDocument();
  });

  it("says plainly when a stop has nothing scheduled to it", async () => {
    openPlace("tribal-museum");

    const there = within(section(/getting there/i));

    expect(
      await there.findByText(/no departures yet/i)
    ).toBeInTheDocument();
    expect(
      there.queryByRole("link", { name: /plan journey/i })
    ).not.toBeInTheDocument();
  });

  it("shows opening hours and a phone number only where a source publishes them", async () => {
    openPlace("balco-medical-center");

    expect(await screen.findByText("Open 24 hours")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /0771-2237575/ })
    ).toHaveAttribute("href", "tel:07712237575");
  });

  it("omits the hours entirely rather than guessing them", async () => {
    openPlace("miraj-cinema");

    await screen.findByRole("heading", { level: 1, name: "Miraj Cinema" });

    expect(screen.queryByText("Opening hours")).not.toBeInTheDocument();
  });
});

describe("how far the data can be trusted", () => {
  /*
    The operator publishes this school at a point roughly 90 km outside Nava
    Raipur. Correcting it would be inventing data; hiding it would be the same
    thing more quietly. The page says what is wrong and declines to map it.
  */
  it("refuses to place a coordinate that has left the city, and says why", async () => {
    openPlace("christel-house-india");

    const about = within(section(/about this information/i));

    expect(
      await about.findByText(/do not show this place on a map/i)
    ).toBeInTheDocument();
    expect(about.getByText(/90 km/)).toBeInTheDocument();
  });

  it("does the same for a point the operator gives to two institutions", async () => {
    openPlace("mgm-model-school");

    expect(
      await within(section(/about this information/i)).findByText(
        /second, different institution/i
      )
    ).toBeInTheDocument();
  });

  /*
    Everything else is published-but-unchecked, and says so. Nothing here may
    claim to be verified until the corridor survey happens.
  */
  it("does not pass an unchecked coordinate off as located", async () => {
    openPlace("miraj-cinema");

    expect(
      await within(section(/about this information/i)).findByText(
        /nobody has checked it on the ground/i
      )
    ).toBeInTheDocument();
  });

  it("records where the facts came from and when", async () => {
    openPlace("miraj-cinema");

    const about = within(section(/about this information/i));

    expect(await about.findByText(/Place to Explore/)).toBeInTheDocument();
    expect(about.getByText("2026-08-20")).toBeInTheDocument();
  });

  it("says when the stop pairing is ours rather than the operator's", async () => {
    openPlace("nandanvan-jungle-safari");

    expect(
      await within(section(/getting there/i)).findByText(
        /comes from our own network registry/i
      )
    ).toBeInTheDocument();
  });
});

describe("a link that does not resolve", () => {
  it("says so instead of rendering an empty page", async () => {
    openPlace("no-such-place");

    expect(
      await screen.findByRole("heading", { name: /do not have a page for that place/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /back to nearby places/i })
    ).toHaveAttribute("href", "/nearby");
  });
});

/*
  RouteChangeHandler keys metadata off an exact pathname and lives in the eager
  bundle, so this route is skipped there and the page owns its own title. If
  that ever regresses, the tab reads "Page" for every place.
*/
describe("the page names itself", () => {
  it("puts the place in the document title", async () => {
    openPlace("purkhouti-muktangan");

    await screen.findByRole("heading", { level: 1, name: "Purkhouti Muktangan" });

    expect(document.title).toBe("Purkhouti Muktangan · BRT Bus Service");
  });

  it("writes a meta description from the place, not a generic one", async () => {
    openPlace("purkhouti-muktangan");

    await screen.findByRole("heading", { level: 1, name: "Purkhouti Muktangan" });

    expect(
      document.head.querySelector('meta[name="description"]')?.getAttribute("content")
    ).toMatch(/Nearest BRT stop: Muktangan\./);
  });
});
