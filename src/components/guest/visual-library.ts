import type { PublicSection } from "@/lib/data/public-guide.functions";
import { detectAccommodationMood } from "./property-media";

/** Generated HostBuddy ambience, explicitly illustrative. Real host images always win. */
export const SECTION_VISUALS: Record<string, string> = {
  welcome: "/hostbuddy-media/apartment.webp",
  arrival: "/hostbuddy-media/arrival.webp",
  wifi: "/hostbuddy-media/wifi.webp",
  house: "/hostbuddy-media/apartment.webp",
  places: "/demo-guide/restaurant.webp",
  services: "/demo-guide/breakfast.webp",
  contact: "/hostbuddy-media/contact.webp",
  departure: "/hostbuddy-media/departure.webp",
  pool: "/demo-guide/pool.webp",
};
export function sectionVisual(section: PublicSection) {
  return (
    section.media?.find((item) => item.type === "image" && item.url)?.url ||
    SECTION_VISUALS[section.key.split("-")[0]!] ||
    SECTION_VISUALS["house"]!
  );
}
export function ambienceFor(text: string) {
  const mood = detectAccommodationMood(text);
  return mood === "villa-sea"
    ? "/demo-guide/coast.webp"
    : mood
      ? `/hostbuddy-media/${mood}.webp`
      : "/hostbuddy-media/apartment.webp";
}
export function homeSections(sections: PublicSection[]) {
  const kinds = ["wifi", "arrival", "places", "departure", "contact"];
  const services = sections.find((section) => section.key.split("-")[0] === "services");
  const main = sections
    .filter((section) => kinds.includes(section.key.split("-")[0]!))
    .sort((a, b) => kinds.indexOf(a.key.split("-")[0]!) - kinds.indexOf(b.key.split("-")[0]!));
  const extra = sections.filter(
    (section) =>
      !main.includes(section) && section !== services && section.key.split("-")[0] !== "welcome",
  );
  return { services, main, extra };
}
