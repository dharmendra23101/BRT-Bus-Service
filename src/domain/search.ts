/**
 * One search across everything the corridor publishes.
 *
 * Until now every screen searched its own thing: stops in the planner, places
 * in Nearby, routes in the explorer. A passenger who knew the name of where
 * they were going had to already know which of those it was before they could
 * look for it.
 *
 * Nothing here is fuzzy. A result appears because the query is genuinely part
 * of a published name, and the ranking only decides which of those comes
 * first - there is no scoring threshold below which a real match is dropped,
 * and no correction of what somebody typed into something else.
 */

import { STOPS, type StopName } from "@/domain/transit/stops";
import { hasScheduledService } from "@/domain/transit/schedule";
import {
  ROUTES,
  ROUTE_IDS,
  NETWORK_ROUTE_IDS,
  getNetworkRoute,
  getRoutesServing,
} from "@/domain/transit/routes";
import { PLACES } from "@/domain/places";

export type SearchResultKind = "stop" | "route" | "place";

export interface SearchResult {
  kind: SearchResultKind;
  /**
   * Identity within its own registry - a `StopName`, a route id of either
   * kind, or a place id. Deliberately not a URL: where a result leads is a
   * question about this application's routing, and a second platform answers
   * it differently.
   */
  id: string;
  label: string;
  /** One line of context, always derived, never written per entry. */
  detail: string;
}

/** Ranks lower for a closer match; null when the term does not appear at all. */
const rankOf = (value: string, term: string): number | null => {
  const haystack = value.toLowerCase();

  if (haystack === term) return 0;
  if (haystack.startsWith(term)) return 1;
  if (haystack.includes(term)) return 2;

  return null;
};

/**
 * Best rank across a primary name and any secondary text worth matching.
 *
 * Secondary matches rank behind every name match, so searching "HNLU" lists
 * the stop itself before the four routes whose headline mentions it.
 */
const bestRank = (
  label: string,
  term: string,
  secondary: readonly string[]
): number | null => {
  const primary = rankOf(label, term);

  if (primary !== null) return primary;

  return secondary.some((value) => value.toLowerCase().includes(term))
    ? 3
    : null;
};

const KIND_ORDER: Record<SearchResultKind, number> = {
  stop: 0,
  route: 1,
  place: 2,
};

const stopDetail = (stop: StopName): string => {
  if (!hasScheduledService(stop)) return "No departures yet";

  const routes = getRoutesServing(stop);
  const first = routes[0];

  if (!first) return "Has departures";

  const rest = routes.length - 1;

  return rest > 0
    ? `Served by ${first.name} and ${rest} more`
    : `Served by ${first.name}`;
};

interface Candidate extends SearchResult {
  rank: number;
}

/**
 * Everything matching a query, best match first.
 *
 * An empty query returns nothing rather than everything: a results page that
 * lists all 39 stops before a single key is pressed reads as broken, and the
 * pages that browse each registry already exist.
 */
export const searchEverything = (
  query: string,
  limit = 20
): SearchResult[] => {
  const term = query.trim().toLowerCase();

  if (term === "") return [];

  const candidates: Candidate[] = [];

  const consider = (
    result: SearchResult,
    rank: number | null
  ): void => {
    if (rank !== null) candidates.push({ ...result, rank });
  };

  for (const stop of STOPS) {
    consider(
      { kind: "stop", id: stop, label: stop, detail: stopDetail(stop) },
      rankOf(stop, term)
    );
  }

  for (const id of NETWORK_ROUTE_IDS) {
    const route = getNetworkRoute(id);

    consider(
      { kind: "route", id, label: route.name, detail: route.headline },
      bestRank(route.name, term, [route.headline])
    );
  }

  for (const id of ROUTE_IDS) {
    const route = ROUTES[id];

    consider(
      { kind: "route", id, label: route.name, detail: route.headline },
      bestRank(route.name, term, [route.headline])
    );
  }

  for (const place of PLACES) {
    consider(
      {
        kind: "place",
        id: place.id,
        label: place.name,
        detail: `${place.category} near ${place.nearestStop}`,
      },
      bestRank(place.name, term, [place.category])
    );
  }

  return candidates
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
        a.label.localeCompare(b.label)
    )
    .slice(0, limit)
    .map(({ rank: _rank, ...result }) => result);
};
