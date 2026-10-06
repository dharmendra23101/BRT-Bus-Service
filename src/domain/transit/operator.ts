/**
 * What the operator publishes about the real Nava Raipur BRTS service.
 *
 * Every figure here was read from NRANVP's own published page and recorded
 * with the date it was read. None of it is derived from anything else in this
 * repository, and none of it may be recomputed from our own data: a number the
 * operator publishes and a number we count are different kinds of claim, and
 * merging them is how a page starts asserting things nobody verified.
 *
 * The source has been unreachable since 26 August 2026. That makes the
 * attribution more important rather than less - a reader cannot go and check
 * it, so the page must say exactly where each figure came from and when.
 */

/**
 * A single figure the operator published.
 *
 * `caveat` carries a qualification that travelled with the figure at the
 * source. It exists because one of these figures is internally inconsistent on
 * the operator's own page, and dropping that would present their uncertainty
 * as our confidence.
 */
export interface OperatorFact {
  readonly label: string;
  readonly value: string;
  readonly caveat?: string;
}

/** The public authority that runs the corridor. */
export const OPERATOR = {
  name: "Nava Raipur Atal Nagar Vikas Pradhikaran",
  abbreviation: "NRANVP",
} as const;

/**
 * Where the figures below came from, and when they were read.
 *
 * Kept as data rather than prose so the page cannot show the figures without
 * also being able to show their provenance.
 */
export const OPERATOR_SOURCE = {
  publication: "Tatpar BRTS, \u201CDiscover Now\u201D",
  url: "https://tatparbus.in/discover_now.php",
  retrievedOn: "20 August 2026",
  reachableAtRetrieval: true,
  unreachableSince: "26 August 2026",
} as const;

/** The service as the operator describes it. */
export const SERVICE_FACTS: readonly OperatorFact[] = [
  { label: "Service launched", value: "1 November 2016" },
  {
    label: "Fleet",
    value: "30 buses \u2014 Tata Marcopolo, UBS-II compliant, air-conditioned, diesel",
  },
  { label: "Operating hours", value: "06:00 \u2013 22:00" },
  {
    label: "Frequency",
    value: "15 minutes at peak, 30 minutes off-peak",
    caveat:
      "The operator\u2019s own page states this inconsistently, so treat it as indicative rather than a guarantee.",
  },
  { label: "Depot parking", value: "100 buses" },
];

/** The corridor infrastructure the operator reports having built. */
export const INFRASTRUCTURE_FACTS: readonly OperatorFact[] = [
  { label: "Corridor 1", value: "24.70 km" },
  { label: "Corridor 3", value: "17.80 km" },
  { label: "Pedestrian walkway", value: "28.93 km" },
  { label: "Cycle track", value: "38.01 km" },
  { label: "Table-top crossings", value: "2.78 km" },
];

/**
 * The stopping places the operator publishes, kept as separate components.
 *
 * The operator never published a single total, so we do not present one. The
 * components are listed as they were given; anyone adding them up is doing our
 * arithmetic, not quoting theirs.
 */
export const PUBLISHED_STOPS: readonly OperatorFact[] = [
  { label: "BRTS shelters", value: "8 operational, 9 under construction" },
  { label: "Feeder stops", value: "25" },
  { label: "Pick-up points", value: "2" },
];
