import { describe, expect, it } from "vitest";
import { lighthouseSummary } from "./lighthouse-summary.mjs";
describe("safe Lighthouse evidence", () => {
  it("does not publish signed URLs, page content or screenshot data", () => {
    const output = lighthouseSummary({
      lighthouseVersion: "fixture",
      configSettings: { throttlingMethod: "devtools" },
      categories: { performance: { score: 0.8 } },
      audits: {
        "network-requests": {
          id: "network-requests",
          score: null,
          details: {
            items: [
              {
                url: "https://storage.test/storage/v1/object/sign/file?token=PRIVATE",
                resourceType: "Image",
                transferSize: 123,
                resourceSize: 456,
                networkRequestTime: 1,
                networkEndTime: 101,
                statusCode: 200,
                finished: true,
              },
            ],
          },
        },
        "lcp-breakdown-insight": {
          id: "lcp-breakdown-insight",
          score: 0,
          details: {
            items: [
              {
                duration: 1234,
                subpart: "resourceLoadDuration",
                url: "PRIVATE",
                node: { boundingRect: { width: 100 }, snippet: "PRIVATE" },
              },
            ],
            headers: { Authorization: "PRIVATE" },
          },
        },
        secret: {
          id: "network",
          score: 0,
          details: { url: "https://storage.test/object?token=PRIVATE", screenshot: "PRIVATE" },
        },
      },
    });
    expect(output.diagnostics["lcp-breakdown-insight"]).toEqual({
      items: [{ duration: 1234, subpart: "resourceLoadDuration" }],
    });
    expect(output.network.SignedImages).toEqual({
      count: 1,
      transferBytes: 123,
      decodedBytes: 456,
      maxNetworkMs: 100,
      failed: 0,
      cacheHits: 0,
    });
    expect(output.scores.performance).toBe(80);
    expect(JSON.stringify(output)).not.toContain("PRIVATE");
  });
  it("never treats a failed page load or missing score as proof", () => {
    expect(() =>
      lighthouseSummary({ runtimeError: { code: "FAILED_DOCUMENT_REQUEST" } }),
    ).toThrow();
    expect(() => lighthouseSummary({ categories: { performance: { score: null } } })).toThrow();
  });
});
