/**
 * Places passengers reach by BRT.
 *
 * Two grounded sources only: destinations the operator itself publishes on its
 * "Place to Explore" page, and institutions that are already stops in the
 * transit registry. Nothing here is invented - every `nearestStop` is a real
 * StopName, and every operator-listed place carries the stop the operator
 * states, recorded in `nearestStopSource`.
 *
 * COORDINATES ARE REPRODUCED EXACTLY AS THE OPERATOR PUBLISHES THEM, INCLUDING
 * THE ONES THAT ARE WRONG. Their listing contains one point roughly 90 km
 * outside Nava Raipur and three coordinate pairs shared between six different
 * institutions. Silently correcting those would be inventing data; instead
 * each is marked `disputed` with a note saying why, and the validation suite
 * in `src/test/domain/places.test.ts` asserts that every such defect is
 * labelled rather than hidden.
 *
 * Descriptions are written here from scratch. The operator's prose is theirs;
 * the coordinates, categories and stop pairings are facts and are not.
 */

import { getRoutesServing, type NetworkRouteId } from "./transit/routes";
import { hasScheduledService } from "./transit/schedule";
import type { Coordinate, StopName } from "./transit/stops";

export type PlaceCategory =
  | "Education"
  | "Healthcare"
  | "Government"
  | "Recreation"
  | "Tourism"
  | "Entertainment";

/**
 * How much a coordinate can be trusted.
 *
 * `verified` requires someone to have stood at the point. Nothing carries it
 * yet, and nothing may carry it until the corridor survey happens - see
 * `ARCHITECTURE-2.0.md` §14.1.
 */
export type CoordinateStatus = "verified" | "unverified" | "disputed";

/** Whether the operator published the stop pairing, or we derived it. */
export type StopSource = "operator" | "registry";

export interface PlaceImage {
  src: string;
  alt: string;
  /** Licence the file is used under. Required - there is no "probably fine". */
  licence: string;
  attribution: string;
}

export interface Place {
  /** URL-safe identity, stable across renames. */
  id: string;
  name: string;
  category: PlaceCategory;
  nearestStop: StopName;
  nearestStopSource: StopSource;
  /** Exactly as published. Null when no source publishes one. */
  coordinates: Coordinate | null;
  coordinateStatus: CoordinateStatus;
  /** Why a coordinate is disputed, in words a reader can act on. */
  coordinateNote: string | null;
  /** Two sentences, written here. Never copied from another site. */
  description: string;
  website: string | null;
  /** Only where a source publishes them. Guessing opening hours strands people. */
  openingHours: string | null;
  contact: string | null;
  image: PlaceImage | null;
  /** Where the facts in this entry came from. */
  source: string;
  /** ISO date this entry was last checked against its source. */
  lastVerified: string;
  /** True when the operator lists this destination itself, not just the stop. */
  official: boolean;
}

export const PLACE_CATEGORIES: readonly PlaceCategory[] = [
  "Education",
  "Healthcare",
  "Government",
  "Recreation",
  "Tourism",
  "Entertainment",
];

/**
 * The extent of Nava Raipur, used to catch a coordinate that has escaped.
 *
 * Generous on purpose: it is a smell test for a point in the wrong district,
 * not a survey boundary.
 */
export const NAVA_RAIPUR_BOUNDS = {
  minLat: 21.0,
  maxLat: 21.3,
  minLng: 81.65,
  maxLng: 81.9,
} as const;

export const isInsideNavaRaipur = (point: Coordinate): boolean =>
  point.lat >= NAVA_RAIPUR_BOUNDS.minLat &&
  point.lat <= NAVA_RAIPUR_BOUNDS.maxLat &&
  point.lng >= NAVA_RAIPUR_BOUNDS.minLng &&
  point.lng <= NAVA_RAIPUR_BOUNDS.maxLng;

const OPERATOR_LISTING =
  "Operator 'Place to Explore' listing, captured 2026-08-20";
const STOP_REGISTRY = "Transit stop registry (src/domain/transit/stops.ts)";
const CAPTURED = "2026-08-20";

/** Shared by MGM Model School and Delhi Public School in the source. */
const DUPLICATED_SCHOOL_POINT: Coordinate = {
  lat: 21.176632074441493,
  lng: 81.77078799347926,
};

