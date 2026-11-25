export const photoRoleLabels = {
  cover: ["Couverture", "Cover"],
  bedrooms: ["Chambres", "Bedrooms"],
  kitchen: ["Cuisine", "Kitchen"],
  living: ["Salon", "Living room"],
  pool: ["Piscine", "Pool"],
  outdoors: ["Extérieurs", "Outdoors"],
  bathroom: ["Salle de bain", "Bathroom"],
  equipment: ["Autres équipements", "Other amenities"],
} as const;

export type PhotoRole = keyof typeof photoRoleLabels;
export type LodgingPhoto = { url: string; role: PhotoRole; label: string };
