/**
 * Switching the interface language.
 *
 * The dictionary is covered in `domain/i18n.test.ts`. This covers the part
 * that only exists once it is on screen: that choosing a language changes the
 * words, that the choice survives a reload, and that `<html lang>` follows -
 * which is not decoration, it is what tells a screen reader which voice to
 * read with. Hindi read aloud by an English synthesiser is not accented, it
 * is unintelligible.
 */

import { describe, expect, it, vi } from "vitest";
import Header from "@/components/Header";
import { hi } from "@/domain/i18n/hi";
import { STORAGE_KEYS } from "@/constants/config";
import { renderWithProviders, screen, waitFor } from "../helpers/render";

vi.mock("@/services/userService", async () => {
  const helper = await import("../helpers/userService");
  return helper.userServiceMock();
});

/*
  Found by role alone. The control's own accessible name is translated too, so
  querying for the English one stops matching the moment it works - which is
  the feature, not a fault. The header renders exactly one combobox.
*/
const switcher = () => screen.getByRole("combobox");

const chooseHindi = async (user: ReturnType<typeof renderWithProviders>["user"]) => {
  await user.selectOptions(switcher(), "hi");
};

describe("offering the choice", () => {
  it("shows a language control", () => {
    renderWithProviders(<Header />);

    expect(
      screen.getByRole("combobox", { name: /change language/i })
    ).toBeInTheDocument();
  });

  /*
    The control that changes the language is itself labelled in the current
    one. A screen-reader user who has switched to Hindi should not meet an
    English label on the way back.
  */
  it("labels itself in the language currently chosen", async () => {
    const { user } = renderWithProviders(<Header />);

    await chooseHindi(user);

    await waitFor(() =>
      expect(
        screen.getByRole("combobox", { name: hi["language.change"] })
      ).toBeInTheDocument()
    );
  });

  /*
    Each language written in itself. Somebody looking for Hindi scans for
    "हिन्दी", not for the word "Hindi" in an alphabet they came here to avoid.
  */
  it("names each language in its own script", () => {
    renderWithProviders(<Header />);

    expect(screen.getByRole("option", { name: "English" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "हिन्दी" })).toBeInTheDocument();
  });

  it("starts in English", () => {
    renderWithProviders(<Header />);

    expect(switcher()).toHaveValue("en");
    expect(screen.getAllByText("Timetable").length).toBeGreaterThan(0);
  });
});

describe("after choosing Hindi", () => {
  it("renders the navigation in Hindi", async () => {
    const { user } = renderWithProviders(<Header />);

    await chooseHindi(user);

    await waitFor(() =>
      expect(
        screen.getAllByText(hi["nav.timetable"]).length
      ).toBeGreaterThan(0)
    );
    expect(screen.queryByText("Timetable")).not.toBeInTheDocument();
  });

  /*
    `lang` drives screen-reader pronunciation and the browser's own offer to
    translate. Changing the words without changing it leaves the page claiming
    to be English while displaying Hindi.
  */
  it("tells the document which language it is now in", async () => {
    const { user } = renderWithProviders(<Header />);

    await chooseHindi(user);

    await waitFor(() => expect(document.documentElement.lang).toBe("hi"));
  });

  it("remembers the choice for next time", async () => {
    const { user } = renderWithProviders(<Header />);

    await chooseHindi(user);

    await waitFor(() =>
      expect(localStorage.getItem(STORAGE_KEYS.LOCALE)).toBe("hi")
    );
  });

  it("can be switched back", async () => {
    const { user } = renderWithProviders(<Header />);

    await chooseHindi(user);
    await waitFor(() => expect(switcher()).toHaveValue("hi"));

    await user.selectOptions(switcher(), "en");

    await waitFor(() =>
      expect(screen.getAllByText("Timetable").length).toBeGreaterThan(0)
    );
  });
});

describe("what a stored choice can and cannot do", () => {
  it("opens in the language chosen last time", () => {
    localStorage.setItem(STORAGE_KEYS.LOCALE, "hi");

    renderWithProviders(<Header />);

    expect(switcher()).toHaveValue("hi");
  });

  /*
    Storage is not trusted. A stale or tampered value must not put the
    interface into a language that does not exist, which would render
    translation keys at a passenger.
  */
  it("ignores a stored value it does not ship", () => {
    localStorage.setItem(STORAGE_KEYS.LOCALE, "mr");

    renderWithProviders(<Header />);

    expect(switcher()).toHaveValue("en");
    expect(screen.queryByText(/nav\./)).not.toBeInTheDocument();
  });
});