/** Shared by IDTR and IIIT Naya Raipur in the source. */
const DUPLICATED_INSTITUTE_POINT: Coordinate = {
  lat: 21.128609509915727,
  lng: 81.76616539999999,
};

/** Shared by HNLU and Shri Rawatpura Sarkar IMS in the source. */
const DUPLICATED_CAMPUS_POINT: Coordinate = {
  lat: 21.085626310013723,
  lng: 81.81146265767237,
};

const DUPLICATE_NOTE =
  "The operator publishes this exact point for a second, different institution. At most one can be right, so neither is shown as located.";

export const PLACES: readonly Place[] = [
  // ---------------------------------------------------------------- Recreation
  {
    id: "nandanvan-jungle-safari",
    name: "Nandanvan Jungle Safari",
    category: "Recreation",
    nearestStop: "Jungle Safari",
    nearestStopSource: "registry",
    coordinates: { lat: 21.104989965254443, lng: 81.772864758714 },
    coordinateStatus: "unverified",
    coordinateNote: null,
    description:
      "A safari park and zoological garden on the Naya Raipur side of the corridor. The operator publishes no BRT access for it, so the stop shown here comes from our own registry rather than from them.",
    website: "https://junglesafari.cg.nic.in",
    openingHours: null,
    contact: null,
    image: null,
    source: `${OPERATOR_LISTING}; stop pairing from ${STOP_REGISTRY}`,
    lastVerified: CAPTURED,
    official: true,
  },
  {
    id: "purkhouti-muktangan",
    name: "Purkhouti Muktangan",
    category: "Recreation",
    nearestStop: "Muktangan",
    nearestStopSource: "registry",
    coordinates: { lat: 21.13432076051166, lng: 81.75891406782978 },
    coordinateStatus: "unverified",
    coordinateNote: null,
    description:
      "An open-air museum park of Chhattisgarh's tribal art, sculpture and village life. It closes on Mondays, so check the day before travelling.",
    website: null,
    openingHours: "09:30 - 18:00, closed Mondays",
    contact: null,
    image: null,
    source: OPERATOR_LISTING,
    lastVerified: CAPTURED,
    official: true,
  },
  {
    id: "vns-cricket-stadium",
    name: "Shaheed Veer Narayan Singh International Cricket Stadium",
    category: "Recreation",
    nearestStop: "Stadium",
    nearestStopSource: "registry",
    coordinates: { lat: 21.20370119755874, lng: 81.82394631291425 },
    coordinateStatus: "unverified",
    coordinateNote: null,
    description:
      "Chhattisgarh's international cricket ground, and the largest single draw on the corridor on a match day. The operator lists it as reachable from any Nava Raipur shelter rather than naming one, so the stop shown is our registry's own Stadium stop.",
    website: null,
    openingHours: null,
    contact: null,
    image: null,
    source: `${OPERATOR_LISTING}; stop pairing from ${STOP_REGISTRY}`,
    lastVerified: CAPTURED,
    official: true,
  },

  // ---------------------------------------------------------------- Healthcare
  {
    id: "balco-medical-center",
    name: "Balco Medical Center",
    category: "Healthcare",
    nearestStop: "Balco Medical Center",
    nearestStopSource: "operator",
    coordinates: { lat: 21.124112050166325, lng: 81.77456312592925 },
    coordinateStatus: "unverified",
    coordinateNote: null,
    description:
      "A cancer care hospital with its own named stop on the corridor. It is one of the few destinations here where the stop and the building share a name, so there is no walk at the far end.",
    website: null,
    openingHours: "Open 24 hours",
    contact: "0771-2237575",
    image: null,
    source: OPERATOR_LISTING,
    lastVerified: CAPTURED,
    official: true,
  },
  {
    id: "sadbhawna-hospital",
    name: "Sadbhawna Hospital",
    category: "Healthcare",
    nearestStop: "Sector 30",
    nearestStopSource: "operator",
    coordinates: null,
    coordinateStatus: "unverified",
    coordinateNote: null,
    description:
      "A general hospital serving the Sector 30 side of Nava Raipur, with a round-the-clock emergency department. No source publishes a coordinate for it, so it cannot be placed on a map here.",
    website: null,
    openingHours: "OPD 10:00 - 14:00 and 18:00 - 20:30 daily; emergency 24 hours",
    contact: null,
    image: null,
    source: OPERATOR_LISTING,
    lastVerified: CAPTURED,
    official: true,
  },
  {
    id: "sri-sathya-sai-sanjeevani",
    name: "Sri Sathya Sai Sanjeevani Hospital",
    category: "Healthcare",
    nearestStop: "Satya Sai Hospital",
    nearestStopSource: "operator",
    coordinates: { lat: 21.211020138325484, lng: 81.81026550270902 },
    coordinateStatus: "unverified",
    coordinateNote: null,
    description:
      "A children's heart hospital that treats without charge. The corridor stop sits a short walk from the gate.",
    website: "https://srisathyasaisanjeevani.org",
    openingHours: null,
    contact: null,
    image: null,
    source: OPERATOR_LISTING,
    lastVerified: CAPTURED,
    official: true,
  },

  // ------------------------------------------------------- Higher education
  {
    id: "hnlu",
    name: "Hidayatullah National Law University",
    category: "Education",
    nearestStop: "HNLU",
    nearestStopSource: "operator",
    coordinates: DUPLICATED_CAMPUS_POINT,
    coordinateStatus: "disputed",
    coordinateNote: DUPLICATE_NOTE,
    description:
      "A national law university, and the western end of the corridor: every outbound trunk departure begins at its stop. It is the busiest single origin on the published timetable.",
    website: "https://hnlu.ac.in",
    openingHours: null,
    contact: null,
    image: null,
    source: OPERATOR_LISTING,
    lastVerified: CAPTURED,
    official: true,
  },
  {
    id: "iim-raipur",
    name: "IIM Raipur",
    category: "Education",
    nearestStop: "IIM",
    nearestStopSource: "operator",
    coordinates: { lat: 21.121280145371784, lng: 81.82451416931055 },
    coordinateStatus: "unverified",
    coordinateNote: null,
    description:
      "An Indian Institute of Management campus in Nava Raipur. It has its own stop on the feeder network, which the late-afternoon Route 105 working calls at.",
    website: "https://iimraipur.ac.in",
    openingHours: null,
    contact: null,
    image: null,
    source: OPERATOR_LISTING,
    lastVerified: CAPTURED,
    official: true,
  },
  {
    id: "iiit-naya-raipur",
    name: "IIIT Naya Raipur",
    category: "Education",
    nearestStop: "IIIT",
    nearestStopSource: "operator",
    coordinates: DUPLICATED_INSTITUTE_POINT,
    coordinateStatus: "disputed",
    coordinateNote: DUPLICATE_NOTE,
    description:
      "An Indian Institute of Information Technology campus, within walking distance of its own corridor stop. The operator publishes the same coordinate for it as for the driving research institute, which cannot be right for both.",
    website: "https://iiitnr.ac.in",
    openingHours: null,
    contact: null,
    image: null,
    source: OPERATOR_LISTING,
    lastVerified: CAPTURED,
    official: true,
  },
  {
    id: "srimsr",
    name: "Shri Rawatpura Sarkar Institute of Medical Sciences",
    category: "Education",
    nearestStop: "Rawatpura Sarkar University",
    nearestStopSource: "operator",
    coordinates: DUPLICATED_CAMPUS_POINT,
    coordinateStatus: "disputed",
    coordinateNote: DUPLICATE_NOTE,
    description:
      "A medical college and teaching hospital with a stop of its own on the corridor. The operator publishes the same coordinate for it as for the law university, while sending you to a different stop.",
    website: "https://srimsr.com",
    openingHours: null,
    contact: null,
    image: null,
    source: OPERATOR_LISTING,
    lastVerified: CAPTURED,
    official: true,
  },
  {
    id: "ayush-university",
    name: "Pt. Deendayal Upadhyay Health Sciences & Ayush University",
    category: "Education",
    nearestStop: "HNLU",
    nearestStopSource: "operator",
    coordinates: { lat: 21.104295289197516, lng: 81.75172388836181 },
    coordinateStatus: "unverified",
    coordinateNote: null,
    description:
      "Chhattisgarh's health sciences university, affiliating the state's medical and Ayush colleges. Reach it from the HNLU stop and continue by auto.",
    website: "https://ddumhsaucg.ac.in",
    openingHours: null,
    contact: null,
    image: null,
    source: OPERATOR_LISTING,
    lastVerified: CAPTURED,
    official: true,
  },
  {
    id: "itm-university",
    name: "ITM University",
    category: "Education",
    nearestStop: "HNLU",
    nearestStopSource: "operator",
    coordinates: { lat: 21.112645227809683, lng: 81.75447099883218 },
    coordinateStatus: "unverified",
    coordinateNote: null,
    description:
      "A private university campus west of the corridor. The operator routes you via the HNLU stop and an auto for the last stretch.",
    website: "https://itmuniversity.org",
    openingHours: null,
    contact: null,
    image: null,
    source: OPERATOR_LISTING,
    lastVerified: CAPTURED,
    official: true,
  },
  {
    id: "kalinga-university",
    name: "Kalinga University",
    category: "Education",
    nearestStop: "North Block",
    nearestStopSource: "operator",
    coordinates: { lat: 21.168934500070257, lng: 81.82108946931055 },
    coordinateStatus: "unverified",
    coordinateNote: null,
    description:
      "A private university on the Raipur side of the corridor. The operator routes you via North Block and an auto.",
    website: "https://kalingauniversity.ac.in",
    openingHours: null,
    contact: null,
    image: null,
    source: OPERATOR_LISTING,
    lastVerified: CAPTURED,
    official: true,
  },
  {
    id: "ritee",
    name: "Raipur Institute of Technology",
    category: "Education",
    nearestStop: "North Block",
    nearestStopSource: "operator",
    coordinates: { lat: 21.108157912809563, lng: 81.73012902467568 },
    coordinateStatus: "unverified",
    coordinateNote: null,
    description:
      "An engineering college west of Nava Raipur. It sits off the corridor, so the last part of the trip is by feeder and auto.",
    website: "https://rit.edu.in",
    openingHours: null,
    contact: null,
    image: null,
    source: OPERATOR_LISTING,
    lastVerified: CAPTURED,
    official: true,
  },
  {
    id: "bit-raipur",
    name: "Bhilai Institute of Technology, Raipur",
    category: "Education",
    nearestStop: "NH 30 Chowk",
    nearestStopSource: "operator",
    coordinates: { lat: 21.107982836411516, lng: 81.73029777593825 },
    coordinateStatus: "unverified",
    coordinateNote: null,
    description:
      "An engineering college near the NH-30 approach to Nava Raipur. The operator routes you to the NH-30 feeder and an e-auto from there.",
    website: "https://bitraipur.ac.in",
    openingHours: null,
    contact: null,
    image: null,
    source: OPERATOR_LISTING,
    lastVerified: CAPTURED,
    official: true,
  },
  {
    id: "idtr",
    name: "Institute of Driving & Traffic Research",
    category: "Education",
    nearestStop: "Sector 27",
    nearestStopSource: "operator",
    coordinates: DUPLICATED_INSTITUTE_POINT,
    coordinateStatus: "disputed",
    coordinateNote: DUPLICATE_NOTE,
    description:
      "A driver training and road-safety research institute. The operator publishes the same coordinate for it as for the IIIT campus, which cannot be right for both.",
    website: null,
    openingHours: null,
    contact: null,
    image: null,
    source: OPERATOR_LISTING,
    lastVerified: CAPTURED,
    official: true,
  },

  // -------------------------------------------------------------- Schools
  {
    id: "adarsh-international-school",
    name: "Adarsh International School",
    category: "Education",
    nearestStop: "Sector 30",
    nearestStopSource: "operator",
    coordinates: { lat: 21.132462304189556, lng: 81.79104977038118 },
    coordinateStatus: "unverified",
    coordinateNote: null,
    description:
      "A school in the Nava Raipur sectors, reached from the Sector 30 stop by feeder. Term-time mornings are the busiest departures on that stretch.",
    website: "https://adarshvidyalaya.net/atalnagar",
    openingHours: null,
    contact: null,
    image: null,
    source: OPERATOR_LISTING,
    lastVerified: CAPTURED,
    official: true,
  },
  {
    id: "krishna-public-school",
    name: "Krishna Public School International",
    category: "Education",
    nearestStop: "Sector 27",
    nearestStopSource: "operator",
    coordinates: { lat: 21.14426576945769, lng: 81.78709861354511 },
    coordinateStatus: "unverified",
    coordinateNote: null,
    description:
      "A school serving the central Nava Raipur sectors. The Sector 27 stop is the corridor access the operator publishes for it.",
    website: "https://kpsatalnagar.com",
    openingHours: null,
    contact: null,
    image: null,
    source: OPERATOR_LISTING,
    lastVerified: CAPTURED,
    official: true,
  },
  {
    id: "amity-international-school",
    name: "Amity International School",
    category: "Education",
    nearestStop: "Sector 30",
    nearestStopSource: "operator",
    coordinates: { lat: 21.12974282170085, lng: 81.78916309311687 },
    coordinateStatus: "unverified",
    coordinateNote: null,
    description:
      "A school in the southern Nava Raipur sectors. Reached from the Sector 30 stop by feeder.",
    website: "https://amityschools.in/raipur",
    openingHours: null,
    contact: null,
    image: null,
    source: OPERATOR_LISTING,
    lastVerified: CAPTURED,
    official: true,
  },
  {
    id: "agarwal-public-school",
    name: "Agarwal Public School",
    category: "Education",
    nearestStop: "Sector 27",
    nearestStopSource: "operator",
    coordinates: { lat: 21.133886990176904, lng: 81.77848293177225 },
    coordinateStatus: "unverified",
    coordinateNote: null,
    description:
      "A school near the Sector 27 corridor stop. It is one of the closer school destinations to a trunk stop.",
    website: "https://apsnavaraipur.in",
    openingHours: null,
    contact: null,
    image: null,
    source: OPERATOR_LISTING,
    lastVerified: CAPTURED,
    official: true,
  },
  {
    id: "bharat-mata-school",
    name: "Bharat Mata Senior Secondary School",
    category: "Education",
    nearestStop: "North Block",
    nearestStopSource: "operator",
    coordinates: { lat: 21.13925229143378, lng: 81.79305724767794 },
    coordinateStatus: "unverified",
    coordinateNote: null,
    description:
      "A senior secondary school in Nava Raipur. The operator publishes access from either North Block or South Block, then a feeder.",
    website: "https://bharatmataschoolnayaraipur.com",
    openingHours: null,
    contact: null,
    image: null,
    source: OPERATOR_LISTING,
    lastVerified: CAPTURED,
    official: true,
  },
  {
    id: "christel-house-india",
    name: "Christel House India",
    category: "Education",
    nearestStop: "North Block",
    nearestStopSource: "operator",
    coordinates: { lat: 20.75354553757882, lng: 82.44140631581612 },
    coordinateStatus: "disputed",
    coordinateNote:
      "The published point lies roughly 90 km south-east of Nava Raipur, in a different district entirely, and nowhere near the feeder route the same listing tells you to take.",
    description:
      "A school for children from low-income families, listed by the operator with North Block or South Block access. Its published coordinate is far outside Nava Raipur, so it is not shown as located here.",
    website: "https://in.christelhouse.org",
    openingHours: null,
    contact: null,
    image: null,
    source: OPERATOR_LISTING,
    lastVerified: CAPTURED,
    official: true,
  },
  {
    id: "mgm-model-school",
    name: "MGM Model School",
    category: "Education",
    nearestStop: "North Block",
    nearestStopSource: "operator",
    coordinates: DUPLICATED_SCHOOL_POINT,
    coordinateStatus: "disputed",
    coordinateNote: DUPLICATE_NOTE,
    description:
      "A school reached from the North Block stop by feeder. The operator publishes the same coordinate for it as for Delhi Public School, which cannot be right for both.",
    website: "https://mgmmodelschool.in",
    openingHours: null,
    contact: null,
    image: null,
    source: OPERATOR_LISTING,
    lastVerified: CAPTURED,
    official: true,
  },
  {
    id: "delhi-public-school",
    name: "Delhi Public School",
    category: "Education",
    nearestStop: "Sector 15",
    nearestStopSource: "operator",
    coordinates: DUPLICATED_SCHOOL_POINT,
    coordinateStatus: "disputed",
    coordinateNote: DUPLICATE_NOTE,
    description:
      "A school reached from Sector 15 or CBD and an auto. The operator publishes the same coordinate for it as for MGM Model School, which cannot be right for both.",
    website: "https://dpsnavaraipur.in",
    openingHours: null,
    contact: null,
    image: null,
    source: OPERATOR_LISTING,
    lastVerified: CAPTURED,
    official: true,
  },

  // --------------------------------------------------------- Entertainment
  {
    id: "miraj-cinema",
    name: "Miraj Cinema",
    category: "Entertainment",
    nearestStop: "CBD",
    nearestStopSource: "operator",
    coordinates: { lat: 21.177938416457692, lng: 81.77170170828606 },
    coordinateStatus: "unverified",
    coordinateNote: null,
    description:
      "A multiplex cinema at the CBD end of the corridor. The CBD stop is on the trunk route, so it is one of the easiest listed destinations to reach.",
    website: null,
    openingHours: null,
    contact: null,
    image: null,
    source: OPERATOR_LISTING,
    lastVerified: CAPTURED,
    official: true,
  },

  // ------------------------------------------ Ours, from the stop registry
  {
    id: "indravati-bhavan",
    name: "Indravati Bhavan",
    category: "Government",
    nearestStop: "Indravati Bhavan",
    nearestStopSource: "registry",
    coordinates: null,
    coordinateStatus: "unverified",
    coordinateNote: null,
    description:
      "One of the state secretariat buildings in the Nava Raipur capital complex. It is a trunk-route stop, so every scheduled corridor departure calls here.",
    website: null,
    openingHours: null,
    contact: null,
    image: null,
    source: STOP_REGISTRY,
    lastVerified: CAPTURED,
    official: false,
  },
  {
    id: "mahanadi-bhavan",
    name: "Mahanadi Bhavan",
    category: "Government",
    nearestStop: "Mahanadi Bhavan",
    nearestStopSource: "registry",
    coordinates: null,
    coordinateStatus: "unverified",
    coordinateNote: null,
    description:
      "The main state secretariat building in the capital complex. It is a trunk-route stop and one of the corridor's busiest weekday destinations.",
    website: null,
    openingHours: null,
    contact: null,
    image: null,
    source: STOP_REGISTRY,
    lastVerified: CAPTURED,
    official: false,
  },
  {
    id: "dks-bhawan",
    name: "DKS Bhawan",
    category: "Government",
    nearestStop: "DKS Bhawan",
    nearestStopSource: "registry",
    coordinates: null,
    coordinateStatus: "unverified",
    coordinateNote: null,
    description:
      "A government building on the Raipur side of the corridor, one stop before the railway station. Some inbound workings begin here rather than at the railway station.",
    website: null,
    openingHours: null,
    contact: null,
    image: null,
    source: STOP_REGISTRY,
    lastVerified: CAPTURED,
    official: false,
  },
  {
    id: "tribal-museum",
    name: "Tribal Museum",
    category: "Tourism",
    nearestStop: "Tribal Museum",
    nearestStopSource: "registry",
    coordinates: null,
    coordinateStatus: "unverified",
    coordinateNote: null,
    description:
      "A museum of Chhattisgarh's tribal culture, with a stop of its own on the published network. No departures are scheduled to that stop yet, so a journey cannot be planned to it here.",
    website: null,
    openingHours: null,
    contact: null,
    image: null,
    source: STOP_REGISTRY,
    lastVerified: CAPTURED,
    official: false,
  },
];

