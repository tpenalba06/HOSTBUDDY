import { describe, expect, it } from "vitest";
import {
  documentChunks,
  extractDocument,
  mergeQuotedEvidence,
  planReimport,
} from "./document-extractor";
import { htmlDocumentText, sunverGuestDocument } from "./html-document";
import { importedPropertyId } from "./import-identity";
import { analyzeImportDocument } from "./intelligence.server";
import { readFlightRecords } from "./flight-records";

describe("document import with verifiable evidence", () => {
  it("accepts only verbatim local model evidence after checking the pinned model", async () => {
    const source = "Casa synthétique\nMerci de libérer les lieux avant dix heures.";
    const urls: string[] = [];
    const result = await analyzeImportDocument(source, {
      localAi: true,
      fetcher: async (url, init) => {
        urls.push(String(url));
        if (String(url).endsWith("/api/tags"))
          return Response.json({
            models: [
              {
                name: "qwen3.5:9b",
                digest: "56671c2ab9385f9cfcb404638e32cd62d88e3501d44822208363c010179a3c90",
              },
            ],
          });
        const request = JSON.parse(init!.body as string);
        expect(request.options.num_gpu).toBe(0);
        return Response.json({
          model: "qwen3.5:9b",
          done: true,
          message: {
            content: JSON.stringify({
              evidence: [
                { key: "departure", quote: "Merci de libérer les lieux avant dix heures." },
                { key: "wifi", quote: "Invented password" },
              ],
            }),
          },
        });
      },
    });
    expect(urls).toEqual(["http://127.0.0.1:11435/api/tags", "http://127.0.0.1:11435/api/chat"]);
    expect(result.analysis?.engine).toBe("document+local-ai");
    expect(result.fields.find((f) => f.key === "departure")?.evidence?.at(-1)?.method).toBe(
      "local-ai",
    );
    expect(result.fields.find((f) => f.key === "wifi")?.status).toBe("missing");
  });
  it("refuses inference when the installed model differs from the pinned digest", async () => {
    let calls = 0;
    const result = await analyzeImportDocument("Casa synthétique\nArrivée à 16h", {
      localAi: true,
      fetcher: async () => {
        calls++;
        return Response.json({ models: [{ name: "qwen3.5:9b", digest: "unexpected" }] });
      },
    });
    expect(calls).toBe(1);
    expect(result.analysis?.warnings).toContain("local_ai_unavailable");
    expect(result.fields.find((f) => f.key === "arrival")?.value).toContain("16h");
  });
  it("covers a long document exactly and preserves its last contradictory credential", () => {
    const input =
      "Villa synthétique\nWi-Fi\nSSID: SYNTHETIC\nPassword: FIRST\n" +
      "Informations sans données particulières.\n".repeat(1600) +
      "\nWi-Fi\nSSID: SYNTHETIC\nPassword: SECOND";
    expect(documentChunks(input).join("")).toBe(input);
    const wifi = extractDocument(input).fields.find((f) => f.key === "wifi")!;
    expect(wifi.rawValue).toContain("SECOND");
    expect(wifi.status).toBe("to_verify");
    expect(wifi.issues).toContain("conflicting_sources");
  });
  it("uses headings to classify multilingual values that contain no keywords", () => {
    const result = extractDocument(
      "Casa sintética\nAnkunft\nAb 16:00\nCheck-out\nVor 10:00\nWi-Fi\nSSID: TEST_ONLY\nPassword: ONLY_A_FIXTURE",
    );
    expect(result.fields.find((f) => f.key === "arrival")?.rawValue).toContain("16:00");
    expect(result.fields.find((f) => f.key === "departure")?.rawValue).toContain("10:00");
    expect(result.fields.find((f) => f.key === "contact")?.status).toBe("missing");
  });
  it("refuses hallucinated quotes, unknown keys and instructions masquerading as extracted facts", () => {
    const source = "Les clés sont dans la boîte grise.";
    const result = mergeQuotedEvidence(extractDocument(source), source, [
      { key: "wifi", quote: "Password: invented" },
      { key: "unknown", quote: source },
      { key: "access", quote: source },
    ]);
    expect(result.fields.find((f) => f.key === "wifi")?.status).toBe("missing");
    expect(result.fields.find((f) => f.key === "access")?.evidence?.at(-1)?.quote).toBe(source);
  });
  it("reports local AI failure with a complete deterministic result and no remote provider", async () => {
    const urls: string[] = [];
    const result = await analyzeImportDocument("Villa synthétique\nArrivée à 16h", {
      localAi: true,
      fetcher: async (url) => {
        urls.push(String(url));
        throw new Error("offline");
      },
    });
    expect(urls).toEqual(["http://127.0.0.1:11435/api/tags"]);
    expect(result.analysis?.warnings).toContain("local_ai_unavailable");
    expect(result.fields.find((f) => f.key === "arrival")?.value).toContain("16h");
  });
  it("never overwrites a manually changed field during reimport", () => {
    const incoming = extractDocument("Villa synthétique\nArrivée à 18h");
    const plans = planReimport(
      [
        {
          key: "arrival",
          value: "15h",
          rawValue: null,
          confidence: 1,
          status: "found",
          manuallyOverridden: true,
        },
      ],
      incoming,
    );
    expect(plans.find((p) => p.key === "arrival")?.action).toBe("preserve_manual");
  });
  it("rejects oversize input explicitly and generates tenant-scoped stable import IDs", async () => {
    expect(() => extractDocument("x".repeat(200001))).toThrow("import_text_too_large");
    expect(await importedPropertyId("org-a", "pms", "pms:test:123")).toBe(
      await importedPropertyId("org-a", "pms", "pms:test:123"),
    );
    expect(await importedPropertyId("org-a", "pms", "pms:test:123")).not.toBe(
      await importedPropertyId("org-b", "pms", "pms:test:123"),
    );
  });
  it("parses HTML entities and long paragraphs without running scripts or importing reviews", () => {
    const html = `<h2>Wi-Fi</h2><p>SSID: TEST &amp; ONLY</p><script>throw new Error('never execute')</script><div class="customer-reviews">Pool invented by a reviewer</div><p>${"Long text. ".repeat(500)} Arrivée à 16h.</p>`;
    const text = htmlDocumentText(html);
    expect(text).toContain("TEST & ONLY");
    expect(text).toContain("Arrivée à 16h");
    expect(text).not.toContain("invented by a reviewer");
    expect(text).not.toContain("never execute");
  });
  it("reads only the matching public Sunver establishment, never interface translations or tokens", () => {
    const e = {
      slug: "synthetic",
      name: { fr: "Villa synthétique" },
      info_text: { fr: "Bienvenue" },
      address: "Adresse fictive",
      token: "NEVER_IMPORT_TOKEN",
      config: { password: "NEVER_IMPORT_PASSWORD" },
    };
    const payload =
      "a:" +
      JSON.stringify([
        "$",
        "Component",
        null,
        { messages: { wifi: "NEVER_IMPORT_TRANSLATION" }, establishment: e },
      ]) +
      "\n";
    const html = `<script>self.__next_f.push(${JSON.stringify([1, payload])})</script>`;
    const result = sunverGuestDocument(html, "https://app.sunver.app/fr/guest/synthetic")!;
    expect(result.text).toContain("Villa synthétique");
    expect(result.text).not.toMatch(/NEVER_IMPORT/);
    expect(sunverGuestDocument(html, "https://app.sunver.app/fr/staff/synthetic")).toBeNull();
  });
  it("reads UTF-8 byte-counted Flight text containing newlines before subsequent records", () => {
    const text = "Description très longue\nAvec accents à conserver.";
    const length = new TextEncoder().encode(text).length.toString(16);
    const stream = `a:T${length},${text}b:${JSON.stringify({ name: "Villa après le bloc texte" })}\n`;
    const records = readFlightRecords(
      `<script>self.__next_f.push(${JSON.stringify([1, stream])})</script>`,
    );
    expect(records.get("a")).toBe(text);
    expect(records.get("b")).toEqual({ name: "Villa après le bloc texte" });
  });
});
