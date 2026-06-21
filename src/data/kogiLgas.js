export const KOGI_LGAS = [
  {
    id: "adavi",
    name: "Adavi",
    latitude: 7.61,
    longitude: 6.21,
    riskProfile: { riverineExposure: 0.28, roadExposure: 0.54, agriculturalExposure: 0.62 }
  },
  {
    id: "ajaokuta",
    name: "Ajaokuta",
    latitude: 7.56,
    longitude: 6.66,
    riskProfile: { riverineExposure: 0.72, roadExposure: 0.66, agriculturalExposure: 0.56 }
  },
  {
    id: "ankpa",
    name: "Ankpa",
    latitude: 7.37,
    longitude: 7.63,
    riskProfile: { riverineExposure: 0.38, roadExposure: 0.48, agriculturalExposure: 0.76 }
  },
  {
    id: "bassa",
    name: "Bassa",
    latitude: 7.91,
    longitude: 7.17,
    riskProfile: { riverineExposure: 0.66, roadExposure: 0.42, agriculturalExposure: 0.72 }
  },
  {
    id: "dekina",
    name: "Dekina",
    latitude: 7.69,
    longitude: 7.02,
    riskProfile: { riverineExposure: 0.44, roadExposure: 0.5, agriculturalExposure: 0.78 }
  },
  {
    id: "ibaji",
    name: "Ibaji",
    latitude: 6.86,
    longitude: 6.78,
    riskProfile: { riverineExposure: 0.96, roadExposure: 0.68, agriculturalExposure: 0.82 }
  },
  {
    id: "idah",
    name: "Idah",
    latitude: 7.11,
    longitude: 6.73,
    riskProfile: { riverineExposure: 0.9, roadExposure: 0.58, agriculturalExposure: 0.7 }
  },
  {
    id: "igalamela-odolu",
    name: "Igalamela-Odolu",
    latitude: 7.14,
    longitude: 6.86,
    riskProfile: { riverineExposure: 0.82, roadExposure: 0.52, agriculturalExposure: 0.74 }
  },
  {
    id: "ijumu",
    name: "Ijumu",
    latitude: 7.84,
    longitude: 5.96,
    riskProfile: { riverineExposure: 0.34, roadExposure: 0.62, agriculturalExposure: 0.68 }
  },
  {
    id: "kabba-bunu",
    name: "Kabba/Bunu",
    latitude: 7.83,
    longitude: 6.07,
    riskProfile: { riverineExposure: 0.48, roadExposure: 0.72, agriculturalExposure: 0.66 }
  },
  {
    id: "kogi",
    name: "Kogi",
    latitude: 8.08,
    longitude: 6.73,
    riskProfile: { riverineExposure: 0.88, roadExposure: 0.52, agriculturalExposure: 0.62 }
  },
  {
    id: "lokoja",
    name: "Lokoja",
    latitude: Number(process.env.LOKOJA_LAT ?? 7.8),
    longitude: Number(process.env.LOKOJA_LON ?? 6.74),
    riskProfile: { riverineExposure: 1, roadExposure: 0.76, agriculturalExposure: 0.56 }
  },
  {
    id: "mopa-muro",
    name: "Mopa-Muro",
    latitude: 8.12,
    longitude: 5.89,
    riskProfile: { riverineExposure: 0.28, roadExposure: 0.48, agriculturalExposure: 0.7 }
  },
  {
    id: "ofu",
    name: "Ofu",
    latitude: 7.23,
    longitude: 6.92,
    riskProfile: { riverineExposure: 0.58, roadExposure: 0.54, agriculturalExposure: 0.76 }
  },
  {
    id: "ogori-magongo",
    name: "Ogori/Magongo",
    latitude: 7.47,
    longitude: 6.22,
    riskProfile: { riverineExposure: 0.24, roadExposure: 0.5, agriculturalExposure: 0.58 }
  },
  {
    id: "okehi",
    name: "Okehi",
    latitude: 7.71,
    longitude: 6.31,
    riskProfile: { riverineExposure: 0.36, roadExposure: 0.58, agriculturalExposure: 0.66 }
  },
  {
    id: "okene",
    name: "Okene",
    latitude: 7.55,
    longitude: 6.24,
    riskProfile: { riverineExposure: 0.26, roadExposure: 0.64, agriculturalExposure: 0.54 }
  },
  {
    id: "olamaboro",
    name: "Olamaboro",
    latitude: 7.18,
    longitude: 7.56,
    riskProfile: { riverineExposure: 0.42, roadExposure: 0.46, agriculturalExposure: 0.8 }
  },
  {
    id: "omala",
    name: "Omala",
    latitude: 7.84,
    longitude: 7.56,
    riskProfile: { riverineExposure: 0.72, roadExposure: 0.42, agriculturalExposure: 0.78 }
  },
  {
    id: "yagba-east",
    name: "Yagba East",
    latitude: 8.03,
    longitude: 5.75,
    riskProfile: { riverineExposure: 0.3, roadExposure: 0.48, agriculturalExposure: 0.74 }
  },
  {
    id: "yagba-west",
    name: "Yagba West",
    latitude: 8.29,
    longitude: 5.55,
    riskProfile: { riverineExposure: 0.32, roadExposure: 0.5, agriculturalExposure: 0.76 }
  }
];

export function slugifyLga(value = "lokoja") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\//g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getKogiLgas() {
  return KOGI_LGAS.map((lga) => ({
    id: lga.id,
    name: lga.name,
    latitude: lga.latitude,
    longitude: lga.longitude,
    riskProfile: { ...lga.riskProfile }
  }));
}

export function getKogiLga(value = "lokoja") {
  const normalized = slugifyLga(value);
  return KOGI_LGAS.find((lga) => lga.id === normalized || slugifyLga(lga.name) === normalized) ?? KOGI_LGAS.find((lga) => lga.id === "lokoja");
}
