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
});
