import { describe, expect, it, vi } from "vitest";
import { otaListing } from "./ota-listing";
import { importAuthorizedEvaluationUrl } from "./firecrawl.server";
import { publicPreviewSchema } from "./public-preview";
import * as urlSource from "./url-source.server";
import * as network from "./safe-public-fetch";

const locales = [
  ["fr", "Ce que propose ce logement", "Équipements de l'établissement", "Cuisine équipée"],
  ["com", "What this place offers", "Facilities of", "Kitchen with oven"],
  ["de", "Was diese Unterkunft bietet", "Ausstattung von", "Küche mit Backofen"],
  ["es", "Qué ofrece este lugar", "Servicios de", "Cocina equipada"],
  ["it", "Cosa troverai", "Servizi di", "Cucina attrezzata"],
  ["pt", "O que este espaço oferece", "Comodidades do", "Cozinha equipada"],
] as const;
const env = { VERCEL_ENV: "preview", VITE_SUPABASE_PROJECT_ID: "mhhtnqfdkyudwyqlmnce" };

it("uses keyless Firecrawl for new listings only after public access checks", async () => {
  const policy = vi.spyOn(urlSource, "robotsAllows").mockResolvedValue(true);
  const access = vi.spyOn(network, "safePublicFetch");
  const url = "https://www.booking.com/hotel/fr/test-public.fr.html";
  const settings = {
    ...env,
    NONA_BOOKING_FIRECRAWL_TEST_UNTIL: new Date(Date.now() + 60_000).toISOString(),
  };
  const input = { testEnvironment: true, env: settings };
  const markdown = "# Hôtel Test\n## Équipements de l'établissement\nCuisine équipée\nTélévision";
  const provider = vi.fn(async () =>
    Response.json({
      success: true,
      data: {
        markdown,
        metadata: {
          sourceURL: url,
          statusCode: 200,
          ogDescription: "Appartement lumineux près du port.",
        },
      },
    }),
  );
  const checkedPage = (body: string) => ({
    url,
    buffer: new TextEncoder().encode(body),
    response: new Response(body, { headers: { "content-type": "text/html" } }),
  });
  try {
    policy.mockResolvedValueOnce(false);
    expect((await importAuthorizedEvaluationUrl(url, { ...input, fetcher: provider })).status).toBe(
      "blocked",
    );
    expect(access).not.toHaveBeenCalled();
    access.mockResolvedValueOnce(
      checkedPage("<h1>JavaScript is disabled</h1><p>Verify that you're not a robot</p>"),
    );
    expect((await importAuthorizedEvaluationUrl(url, { ...input, fetcher: provider })).status).toBe(
      "blocked",
    );
    expect(provider).not.toHaveBeenCalled();
    access.mockResolvedValueOnce(checkedPage("<h1>Hôtel Test</h1><p>Cuisine équipée</p>"));
    const result = await importAuthorizedEvaluationUrl(`${url}?sid=fictif`, {
      ...input,
      fetcher: provider,
    });
    expect(result.status).toBe("ok");
    expect(provider).toHaveBeenCalledTimes(1);
    expect(provider).toHaveBeenCalledWith(
      "https://api.firecrawl.dev/v2/scrape",
      expect.objectContaining({
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url,
          formats: ["markdown", "html", "images"],
          proxy: "basic",
          timeout: 15000,
          storeInCache: false,
          maxAge: 0,
        }),
      }),
    );
    expect(
      (
        await importAuthorizedEvaluationUrl(url, {
          ...input,
          env: { ...settings, VERCEL_ENV: "production" },
          fetcher: provider,
        })
      ).status,
    ).toBe("authorization_required");
    expect(provider).toHaveBeenCalledTimes(1);
  } finally {
    access.mockRestore();
    policy.mockRestore();
  }
});

describe.each(["airbnb", "booking"] as const)("%s authorized adapter", (platform) => {
  const prefix = `NONA_${platform.toUpperCase()}_AUTHORIZED`;
  const endpoint = "https://data.example.com/import";
  const configured = {
    ...env,
    [`${prefix}_ENDPOINT`]: endpoint,
    [`${prefix}_TOKEN`]: "test-token",
  };
  const times: number[] = [];
  it("projects 20 distinct synthetic listings across six languages", async () => {
    let correct = 0;
    for (let index = 0; index < 20; index++) {
      const [locale, airbnbHeading, bookingHeading, amenity] = locales[index % locales.length]!;
      const url =
        platform === "airbnb"
          ? `https://www.airbnb.${locale}/rooms/${700001 + index}`
          : `https://www.booking.com/hotel/fr/test-lodge-${index}.${locale === "com" ? "en-gb" : locale}.html`;
      const title = `Test Lodge ${index}`;
      const heading = platform === "airbnb" ? airbnbHeading : bookingHeading;
      const fetcher = vi.fn(async () =>
        Response.json({
          success: true,
          data: {
            markdown: `# ${title}\n## ${heading}\n${amenity}\nTélévision`,
            metadata: {
              statusCode: 200,
              sourceURL: url,
              title: `${title}, Lisbonne (TEST)`,
              ogDescription: "Appartement lumineux près du port.",
            },
          },
        }),
      );
      const start = performance.now();
      const result = await importAuthorizedEvaluationUrl(
        `${url}?sid=fictif&checkin=2026-12-01#map`,
        {
          testEnvironment: true,
          env: configured,
          fetcher,
        },
      );
      times.push(performance.now() - start);
      expect(fetcher).toHaveBeenCalledWith(
        endpoint,
        expect.objectContaining({
          body: JSON.stringify({ url, platform }),
          redirect: "error",
        }),
      );
      expect(result.status).toBe("ok");
      if (result.status !== "ok") continue;
      const preview = publicPreviewSchema.parse(result.preview);
      expect(preview.name).toBe(title);
      expect(preview.text?.equipment).toContain(amenity);
      expect(preview.text?.description).toContain("Appartement lumineux");
      expect(result.provenance.photosReused).toBe(0);
      correct++;
    }
    expect(correct).toBe(20);
    times.sort((a, b) => a - b);
    console.info(
      `${platform} synthetic: ${correct}/20; local p50=${times[9]!.toFixed(2)}ms, p95=${times[18]!.toFixed(2)}ms`,
    );
  });
  it("does not fetch without authorization, outside TEST or through an unsafe endpoint", async () => {
    const url =
      platform === "airbnb"
        ? "https://www.airbnb.de/rooms/700001"
        : "https://www.booking.com/hotel/de/test.de.html";
    const fetcher = vi.fn();
    for (const settings of [
      env,
      { ...configured, VERCEL_ENV: "production" },
      { ...configured, [`${prefix}_ENDPOINT`]: "https://127.0.0.1/data" },
    ]) {
      expect(
        (
          await importAuthorizedEvaluationUrl(url, {
            testEnvironment: true,
            env: settings,
            fetcher,
          })
        ).status,
      ).toBe("authorization_required");
    }
    expect(fetcher).not.toHaveBeenCalled();
  });
});

it.each([
  "https://www.airbnb.fr.example.org/rooms/12345",
  "https://www.booking.com.example.org/hotel/fr/lodge.fr.html",
  "https://www.airbnb.fake/rooms/12345",
  "http://www.airbnb.fr/rooms/12345",
  "https://user@www.booking.com/hotel/fr/lodge.fr.html",
  "https://www.booking.com:4433/hotel/fr/lodge.fr.html",
  "https://www.airbnb.fr/rooms/12345/private",
  "https://www.booking.com/searchresults.fr.html",
])("rejects non-listing URL %s", (url) => expect(otaListing(url)).toBeNull());
