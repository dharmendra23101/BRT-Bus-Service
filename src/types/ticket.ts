export const STOPS_IN_ORDER = [
  "HNLU",
  "Telibandha",
  "GE Road",
  "Pandri",
  "Raipur Station",
  "Tatibandh",
];

export const calculateFare = (toStop: string) => {
  const baseFare = 10;
  const index = STOPS_IN_ORDER.indexOf(toStop);
  return baseFare + index * 5;
};