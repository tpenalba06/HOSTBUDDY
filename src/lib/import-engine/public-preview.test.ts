import { describe, expect, it } from "vitest";
import { extractDocument } from "./document-extractor";
import { publicImportPreview, publicPreviewSchema, previewPastedDocument } from "./public-preview";

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
  it("preserves the Villa Azur paragraph facts without exposing its credentials", () => {
    const preview = previewPastedDocument(
      "Bienvenue à la Villa Azur, située au 12 rue des Oliviers à Nice. L'arrivée se fait à partir de 16 h et le départ avant 11 h. Le logement dispose d'une piscine, de la climatisation, d'une cuisine équipée et d'un parking privé. Le réseau Wi-Fi s'appelle VillaAzur_Guest, mot de passe TESTAzur2026. Les clés sont dans une boîte située à droite du portail. Le code fictif de TEST est 1234. Merci de ne pas faire de bruit après 22 h. Pour le départ, fermer toutes les fenêtres et déposer les clés dans la boîte.",
    );
    expect(preview).toMatchObject({
      name: "Villa Azur",
      arrival: "16:00",
      departure: "11:00",
      text: { address: "12 rue des Oliviers, Nice" },
    });
    expect(preview.text?.kitchen).toContain("cuisine équipée");
    expect(preview.text?.rules).toContain("bruit après 22 h");
    expect(preview.text?.departure).toContain("fermer toutes les fenêtres");
    expect(JSON.stringify(preview)).not.toMatch(
      /TESTAzur2026|1234|VillaAzur_Guest|droite du portail/,
    );
  });
});
