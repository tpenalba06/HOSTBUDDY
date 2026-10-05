import { describe, expect, it } from "vitest";
import { extractStructuredFields, webTextForRules } from "./url-import.functions";
import { extractFromText } from "./rules-extractor";

// Shape reproduced from https://www.wikipedia.org/ (2026-10-05): generic meta + one huge language list line.
const portal = `<html><head><title>Wikipedia</title>
<meta name="description" content="Wikipedia is a free online encyclopedia, created and edited by volunteers around the world">
</head><body></body></html>`;
const languageLine = Array.from({ length: 80 }, (_, i) => `Langue${i} piscine cuisine poubelle accès`).join(" ");

describe("non-property web pages", () => {
  it("keeps a generic meta description unverified without lodging JSON-LD", () => {
    const s = extractStructuredFields(portal, "https://www.wikipedia.org/");
    expect(s.lodging).toBe(false);
    expect(s.fields["description"]?.status).toBe("to_verify");
  });

  it("ignores keyword hits inside long menu or link-list lines", () => {
    const fields = extractFromText(webTextForRules(`Wikipedia\n${languageLine}`), 0.6).fields;
    expect(fields.filter((f) => f.status !== "missing")).toHaveLength(0);
  });

  it("still reads short property sentences", () => {
    const fields = extractFromText(webTextForRules("Villa test\nLa piscine est chauffée."), 0.6).fields;
    expect(fields.find((f) => f.key === "pool")?.status).not.toBe("missing");
  });
});

describe("language-list false positives (wikipedia.org network result 2026-10-05)", () => {
  it("does not match keywords inside language names", () => {
    const text = webTextForRules("Asturianu\nTürkçe\nSlovenčina\nSlovenščina\nSinugboanong Binisaya\nEspañol");
    const hits = extractFromText(text, 0.6).fields.filter((f) => f.status !== "missing");
    expect(hits.map((f) => f.key)).toEqual([]);
  });
});
