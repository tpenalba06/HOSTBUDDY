import { describe, expect, it } from "vitest";
import { normalizePms, readPms } from "./pms-session.server";
import { extractionFromProvider } from "./model";

describe("read-only PMS import contracts (synthetic fixtures, not live accounts)", () => {
  it("does not invent missing property details, photos or credentials", () => {
    const p = normalizePms("lodgify", { id: 123, name: "Synthetic", apiKey: "DO_NOT_EXPORT" });
    expect(p.fields).toEqual([]);
    expect(p.photos).toEqual([]);
    expect(JSON.stringify(p)).not.toContain("DO_NOT_EXPORT");
    expect(extractionFromProvider(p).fields.every((f) => f.status === "missing")).toBe(true);
  });
  it("uses a fixed Hostaway listing endpoint with resources and never writes to the provider", async () => {
    const requests: { url: string; init?: RequestInit }[] = [];
    const r = await readPms("hostaway", { key: "SYNTHETIC_TOKEN" }, 1, "123", async (url, init) => {
      requests.push({ url: String(url), ...(init ? { init } : {}) });
      return Response.json({
        result: {
          id: 123,
          name: "Synthetic",
          description: "Source text",
          listingImages: [{ url: "https://example.invalid/photo.webp" }],
        },
      });
    });
    expect(requests[0]!.url).toBe("https://api.hostaway.com/v1/listings/123?includeResources=1");
    expect(requests[0]!.init?.redirect).toBe("error");
    expect(requests[0]!.init?.method).toBeUndefined();
    expect(r.properties[0]!.photos).toHaveLength(1);
    expect(r.properties[0]!.fields[0]!.status).toBe("to_verify");
  });
  it("signs Smoobu requests and rejects the deprecated secret-less authentication", async () => {
    await expect(readPms("smoobu", { key: "TEST" })).rejects.toThrow(
      "provider_credentials_invalid",
    );
    let headers: Record<string, string> = {};
    await readPms(
      "smoobu",
      { key: "TEST", secret: "SYNTHETIC_SECRET" },
      1,
      undefined,
      async (_url, init) => {
        headers = init?.headers as Record<string, string>;
        return Response.json({ apartments: [{ id: 1, name: "Synthetic" }] });
      },
    );
    expect(headers["X-Signature"]).toMatch(/^[A-Za-z0-9+/]{43}=$/);
    expect(headers["X-Nonce"]).toBeTruthy();
    expect(headers).not.toHaveProperty("Api-Key");
  });
  it("handles access denial and malformed responses without exposing upstream data", async () => {
    await expect(
      readPms(
        "beds24",
        { key: "TEST" },
        1,
        undefined,
        async () => new Response("PRIVATE_UPSTREAM_ERROR", { status: 401 }),
      ),
    ).rejects.toThrow("provider_credentials_invalid");
    await expect(
      readPms("lodgify", { key: "TEST" }, 1, undefined, async () =>
        Response.json({ unexpected: [] }),
      ),
    ).rejects.toThrow("provider_invalid_response");
    await expect(readPms("lodgify", { key: "TEST" }, 1, "../secrets")).rejects.toThrow(
      "provider_invalid_request",
    );
  });
});
