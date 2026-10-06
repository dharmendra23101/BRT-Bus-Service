import { afterEach, describe, expect, it, vi } from "vitest";
import { Suspense, lazy } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { renderWithProviders, screen, within } from "../helpers/render";

vi.mock("@/services/userService", async () => {
  const helper = await import("../helpers/userService");
  return helper.userServiceMock();
});

const Boom = (): never => {
  throw new Error("render failed");
};

const silenceReactErrorLog = () =>
  vi.spyOn(console, "error").mockImplementation(() => {});

describe("when the app renders normally", () => {
  it("shows the page and nothing else", () => {
    renderWithProviders(
      <ErrorBoundary>
        <p>Timetable</p>
      </ErrorBoundary>
    );

    expect(screen.getByText("Timetable")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Something went wrong" })
    ).not.toBeInTheDocument();
  });
});

describe("when a page fails to render", () => {
  it("replaces the blank screen with an explanation", () => {
    silenceReactErrorLog();

    renderWithProviders(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(
      screen.getByRole("heading", { name: "Something went wrong" })
    ).toBeInTheDocument();
    expect(within(screen.getByRole("main")).getByRole("alert")).toHaveTextContent(
      /reloading usually fixes it/i
    );
  });

  it("records the failure for diagnosis", () => {
    const logged = silenceReactErrorLog();

    renderWithProviders(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(logged).toHaveBeenCalledWith(
      "Unhandled render error",
      expect.objectContaining({ message: "render failed" }),
      expect.anything()
    );
  });

  it("gives the skip link somewhere to land", () => {
    silenceReactErrorLog();

    renderWithProviders(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
  });
});

describe("recovering from a failed render", () => {
  it("reloads the tab on request", async () => {
    silenceReactErrorLog();

    const reload = vi.fn();

    /*
      Restored below. Left in place it leaks into every file that runs after
      this one in the same worker: the replacement has no origin or href, so
      any later test that pushes history fails with an unrelated URL error.
    */
    const realLocation = Object.getOwnPropertyDescriptor(window, "location");

    Object.defineProperty(window, "location", {
      configurable: true,
      value: { reload },
    });

    const { user } = renderWithProviders(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    await user.click(screen.getByRole("button", { name: "Reload the page" }));

    expect(reload).toHaveBeenCalled();

    if (realLocation) Object.defineProperty(window, "location", realLocation);
  });

  it("offers a fresh load of the home page rather than a router link", () => {
    silenceReactErrorLog();

    renderWithProviders(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute(
      "href",
      "/"
    );
  });
});

describe("when a page's code never arrives", () => {
  it("recovers instead of leaving the router empty", async () => {
    silenceReactErrorLog();

    const Missing = lazy(() =>
      Promise.reject(new Error("Failed to fetch dynamically imported module"))
    );

    renderWithProviders(
      <ErrorBoundary>
        <Suspense fallback={<p>Loading page…</p>}>
          <Missing />
        </Suspense>
      </ErrorBoundary>
    );

    expect(
      await screen.findByRole("heading", { name: "Something went wrong" })
    ).toBeInTheDocument();
  });
});

/*
  Offline became a distinct failure the moment the app gained a service worker:
  a page opened before is served from the cache, one that has not been is simply
  absent, and telling somebody with no signal to reload is advice that cannot
  work. `navigator.onLine` only reports a network interface, so it softens the
  wording and never asserts a diagnosis.
*/
describe("when the page is missing because there is no connection", () => {
  const setOnline = (value: boolean) =>
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value,
    });

  afterEach(() => {
    Reflect.deleteProperty(navigator, "onLine");
  });

  it("says the page needs a connection rather than blaming the app", () => {
    silenceReactErrorLog();
    setOnline(false);

    renderWithProviders(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(
      screen.getByRole("heading", { name: "This page needs a connection" })
    ).toBeInTheDocument();
    expect(within(screen.getByRole("main")).getByRole("alert")).toHaveTextContent(
      /you appear to be offline/i
    );
  });

  it("does not tell somebody with no signal that reloading will fix it", () => {
    silenceReactErrorLog();
    setOnline(false);

    renderWithProviders(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(
      screen.queryByText(/reloading usually fixes it/i)
    ).not.toBeInTheDocument();
  });

  it("says what does still work", () => {
    silenceReactErrorLog();
    setOnline(false);

    renderWithProviders(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(
      screen.getByText(/Pages you have already visited still work/i)
    ).toBeInTheDocument();
  });

  it("keeps the ordinary message when the connection is fine", () => {
    silenceReactErrorLog();
    setOnline(true);

    renderWithProviders(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(
      screen.getByRole("heading", { name: "Something went wrong" })
    ).toBeInTheDocument();
  });
});
