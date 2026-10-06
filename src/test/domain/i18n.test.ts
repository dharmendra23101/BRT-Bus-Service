/**
 * The interface copy, and the line it must not cross.
 *
 * The dictionary itself is type-checked - a missing Hindi string will not
 * compile - so these cover what types cannot: that the two languages actually
 * say different things, that a bad stored value cannot render keys at a
 * passenger, and above all that no published transit name has been quietly
 * translated.
 */

import { describe, expect, it } from "vitest";
import {
  ENGLISH,
  isLocale,
  isTranslationKey,
  loadCatalogue,
  loadedCatalogue,
  LOCALES,
  LOCALE_NAMES,
  preferredLocale,
  translate,
  type LoadedCatalogue,
} from "@/domain/i18n/strings";
import { en } from "@/domain/i18n/en";
import { hi } from "@/domain/i18n/hi";
import type { TranslationKey } from "@/domain/i18n/en";
import { STOPS } from "@/domain/transit/stops";
import { ROUTE_IDS, getRoute } from "@/domain/transit/routes";

/*
  Built here rather than fetched, so the lookup tests stay synchronous. What
  `loadCatalogue` produces is covered on its own below.
*/
const HINDI: LoadedCatalogue = { locale: "hi", strings: hi };

describe("the two languages", () => {
  it("ships both, and no more than it can maintain", () => {
    expect([...LOCALES]).toEqual(["en", "hi"]);
  });

  it("covers every key in both", () => {
    expect(Object.keys(hi).sort()).toEqual(
      Object.keys(en).sort()
    );
  });

  /*
    A key copied across untranslated is the failure a type cannot catch: it
    compiles, it renders, and it is English on a Hindi screen. Punctuation and
    the brand name are legitimately shared, so only alphabetic copy counts.
  */
  it("does not leave English copy sitting in the Hindi record", () => {
    const untranslated = (Object.keys(en) as TranslationKey[])
      .filter((key) => en[key] === hi[key])
      .filter((key) => /[a-z]{4,}/i.test(en[key]));

    expect(untranslated).toEqual([]);
  });

  /*
    Somebody looking for Hindi scans for "हिन्दी", not for the word "Hindi"
    written in an alphabet they came here to avoid.
  */
  it("names each language in itself", () => {
    expect(LOCALE_NAMES.en).toBe("English");
    expect(LOCALE_NAMES.hi).toMatch(/[ऀ-ॿ]/);
  });

  it("writes the Hindi in Devanagari", () => {
    const devanagari = Object.values(hi).filter((value) =>
      /[ऀ-ॿ]/.test(value)
    );

    expect(devanagari.length).toBeGreaterThan(Object.keys(hi).length / 2);
  });
});

/*
  THE RULE THIS FILE EXISTS FOR.

  Stop names, route names and headlines are published by the operator. Their
  official Devanagari forms are the operator's to supply, and machine
  transliteration produces strings that look plausible and read as wrong to
  somebody who lives on the corridor. Until they are supplied, published names
  render in their published form in both languages - which is normal practice,
  and honest.
*/
describe("what must never be translated", () => {
  it("holds no stop name in the dictionary, in either language", () => {
    const copy = [
      ...Object.values(en),
      ...Object.values(hi),
    ].join(" ");

    for (const stop of STOPS) {
      expect(copy, `${stop} appears in interface copy`).not.toContain(stop);
    }
  });

  it("holds no route name or headline", () => {
    const copy = [
      ...Object.values(en),
      ...Object.values(hi),
    ].join(" ");

    for (const id of ROUTE_IDS) {
      const route = getRoute(id);

      expect(copy).not.toContain(route.headline);
      expect(copy).not.toContain(route.name);
    }
  });
});

describe("choosing a language", () => {
  it("recognises the locales it ships", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("hi")).toBe(true);
  });

  /*
    The storage boundary. A value read back from a device is not trusted -
    without this, a tampered or stale entry would render translation keys at a
    passenger rather than words.
  */
  it("refuses anything else", () => {
    expect(isLocale("mr")).toBe(false);
    expect(isLocale("")).toBe(false);
    expect(isLocale(null)).toBe(false);
    expect(isLocale(["hi"])).toBe(false);
  });

  it("takes Hindi from a browser that asks for it", () => {
    expect(preferredLocale(["hi-IN", "en-GB"])).toBe("hi");
  });

  /*
    Matched on the language subtag. `hi-IN` and `hi` are the same request, and
    a phone set to Indian English is asking for English.
  */
  it("reads a regional tag as its language", () => {
    expect(preferredLocale(["hi"])).toBe("hi");
    expect(preferredLocale(["en-IN"])).toBe("en");
  });

  it("takes the first language it can actually serve", () => {
    expect(preferredLocale(["ta-IN", "mr", "hi-IN"])).toBe("hi");
  });

  it("falls back rather than failing when it serves none of them", () => {
    expect(preferredLocale(["ta", "bn"])).toBe("en");
    expect(preferredLocale([])).toBe("en");
  });
});

