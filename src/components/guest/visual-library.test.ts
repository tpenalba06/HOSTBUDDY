import { describe, it, expect } from "vitest";
import { homeSections, sectionVisual, ambienceFor } from "./visual-library";
import type { PublicSection } from "@/lib/data/public-guide.functions";
const section = (key: string): PublicSection => ({ id: key, key, title: key, content: {} });
describe("home hierarchy", () => {
  it("keeps services structural and preserves every editorial section in manager order", () => {
    const result = homeSections(
      [
        "pool",
        "services",
        "contact",
        "wifi",
        "arrival",
        "places",
        "departure",
        "welcome",
        "parking",
      ].map(section),
    );
    expect(result.services?.key).toBe("services");
    expect(result.main.map((item) => item.key)).toEqual([
      "pool",
      "contact",
      "wifi",
      "arrival",
      "places",
      "departure",
      "parking",
    ]);
    expect(result.extra).toEqual([]);
  });
  it("keeps all custom sections and repeated sections reachable without modifying the source", () => {
    const sections = ["custom-a", "wifi-a", "wifi-b", "services"].map(section);
    const original = [...sections];
    const result = homeSections(sections);
    expect([...result.main, ...result.extra, result.services].filter(Boolean)).toHaveLength(4);
    expect(sections).toEqual(original);
  });
  it("always replaces the default visual with the host photograph", () => {
    expect(
      sectionVisual({
        ...section("wifi"),
        media: [
          {
            id: "actual",
            type: "image",
            url: "https://example.test/actual",
            path: "private",
            mimeType: "image/jpeg",
            sortOrder: 0,
          },
        ],
      }),
    ).toBe("https://example.test/actual");
  });
  it("matches different lodging universes, with a neutral fallback for ambiguous text", () => {
    expect(ambienceFor("Villa face à la mer")).toContain("coast");
    expect(ambienceFor("Chalet alpin")).toContain("chalet");
    expect(ambienceFor("Hôtel en ville")).toContain("urban-hotel");
    expect(ambienceFor("Appartement et chalet")).toContain("apartment");
  });
});
