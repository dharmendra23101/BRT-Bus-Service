/**
 * Custom render.
 *
 * Components in this app assume the provider stack from `App.tsx`. Rendering
 * them bare would either crash on a missing context or, worse, silently test
 * a component in a shape it never occupies in production. This helper mounts
 * the same stack so tests exercise the real wiring.
 */

import type { ReactElement, ReactNode } from "react";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { MemoryRouter, Route, Routes, type Location } from "react-router-dom";
import { LiveAnnouncer } from "@/components/a11y/LiveAnnouncer";
import { NotificationProvider } from "@/components/NotificationPopup";
import { AuthProvider } from "@/contexts/AuthContext";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { TicketProvider } from "@/contexts/TicketContext";

interface ProviderOptions extends Omit<RenderOptions, "wrapper"> {
  /** Initial URL. Defaults to the site root. */
  route?: string | Partial<Location>;
  /** Path pattern to mount the element at, when the component reads params. */
  path?: string;
}

const AllProviders =
  (route: string | Partial<Location>, path?: string) =>
  ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[route]}>
      <LocaleProvider>
        <AuthProvider>
        <TicketProvider>
          <LiveAnnouncer>
            <NotificationProvider>
              {path ? (
                <Routes>
                  <Route path={path} element={children} />
                </Routes>
              ) : (
                children
              )}
            </NotificationProvider>
          </LiveAnnouncer>
        </TicketProvider>
        </AuthProvider>
      </LocaleProvider>
    </MemoryRouter>
  );

export interface RenderWithProvidersResult extends RenderResult {
  /** Pre-configured user-event instance. */
  user: ReturnType<typeof userEvent.setup>;
}

/**
 * Renders inside the full provider stack and returns a `user` for
 * interactions.
 *
 * `userEvent` is preferred over `fireEvent` throughout the suite because it
 * dispatches the same sequence of events a real browser does - a click that
 * lands on a `pointer-events: none` element genuinely fails, which is what we
 * want a test to catch.
 */
export const renderWithProviders = (
  ui: ReactElement,
  { route = "/", path, ...options }: ProviderOptions = {}
): RenderWithProvidersResult => {
  const user = userEvent.setup({
    advanceTimers: (delay) => {
      if (vi.isFakeTimers()) vi.advanceTimersByTime(delay);
    },
  });

  return {
    user,
    ...render(ui, { wrapper: AllProviders(route, path), ...options }),
  };
};

export * from "@testing-library/react";
