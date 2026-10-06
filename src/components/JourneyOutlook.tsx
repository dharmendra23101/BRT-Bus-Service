import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Star } from "lucide-react";
import type { TranslationKey } from "@/domain/i18n/en";
import { useTranslation } from "@/contexts/LocaleContext";
import { useNow } from "@/hooks/use-now";
import {
  journeyOutlookFor,
  type JourneyOutlook as Outlook,
} from "@/domain/transit/departures";
import { isSaved, type JourneyPair } from "@/domain/journeys";
import {
  readRecentJourneys,
  readSavedJourneys,
} from "@/services/journeyService";

/** Enough to be useful on a landing page without becoming a second timetable. */
const SHOWN = 3;

const planHref = (journey: JourneyPair) =>
  `/plan?from=${encodeURIComponent(journey.from)}&to=${encodeURIComponent(journey.to)}`;

const describe = (
  outlook: Outlook
): { key: TranslationKey; values?: Record<string, string> } => {
  if (outlook.kind === "upcoming") {
    return { key: "outlook.next", values: { time: outlook.next.time } };
  }
  if (outlook.kind === "ended") {
    return { key: "outlook.ended", values: { time: outlook.last.time } };
  }

  return { key: "outlook.none" };
};

/**
 * The journeys this device already knows, with what leaves next.
 *
 * The point of the landing page knowing anything about a passenger. It reads
 * what the planner recorded and answers the only question worth answering
 * before they have typed anything: when is my usual bus.
 *
 * **It invents nothing.** A visitor with no history gets no block at all,
 * rather than a shelf of suggested journeys chosen by us - on a two-route
 * corridor a "suggestion" would be the same handful of stops for everybody,
 * which is a feature built for a screenshot rather than a rider.
 *
 * Departures are journey-aware, not stop-aware: `journeyOutlookFor` only
 * counts trips that actually reach the destination, so this never announces a
 * bus that goes the other way.
 */
const JourneyOutlook = () => {
  const { t } = useTranslation();

  /* `describe` names a key and its values; this turns the pair into words. */
  const say = ({
    key,
    values,
  }: {
    key: TranslationKey;
    values?: Record<string, string>;
  }) => t(key, values);
  const now = useNow(60_000);

  const journeys = useMemo(() => {
    const saved = readSavedJourneys();
    const recent = readRecentJourneys().filter(
      (entry) => !isSaved(saved, entry)
    );

    return [
      ...saved.map((journey) => ({ journey, saved: true })),
      ...recent.map((entry) => ({
        journey: { from: entry.from, to: entry.to },
        saved: false,
      })),
    ].slice(0, SHOWN);
  }, []);

  if (journeys.length === 0) return null;

  return (
    <section className="pb-12 px-4" aria-labelledby="your-journeys-heading">
      <div className="max-w-7xl mx-auto">
        <h2
          id="your-journeys-heading"
          className="text-[26px] md:text-[32px] font-semibold text-primary tracking-tight mb-2"
        >
          {t("outlook.title")}
        </h2>
        <p className="text-muted-foreground text-[15px] mb-6">
          {t("outlook.body")}
        </p>

        <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {journeys.map(({ journey, saved }) => {
            const outlook = journeyOutlookFor(journey.from, journey.to, now);

            return (
              <li key={`${journey.from}>${journey.to}`}>
                <Link
                  to={planHref(journey)}
                  className="block h-full bg-white rounded-2xl p-5 shadow-lg border-2 border-transparent hover:border-primary transition-colors"
                >
                  <p className="flex items-center gap-2 font-semibold text-foreground">
                    {saved && (
                      <Star
                        className="w-4 h-4 fill-current text-primary flex-shrink-0"
                        aria-hidden="true"
                      />
                    )}
                    <span>{journey.from}</span>
                    <ArrowRight
                      className="w-4 h-4 text-primary flex-shrink-0"
                      aria-hidden="true"
                    />
                    <span>{journey.to}</span>
                  </p>

                  <p
                    className={`text-sm mt-2 ${
                      outlook.kind === "upcoming"
                        ? "text-primary font-medium"
                        : "text-muted-foreground"
                    }`}
                  >
                    {say(describe(outlook))}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

export default JourneyOutlook;
