import { describe, expect, it } from "vitest";
import { extractDocument } from "./document-extractor";
import { publicImportPreview, publicPreviewSchema } from "./public-preview";

describe("public import preview", () => {
  it("projects only recognized dates and capacity without transferring pasted credentials", () => {
    const source = [
      "Villa 1122",
      "Arrivée : 16h",
      "Départ : avant 10h",
      "3 voyageurs",
      "Wi-Fi : SECRET-TEST",
      "Boîte à clés : 1234",
    ].join("\n");
    expect(publicImportPreview(extractDocument(source))).toEqual({
      arrival: "16:00",
      departure: "10:00",
      capacity: 3,
      text: { arrival: "Arrivée : 16h", departure: "Départ : avant 10h" },
    });
  });

  it("omits free text mixed with an otherwise recognized fact", () => {
    const preview = publicImportPreview(extractDocument("Arrivée : 16h, code 1234"));
    expect(JSON.stringify(preview)).toBe("{}");
    expect(publicPreviewSchema.parse({ arrival: "16:00", wifi: "secret" })).toEqual({
      arrival: "16:00",
    });
  });
  it("reads explicit guest counts in grouped listing details and rejects disagreement", () => {
    const result = (value: string) => ({
      propertyName: null,
      fields: [
        { key: "capacity", status: "to_verify" as const, value, rawValue: value, confidence: 0.8 },
      ],
    });
    expect(publicImportPreview(result("2 voyageurs · 1 chambre · 1 lit")).capacity).toBe(2);
    expect(
      publicImportPreview(result("2 voyageurs · 1 chambre\n4 voyageurs")).capacity,
    ).toBeUndefined();
  });
});
