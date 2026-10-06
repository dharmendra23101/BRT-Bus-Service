import { useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin, Search } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PlaceGlyph from "@/components/PlaceGlyph";
import { useTranslation } from "@/contexts/LocaleContext";
import {
  PLACE_CATEGORIES,
  routeIdForPlace,
  searchPlaces,
  type PlaceCategory,
} from "@/domain/places";
import { hasScheduledService } from "@/domain/transit/schedule";

const NearbyPlaces = () => {
  const { t } = useTranslation();
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<PlaceCategory | null>(null);

  const places = useMemo(
    () => searchPlaces(query, category),
    [query, category]
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main id="main-content" tabIndex={-1} className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 animate-fade-in-up">
            <h1 className="text-3xl md:text-4xl font-bold text-primary tracking-tight">
              {t("nearby.title")}
            </h1>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              {t("nearby.intro")}
            </p>
          </div>

          <div className="brt-search-card animate-fade-in-up animate-stagger-1">
            <label
              htmlFor={searchId}
              className="block text-sm font-medium text-foreground mb-1"
            >
              {t("nearby.find")}
            </label>

            <div className="relative">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                id={searchId}
                type="search"
                value={query}
                autoComplete="off"
                placeholder={t("nearby.searchPlaceholder")}
                onChange={(event) => setQuery(event.target.value)}
                className="brt-input touch-target pl-11"
              />
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              <button
                type="button"
                aria-pressed={category === null}
                onClick={() => setCategory(null)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-state touch-target ${
                  category === null
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-foreground hover:bg-secondary"
                }`}
              >
                {t("nearby.all")}
              </button>

              {PLACE_CATEGORIES.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={category === option}
                  onClick={() => setCategory(option)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-state touch-target ${
                    category === option
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-foreground hover:bg-secondary"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            <p className="sr-only" role="status" aria-live="polite">
              {places.length} places shown
            </p>
          </div>

          <div className="mt-8">
            {places.length === 0 ? (
              <div className="brt-card text-center">
                <p className="font-semibold text-foreground mb-1">
                  {t("nearby.noMatch")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("nearby.tryAnother")}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setCategory(null);
                  }}
                  className="mt-3 text-primary font-medium underline underline-offset-2 touch-target"
                >
                  {t("nearby.clearFilters")}
                </button>
              </div>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 list-none p-0">
                {places.map((place) => {
                  const routeId = routeIdForPlace(place);
                  const scheduled = hasScheduledService(place.nearestStop);

                  return (
                    <li key={place.id} className="brt-card p-0 overflow-hidden">
                      {/*
                        No licensed photograph exists for any of these places
                        yet, so the frame carries a category glyph rather than
                        a broken image or somebody else's picture.
                      */}
                      <div className="h-28">
                        <PlaceGlyph place={place} />
                      </div>

                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          {/*
                            `inline-block` with a little vertical padding so the
                            tap target clears 24px (SC 2.5.8). As a bare inline
                            link it was 21px tall - the whole heading is the
                            link, so there is no surrounding text for the
                            criterion's inline exception to apply to.
                          */}
                          <h2 className="font-bold text-foreground leading-tight">
                            <Link
                              to={`/nearby/${place.id}`}
                              className="inline-block py-0.5 hover:underline underline-offset-2"
                            >
                              {place.name}
                            </Link>
                          </h2>

                          {place.official && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary whitespace-nowrap">
                              {t("nearby.officialListing")}
                            </span>
                          )}
                        </div>

                        <span className="inline-block mt-2 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground">
                          {place.category}
                        </span>

                        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                          {place.description}
                        </p>

                        <p className="mt-3 text-sm text-muted-foreground flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                          {t("nearby.nearestStop", { stop: place.nearestStop })}
                        </p>

                        {!scheduled && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            {t("nearby.unserved")}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-2 mt-4">
                          {scheduled && (
                            <Link
                              to={`/plan?to=${encodeURIComponent(place.nearestStop)}`}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium transition-transform duration-state hover:-translate-y-0.5 touch-target"
                            >
                              {t("nearby.planJourney")}
                              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                            </Link>
                          )}

                          {routeId && (
                            <Link
                              to={`/routes?route=${routeId}`}
                              className="px-4 py-2 rounded-xl border border-border text-foreground text-sm font-medium transition-colors duration-state hover:bg-secondary touch-target"
                            >
                              {t("nearby.route")}
                            </Link>
                          )}

                          <Link
                            to="/fares"
                            className="px-4 py-2 rounded-xl border border-border text-foreground text-sm font-medium transition-colors duration-state hover:bg-secondary touch-target"
                          >
                            {t("nearby.fare")}
                          </Link>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default NearbyPlaces;
