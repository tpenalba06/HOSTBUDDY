import { describe, it, expect } from "vitest";
import { extractFromText } from "./rules-extractor";
// Entirely fictional fixtures: no real addresses, contacts or Wi-Fi credentials.
describe("rules extractor provenance", () => {
  it("retains the smoking prohibition from the audited pasted paragraph", () => {
    const result = extractFromText(
      "Villa Audit à La Rochelle. Arrivée à 16h. Interdiction de fumer. Départ à 10h.",
    );
    expect(result.fields.find((field) => field.key === "rules")).toMatchObject({
      status: "found",
      value: "Interdiction de fumer.",
      rawValue: "Interdiction de fumer.",
    });
  });
  it("recognizes explicit multilingual guest facts", () => {
    const result = extractFromText(`Synthetic Guest House
Check-in from 4pm. Keys are in the lockbox next to the gate.
Wi-Fi network SYNTHETIC_NOT_REAL, password SYNTHETIC_NOT_A_REAL_PASSWORD.
Private parking in the garage.
No smoking and no parties.
Checkout before 11am.
Contact: synthetic-host@example.invalid.`);
    expect(result.propertyName).toBe("Synthetic Guest House");
    for (const key of ["access", "wifi", "contact"])
      expect(result.fields.find((field) => field.key === key)?.status).toBe("found");
  });
  it("does not convert generic words into emergency or contact facts", () => {
    const result = extractFromText(`Logement entièrement synthétique
18 commentaires voyageurs.
Télévision à écran plat.
Verres à vin dans la cuisine.
Situé dans une rue calme, à l'abri du bruit.`);
    for (const key of ["emergency", "contact", "trash"])
      expect(result.fields.find((field) => field.key === key)?.status).toBe("missing");
  });
  it("keeps every uncertain source excerpt for review instead of deleting it to fit a quota", () => {
    const result = extractFromText(`Logement entièrement synthétique
Check-in maybe around 16:00.
Parking quizá disponible.
Wi-Fi password to confirm.
Checkout possibly 10:00.
Contact: maybe synthetic-host@example.invalid.`);
    for (const key of ["arrival", "parking", "wifi", "departure", "contact"]) {
      const field = result.fields.find((value) => value.key === key);
      expect(field?.status).toBe("to_verify");
      expect(field?.value).toBeTruthy();
      expect(field?.rawValue).toBe(field?.value);
    }
  });
  it("never converts conflicting times into a single certain answer", () => {
    const result = extractFromText(`Logement synthétique
Arrivée à 15h.
Arrivée à 17h.`);
    expect(result.fields.find((field) => field.key === "arrival")?.status).toBe("to_verify");
  });
  it("requires review for explicitly absent or nearby amenities instead of enabling sections", () => {
    const result = extractFromText(`Logement synthétique
Pas de piscine.
No parking available.
Air conditioning not available.`);
    for (const key of ["pool", "parking", "climate"])
      expect(result.fields.find((field) => field.key === key)?.status).toBe("to_verify");
    const nearby = extractFromText("Villa fictive\nPiscine publique à proximité.");
    expect(nearby.fields.find((field) => field.key === "pool")?.status).toBe("to_verify");
  });
  it("does not promote low-confidence web keyword matches to confirmed facts", () => {
    const result = extractFromText("Villa fictive\nCheck-in from 16:00.\nPrivate pool.", 0.6);
    expect(result.fields.find((field) => field.key === "arrival")?.status).toBe("to_verify");
    expect(result.fields.find((field) => field.key === "pool")?.status).toBe("to_verify");
  });
});

it("recognizes the audited introductory property name without its location", () => {
  expect(
    extractFromText(
      "Villa Audit à La Rochelle. Arrivée à 16h. Interdiction de fumer. Départ à 10h.",
    ).propertyName,
  ).toBe("Villa Audit");
});
