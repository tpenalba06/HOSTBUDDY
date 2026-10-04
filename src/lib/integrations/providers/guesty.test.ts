import { describe, it, expect, afterEach } from "vitest";
import { normalizeGuesty, guestyPage } from "./guesty";
import { sealCredentials, openCredentials } from "./crypto.server";
const oldKey = process.env["PMS_ENCRYPTION_KEY"];
afterEach(() => {
  if (oldKey === undefined) delete process.env["PMS_ENCRYPTION_KEY"];
  else process.env["PMS_ENCRYPTION_KEY"] = oldKey;
});
describe("Guesty normalized imports", () => {
  it("does not invent absent contacts, equipment or photos", () => {
    const result = normalizeGuesty({ _id: "synthetic-id", title: "Logement synthétique" });
    expect(result.fields).toEqual([]);
    expect(result.photos).toEqual([]);
  });
  it("keeps provenance and requires validation before publication", () => {
    const result = normalizeGuesty({
      _id: "synthetic-id",
      publicDescription: { summary: "Description synthétique" },
      address: { full: "Adresse synthétique sans localisation réelle" },
      amenities: ["Synthetic equipment"],
    });
    expect(
      result.fields.every(
        (field) => field.status === "to_verify" && field.rawValue === field.value,
      ),
    ).toBe(true);
    expect(result.fields.map((field) => field.key)).not.toContain("pool");
  });
  it("deduplicates photos and rejects non-HTTPS or credential URLs", () => {
    expect(
      normalizeGuesty({
        _id: "synthetic",
        pictures: [
          { original: "https://example.invalid/synthetic.webp" },
          { original: "https://example.invalid/synthetic.webp" },
          { original: "javascript:alert(1)" },
          { original: "http://example.invalid/x" },
        ],
      }).photos,
    ).toEqual(["https://example.invalid/synthetic.webp"]);
  });
  it("validates partial pages and pagination", () => {
    expect(guestyPage({ results: [] }, 0).nextOffset).toBe(null);
    expect(
      guestyPage(
        { results: Array.from({ length: 100 }, (_, n) => ({ _id: `synthetic-${n}` })), count: 120 },
        0,
      ).nextOffset,
    ).toBe(100);
    expect(() => guestyPage({ results: "invalid" }, 0)).toThrow();
  });
  it("encrypts credentials with tenant-bound authenticated encryption", () => {
    process.env["PMS_ENCRYPTION_KEY"] = Buffer.alloc(32, 7).toString("base64");
    const envelope = sealCredentials("synthetic-org-a", { token: "synthetic-token" });
    expect(envelope).not.toContain("synthetic-token");
    expect(openCredentials("synthetic-org-a", envelope)).toEqual({ token: "synthetic-token" });
    expect(() => openCredentials("synthetic-org-b", envelope)).toThrow();
    expect(() => openCredentials("synthetic-org-a", envelope.slice(0, -4))).toThrow();
  });
  it("fails closed when encryption is not configured", () => {
    delete process.env["PMS_ENCRYPTION_KEY"];
    expect(() => sealCredentials("synthetic", {})).toThrow("provider_not_configured");
  });
});
