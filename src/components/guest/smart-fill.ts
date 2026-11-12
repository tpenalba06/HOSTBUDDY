import type { PublicImportPreview } from "@/lib/import-engine/public-preview";

// First-party pack. Provenance and usage terms are recorded alongside the files.
export const SMART_FILL = {
  apartment: "/hostbuddy-media/apartment.webp",
  hotel: "/hostbuddy-media/urban-hotel.webp",
  chalet: "/hostbuddy-media/chalet.webp",
  house: "/hostbuddy-media/countryside.webp",
  glamping: "/hostbuddy-media/glamping.webp",
  arrival: "/hostbuddy-media/arrival.webp",
  wifi: "/hostbuddy-media/wifi.webp",
  departure: "/hostbuddy-media/departure.webp",
  contact: "/hostbuddy-media/contact.webp",
} as const;

export function smartFillCover(mood: PublicImportPreview["illustration"]) {
  switch (mood) {
    case "villa-sea":
    case "countryside":
      return SMART_FILL.house;
    case "urban-hotel":
      return SMART_FILL.hotel;
    case "chalet":
      return SMART_FILL.chalet;
    case "glamping":
      return SMART_FILL.glamping;
    default:
      return SMART_FILL.apartment;
  }
}

export const smartFillSections: Record<string, string> = {
  arrival: SMART_FILL.arrival,
  wifi: SMART_FILL.wifi,
  departure: SMART_FILL.departure,
  house: SMART_FILL.apartment,
  contact: SMART_FILL.contact,
  transfer: SMART_FILL.arrival,
};
