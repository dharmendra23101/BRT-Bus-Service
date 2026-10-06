/**
 * Which passengers an operator notice is actually about.
 *
 * Until now every announcement was global: a closure at one feeder stop was
 * shown, in the same words and the same place, to somebody planning a journey
 * at the other end of the corridor. This is the `informed_entity` model from
 * GTFS-realtime `Alert`, which is the vocabulary an operator feed already
 * speaks, so a notice that arrives from NRANVP later needs translating rather
 * than reshaping.
 *
 * The rule that governs everything here: **an alert we cannot place is an alert
 * we show.** Every ambiguity below resolves towards displaying the notice, not
 * hiding it, because the cost of a passenger seeing one irrelevant banner is a
 * moment of their attention and the cost of hiding a real one is a missed bus
 * or a wasted trip.
 */

/**
 * One thing an alert says it affects.
 *
 * Fields within a single entity join by **AND**: `{routeId:"101", stopId:"CBD"}`
 * means route 101 *at CBD*, not route 101 *or* CBD. Two independent things need
 * two entities. Getting this backwards is easy and silent, which is why the
 * admin form asks for one affected thing at a time rather than offering two
 * lists to tick.
 *
 * The ids are plain strings, not the `RouteId` and `StopName` unions. A stored
 * document is untrusted input, and a notice naming a route this build has never
 * heard of must still reach the passenger - see `affectsScope`.
 */
export interface InformedEntity {
  routeId?: string;
  stopId?: string;
}

/** What the passenger is looking at, or about to travel on. */
export interface AlertScope {
  routeIds?: readonly string[];
  stopIds?: readonly string[];
}

/**
 * When a notice is worth showing.
 *
 * Milliseconds since the epoch, both optional. An absent bound is open, so a
 * notice with neither is simply current until an administrator retires it,
 * which is how every existing announcement already behaves.
 */
export interface AlertWindow {
  startsAt?: number;
  endsAt?: number;
}

const hasNoSelector = (entity: InformedEntity): boolean =>
  entity.routeId === undefined && entity.stopId === undefined;

/**
 * Whether this notice is about the whole network.
 *
 * An empty list means global, and so does a list containing an entity that
 * selects nothing - an entity with no fields cannot narrow anything, and
 * reading it as "affects nothing" would silently delete the notice.
 */
export const isGloballyScoped = (
  entities?: readonly InformedEntity[]
): boolean =>
  entities === undefined ||
  entities.length === 0 ||
  entities.some(hasNoSelector);

const entityMatches = (entity: InformedEntity, scope: AlertScope): boolean => {
  if (
    entity.routeId !== undefined &&
    !(scope.routeIds ?? []).includes(entity.routeId)
  ) {
    return false;
  }

  if (
    entity.stopId !== undefined &&
    !(scope.stopIds ?? []).includes(entity.stopId)
  ) {
    return false;
  }

  return true;
};

/**
 * Whether a notice is about this journey, route or stop.
 *
 * Entities join by **OR**, their fields by AND. A globally scoped notice
 * matches every scope, including an empty one.
 *
 * Note what is deliberately absent: there is no check that `routeId` names a
 * route we know. An unrecognised id simply fails to match a scope that does not
 * list it, and the notice keeps its place in the everything-active banner. That
 * is the version-skew rule applied to safety copy - an older build must never
 * drop an operator's warning because the operator has since opened a route it
 * has not heard of.
 */
export const affectsScope = (
  entities: readonly InformedEntity[] | undefined,
  scope: AlertScope
): boolean => {
  if (isGloballyScoped(entities)) return true;

  return (entities ?? []).some((entity) => entityMatches(entity, scope));
};

/**
 * Whether a notice is current.
 *
 * Bounds are inclusive, and a window whose end precedes its start is treated as
 * current rather than as permanently expired: a mistyped date should put a
 * wrong notice in front of an administrator, not quietly bury a real one.
 */
export const isWithinWindow = (window: AlertWindow, now: number): boolean => {
  const { startsAt, endsAt } = window;

  if (startsAt !== undefined && endsAt !== undefined && endsAt < startsAt) {
    return true;
  }

  if (startsAt !== undefined && now < startsAt) return false;
  if (endsAt !== undefined && now > endsAt) return false;

  return true;
};

const describeEntity = (entity: InformedEntity): string => {
  const route = entity.routeId ? `Route ${entity.routeId}` : null;

  if (route && entity.stopId) return `${route} at ${entity.stopId}`;

  return route ?? entity.stopId ?? "";
};

/**
 * What this notice affects, in words a passenger can read.
 *
 * Empty for a global notice, because "affects the whole network" is what a
 * banner with no scope line already means, and labelling every ordinary notice
 * would make the label itself invisible.
 */
export const describeEntities = (
  entities?: readonly InformedEntity[]
): string[] => {
  if (isGloballyScoped(entities)) return [];

  return (entities ?? []).map(describeEntity).filter((label) => label !== "");
};
