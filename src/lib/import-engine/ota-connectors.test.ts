import { describe, expect, it, vi } from "vitest";
import { otaListing } from "./ota-listing";
import { importAuthorizedEvaluationUrl } from "./firecrawl.server";
import { publicPreviewSchema } from "./public-preview";

const locales = [
  ["fr", "Ce que propose ce logement", "Équipements de l'établissement", "Cuisine équipée"],
  ["com", "What this place offers", "Facilities of", "Kitchen with oven"],
  ["de", "Was diese Unterkunft bietet", "Ausstattung von", "Küche mit Backofen"],
  ["es", "Qué ofrece este lugar", "Servicios de", "Cocina equipada"],
  ["it", "Cosa troverai", "Servizi di", "Cucina attrezzata"],
  ["pt", "O que este espaço oferece", "Comodidades do", "Cozinha equipada"],
] as const;
const env = { VERCEL_ENV: "preview", VITE_SUPABASE_PROJECT_ID: "mhhtnqfdkyudwyqlmnce" };

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
