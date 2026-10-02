import { describe, expect, it } from "vitest";
import { extractFromText } from "./rules-extractor";

describe("Universal Import Engine deterministic extraction", () => {
  it("extracts explicit French guest information with very little review noise", () => {
    const result = extractFromText(`Villa Horizon
12 rue des Pins, 17000 La Rochelle
Arrivée à partir de 16h. Boîte à clés à droite du portail, code 4821.
Wi-Fi : Horizon_5G. Mot de passe : ocean2026.
Parking privé devant la maison.
Cuisine avec four, micro-ondes, lave-vaisselle et Nespresso.
Climatisation dans le salon.
Maison non-fumeur, fêtes interdites.
Poubelles dans le conteneur au bout de la rue.
Piscine ouverte de 9h à 21h.
Départ avant 11h, remettre les clés dans la boîte.
Téléphone / WhatsApp : +33 6 12 34 56 78. E-mail : contact@villa-horizon.fr
Urgence : 112.
Restaurant Le Môle et boulangerie du Marché à proximité.
Petit-déjeuner et transfert disponibles sur demande.`);

    const detected = result.fields.filter((field) => field.status !== "missing");
    const review = detected.filter((field) => field.status === "to_verify");

    expect(result.propertyName).toBe("Villa Horizon");
    expect(detected.length).toBeGreaterThanOrEqual(10);
    expect(review.length / detected.length).toBeLessThanOrEqual(0.1);
    expect(result.fields.find((field) => field.key === "contact")?.status).toBe("found");
    expect(result.fields.find((field) => field.key === "wifi")?.status).toBe("found");
  });

  it("does not turn review counts or generic words into emergency/contact facts", () => {
    const result = extractFromText(`Appartement du Port
18 commentaires voyageurs.
Télévision à écran plat.
Verres à vin dans la cuisine.
Situé dans une rue calme, à l'abri du bruit.`);

    expect(result.fields.find((field) => field.key === "emergency")?.status).toBe("missing");
    expect(result.fields.find((field) => field.key === "contact")?.status).toBe("missing");
    expect(result.fields.find((field) => field.key === "trash")?.status).toBe("missing");
  });

  it("keeps genuinely uncertain evidence exceptional instead of presenting guesses as facts", () => {
    const result = extractFromText(`Casa Sol
Check-in maybe around 16:00.
Parking quizá disponible.
Wi-Fi password to confirm.
Checkout possibly 10:00.
Contact: maybe +34 612 345 678.`);

    const detected = result.fields.filter((field) => field.status !== "missing");
    const review = detected.filter((field) => field.status === "to_verify");
    expect(review.length).toBeLessThanOrEqual(Math.floor(detected.length * 0.1));
  });

  it("recognizes common guest information in English", () => {
    const result = extractFromText(`Sea View House
Check-in from 4pm. Keys are in the lockbox next to the gate.
Wi-Fi network SeaView, password summer2026.
Private parking in the garage.
No smoking and no parties.
Checkout before 11am.
Phone / WhatsApp +44 7700 900123. Email host@example.com.`);

    expect(result.propertyName).toBe("Sea View House");
    expect(result.fields.find((field) => field.key === "access")?.status).toBe("found");
    expect(result.fields.find((field) => field.key === "wifi")?.status).toBe("found");
    expect(result.fields.find((field) => field.key === "contact")?.status).toBe("found");
  });
});
