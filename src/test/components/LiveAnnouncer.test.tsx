/**
 * The shared live regions, and what they leave running.
 *
 * An announcement is deliberately delayed: the region has to pass through
 * empty for a screen reader to re-read an identical message. That delay is a
 * timer, and a timer scheduled by a component that then unmounts is a state
 * update against something that no longer exists.
 *
 * It surfaced as an uncaught `ReferenceError: window is not defined` thrown
 * from a timer that fired after a test environment had been torn down -
 * reported against whichever file happened to be running, and passing on most
 * runs, because whether it fires in time is a matter of milliseconds.
 */

import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LiveAnnouncer, useAnnounce } from "@/components/a11y/LiveAnnouncer";

const Announcer = ({
  message,
  politeness,
}: {
  message: string;
  politeness?: "polite" | "assertive";
}) => {
  const announce = useAnnounce();

  return (
    <button type="button" onClick={() => announce(message, politeness)}>
      announce
    </button>
  );
};

const renderAnnouncer = (message: string, politeness?: "polite" | "assertive") =>
  render(
    <LiveAnnouncer>
      <Announcer message={message} politeness={politeness} />
    </LiveAnnouncer>
  );

const fire = () => act(() => void screen.getByRole("button").click());

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("announcing to a screen reader", () => {
  it("speaks a status update politely", () => {
    renderAnnouncer("Ticket cancelled.");

    fire();
    act(() => void vi.advanceTimersByTime(100));

    expect(screen.getByRole("status")).toHaveTextContent("Ticket cancelled.");
    expect(screen.getByRole("alert")).toHaveTextContent("");
  });

  it("interrupts only for something the passenger must act on", () => {
    renderAnnouncer("Payment failed.", "assertive");

    fire();
    act(() => void vi.advanceTimersByTime(100));

    expect(screen.getByRole("alert")).toHaveTextContent("Payment failed.");
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  /*
    The region has to be empty first or an identical repeat message - a second
    failed booking - is not a change, and is never read out.
  */
  it("passes through empty so an identical message is read again", () => {
    renderAnnouncer("Payment failed.", "assertive");

    fire();
    act(() => void vi.advanceTimersByTime(100));
    fire();

    expect(screen.getByRole("alert")).toHaveTextContent("");

    act(() => void vi.advanceTimersByTime(100));

    expect(screen.getByRole("alert")).toHaveTextContent("Payment failed.");
  });
});

describe("when the page goes away mid-announcement", () => {
  it("leaves no timer running after it unmounts", () => {
    const { unmount } = renderAnnouncer("Ticket cancelled.");

    fire();

    expect(vi.getTimerCount()).toBeGreaterThan(0);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears several announcements, not merely the last", () => {
    const { unmount } = renderAnnouncer("Ticket cancelled.");

    fire();
    fire();
    fire();

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });

  it("does nothing when the timer is allowed to run after unmount", () => {
    const { unmount } = renderAnnouncer("Ticket cancelled.");

    fire();
    unmount();

    expect(() => act(() => void vi.advanceTimersByTime(100))).not.toThrow();
  });
});
