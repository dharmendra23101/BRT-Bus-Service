import { useEffect, useState } from "react";
import { Star, X } from "lucide-react";
import { JOURNEY_RULES } from "@/constants/config";
import { useTranslation } from "@/contexts/LocaleContext";
import {
  clearRecentJourneys,
  forgetRecentJourney,
  readRecentJourneys,
  readSavedJourneys,
  rememberJourney,
  toggleSavedJourney,
} from "@/services/journeyService";
import { isSaved, type JourneyPair } from "@/domain/journeys";
import type { StopName } from "@/domain/transit/stops";

interface JourneyShortcutsProps {
  /** The journey currently being shown, or null when none has resolved. */
  from: StopName | null;
  to: StopName | null;
  onPick: (journey: JourneyPair) => void;
}

const label = (journey: JourneyPair) => `${journey.from} to ${journey.to}`;

/** Strips a recent journey's timestamp; the caller wants the stops only. */
const pairOf = (journey: JourneyPair): JourneyPair => ({
  from: journey.from,
  to: journey.to,
});

/**
 * The journeys this device remembers.
 *
 * Owns the whole feature rather than threading four pieces of state through
 * the planner: it records what was searched, lists what is worth offering
 * back, and is the only thing that writes to storage.
 *
 * Renders nothing until there is something to offer, so a first-time visitor
 * sees the planner they came for and not an empty shelf.
 */
const JourneyShortcuts = ({ from, to, onPick }: JourneyShortcutsProps) => {
  const { t } = useTranslation();
  const [saved, setSaved] = useState<JourneyPair[]>(readSavedJourneys);
  const [recent, setRecent] = useState(readRecentJourneys);
  const [full, setFull] = useState(false);

  /*
    Recorded from the resolved stops rather than from the form, so a half-typed
    stop name never reaches the history, and re-running the same search moves
    the existing entry rather than adding another. The dependencies are the
    stop names themselves - passing an object would rebuild it every render and
    record on each one.
  */
  useEffect(() => {
    /* The capacity warning belongs to one journey, not to the page. */
    setFull(false);

    if (!from || !to || from === to) return;

    setRecent(rememberJourney({ from, to }));
  }, [from, to]);

  const current: JourneyPair | null = from && to && from !== to ? { from, to } : null;
  const currentIsSaved = current !== null && isSaved(saved, current);

  const save = () => {
    if (!current) return;

    const next = toggleSavedJourney(current);

    setFull(!currentIsSaved && next.length === saved.length);
    setSaved(next);
  };

  const forget = (journey: JourneyPair) => {
    setRecent(forgetRecentJourney(journey));
  };

  const clearAll = () => {
    clearRecentJourneys();
    setRecent([]);
  };

  /* A journey that has been saved does not also need offering as recent. */
  const unsavedRecent = recent.filter((entry) => !isSaved(saved, entry));

  if (!current && saved.length === 0 && unsavedRecent.length === 0) return null;

  return (
    <section aria-labelledby="journey-shortcuts-heading" className="mt-6">
      <h2 id="journey-shortcuts-heading" className="sr-only">
        {t("journeys.title")}
      </h2>

      {current && (
        <div className="mb-4">
          <button
            type="button"
            onClick={save}
            aria-pressed={currentIsSaved}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary underline underline-offset-2 touch-target"
          >
            <Star
              className={`w-4 h-4 ${currentIsSaved ? "fill-current" : ""}`}
              aria-hidden="true"
            />
            {t(currentIsSaved ? "journeys.remove" : "journeys.save", {
              journey: label(current),
            })}
          </button>

          {full && (
            <p role="alert" className="text-xs text-destructive mt-1">
              {t("journeys.full", { limit: JOURNEY_RULES.SAVED_LIMIT })}
            </p>
          )}
        </div>
      )}

      {saved.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-foreground mb-2">Saved</h3>
          <ul className="flex flex-wrap gap-2">
            {saved.map((journey) => (
              <li key={label(journey)}>
                <button
                  type="button"
                  onClick={() => onPick(pairOf(journey))}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-sm hover:border-primary transition-colors touch-target"
                >
                  <Star className="w-3.5 h-3.5 fill-current text-primary" aria-hidden="true" />
                  {label(journey)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {unsavedRecent.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-foreground">Recent</h3>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-muted-foreground underline underline-offset-2 touch-target"
            >
              {t("journeys.clearRecent")}
            </button>
          </div>

          <ul className="flex flex-wrap gap-2">
            {unsavedRecent.map((journey) => (
              <li key={label(journey)} className="flex items-center">
                <button
                  type="button"
                  onClick={() => onPick(pairOf(journey))}
                  className="inline-flex items-center rounded-l-full border border-r-0 border-border bg-white px-3 py-1.5 text-sm hover:border-primary transition-colors touch-target"
                >
                  {label(journey)}
                </button>
                <button
                  type="button"
                  onClick={() => forget(journey)}
                  aria-label={t("journeys.forget", { journey: label(journey) })}
                  className="inline-flex items-center rounded-r-full border border-border bg-white px-2 py-1.5 text-muted-foreground hover:text-destructive hover:border-primary transition-colors touch-target"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

export default JourneyShortcuts;
