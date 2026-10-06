import { useState } from "react";
import { useTranslation } from "@/contexts/LocaleContext";
import type { TranslationKey } from "@/domain/i18n/strings";
import { Link } from "react-router-dom";
import { ArrowRight, Download, ExternalLink, FileText } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StopField from "@/components/StopField";
import { calculateFare, getFareBandsFrom } from "@/domain/transit/fares";
import { findStops, isStopName, type StopName } from "@/domain/transit/stops";

const FARE_CHART_URL = "/docs/FareChart.pdf";

const POPULAR: ReadonlyArray<readonly [StopName, StopName]> = [
  ["Raipur Railway Station", "CBD"],
  ["HNLU", "Telibandha"],
  ["Sector 30", "CBD"],
  ["HNLU", "Raipur Railway Station"],
];

const FARE_NOTE_KEYS = [
  "fares.note.1",
  "fares.note.2",
  "fares.note.3",
  "fares.note.4",
] as const satisfies readonly TranslationKey[];

const resolveStop = (value: string): StopName | null => {
  const trimmed = value.trim();
  if (isStopName(trimmed)) return trimmed;

  const matches = findStops(trimmed);
  return matches.length === 1 ? matches[0]! : null;
};

/**
 * Derived from the fare table rather than restated.
 *
 * The hardcoded list this replaced had drifted out of step with the fare
 * actually charged at booking, and omitted several stops entirely.
 */
const formatDestinations = (stops: readonly string[]): string => {
  if (stops.length === 1) return stops[0]!;

  return `${stops.slice(0, -1).join(", ")}, and ${stops[stops.length - 1]}`;
};

const Fares = () => {
  const { t } = useTranslation();

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const origin = resolveStop(from);
  const destination = resolveStop(to);

  const sameStop = Boolean(origin && destination && origin === destination);
  const fare =
    origin && destination && !sameStop ? calculateFare(origin, destination) : null;
  const bands = origin ? getFareBandsFrom(origin) : [];

  const choose = (pair: readonly [StopName, StopName]) => {
    setFrom(pair[0]);
    setTo(pair[1]);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main id="main-content" tabIndex={-1} className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 animate-fade-in-up">
            <h1 className="text-3xl md:text-4xl font-bold text-primary tracking-tight">
              {t("fares.title")}
            </h1>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
{t("fares.intro")}
            </p>
          </div>

          <div className="brt-search-card animate-fade-in-up animate-stagger-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StopField
                label={t("fares.from")}
                value={from}
                onChange={setFrom}
                exclude={destination ?? ""}
              />
              <StopField
                label="To"
                value={to}
                onChange={setTo}
                exclude={origin ?? ""}
              />
            </div>

            <div aria-live="polite" className="mt-6">
              {sameStop && (
                <p className="text-sm text-destructive font-medium">
                  {t("fares.sameStop")}
                </p>
              )}

              {origin && destination && !sameStop && (
                <div className="rounded-xl bg-secondary p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3 font-semibold text-foreground">
                      <span>{origin}</span>
                      <ArrowRight
                        className="w-4 h-4 text-primary"
                        aria-hidden="true"
                      />
                      <span>{destination}</span>
                    </div>

                    <p className="text-3xl font-bold text-primary">
                      {fare === null ? t("fares.notPublished") : `₹${fare}/-`}
                    </p>
                  </div>

                  {fare !== null && (
                    <Link
                      to={`/plan?from=${encodeURIComponent(origin)}&to=${encodeURIComponent(destination)}`}
                      className="brt-button inline-block mt-4 touch-target"
                    >
                      {t("fares.findDepartures")}
                    </Link>
                  )}

                  {fare === null && (
                    <p className="text-sm text-destructive font-medium mt-3">
{t("fares.noFare")}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <section className="mt-12" aria-labelledby="popular-heading">
            <h2 id="popular-heading" className="brt-section-title text-primary">
              {t("fares.popular")}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {POPULAR.map((pair) => {
                const price = calculateFare(pair[0], pair[1]);

                return (
                  <button
                    key={`${pair[0]}-${pair[1]}`}
                    type="button"
                    onClick={() => choose(pair)}
                    className="brt-card text-left touch-target"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <span>{pair[0]}</span>
                        <ArrowRight
                          className="w-3.5 h-3.5 text-primary flex-shrink-0"
                          aria-hidden="true"
                        />
                        <span>{pair[1]}</span>
                      </div>

                      <span className="text-lg font-bold text-primary whitespace-nowrap">
                        ₹{price}/-
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {origin && bands.length > 0 && (
            <section className="mt-12" aria-labelledby="bands-heading">
              <h2 id="bands-heading" className="brt-section-title text-primary">
                All fares from {origin}
              </h2>

              <div className="brt-container">
                {bands.map((band) => (
                  <div
                    key={band.fare}
                    className="fare-row-alt flex justify-between items-center gap-6"
                  >
                    <span className="font-medium text-foreground text-sm">
                      {formatDestinations(band.destinations)}
                    </span>
                    <span className="text-primary font-bold whitespace-nowrap">
                      ₹ {band.fare} /-
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="mt-12" aria-labelledby="chart-heading">
            <h2 id="chart-heading" className="brt-section-title text-primary">
              {t("fares.chart")}
            </h2>

            <div className="brt-card">
              <div className="flex flex-wrap gap-3 mb-5">
                <a
                  href={FARE_CHART_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="brt-button inline-flex items-center gap-2 touch-target"
                >
                  <ExternalLink className="w-4 h-4" aria-hidden="true" />
                  {t("fares.openFullScreen")}
                </a>

                <a
                  href={FARE_CHART_URL}
                  download
                  className="px-6 py-3 rounded-xl border border-border text-foreground font-medium transition-colors duration-state hover:bg-secondary inline-flex items-center gap-2 touch-target"
                >
                  <Download className="w-4 h-4" aria-hidden="true" />
                  {t("fares.download")}
                </a>
              </div>

              <object
                data={FARE_CHART_URL}
                type="application/pdf"
                title={t("fares.chartTitle")}
                className="w-full h-[420px] md:h-[560px] rounded-xl border border-border"
              >
                <div className="p-6 text-center">
                  <FileText
                    className="w-8 h-8 text-primary mx-auto mb-3"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-muted-foreground">
                    {t("fares.cannotDisplay")}{" "}
                    <a
                      href={FARE_CHART_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary font-semibold underline underline-offset-2"
                    >
                      {t("fares.openNewTab")}
                    </a>
                    .
                  </p>
                </div>
              </object>
            </div>
          </section>

          <section className="mt-12" aria-labelledby="notes-heading">
            <h2 id="notes-heading" className="brt-section-title text-primary">
              {t("fares.notes")}
            </h2>

            <div className="brt-container">
              <ul className="space-y-3">
                {FARE_NOTE_KEYS.map((note) => (
                  <li
                    key={note}
                    className="text-sm text-muted-foreground leading-relaxed pl-4 border-l-2 border-primary/30"
                  >
                    {t(note)}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Fares;
