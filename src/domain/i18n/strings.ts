/**
 * Which languages this corridor is served in, and how a string is looked up.
 *
 * The copy itself lives one module per language - `en.ts` is the source every
 * other is typed against, and each other language is its own file. What is
 * translated and what is deliberately not is written down in `en.ts`, because
 * that distinction is the whole design and getting it wrong is the failure
 * mode.
 *
 * NO LIBRARY. A typed record and a hook cover this stage at zero bundle cost,
 * and the initial payload is already measured against a budget.
 * `react-i18next` is worth reaching for when pluralisation starts to bite -
 * Hindi has two plural forms - which is a later stage than this one.
 */

import { en, type Catalogue, type TranslationKey } from "./en";

export type { Catalogue, TranslationKey } from "./en";

export const LOCALES = ["en", "hi"] as const;

export type Locale = (typeof LOCALES)[number];

/**
 * The BCP 47 tag each locale formats dates with.
 *
 * Separate from the locale itself because `Intl` needs a region to choose
 * conventions, and because only DISPLAY formatting may follow the interface
 * language - the formatters in `calendar.ts` whose output is used as a key
 * stay pinned to English regardless of what a passenger has chosen.
 */
export const DATE_LOCALES: Record<Locale, string> = {
  en: "en-GB",
  hi: "hi-IN",
};

/** What each language calls itself, which is what a switcher must show. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  hi: "हिन्दी",
};

/**
 * A language's copy, together with the language it is actually in.
 *
 * The two travel as one value on purpose. `<html lang>` has to describe the
 * words currently on screen, and those are not always the words that were
 * asked for - a passenger who chose Hindi offline gets English, and telling a
 * screen reader to pronounce English with a Hindi voice is worse than either.
 * Pairing them makes the two impossible to drift apart.
 */
export interface LoadedCatalogue {
  readonly locale: Locale;
  readonly strings: Catalogue;
}

/** The one language that is always present, because it is the fallback. */
export const ENGLISH: LoadedCatalogue = { locale: "en", strings: en };

/*
  Every language except English is fetched when somebody asks for it.

  The dictionary is small, but it sits in the ENTRY chunk - the header and
  footer are in the shell, so whatever they import arrives before the first
  paint, for every visitor, in every language they did not choose. Shipping
  each additional language to all of them does not scale past the second one.

  A static `import()` per locale rather than a computed specifier, because the
  bundler has to be able to see the target to split it. Adding a language is
  one line here and one file beside it.
*/
const LOADERS: Partial<Record<Locale, () => Promise<Catalogue>>> = {
  hi: () => import("./hi").then((module) => module.hi),
};

const loaded = new Map<Locale, LoadedCatalogue>([["en", ENGLISH]]);

/**
 * The catalogue for a locale if it is already in memory, otherwise nothing.
 *
 * Lets a caller render the right language immediately when it has been
 * fetched once already, rather than flashing English on the way back to it.
 */
export const loadedCatalogue = (locale: Locale): LoadedCatalogue | null =>
  loaded.get(locale) ?? null;

/**
 * Fetches a locale's copy, once.
 *
 * Rejects if the chunk cannot be fetched - offline, or a deploy that moved it
 * out from under an open tab. The caller decides what to do about that, which
 * is the point: swallowing it here would leave the interface in English while
 * claiming to be in Hindi, with nobody told.
 */
export const loadCatalogue = async (
  locale: Locale
): Promise<LoadedCatalogue> => {
  const already = loaded.get(locale);

  if (already) return already;

  const load = LOADERS[locale];

  if (!load) return ENGLISH;

  const catalogue: LoadedCatalogue = { locale, strings: await load() };

  loaded.set(locale, catalogue);

  return catalogue;
};

/**
 * Whether a string is a key the catalogues answer for.
 *
 * The boundary for messages that travel as keys. A zod schema reports which
 * rule failed rather than choosing the words, and zod supplies its own
 * built-in text for a rule nobody gave a message to - so what arrives at the
 * interface is USUALLY a key and occasionally an English sentence. This tells
 * the two apart, so the sentence renders as itself instead of a passenger
 * meeting `validation.email.required`.
 */
export const isTranslationKey = (value: unknown): value is TranslationKey =>
  typeof value === "string" && Object.prototype.hasOwnProperty.call(en, value);

/**
 * Whether a value is a locale this app ships.
 *
 * Used at the storage boundary: a value read back from a device is not
 * trusted, and an unknown one falls back rather than rendering keys.
 */
export const isLocale = (value: unknown): value is Locale =>
  typeof value === "string" && (LOCALES as readonly string[]).includes(value);

/**
 * The best locale for a browser's stated preferences.
 *
 * Matches on the language subtag only: `hi-IN` and `hi` are the same request,
 * and a device set to Indian English should get English rather than Hindi.
 */
export const preferredLocale = (
  languages: readonly string[],
  fallback: Locale = "en"
): Locale => {
  for (const tag of languages) {
    const base = tag.toLowerCase().split("-")[0];

    if (isLocale(base)) return base;
  }

  return fallback;
};

/**
 * Looks up a string, falling back to English rather than showing a key.
 *
 * Values are substituted INSIDE the sentence rather than concatenated around
 * it, because word order is not a constant. "Next from HNLU" is
 * "HNLU से अगली" - the stop comes first in Hindi and last in English, so a
 * prefix-plus-value approach produces something a Hindi reader has to
 * mentally reassemble. A placeholder can sit wherever the sentence needs it.
 *
 * An unknown placeholder is left visible rather than replaced with nothing:
 * "Next from {stop}" is a bug somebody notices, and "Next from " is a bug
 * that ships.
 */
export const translate = (
  catalogue: LoadedCatalogue,
  key: TranslationKey,
  values?: Readonly<Record<string, string | number>>
): string => {
  const template = catalogue.strings[key] || en[key];

  if (!values) return template;

  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    Object.prototype.hasOwnProperty.call(values, name)
      ? String(values[name])
      : placeholder
  );
};
