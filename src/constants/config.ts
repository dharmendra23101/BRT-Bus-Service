/**
 * Single source of truth for tunable application values.
 *
 * Anything that was previously a magic number buried in a component or a
 * hook lives here. Domain rules (fares, stops, schedules) do NOT belong in
 * this file - those live under `src/domain`.
 */

/**
 * What the service is called.
 *
 * A name, not copy: it is never translated, and it is not in the string
 * catalogues for that reason. It was written out in four places, so a rename
 * would have had to find all four.
 */
export const BRAND_NAME = "BRT Bus Service";

/** Ticket lifecycle timing rules. */
export const TICKET_RULES = {
  /** Minutes a ticket stays valid after its scheduled arrival. */
  GRACE_MINUTES: 15,
  /** Minutes before departure at which a ticket flips to BOARDING_SOON. */
  BOARDING_WINDOW_MINUTES: 15,
  /**
   * A timetable arrival earlier than its departure is only treated as a real
   * midnight crossing when the gap exceeds this many hours. Smaller gaps are
   * data-entry slips and get clamped to the departure time instead.
   */
  MIDNIGHT_ROLLOVER_HOURS: 12,
} as const;

/** Live-tracking and proximity-alert tuning. */
export const ARRIVAL_RULES = {
  /**
   * Alert the passenger when a reporting bus is within this straight-line
   * distance of their boarding stop.
   *
   * A distance, not a duration: the app knows where a bus is, not how long
   * the road between them takes. Anything time-shaped needs route geometry
   * and a schedule, which is the ETA engine, not this rule.
   */
  ALERT_RADIUS_KM: 2.5,
} as const;

/** Recurring timer intervals. */
export const POLLING = {
  /** How often ticket statuses are re-evaluated against the clock. */
  TICKET_STATUS_MS: 15_000,
  /**
   * How often a sharing driver publishes their position.
   *
   * 30 s, and the reason is measured rather than assumed. Egress is
   * `listeners x writes x payload`, so the cadence is multiplied by every
   * passenger watching at that moment - it is the only lever in the system
   * that reduces cost for all of them at once. The fanout harness put one
   * continuously-open listener at 0.45 GB/month against a 10 GB free
   * allowance at 15 s; halving the rate halves that, and every viewer's share
   * of it, for nothing.
   *
   * Nothing is given up to get it. GTFS-Realtime's own guidance is "at least
   * once every 30 seconds", so this sits exactly on what the ecosystem treats
   * as current; no certified AIS-140 device will ever beat it - the standard
   * permits 5 s to ten minutes and real state backends default to two - and
   * at BRT headways a passenger cannot perceive the difference between a
   * marker 15 s old and one 30 s old.
   *
   * Faster was never better anyway. Position error is roughly fixed while the
   * measurement baseline grows with the interval, so a short gap yields a
   * NOISIER speed estimate, not a sharper one: about 34% at 3 s against 6.8%
   * at 15 s, and better still here.
   *
   * `DEFAULT_FRESHNESS.liveMs` is tied to this. Raising the cadence without
   * raising that would mean a bus reporting perfectly on schedule was never
   * once classified LIVE.
   */
  DRIVER_LOCATION_MS: 30_000,
  /**
   * How often live bus positions are re-checked against the clock.
   *
   * Deliberately shorter than the publish cadence. This is a local re-render
   * with no network cost, and it has to be no longer than the smallest
   * freshness boundary or a vehicle could appear to skip a state between
   * ticks - the age a passenger reads would jump rather than count.
   */
  BUS_FRESHNESS_MS: 15_000,
  /** How often the virtual ticket countdown re-renders. */
  TICKET_COUNTDOWN_MS: 1_000,
} as const;

/** In-app notification behaviour. */
export const NOTIFICATION_RULES = {
  /** Suppress repeat alerts for the same bus/stop pair within this window. */
  DEDUPE_WINDOW_MS: 300_000,
  /** How long a popup stays on screen before auto-dismissing. */
  AUTO_DISMISS_MS: 6_000,
  /*
    The app's own icon, served from this origin.

    It used to be hotlinked from a stock-icon CDN, which meant three things
    nobody chose: every arrival alert told a third party that this person had
    just been notified, complete with IP and timestamp; the icon carried
    somebody else's licence terms into a product heading for an operator
    conversation; and because the service worker caches same-origin requests
    only, an alert raised with no connection had no icon at all - which is
    precisely when arrival alerts matter most.
  */
  ICON_URL: "/icon-192.png",
} as const;

/**
 * Payment behaviour.
 *
 * There is deliberately no payee, VPA or account here. A demonstration must
 * not carry a payment target a passenger could act on; the provider in
 * `services/payment` decides what happens, and says whether money moves.
 */
export const PAYMENT_CONFIG = {
  /** Artificial latency so the processing state is visible. */
  SIMULATED_DELAY_MS: 2_000,
  CURRENCY: "INR",
} as const;

/** QR rendering sizes. */
export const QR_CONFIG = {
  TICKET_SIZE: 120,
  ERROR_CORRECTION: "M",
} as const;

/** How many journeys this device keeps. */
export const JOURNEY_RULES = {
  /** Recent journeys are written automatically, so the oldest is dropped. */
  RECENT_LIMIT: 6,
  /**
   * Saved journeys are put there deliberately, so reaching this refuses the
   * addition rather than deleting one of the passenger's own choices.
   */
  SAVED_LIMIT: 20,
} as const;

/** Namespaced browser-storage keys. */
export const STORAGE_KEYS = {
  /** Per-user ticket collection: `brt.tickets.<uid>`. */
  TICKETS_PREFIX: "brt.tickets",
  /** Pre-Sprint-2 single-ticket key, migrated then removed on first login. */
  LEGACY_TICKET: "latestTicket",
  /**
   * Journeys kept on this device, deliberately not scoped to a signed-in
   * account: saving a journey must not require an account, because a
   * passenger who has to sign in to keep one will simply retype it.
   */
  /** The interface language, chosen per device rather than per account. */
  LOCALE: "brt.locale",
  SAVED_JOURNEYS: "brt.journeys.saved",
  RECENT_JOURNEYS: "brt.journeys.recent",
} as const;

/** Remote data locations. */
export const REMOTE_PATHS = {
  /** Realtime Database node holding live driver positions. */
  /**
   * Live positions, sharded by the route the bus is running.
   *
   * The route is the PATH, not a field. A passenger watching one route
   * subscribes to one shard and receives only those buses; a whole-fleet
   * view subscribes to the parent and still spends a single listener. A
   * `routeId` in the payload as well would be a second answer that could
   * disagree with the first.
   */
  BUS_LOCATIONS: "busLocationsByRoute",
  /** Who may publish as which vehicle, and until when. Operator-written. */
  ASSIGNMENTS: "assignments",
  /** When each vehicle was last heard from. Written by the server on disconnect. */
  VEHICLE_STATUS: "vehicleStatus",
  /** Firestore collection holding user profiles and roles. */
  USERS: "users",
  /** Firestore collection holding booked tickets. */
  TICKETS: "tickets",
  /** Firestore collection holding operator announcements. */
  ANNOUNCEMENTS: "announcements",
  /** Append-only record of administrative acts. Admin-readable only. */
  AUDIT_LOG: "auditLog",
} as const;

/** How wide a bounding box the embedded map draws around its centre. */
export const MAP_CONFIG = {
  BBOX_DELTA_DEG: 0.02,
} as const;
