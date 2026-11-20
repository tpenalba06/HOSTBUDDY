import { describe, it, expect, vi } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { importAuthorizedEvaluationUrl } from "./firecrawl.server";
import { authorizedEvaluationSources } from "./authorized-source";

describe("bounded Firecrawl evaluation transport (mocked unit tests)", () => {
  it("never sends unauthorized platform, sibling path or production requests", async () => {
    const fetcher = vi.fn();
    for (const url of [
      "https://www.airbnb.fr/rooms/1086157072408105944",
      "https://www.booking.com/hotel/gr/vallais-villa.fr.html",
      authorizedEvaluationSources[0] + "?token=private",
      "http://localhost/",
    ]) {
      expect(
        (await importAuthorizedEvaluationUrl(url, { testEnvironment: true, fetcher })).status,
      ).toBe("authorization_required");
    }
    expect(
      (
        await importAuthorizedEvaluationUrl(authorizedEvaluationSources[0], {
          testEnvironment: false,
          fetcher,
        })
      ).status,
    ).toBe("authorization_required");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([402, 403, 429, 500])(
    "stops on HTTP %s with no retry or paid fallback",
    async (status) => {
      const fetcher = vi.fn().mockResolvedValue(new Response(null, { status }));
      const result = await importAuthorizedEvaluationUrl(authorizedEvaluationSources[0], {
        testEnvironment: true,
        fetcher,
      });
      expect(result.status).not.toBe("ok");
      expect(fetcher).toHaveBeenCalledTimes(1);
      const [, init] = fetcher.mock.calls[0]!;
      expect(init.headers).toEqual({ "content-type": "application/json" });
      expect(JSON.parse(init.body)).toMatchObject({
        proxy: "basic",
        formats: ["markdown", "html"],
      });
    },
  );
  it("feeds fetched text into the existing engine, masking credentials and using Smart Fill", async () => {
    const html = readFileSync("docs/fixtures/nona-villa-test.html", "utf8");
    const markdown = html.replace(/<head>[\s\S]*?<\/head>/, " ").replace(/<[^>]+>/g, "\n");
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              markdown,
              html,
              metadata: { statusCode: 200, sourceURL: authorizedEvaluationSources[0] },
            },
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );
    const result = await importAuthorizedEvaluationUrl(authorizedEvaluationSources[0], {
      testEnvironment: true,
      fetcher,
    });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") throw Error("expected preview");
    expect(result.preview.name).toContain("TEST fictive");
    expect(result.preview.text?.transport).toContain("gare");
    expect(result.preview.text?.kitchen).toContain("four");
    expect(result.preview.illustration).toBeTruthy();
    expect(JSON.stringify(result)).not.toContain("SECRET_FICTIF");
    expect(result.provenance.photosReused).toBe(0);
  });
  it("rejects successful provider envelopes containing a blocked target page", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { markdown: "CAPTCHA", metadata: { statusCode: 403 } },
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );
    expect(
      (
        await importAuthorizedEvaluationUrl(authorizedEvaluationSources[0], {
          testEnvironment: true,
          fetcher,
        })
      ).status,
    ).toBe("blocked");
  });
});

it.runIf(process.env["NONA_FIRECRAWL_LIVE_RECIPE"] === "owned-keyless-two-requests")(
  "real keyless requests to two owned fictional pages (no platform request)",
  async () => {
    const results = [];
    for (const url of authorizedEvaluationSources) {
      const start = Date.now();
      const result = await importAuthorizedEvaluationUrl(url, { testEnvironment: true });
      results.push({
        source: url,
        status: result.status,
        latencyMs: Date.now() - start,
        ...(result.status === "ok"
          ? {
              name: result.preview.name,
              textSections: Object.keys(result.preview.text ?? {}),
              provenance: result.provenance,
            }
          : {}),
      });
    }
    if (process.env["NONA_FIRECRAWL_LIVE_RESULT"])
      writeFileSync(process.env["NONA_FIRECRAWL_LIVE_RESULT"], JSON.stringify(results, null, 2));
    expect(results.map((r) => r.status)).toEqual(["ok", "ok"]);
  },
  60_000,
);