const PLACES_BY_ID = new Map(PLACES.map((place) => [place.id, place]));

export const findPlace = (id: string): Place | null =>
  PLACES_BY_ID.get(id) ?? null;

export const searchPlaces = (
  query: string,
  category: PlaceCategory | null
): Place[] => {
  const term = query.trim().toLowerCase();

  return PLACES.filter((place) => {
    if (category && place.category !== category) return false;
    if (!term) return true;

    return place.name.toLowerCase().includes(term);
  });
};

export const routeIdForPlace = (place: Place): NetworkRouteId | null =>
  getRoutesServing(place.nearestStop)[0]?.id ?? null;

/**
 * How to reach a place, derived rather than written.
 *
 * The operator's own listing carries free-text directions, and they have
 * already rotted - one of them sends you towards a coordinate in the wrong
 * district. Everything here is read from the live stop registry and timetable,
 * so it cannot describe a service that has changed underneath it.
 */
export interface GettingThere {
  stop: StopName;
  /** Network routes that call at the stop, from the route registry. */
  routeIds: readonly NetworkRouteId[];
  /** Whether anything is actually scheduled to call there. */
  scheduled: boolean;
  /** Whether the operator published this pairing or we derived it. */
  stopSource: StopSource;
}

export const gettingThereFor = (place: Place): GettingThere => ({
  stop: place.nearestStop,
  routeIds: getRoutesServing(place.nearestStop).map((route) => route.id),
  scheduled: hasScheduledService(place.nearestStop),
  stopSource: place.nearestStopSource,
});
