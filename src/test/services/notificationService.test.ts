/**
 * Asking the platform for permission to alert.
 *
 * All that is left in this service. The rules that decide WHETHER to alert
 * moved to `@/domain/alerts/arrival` and are tested in the domain project,
 * where no browser exists at all - see `src/test/domain/arrival.test.ts`.
 */

import { describe, expect, it, vi } from "vitest";
import { requestAlertPermission } from "@/services/notificationService";

describe("asking to raise browser alerts", () => {
  const notification = () =>
    window.Notification as unknown as {
      permission: string;
      requestPermission: ReturnType<typeof vi.fn>;
    };

  it("asks once the passenger has switched alerts on", async () => {
    await requestAlertPermission();

    expect(notification().requestPermission).toHaveBeenCalled();
  });

  it("does not ask again once the choice has been made", async () => {
    notification().permission = "denied";

    await requestAlertPermission();

    expect(notification().requestPermission).not.toHaveBeenCalled();
  });

  it("does nothing on a browser without notifications", async () => {
    Reflect.deleteProperty(window, "Notification");

    await expect(requestAlertPermission()).resolves.toBeUndefined();
  });

  it("treats a refusal as an ordinary outcome", async () => {
    notification().requestPermission.mockRejectedValueOnce(new Error("blocked"));

    await expect(requestAlertPermission()).resolves.toBeUndefined();
  });
});
