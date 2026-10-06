import { describe, expect, it, vi } from "vitest";
import DriverDashboard from "@/components/dashboards/DriverDashboard";
import { subscribeToAssignment } from "@/services/locationService";
import { renderWithProviders, screen } from "../helpers/render";
import { makeUser, signInAs } from "../helpers/firebase";
import { setMockRole } from "../helpers/userService";

vi.mock("@/services/locationService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/locationService")>()),
  subscribeToAssignment: vi.fn(() => () => {}),
}));

const VEHICLE = "fixture-a";

/** Reports an assignment to whatever the card subscribed with. */
const assign = (vehicleId: string | null) => {
  vi.mocked(subscribeToAssignment).mockImplementation((_uid, onAssignment) => {
    onAssignment(vehicleId);

    return () => {};
  });
};

vi.mock("@/services/userService", async () => {
  const helper = await import("../helpers/userService");
  return helper.userServiceMock();
});

const asDriver = () => {
  setMockRole("driver");
  signInAs(
    makeUser({ uid: "driver-9", displayName: "Asha Verma", email: "asha@brt.in" }),
    "driver"
  );
};

describe("a driver arriving at their dashboard", () => {
  it("greets them by name", async () => {
    renderWithProviders(<DriverDashboard />, { route: "/dashboard" });
    asDriver();

    expect(
      await screen.findByRole("heading", { name: "Asha Verma" })
    ).toBeInTheDocument();
    expect(screen.getByText("asha@brt.in")).toBeInTheDocument();
  });

  it("uses the photo on their account when there is one", async () => {
    renderWithProviders(<DriverDashboard />, { route: "/dashboard" });
    setMockRole("driver");
    signInAs(
      makeUser({
        uid: "driver-9",
        displayName: "Asha Verma",
        photoURL: "https://example.com/asha.jpg",
      }),
      "driver"
    );

    expect(
      await screen.findByRole("img", { name: "Asha Verma" })
    ).toHaveAttribute("src", "https://example.com/asha.jpg");
  });

  it("names the vehicle passengers will see, not the account", async () => {
    assign(VEHICLE);

    renderWithProviders(<DriverDashboard />, { route: "/dashboard" });
    asDriver();

    expect(await screen.findByText(VEHICLE)).toBeInTheDocument();
    expect(screen.queryByText("driver-9")).not.toBeInTheDocument();
  });

  /*
    Promising a driver that passengers can see their bus, while no bus is
    assigned, would be a claim about something that is not happening.
  */
  it("says nothing is shared when no bus is assigned", async () => {
    assign(null);

    renderWithProviders(<DriverDashboard />, { route: "/dashboard" });
    asDriver();

    expect(
      await screen.findByText(/No bus is assigned to you right now/i)
    ).toBeInTheDocument();
  });
});

describe("reaching live tracking from the dashboard", () => {
  it("links to the page that owns broadcasting", () => {
    renderWithProviders(<DriverDashboard />, { route: "/dashboard" });

    expect(
      screen.getByRole("link", { name: "Open live tracking" })
    ).toHaveAttribute("href", "/driver");
  });

  it("says that leaving the tracking page ends the broadcast", () => {
    renderWithProviders(<DriverDashboard />, { route: "/dashboard" });

    expect(
      screen.getByText(/stops when you leave it/i)
    ).toBeInTheDocument();
  });

  it("does not offer a broadcast toggle it cannot honour", () => {
    renderWithProviders(<DriverDashboard />, { route: "/dashboard" });

    expect(
      screen.getByRole("heading", { name: "Share Live Location" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /broadcasting/i })
    ).not.toBeInTheDocument();
  });
});

describe("what the dashboard claims to know", () => {
  it("makes no claim the app cannot stand behind", async () => {
    assign(VEHICLE);

    renderWithProviders(<DriverDashboard />, { route: "/dashboard" });
    asDriver();

    await screen.findByText(VEHICLE);

    expect(screen.queryByText("Status")).not.toBeInTheDocument();
    expect(screen.queryByText(/Offline/)).not.toBeInTheDocument();
    expect(screen.queryByText("Passengers Today")).not.toBeInTheDocument();
    expect(screen.queryByText("Distance Covered")).not.toBeInTheDocument();
  });
});
