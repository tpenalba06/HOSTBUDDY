import { it, expect } from "vitest";
import { writeFile } from "node:fs/promises";
import { importAuthorizedEvaluationUrl } from "./firecrawl.server";
import { otaReferenceSources, otaTestAllowed } from "./ota-test-policy";

it("closes the experiment outside bounded TEST", () => {
  const now = Date.parse("2026-11-20T13:00:00Z");
  const env = {
    VERCEL_ENV: "preview",
    VITE_SUPABASE_PROJECT_ID: "mhhtnqfdkyudwyqlmnce",
    NONA_OTA_PUBLIC_TEST_UNTIL: "2026-11-21T13:00:00Z",
  };
  expect(otaTestAllowed(otaReferenceSources[0], env, now)).toBe(true);
  for (const changed of [
    { VERCEL_ENV: "production" },
    { VITE_SUPABASE_PROJECT_ID: "other" },
    { NONA_OTA_PUBLIC_TEST_UNTIL: "" },
    { NONA_OTA_PUBLIC_TEST_UNTIL: "2026-11-19T13:00:00Z" },
  ])
    expect(otaTestAllowed(otaReferenceSources[0], { ...env, ...changed }, now)).toBe(false);
  expect(otaTestAllowed("https://www.airbnb.fr/rooms/another", env, now)).toBe(false);
});

it.runIf(process.env["NONA_OTA_LIVE_RECIPE"] === "two-references-keyless-no-cache")(
  "measures actual reference sources without saving source content",
  async () => {
    const results = [];
    for (const source of otaReferenceSources) {
      const outcome = await importAuthorizedEvaluationUrl(source, {
        testEnvironment: true,
        experimentalPublic: true,
      });
      results.push({
        source,
        status: outcome.status,
        ...("diagnostics" in outcome ? { diagnostics: outcome.diagnostics } : {}),
        ...("preview" in outcome
          ? {
              hasName: !!outcome.preview.name,
              hasLocality: !!outcome.preview.locality,
              capacity: outcome.preview.capacity,
              arrival: outcome.preview.arrival,
              departure: outcome.preview.departure,
              wifiAvailable: outcome.preview.wifiAvailable,
              amenities: outcome.preview.amenities,
              illustration: outcome.preview.illustration,
              sections: Object.keys(outcome.preview.text ?? {}),
            }
          : {}),
      });
    }
    if (process.env["NONA_OTA_LIVE_RESULT"])
      await writeFile(process.env["NONA_OTA_LIVE_RESULT"], JSON.stringify(results, null, 2));
    expect(results).toHaveLength(2);
  },
  60000,
);
