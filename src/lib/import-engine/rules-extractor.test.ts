import { describe, it, expect } from "vitest";
import { extractFromText } from "./rules-extractor";
import { extractDocument } from "./document-extractor";
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

describe("audited synthetic guest-note classifications", () => {
  const source = `Nom du logement : Maison des Tests
Arrivée à partir de 17 h, départ avant 10 h.
Wi-Fi TEST-NONA, mot de passe uniquement-fictif.
Contact : Camille, camille@example.test. 2 chambres, 4 voyageurs.
Petit-déjeuner sur demande 12 euros.`;

  it("keeps a breakfast offer out of house rules without losing actual pet rules", () => {
    const fields = extractDocument(source).fields;
    expect(fields.find((field) => field.key === "services")).toMatchObject({
      value: "Petit-déjeuner sur demande 12 euros.",
      status: "found",
    });
    expect(fields.find((field) => field.key === "rules")?.status).toBe("missing");
    const pets = extractFromText("Synthetic House\nPets are not allowed.");
    expect(pets.fields.find((field) => field.key === "rules")).toMatchObject({
      value: "Pets are not allowed.",
      status: "found",
    });
  });

  it("separates a numbered capacity sentence from its preceding contact", () => {
    const fields = extractDocument(source).fields;
    const contact = fields.find((field) => field.key === "contact");
    const capacity = fields.find((field) => field.key === "capacity");
    expect(contact?.value).toBe("Contact : Camille, camille@example.test.");
    expect(capacity?.value).toBe("2 chambres, 4 voyageurs.");
    for (const field of [contact, capacity]) {
      expect(field?.status).toBe("found");
      expect(source).toContain(field!.rawValue);
      expect(field?.evidence?.[0]?.quote).toBe(field?.rawValue);
    }
  });

  it.each([
    ["Arrivée à partir de 17 h, départ avant 10 h.", "17 h", "10 h"],
    ["Check-in from 4pm and check-out before 10am.", "4pm", "10am"],
    ["Llegada a las 16:00; salida antes de las 10:00.", "16:00", "10:00"],
  ])("keeps each explicitly named time in its own field: %s", (notes, arrival, departure) => {
    const fields = extractDocument("Synthetic House\n" + notes).fields;
    for (const [key, included, excluded] of [
      ["arrival", arrival, departure],
      ["departure", departure, arrival],
    ]) {
      const field = fields.find((item) => item.key === key)!;
      expect(field.status).toBe("found");
      expect(field.value).toContain(included);
      expect(field.value).not.toContain(excluded);
      expect(notes).toContain(field.rawValue);
      expect(field.evidence?.every((item) => notes.includes(item.quote))).toBe(true);
    }
  });

  it("still requires review when two arrival claims differ within a mixed paragraph", () => {
    const result = extractDocument(
      "Synthetic House\nArrivée à 15h, départ avant 10h, arrivée à 17h.",
    );
    const arrival = result.fields.find((field) => field.key === "arrival")!;
    expect(arrival.status).toBe("to_verify");
    expect(arrival.issues).toContain("conflicting_sources");
    expect(arrival.rawValue).toContain("15h");
    expect(arrival.rawValue).toContain("17h");
    expect(arrival.rawValue).not.toContain("10h");
    expect(result.fields.find((field) => field.key === "departure")?.status).toBe("found");
  });

  it("does not interpret a named arrival deadline as a generic departure deadline", () => {
    const fields = extractDocument("Synthetic House\nArrivée avant 18h.").fields;
    expect(fields.find((field) => field.key === "arrival")?.status).toBe("found");
    expect(fields.find((field) => field.key === "departure")?.status).toBe("missing");
  });

  it("keeps uncertainty and low-trust URL evidence subject to review", () => {
    const uncertain = extractDocument(
      "Synthetic House\nArrivée peut-être à 17h, départ avant 10h.",
    );
    expect(uncertain.fields.find((field) => field.key === "arrival")?.status).toBe("to_verify");
    const website = extractDocument(source, "https://synthetic.example.invalid/guide");
    expect(website.fields.find((field) => field.key === "arrival")?.status).toBe("to_verify");
    expect(website.fields.find((field) => field.key === "departure")?.status).toBe("to_verify");
  });
});

it("recognizes the audited introductory property name without its location", () => {
  expect(
    extractFromText(
      "Villa Audit à La Rochelle. Arrivée à 16h. Interdiction de fumer. Départ à 10h.",
    ).propertyName,
  ).toBe("Villa Audit");
});
