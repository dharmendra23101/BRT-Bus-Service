/**
 * The stops each route calls at, in travel order.
 *
 * GENERATED alongside `timetable.ts` - see `TIMETABLE_SOURCE` there for
 * provenance. Do not hand-edit.
 *
 * Derived from each route LONGEST published working, because the source runs
 * several patterns under one number and no single one of them is canonical. A
 * stop is listed once even where a trip calls at it twice.
 *
 * Kept in its own module so `routes.ts` never imports the trip data: routes are
 * reachable from the eager entry chunk and the timetable deliberately is not.
 */

import type { StopName } from "./stops";

export const ROUTE_STOPS: Record<string, readonly StopName[]> = {
  "101": ["HNLU", "Balco Medical Center", "Sector 30", "Sector 29", "Sector 27", "South Block", "Indravati Bhavan", "Mahanadi Bhavan", "North Block", "Ekatm Path", "CBD", "Sector 15", "Telibandha", "DKS Bhawan", "Raipur Railway Station"],
  "102": ["HNLU", "Balco Medical Center", "Sector 30", "Sector 29", "Sector 27", "South Block", "North Block", "Ekatm Path", "CBD", "Sector 15", "Telibandha", "DKS Bhawan", "Raipur Railway Station"],
  "105": ["HNLU", "IIM", "Sector 29", "Sector 27", "South Block", "Indravati Bhavan", "Mahanadi Bhavan", "North Block", "Ekatm Path", "CBD", "Sector 15", "Telibandha", "DKS Bhawan", "Raipur Railway Station"],
  "201": ["Raipur Railway Station", "DKS Bhawan", "Telibandha", "Sector 15", "CBD", "Ekatm Path", "North Block", "Mahanadi Bhavan", "Indravati Bhavan", "South Block", "Sector 27", "Sector 29", "Sector 30", "Balco Medical Center", "HNLU", "HNLU Gate", "Jungle Safari", "IIIT", "Muktangan"],
  "202": ["Raipur Railway Station", "DKS Bhawan", "Telibandha", "Sector 15", "CBD", "Ekatm Path", "North Block", "Mahanadi Bhavan", "Indravati Bhavan", "South Block", "Sector 27", "Sector 29", "Sector 30", "Balco Medical Center", "HNLU", "HNLU Gate", "Jungle Safari", "IIIT", "Muktangan"],
  "203": ["Raipur Railway Station", "DKS Bhawan", "Telibandha", "Sector 15", "CBD", "Ekatm Path", "North Block", "South Block", "Sector 27", "Sector 29", "Sector 30", "Balco Medical Center", "HNLU", "HNLU Gate"],
  "204": ["DKS Bhawan", "Telibandha", "Sector 15", "CBD", "Ekatm Path", "North Block", "Mahanadi Bhavan", "Indravati Bhavan", "South Block", "Sector 27", "Sector 29", "Sector 30", "Balco Medical Center"],
  "205": ["Raipur Railway Station", "DKS Bhawan", "Telibandha", "Sector 15", "CBD", "Ekatm Path", "North Block", "Mahanadi Bhavan", "Indravati Bhavan", "South Block", "Sector 27", "Sector 29", "Sector 30", "IIM", "Balco Medical Center", "HNLU", "HNLU Gate", "Jungle Safari", "IIIT", "Muktangan"],
};
