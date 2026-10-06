/**
 * Which language the interface is in.
 *
 * Device-scoped rather than account-scoped, deliberately. Somebody reads a bus
 * timetable on the phone in their hand, often before signing in and often
 * without ever signing in - tying the choice to an account would lose it for
 * exactly the passengers most likely to want it.
 *
 * English is bundled; every other language is fetched when somebody asks for
 * it, so what is rendered and what was chosen can differ - offline, or across
 * a deploy. `<html lang>` follows what is RENDERED, because it is what tells a
 * screen reader which voice to use, and Hindi read aloud by an English
 * synthesiser is not accented, it is unintelligible.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { STORAGE_KEYS } from "@/constants/config";
import { reportCaught } from "@/services/observability";
import {
  ENGLISH,
  isLocale,
  loadCatalogue,
  loadedCatalogue,
  preferredLocale,
  translate,
  type Locale,
  type LoadedCatalogue,
  type TranslationKey,
} from "@/domain/i18n/strings";

interface LocaleValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: TranslationKey, values?: Readonly<Record<string, string | number>>) => string;
}

const LocaleContext = createContext<LocaleValue>({
  locale: "en",
  setLocale: () => {},
  t: (key, values) => translate(ENGLISH, key, values),
});

/**
 * The locale to start in.
 *
 * A previous choice wins over the browser's preference - it was made
 * deliberately, and overriding it would mean a passenger re-choosing on every
 * visit. Storage can throw in a private window, so it is guarded rather than
 * assumed.
 */
const initialLocale = (): Locale => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.LOCALE);

    if (isLocale(stored)) return stored;
  } catch {
    /* A device that refuses storage still gets a language. */
  }

  return preferredLocale(
    typeof navigator === "undefined" ? [] : (navigator.languages ?? [])
  );
};

export const LocaleProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  /*
    What is on screen, which is not always what was asked for. English is in
    the entry bundle; every other language is fetched. Starting from whatever
    is already in memory means switching back to a language fetched earlier
    does not flash English on the way.
  */
  const [catalogue, setCatalogue] = useState<LoadedCatalogue>(
    () => loadedCatalogue(locale) ?? ENGLISH
  );

  /*
    A first visit in Hindi therefore paints English once, for as long as one
    small chunk takes to arrive. That is the cost of not shipping every
    language to every visitor, and it is the right way round: the alternative
    is a blank screen while a passenger waits to find out when their bus
    leaves.

    On failure the interface stays English and SAYS English. Rendering English
    under `lang="hi"` would have a screen reader pronounce it with a Hindi
    voice, which is not a degraded experience but an unusable one.
  */
  useEffect(() => {
    let cancelled = false;

    loadCatalogue(locale)
      .then((next) => {
        if (!cancelled) setCatalogue(next);
      })
      .catch(() => {
        if (cancelled) return;

        setCatalogue(ENGLISH);
        reportCaught(
          "boundary",
          new Error(`the ${locale} interface could not be loaded`)
        );
      });

    return () => {
      cancelled = true;
    };
  }, [locale]);

  /*
    Written to the document rather than only to React state. `lang` drives
    screen-reader pronunciation and the browser's own translation offer, and
    neither reads component state. It follows the catalogue rather than the
    choice, because it describes the words that are actually rendered.
  */
  useEffect(() => {
    document.documentElement.lang = catalogue.locale;
  }, [catalogue.locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);

    try {
      localStorage.setItem(STORAGE_KEYS.LOCALE, next);
    } catch {
      /* The choice still applies to this session; it just will not persist. */
    }
  }, []);

  const value = useMemo<LocaleValue>(
    () => ({
      locale,
      setLocale,
      t: (key, values) => translate(catalogue, key, values),
    }),
    [locale, setLocale, catalogue]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
};

/** The interface language, and the function that renders copy in it. */
export const useTranslation = (): LocaleValue => useContext(LocaleContext);
