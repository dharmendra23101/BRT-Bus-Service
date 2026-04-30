export const STOPS_IN_ORDER = [
  "HNLU",
  "Balco Medical Center",
  "Sector 30",
  "IIM",
  "Sector 29",
  "Sector 27",
  "South Block",
  "Indravati Bhavan",
  "Mahanadi Bhavan",
  "North Block",
  "Ekatm Path",
  "CBD",
  "Sector 15",
  "Telibandha",
  "DKS Bhavan",
  "Railway Station"
];

export const calculateFare = (toStop: string) => {
  const baseFare = 10;
  const index = STOPS_IN_ORDER.indexOf(toStop);
  return baseFare + index * 5;
};