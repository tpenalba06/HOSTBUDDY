import { describe, it, expect } from "vitest";
import { initialGuideSections } from "./section-policy";
import { validateMediaFile } from "./media-validation";
import type { PropertyField } from "./properties";
const field = (key: string, status: string, value: string) =>
  ({ key, status, value, label: key }) as PropertyField;
describe("section activation", () => {
  it("proposes structural sections only when there is no evidence", () => {
    expect(initialGuideSections("p", []).map((s) => s.section_key)).toEqual([
      "welcome",
      "arrival",
      "departure",
    ]);
  });
  it("does not create unverified facilities or contact but includes verified ones", () => {
    const result = initialGuideSections("p", [
      field("pool", "to_verify", "Piscine possible"),
      field("contact", "missing", ""),
      field("wifi", "found", "Maison"),
      field("equipment", "found", "Four"),
    ]);
    expect(result.map((s) => s.section_key)).toEqual([
      "welcome",
      "arrival",
      "wifi",
      "house",
      "departure",
    ]);
  });
  it("leaves fields intact and excludes unverified values from content", () => {
    const fields = [field("pool", "to_verify", "Piscine")];
    const before = JSON.stringify(fields);
    const sections = initialGuideSections("p", fields);
    expect(JSON.stringify(sections)).not.toContain("Piscine");
    expect(JSON.stringify(fields)).toBe(before);
  });
});
describe("media validation", () => {
  it("accepts supported formats and rejects executable, empty and oversized files", () => {
    expect(() => validateMediaFile({ type: "image/webp", size: 4000 })).not.toThrow();
    for (const file of [
      { type: "text/html", size: 100 },
      { type: "video/mp4", size: 51 * 1024 * 1024 },
      { type: "image/jpeg", size: 0 },
    ])
      expect(() => validateMediaFile(file)).toThrow();
  });
});
