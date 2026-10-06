import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MapPin, Route as RouteIcon, Compass, Search as SearchIcon } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useTranslation } from "@/contexts/LocaleContext";
import type { TranslationKey } from "@/domain/i18n/en";
import { searchEverything, type SearchResult } from "@/domain/search";
import { isNetworkRouteId } from "@/domain/transit/routes";

const KIND_ICONS = {
  stop: MapPin,
  route: RouteIcon,
  place: Compass,
} as const;

const KIND_LABELS = {
  stop: "search.kind.stop",
  route: "search.kind.route",
  place: "search.kind.place",
} as const satisfies Record<string, TranslationKey>;

/**
 * Where a result leads.
 *
 * Kept out of the domain, which has no opinion about this application's URLs.
 * A numbered working has no page of its own, so it goes to the timetable -
 * which is where its departures actually are - rather than to the route
 * diagram, which draws the network routes.
 */
const hrefFor = (result: SearchResult): string => {
  if (result.kind === "stop") {
    return `/plan?from=${encodeURIComponent(result.id)}`;
  }

  if (result.kind === "place") return `/nearby/${result.id}`;

  return isNetworkRouteId(result.id)
    ? `/routes?route=${result.id}`
    : "/timetable";
};

const Search = () => {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();

  const query = params.get("q") ?? "";
  const [draft, setDraft] = useState(query);

  const results = useMemo(() => searchEverything(query), [query]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();

    const next = draft.trim();

    setParams(next ? { q: next } : {}, { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-white">
      <Header />

      <main id="main-content" tabIndex={-1} className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-primary-deep mb-3">
              {t("page.search")}
            </h1>
            <p className="text-gray-600">
              {t("search.intro")}
            </p>
          </div>

          <form onSubmit={submit} role="search" className="flex gap-2 mb-8">
            <label htmlFor="search-query" className="sr-only">
              {t("home.search.label")}
            </label>
            {/*
              `min-w-0` because a flex item defaults to `min-width: auto`, so
              the placeholder's intrinsic width stopped the field shrinking and
              pushed the button off a 320px screen entirely.
            */}
            <input
              id="search-query"
              type="search"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t("search.placeholder", {
                stop: "CBD",
                route: "Trunk Route",
                place: "Jungle Safari",
              })}
              className="flex-1 min-w-0 bg-white rounded-xl px-4 py-3 border-2 border-input focus:border-primary transition-colors"
            />
            <button
              type="submit"
              className="px-5 py-3 bg-primary text-white rounded-xl hover:bg-primary-strong transition-colors font-semibold flex items-center gap-2 flex-shrink-0"
            >
              <SearchIcon className="w-4 h-4" aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">{t("action.search")}</span>
            </button>
          </form>

          {/*
            Only the summary is live. Wrapping the results themselves would
            re-read every match on each search, which for twenty results is a
            paragraph a screen-reader user cannot interrupt or skip.
          */}
          <p aria-live="polite" className="sr-only">
            {query === ""
              ? ""
              : results.length === 0
                ? t("search.announce.none", { query })
                : t(
                    results.length === 1
                      ? "search.announce.one"
                      : "search.announce.many",
                    { count: results.length, query }
                  )}
          </p>

          <div>
            {query === "" ? (
              <p className="text-center text-gray-600">
                {t("search.begin")}
              </p>
            ) : results.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 md:p-8 shadow-lg text-center">
                <p className="font-semibold text-gray-900 mb-1">
                  {t("search.nothing", { query })}
                </p>
                <p className="text-sm text-gray-600">
                  {t("search.onlyPublished")}{" "}
                  <Link to="/routes" className="text-primary font-medium underline">
                    {t("search.browseRoutes")}
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-3">
                  {t(
                    results.length === 1
                      ? "search.resultsOne"
                      : "search.resultsMany",
                    { count: results.length, query }
                  )}
                </p>

                <ul className="space-y-3">
                  {results.map((result) => {
                    const Icon = KIND_ICONS[result.kind];

                    return (
                      <li key={`${result.kind}-${result.id}`}>
                        <Link
                          to={hrefFor(result)}
                          className="flex items-start gap-3 bg-white rounded-2xl p-4 shadow-lg hover:border-primary border-2 border-transparent transition-colors"
                        >
                          <Icon
                            className="w-5 h-5 text-primary flex-shrink-0 mt-0.5"
                            aria-hidden="true"
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900">
                              <span className="sr-only">
                                {t(KIND_LABELS[result.kind])}:{" "}
                              </span>
                              {result.label}
                            </p>
                            <p className="text-sm text-gray-600">{result.detail}</p>
                          </div>
                          <span
                            aria-hidden="true"
                            className="ml-auto text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2.5 py-1 flex-shrink-0"
                          >
                            {t(KIND_LABELS[result.kind])}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Search;
