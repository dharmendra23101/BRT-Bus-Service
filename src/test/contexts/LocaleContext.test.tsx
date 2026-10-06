/**
 * What happens when a language does not arrive.
 *
 * English is in the entry bundle; every other language is fetched. That is a
 * network call, and network calls fail - a passenger underground, a phone on
 * a dead connection, a tab left open across a deploy that moved the chunk.
 *
 * The failure has to be survivable AND honest, and the honest part is the
 * subtle one: `<html lang>` must describe the words actually on screen. A
 * page rendering English while claiming to be Hindi has a screen reader
 * pronounce English words with a Hindi voice, which is not a degraded
 * experience but an unusable one - and it is exactly what a naive
 * implementation does, because the locale the passenger chose is the obvious
 * thing to write there.
 *
 * The Hindi module is mocked into failing for this whole file, which is why
 * it is a file of its own: `loadCatalogue` caches, so one successful load
 * anywhere would hide the failure from everything after it.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LocaleProvider, useTranslation } from "@/contexts/LocaleContext";
import { STORAGE_KEYS } from "@/constants/config";
import { en } from "@/domain/i18n/en";

vi.mock("@/domain/i18n/hi", () => {
  throw new Error("Failed to fetch dynamically imported module");
});

const reportCaught = vi.fn();

vi.mock("@/services/observability", () => ({
  get reportCaught() {
    return reportCaught;
  },
}));

const Probe = () => {
  const { locale, setLocale, t } = useTranslation();

  return (
    <div>
      <p data-testid="copy">{t("nav.timetable")}</p>
      <p data-testid="chosen">{locale}</p>
      <button type="button" onClick={() => setLocale("hi")}>
        switch
      </button>
    </div>
  );
};

const renderProbe = () =>
  render(
    <LocaleProvider>
      <Probe />
    </LocaleProvider>
  );

beforeEach(() => {
  localStorage.clear();
  document.documentElement.lang = "en";
  reportCaught.mockClear();
});

describe("when the chosen language cannot be fetched", () => {
  it("keeps the interface usable in English", async () => {
    const user = userEvent.setup();

    renderProbe();
    await user.click(screen.getByRole("button", { name: "switch" }));

    await waitFor(() => expect(reportCaught).toHaveBeenCalled());

    expect(screen.getByTestId("copy")).toHaveTextContent(en["nav.timetable"]);
  });

  /*
    THE POINT OF THIS FILE. English words under `lang="hi"` are read aloud by
    a Hindi synthesiser. The attribute follows what was rendered, not what was
    asked for.
  */
  it("does not claim to be in a language it failed to load", async () => {
    const user = userEvent.setup();

    renderProbe();
    await user.click(screen.getByRole("button", { name: "switch" }));

    await waitFor(() => expect(reportCaught).toHaveBeenCalled());

    expect(document.documentElement.lang).toBe("en");
  });

  /*
    The preference survives. Somebody who asked for Hindi on a dead connection
    has not changed their mind, and making them ask again on every visit
    punishes them for the network.
  */
  it("remembers that Hindi was asked for", async () => {
    const user = userEvent.setup();

    renderProbe();
    await user.click(screen.getByRole("button", { name: "switch" }));

    await waitFor(() => expect(reportCaught).toHaveBeenCalled());

    expect(localStorage.getItem(STORAGE_KEYS.LOCALE)).toBe("hi");
    expect(screen.getByTestId("chosen")).toHaveTextContent("hi");
  });

  /*
    A failure that nobody hears about is the reason the observability layer
    exists. This is a caught error - the passenger still has a working page -
    which is precisely the class that used to vanish.
  */
  it("reports the failure rather than swallowing it", async () => {
    const user = userEvent.setup();

    renderProbe();
    await user.click(screen.getByRole("button", { name: "switch" }));

    await waitFor(() => expect(reportCaught).toHaveBeenCalledTimes(1));

    const [, error] = reportCaught.mock.calls[0]!;

    expect(String((error as Error).message)).toContain("hi");
  });

  /*
    And it does not spin. The catch sets English, which is a state change; if
    that fed back into the effect that loads, a failed language would retry
    forever on a connection already known to be bad.
  */
  it("does not retry in a loop", async () => {
    const user = userEvent.setup();

    renderProbe();
    await user.click(screen.getByRole("button", { name: "switch" }));

    await waitFor(() => expect(reportCaught).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(reportCaught).toHaveBeenCalledTimes(1);
  });

  /*
    A stored preference takes the same path on a cold start, where there is no
    click to blame and the failure happens during the first render.
  */
  it("starts in English when a stored language cannot be fetched", async () => {
    localStorage.setItem(STORAGE_KEYS.LOCALE, "hi");

    renderProbe();

    await waitFor(() => expect(reportCaught).toHaveBeenCalled());

    expect(screen.getByTestId("copy")).toHaveTextContent(en["nav.timetable"]);
    expect(document.documentElement.lang).toBe("en");
  });
});
