/**
 * Where the journeys a passenger keeps actually live.
 *
 * This device, and nowhere else. Saving a journey deliberately does **not**
 * require an account: a passenger who has to sign in to keep a shortcut will
 * retype the stops instead, and the feature is worth nothing. The cost is that
 * the list does not follow them to another phone, which is the honest trade
 * and the one `COST-AND-SCALE-PLAN.md` records - syncing it is a Firestore
 * collection whenever that is worth paying for, and the domain functions above
 * this file would not change.
 *
 * Because it is device-scoped rather than account-scoped, it is also readable
 * by anyone else holding the phone. That is why forgetting is a first-class
 * operation here rather than an afterthought.
 */

import { JOURNEY_RULES, STORAGE_KEYS } from "@/constants/config";
import { readValidated, removeKey, write } from "@/services/storageService";
import {
  recentJourneysSchema,
  savedJourneysSchema,
} from "@/domain/validation/schemas";
import {
  forgetJourney,
  recordRecent,
  toggleSaved,
  type JourneyPair,
  type RecentJourney,
} from "@/domain/journeys";

export const readSavedJourneys = (): JourneyPair[] =>
  readValidated<JourneyPair[]>(
    STORAGE_KEYS.SAVED_JOURNEYS,
    savedJourneysSchema,
    []
  ).value;

export const readRecentJourneys = (): RecentJourney[] =>
  readValidated<RecentJourney[]>(
    STORAGE_KEYS.RECENT_JOURNEYS,
    recentJourneysSchema,
    []
  ).value;

/**
 * Saves or unsaves a journey, returning the list as it now stands.
 *
 * The caller compares lengths to tell a refused addition from a removal: at
 * capacity the domain returns the list unchanged rather than evicting one of
 * the passenger's own choices.
 */
export const toggleSavedJourney = (journey: JourneyPair): JourneyPair[] => {
  const next = toggleSaved(
    readSavedJourneys(),
    journey,
    JOURNEY_RULES.SAVED_LIMIT
  );

  write(STORAGE_KEYS.SAVED_JOURNEYS, next);

  return next;
};

/** Records a journey as just planned. */
export const rememberJourney = (
  journey: JourneyPair,
  now: number = Date.now()
): RecentJourney[] => {
  const next = recordRecent(
    readRecentJourneys(),
    journey,
    now,
    JOURNEY_RULES.RECENT_LIMIT
  );

  write(STORAGE_KEYS.RECENT_JOURNEYS, next);

  return next;
};

export const forgetRecentJourney = (journey: JourneyPair): RecentJourney[] => {
  const next = forgetJourney(readRecentJourneys(), journey);

  write(STORAGE_KEYS.RECENT_JOURNEYS, next);

  return next;
};

/** Drops the whole history. The list is a record of where somebody goes. */
export const clearRecentJourneys = (): void => {
  removeKey(STORAGE_KEYS.RECENT_JOURNEYS);
};