describe("looking a string up", () => {
  it("returns the language asked for", () => {
    expect(translate(HINDI, "nav.timetable")).toBe(hi["nav.timetable"]);
    expect(translate(ENGLISH, "nav.timetable")).toBe("Timetable");
  });

  /*
    A key the catalogue does not answer for falls back to English rather than
    rendering nothing. This is not hypothetical now that catalogues are
    fetched: a tab left open across a deploy can hold a chunk written before
    the key existed. A passenger seeing "Timetable" on a Hindi screen still
    gets somewhere; a passenger seeing an empty heading does not.
  */
  it("falls back to English rather than showing an empty string", () => {
    const stale: LoadedCatalogue = {
      locale: "hi",
      strings: { ...hi, "nav.timetable": "" },
    };

    expect(translate(stale, "nav.timetable")).toBe("Timetable");
  });
});

/*
  Messages that travel as keys.

  A zod schema and a Firebase error mapper both decide WHICH problem occurred,
  in a domain that has no idea which language anybody is reading in. They
  therefore name a key and leave the wording to whatever renders it - but zod
  supplies its own English for any rule nobody gave a message to, so the two
  have to be told apart at the boundary.
*/
describe("telling a key from a sentence", () => {
  it("recognises a key the catalogue answers for", () => {
    expect(isTranslationKey("validation.email.required")).toBe(true);
    expect(isTranslationKey("auth.error.credentials")).toBe(true);
  });

  it("refuses a sentence, so it renders as itself", () => {
    expect(isTranslationKey("Email is required")).toBe(false);
    expect(isTranslationKey("Required")).toBe(false);
  });

  it("refuses anything that is not a string", () => {
    expect(isTranslationKey(undefined)).toBe(false);
    expect(isTranslationKey(null)).toBe(false);
    expect(isTranslationKey(42)).toBe(false);
  });

  /*
    Object prototype members are not keys. `"toString" in en` is true, and a
    guard written that way would let `toString` through to be rendered as a
    function body at a passenger.
  */
  it("refuses an inherited property name", () => {
    expect(isTranslationKey("toString")).toBe(false);
    expect(isTranslationKey("constructor")).toBe(false);
  });
});

/*
  Loading a language, which is the part that changed when the dictionary left
  the entry bundle. English must never be fetched - it is the fallback, and a
  fallback that has to arrive over the network is not one.
*/
describe("loading a language", () => {
  it("has English in hand without being asked", () => {
    expect(loadedCatalogue("en")).toEqual(ENGLISH);
    expect(ENGLISH.strings["nav.timetable"]).toBe("Timetable");
  });

  it("fetches Hindi and reports which language it got", async () => {
    const catalogue = await loadCatalogue("hi");

    expect(catalogue.locale).toBe("hi");
    expect(catalogue.strings["nav.timetable"]).toBe(hi["nav.timetable"]);
  });

  /*
    Cached by identity, not merely by value: a passenger switching back and
    forth must not re-fetch, and the provider uses a hit here to render the
    right language on the first paint rather than flashing English.
  */
  it("keeps a language it has already fetched", async () => {
    const first = await loadCatalogue("hi");
    const second = await loadCatalogue("hi");

    expect(second).toBe(first);
    expect(loadedCatalogue("hi")).toBe(first);
  });

  it("resolves English without touching a loader", async () => {
    await expect(loadCatalogue("en")).resolves.toBe(ENGLISH);
  });
});

/*
  Interpolation, which exists because word order is not a constant.

  "Next from HNLU" is "HNLU से अगली बस": the stop leads in one language and
  trails in the other. A prefix-plus-value approach cannot express that, which
  is why the placeholder lives inside the sentence.
*/
describe("putting a value into a sentence", () => {
  it("substitutes wherever the sentence puts the placeholder", () => {
    expect(translate(ENGLISH, "timetable.nextFrom", { stop: "HNLU" })).toBe(
      "Next from HNLU"
    );
    expect(translate(HINDI, "timetable.nextFrom", { stop: "HNLU" })).toContain(
      "HNLU"
    );
  });

  /*
    The stop leads in Hindi and trails in English. If both put it in the same
    place, the Hindi is a transliterated English sentence rather than a Hindi
    one.
  */
  it("does not assume the value sits in the same place in both", () => {
    const english = translate(ENGLISH, "timetable.nextFrom", { stop: "CBD" });
    const hindi = translate(HINDI, "timetable.nextFrom", { stop: "CBD" });

    expect(english.indexOf("CBD")).toBeGreaterThan(0);
    expect(hindi.indexOf("CBD")).toBe(0);
  });

  it("substitutes every placeholder in a sentence with several", () => {
    const shown = translate(ENGLISH, "timetable.showing", {
      shown: "Weekend service",
      today: "Weekday service",
    });

    expect(shown).toContain("Weekend service");
    expect(shown).toContain("Weekday service");
    expect(shown).not.toContain("{");
  });

  /*
    A missing value is left visible. "Next from {stop}" is a bug somebody
    reports; "Next from " is a bug that ships.
  */
  it("leaves an unfilled placeholder visible rather than blank", () => {
    expect(translate(ENGLISH, "timetable.nextFrom", {})).toBe("Next from {stop}");
  });

  it("leaves a plain string alone when given no values", () => {
    expect(translate(ENGLISH, "timetable.finished")).toBe(
      "Service has finished for today"
    );
  });

  /*
    Every placeholder an English string declares must exist in the Hindi one,
    or a translated sentence silently drops the value it was written around.
  */
  it("declares the same placeholders in both languages", () => {
    const names = (value: string) =>
      [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

    for (const key of Object.keys(en) as TranslationKey[]) {
      expect(names(hi[key]), `${key} placeholders differ`).toEqual(
        names(en[key])
      );
    }
  });
});
