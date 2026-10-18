import { describe, expect, it } from "vitest";
import { extractFromText } from "./rules-extractor";

describe("large synthetic pasted documents", () => {
  it("keeps an explicit network name and leaves absent contact data missing", () => {
    // Entirely synthetic input: no address, person, credentials or contact.
    const source =
      "Appartement de test fictif\n" +
      "Description libre du séjour et de la destination.\n".repeat(2000) +
      "Wi-Fi : RESEAU_FICTIF_DE_TEST.";
    const result = extractFromText(source);
    expect(result.fields.find((field) => field.key === "wifi")?.status).toBe("found");
    expect(result.fields.find((field) => field.key === "contact")?.status).toBe("missing");
    expect(result.fields.find((field) => field.key === "wifi")?.value).toContain(
      "RESEAU_FICTIF_DE_TEST",
    );
  });
  it("does not hide a late contradiction beyond the excerpt preview limit", () => {
    const source =
      "Villa fictive\n" +
      Array.from({ length: 10 }, (_, i) => `Arrivée à 16h, note ${i}.`).join("\n") +
      "\nArrivée à 18h selon le dernier document.";
    const field = extractFromText(source).fields.find((field) => field.key === "arrival");
    expect(field?.status).toBe("to_verify");
    expect(field?.rawValue).toContain("Arrivée à 18h");
  });
  it("preserves final explicit Wi-Fi credentials after many other matching snippets", () => {
    const source =
      "Villa fictive\n" +
      Array.from({ length: 12 }, (_, i) => `Wi-Fi disponible dans la zone fictive ${i}.`).join(
        "\n",
      ) +
      "\nRéseau Wi-Fi : RESEAU_FICTIF_FINAL\nMot de passe Wi-Fi : SECRET_FICTIF_FINAL";
    const field = extractFromText(source).fields.find((field) => field.key === "wifi");
    expect(field?.status).toBe("to_verify");
    expect(field?.rawValue).toContain("RESEAU_FICTIF_FINAL");
    expect(field?.rawValue).toContain("SECRET_FICTIF_FINAL");
    expect(field?.value).toContain("RESEAU_FICTIF_FINAL");
  });
});
