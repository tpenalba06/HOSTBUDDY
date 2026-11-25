import { describe, it, expect, vi } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { importAuthorizedEvaluationUrl } from "./firecrawl.server";
import { authorizedEvaluationSources } from "./authorized-source";

describe("bounded Firecrawl evaluation transport (mocked unit tests)", () => {
  it("projects explicit policy ranges and public Wi-Fi without FAQ contamination (synthetic)", async () => {
    const url = "https://www.booking.com/hotel/gr/vallais-villa.fr.html";
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            markdown:
              "# Hôtel TEST\n## Équipements de l'établissement TEST\nTélévision\nConnexion Wi-Fi gratuite\n## Règles de la maison\n**Arrivée**\nDe 14:00 à 21:00\n**Départ**\nDe 08:00 à 11:00\n## FAQ sur l'établissement TEST\nÉquipements imaginaires",
            metadata: { statusCode: 200, sourceURL: url, ogDescription: "Un hôtel lumineux." },
          },
        }),
        { headers: { "content-type": "application/json" } },
      ),
    );
    const result = await importAuthorizedEvaluationUrl(url, {
      testEnvironment: true,
      env: {
        VERCEL_ENV: "preview",
        VITE_SUPABASE_PROJECT_ID: "mhhtnqfdkyudwyqlmnce",
        NONA_BOOKING_AUTHORIZED_ENDPOINT: "https://data.example.com/import",
        NONA_BOOKING_AUTHORIZED_TOKEN: "synthetic-token",
      },
      fetcher,
    });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") throw Error("Expected synthetic projection");
    expect(result.preview.text?.arrival).toBe("Arrivée : De 14:00 à 21:00");
    expect(result.preview.text?.departure).toBe("Départ : De 08:00 à 11:00");
    expect(result.preview.wifiAvailable).toBe(true);
    expect(JSON.stringify(result.preview)).not.toContain("imaginaires");
  });
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
        formats: ["markdown", "html", "images"],
        storeInCache: false,
        maxAge: 0,
      });
    },
  );
  it("feeds fetched text into the existing engine, masking credentials and using Smart Fill", async () => {
    const html = readFileSync("docs/fixtures/nona-villa-test.html", "utf8");
    const markdown = html
      .replace(/<head>[\s\S]*?<\/head>/, " ")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const fetcher = vi.fn().mockResolvedValue(
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
    expect(result.preview.capacity).toBe(4);
    expect(result.preview.wifiAvailable).toBe(true);
    expect(JSON.stringify(result.preview)).not.toContain("<p>");
    expect(result.preview.illustration).toBeTruthy();
    expect(JSON.stringify(result)).not.toContain("SECRET_FICTIF");
    expect(result.provenance.photosReused).toBe(0);
  });
  it("rejects successful provider envelopes containing a blocked target page", async () => {
    const fetcher = vi.fn().mockResolvedValue(
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
