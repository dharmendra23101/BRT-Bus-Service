/**
 * Arrival alert popups.
 *
 * The provider is driven through `useNotification` the way `ArrivalMonitor`
 * drives it, so what is checked here is what a passenger would actually see
 * and hear: one popup per alert, no repeats for the same bus, and a browser
 * notification only when the passenger has allowed one.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NOTIFICATION_RULES } from "@/constants/config";
import { useNotification } from "@/components/NotificationPopup";
import { act, renderWithProviders, screen, waitFor } from "../helpers/render";

vi.mock("@/services/userService", async () => {
  const helper = await import("../helpers/userService");
  return helper.userServiceMock();
});

const AlertTrigger = ({ stop = "HNLU" }: { stop?: string }) => {
  const { notify } = useNotification();

  return (
    <button type="button" onClick={() => notify("101", stop)}>
      Raise alert
    </button>
  );
};

const notificationApi = () =>
  window.Notification as unknown as {
    permission: string;
    mock: { calls: unknown[][] };
  };

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("telling a passenger their bus is close", () => {
  it("shows the route and the stop, and no arrival time", async () => {
    const { user } = renderWithProviders(<AlertTrigger />);

    await user.click(screen.getByRole("button", { name: "Raise alert" }));

    expect(await screen.findByText("Bus 101")).toBeInTheDocument();
    expect(screen.getByText("HNLU")).toBeInTheDocument();
    expect(screen.getByText(/not an arrival time/i)).toBeInTheDocument();
  });

  it("speaks the alert once through the shared live region", async () => {
    const { user } = renderWithProviders(<AlertTrigger />);

    await user.click(screen.getByRole("button", { name: "Raise alert" }));

    const spoken = await screen.findAllByText(
      /Bus 101 is reporting its position near HNLU/
    );

    expect(spoken).toHaveLength(1);
  });

  it("keeps the visual stack away from screen readers", async () => {
    const { user } = renderWithProviders(<AlertTrigger />);

    await user.click(screen.getByRole("button", { name: "Raise alert" }));

    const popup = await screen.findByText("Bus 101");

    expect(popup.closest("[aria-hidden='true']")).not.toBeNull();
  });
});

describe("not repeating itself", () => {
  it("ignores a second alert for the same bus and stop", async () => {
    const { user } = renderWithProviders(<AlertTrigger />);

    await user.click(screen.getByRole("button", { name: "Raise alert" }));
    await screen.findByText("Bus 101");

    await user.click(screen.getByRole("button", { name: "Raise alert" }));

    expect(screen.getAllByText("Bus 101")).toHaveLength(1);
  });

  it("still alerts for a different stop on the same route", async () => {
    const { user, rerender } = renderWithProviders(<AlertTrigger />);

    await user.click(screen.getByRole("button", { name: "Raise alert" }));
    await screen.findByText("Bus 101");

    rerender(<AlertTrigger stop="CBD" />);
    await user.click(screen.getByRole("button", { name: "Raise alert" }));

    await waitFor(() => expect(screen.getAllByText("Bus 101")).toHaveLength(2));
  });
});

describe("clearing an alert", () => {
  it("takes it away on its own after a while", async () => {
    const { user } = renderWithProviders(<AlertTrigger />);

    await user.click(screen.getByRole("button", { name: "Raise alert" }));
    await screen.findByText("Bus 101");

    act(() => {
      vi.advanceTimersByTime(NOTIFICATION_RULES.AUTO_DISMISS_MS);
    });

    await waitFor(() => expect(screen.queryByText("Bus 101")).not.toBeInTheDocument());
  });

  it("takes it away when the passenger dismisses it", async () => {
    const { user } = renderWithProviders(<AlertTrigger />);

    await user.click(screen.getByRole("button", { name: "Raise alert" }));
    await screen.findByText("Bus 101");

    const dismiss = screen.getByText("Dismiss notification").closest("button")!;

    await user.click(dismiss);

    expect(screen.queryByText("Bus 101")).not.toBeInTheDocument();
  });
});

describe("raising a browser notification", () => {
  it("does so once the passenger has allowed them", async () => {
    notificationApi().permission = "granted";

    const { user } = renderWithProviders(<AlertTrigger />);

    await user.click(screen.getByRole("button", { name: "Raise alert" }));
    await screen.findByText("Bus 101");

    expect(notificationApi().mock.calls).toHaveLength(1);
    expect(notificationApi().mock.calls[0]![0]).toBe("Bus nearby");
  });

  /*
    The icon used to be hotlinked from a stock-icon CDN. Every arrival alert
    therefore told a third party that this person had just been notified, and
    the request could never be cached - the service worker only touches
    same-origin - so an alert raised with no connection showed no icon at all,
    which is exactly when an arrival alert matters most.

    Asserted as first-party rather than as one specific filename, so swapping
    the artwork does not fail this, and reaching for a CDN again does.
  */
  it("draws its icon from this origin, never a third party", async () => {
    notificationApi().permission = "granted";

    const { user } = renderWithProviders(<AlertTrigger />);

    await user.click(screen.getByRole("button", { name: "Raise alert" }));
    await screen.findByText("Bus 101");

    const options = notificationApi().mock.calls[0]![1] as { icon?: string };

    expect(options.icon).toBeDefined();
    expect(options.icon).toMatch(/^\//);
    expect(options.icon).not.toMatch(/^https?:/);
  });

  it("does not when permission has never been given", async () => {
    notificationApi().permission = "default";

    const { user } = renderWithProviders(<AlertTrigger />);

    await user.click(screen.getByRole("button", { name: "Raise alert" }));
    await screen.findByText("Bus 101");

    expect(notificationApi().mock.calls).toHaveLength(0);
  });

  it("does not when permission has been refused", async () => {
    notificationApi().permission = "denied";

    const { user } = renderWithProviders(<AlertTrigger />);

    await user.click(screen.getByRole("button", { name: "Raise alert" }));
    await screen.findByText("Bus 101");

    expect(notificationApi().mock.calls).toHaveLength(0);
  });
});
