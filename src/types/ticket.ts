export const STOPS = [
  "HNLU",
  "Balco Medical Center",
  "Sector 30",
  "Sector 29",
  "Sector 27",
  "South Block",
  "Indravati Bhawan",
  "Mahanadi Bhawan",
  "North Block",
  "Ekatm Path",
  "CBD",
  "Sector 15",
  "Telibandha",
  "DKS Bhawan",
  "Raipur Railway Station"
];

export const FARE_MATRIX: Record<string, Record<string, number>> = {
  "Raipur Railway Station": {
    "Raipur Railway Station": 0,
    "DKS Bhawan": 5,
    "Telibandha": 10,
    "Sector 15": 25,
    "CBD": 25,
    "Ekatm Path": 25,
    "North Block": 25,
    "Mahanadi Bhawan": 30,
    "Indravati Bhawan": 30,
    "South Block": 25,
    "Sector 27": 30,
    "Sector 29": 30,
    "HNLU": 35
  },

  "DKS Bhawan": {
    "Raipur Railway Station": 5,
    "DKS Bhawan": 0,
    "Telibandha": 5,
    "Sector 15": 20,
    "CBD": 25,
    "Ekatm Path": 25,
    "North Block": 25,
    "Mahanadi Bhawan": 30,
    "Indravati Bhawan": 30,
    "South Block": 25,
    "Sector 27": 25,
    "Sector 29": 25,
    "HNLU": 30
  },

  "Telibandha": {
    "Raipur Railway Station": 10,
    "DKS Bhawan": 5,
    "Telibandha": 0,
    "Sector 15": 15,
    "CBD": 20,
    "Ekatm Path": 20,
    "North Block": 20,
    "Mahanadi Bhawan": 25,
    "Indravati Bhawan": 25,
    "South Block": 20,
    "Sector 27": 25,
    "Sector 29": 25,
    "HNLU": 25
  },

  "Sector 15": {
    "Raipur Railway Station": 25,
    "DKS Bhawan": 20,
    "Telibandha": 15,
    "Sector 15": 0,
    "CBD": 5,
    "Ekatm Path": 5,
    "North Block": 5,
    "Mahanadi Bhawan": 5,
    "Indravati Bhawan": 10,
    "South Block": 5,
    "Sector 27": 10,
    "Sector 29": 10,
    "HNLU": 10
  },

  "CBD": {
    "Raipur Railway Station": 25,
    "DKS Bhawan": 25,
    "Telibandha": 20,
    "Sector 15": 5,
    "CBD": 0,
    "Ekatm Path": 5,
    "North Block": 5,
    "Mahanadi Bhawan": 5,
    "Indravati Bhawan": 5,
    "South Block": 5,
    "Sector 27": 5,
    "Sector 29": 5,
    "HNLU": 10
  },

  "Ekatm Path": {
    "Raipur Railway Station": 25,
    "DKS Bhawan": 25,
    "Telibandha": 20,
    "Sector 15": 5,
    "CBD": 5,
    "Ekatm Path": 0,
    "North Block": 5,
    "Mahanadi Bhawan": 5,
    "Indravati Bhawan": 5,
    "South Block": 5,
    "Sector 27": 5,
    "Sector 29": 5,
    "HNLU": 5
  },

  "North Block": {
    "Raipur Railway Station": 25,
    "DKS Bhawan": 25,
    "Telibandha": 20,
    "Sector 15": 5,
    "CBD": 5,
    "Ekatm Path": 5,
    "North Block": 0,
    "Mahanadi Bhawan": 5,
    "Indravati Bhawan": 5,
    "South Block": 5,
    "Sector 27": 5,
    "Sector 29": 5,
    "HNLU": 10
  },

  "Mahanadi Bhawan": {
    "Raipur Railway Station": 30,
    "DKS Bhawan": 30,
    "Telibandha": 25,
    "Sector 15": 5,
    "CBD": 5,
    "Ekatm Path": 5,
    "North Block": 5,
    "Mahanadi Bhawan": 0,
    "Indravati Bhawan": 5,
    "South Block": 5,
    "Sector 27": 5,
    "Sector 29": 5,
    "HNLU": 10
  },

  "Indravati Bhawan": {
    "Raipur Railway Station": 30,
    "DKS Bhawan": 30,
    "Telibandha": 25,
    "Sector 15": 10,
    "CBD": 5,
    "Ekatm Path": 5,
    "North Block": 5,
    "Mahanadi Bhawan": 5,
    "Indravati Bhawan": 0,
    "South Block": 5,
    "Sector 27": 5,
    "Sector 29": 5,
    "HNLU": 10
  },

  "South Block": {
    "Raipur Railway Station": 25,
    "DKS Bhawan": 25,
    "Telibandha": 20,
    "Sector 15": 5,
    "CBD": 5,
    "Ekatm Path": 5,
    "North Block": 5,
    "Mahanadi Bhawan": 5,
    "Indravati Bhawan": 5,
    "South Block": 0,
    "Sector 27": 5,
    "Sector 29": 5,
    "HNLU": 5
  },

  "Sector 27": {
    "Raipur Railway Station": 30,
    "DKS Bhawan": 25,
    "Telibandha": 25,
    "Sector 15": 10,
    "CBD": 5,
    "Ekatm Path": 5,
    "North Block": 5,
    "Mahanadi Bhawan": 5,
    "Indravati Bhawan": 5,
    "South Block": 5,
    "Sector 27": 0,
    "Sector 29": 5,
    "HNLU": 5
  },

  "Sector 29": {
    "Raipur Railway Station": 30,
    "DKS Bhawan": 25,
    "Telibandha": 25,
    "Sector 15": 10,
    "CBD": 5,
    "Ekatm Path": 5,
    "North Block": 5,
    "Mahanadi Bhawan": 5,
    "Indravati Bhawan": 5,
    "South Block": 5,
    "Sector 27": 5,
    "Sector 29": 0,
    "HNLU": 5
  },


  "Sector 30": {
  "Sector 30": 0,
  "Balco Medical Center": 5,
  "Sector 29": 5,
  "Sector 27": 5,
  "South Block": 5,
  "Indravati Bhawan": 10,
  "Mahanadi Bhawan": 10,
  "North Block": 10,
  "Ekatm Path": 10,
  "CBD": 10,
  "Sector 15": 15,
  "Telibandha": 20,
  "DKS Bhawan": 25,
  "Raipur Railway Station": 30,
  "HNLU": 5
},



  "Balco Medical Center": {
  "Balco Medical Center": 0,
  "Sector 30": 5,
  "Sector 29": 5,
  "Sector 27": 5,
  "South Block": 5,
  "Indravati Bhawan": 10,
  "Mahanadi Bhawan": 10,
  "North Block": 10,
  "Ekatm Path": 10,
  "CBD": 10,
  "Sector 15": 15,
  "Telibandha": 20,
  "DKS Bhawan": 25,
  "Raipur Railway Station": 30,
  "HNLU": 5
},

  "HNLU": {
    "Raipur Railway Station": 35,
    "DKS Bhawan": 30,
    "Telibandha": 25,
    "Sector 15": 10,
    "CBD": 10,
    "Ekatm Path": 5,
    "North Block": 10,
    "Mahanadi Bhawan": 10,
    "Indravati Bhawan": 10,
    "South Block": 5,
    "Sector 27": 5,
    "Sector 29": 5,
    "HNLU": 0
  }
};

export const calculateFare = (from: string, to: string) => {
  if (!from || !to) return 0;
  if (from === to) return 0;

  const fare = FARE_MATRIX[from]?.[to];

  if (fare === undefined) {
    console.warn(`Fare not found for ${from} → ${to}`);
    return 0;
  }

  return fare;
};