import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { runUrlImport } from "../../src/lib/import-engine/url-source.server";
import { safePublicFetch } from "../../src/lib/import-engine/safe-public-fetch";
import { robotsTextAllows } from "../../src/lib/import-engine/robots-policy";

// Opt-in real HTTP test. No DNS/fetch/auth mocks and no hosted DB mutations.
// httpbin is a public HTTP testing service; all listing data is fictitious.
const network = describe.skipIf(process.env["HOSTBUDDY_NETWORK_IMPORTS"] !== "1");
network("authorized public network extraction (not authenticated Storage/publication)", () => {
  it("fetches robots, fictitious JSON-LD, provenance and real photo bytes", async () => {
    const listing = {
      "@context": "https://schema.org",
      "@type": "VacationRental",
      name: "HOSTBUDDY TEST réseau",
      description: "Logement fictif réservé aux tests techniques.",
      address: "1 voie fictive, Ville TEST",
      maximumAttendeeCapacity: 4,
      checkinTime: "16:00",
      checkoutTime: "10:00",
      image: ["https://httpbin.org/image/jpeg"],
    };
    const html = `<html><head><script type="application/ld+json">${JSON.stringify(listing)}</script></head><body>Source fictive HostBuddy</body></html>`;
    // httpbin expects padded standard Base64, not the unpadded URL-safe variant.
    const url = `https://httpbin.org/base64/${encodeURIComponent(Buffer.from(html).toString("base64"))}`;
    const outcome = await runUrlImport({ url, source: "website" });
    if (!outcome.ok) throw Error(`network_import_${outcome.reason}`);
    expect(outcome.result.propertyName).toBe(listing.name);
    expect(outcome.result.fields.find((field) => field.key === "address")).toMatchObject({
      status: "found",
      value: listing.address,
    });
    expect(outcome.result.fields.find((field) => field.key === "address")?.rawValue).toContain(
      "JSON-LD",
    );
    expect(outcome.result.photos).toEqual(listing.image);
    const imageUrl = new URL(listing.image[0]!);
    const robots = await safePublicFetch(
      `${imageUrl.origin}/robots.txt`,
      { headers: { "user-agent": "HostBuddyBot/1.0" } },
      256_000,
    );
    expect(
      robots.response.status === 404 ||
        robotsTextAllows(new TextDecoder().decode(robots.buffer), imageUrl),
    ).toBe(true);
    const photo = await safePublicFetch(
      imageUrl.href,
      { headers: { "user-agent": "HostBuddyBot/1.0" } },
      5 * 1024 * 1024,
    );
    expect(photo.response.ok).toBe(true);
    expect(photo.response.headers.get("content-type")).toContain("image/jpeg");
    expect([...photo.buffer.slice(0, 3)]).toEqual([255, 216, 255]);
    expect(photo.buffer.byteLength).toBeLessThan(100_000);
    console.log(
      JSON.stringify({
        scope: "real-public-network-extraction-and-photo-only",
        extractedFields: outcome.result.fields.filter((f) => f.status === "found").length,
        photoBytes: photo.buffer.byteLength,
        privateStorageAndPublication: "not-tested-no-manager-session",
      }),
    );
  }, 60_000);
});

network("provider availability without bypass", () => {
  it("records robots permission and actual importer outcome once per provider", async () => {
    const results = [];
    for (const [source, url] of [
      ["airbnb", "https://www.airbnb.fr/rooms/14749668"],
      ["booking", "https://www.booking.com/hotel/fr/negresco.html"],
      ["sunver", "https://app.sunver.app/fr/guest/villa-dolce-vecchia"],
    ] as const) {
      let robots: { status?: number; allowed?: boolean; networkUnavailable?: boolean };
      try {
        const target = new URL(url);
        const fetched = await safePublicFetch(
          `${target.origin}/robots.txt`,
          { headers: { "user-agent": "HostBuddyBot/1.0" }, signal: AbortSignal.timeout(5000) },
          256_000,
        );
        robots = {
          status: fetched.response.status,
          allowed:
            fetched.response.status === 404 ||
            (fetched.response.ok &&
              !fetched.response.headers.get("content-type")?.includes("text/html") &&
              robotsTextAllows(new TextDecoder().decode(fetched.buffer), target)),
        };
      } catch {
        robots = { networkUnavailable: true };
      }
      const outcome = await runUrlImport({ source, url });
      results.push({
        source,
        url,
        robots,
        ok: outcome.ok,
        ...(outcome.ok
          ? { photoCandidates: outcome.result.photos?.length ?? 0 }
          : { reason: outcome.reason }),
        privateStorageAndPublication: "not-tested-no-manager-session",
      });
    }
    const proof = { scope: "real-network-read-only-no-captcha-or-proxy-bypass", results };
    console.log(JSON.stringify(proof));
    if (process.env["HOSTBUDDY_NETWORK_EVIDENCE"])
      writeFileSync(
        process.env["HOSTBUDDY_NETWORK_EVIDENCE"]!,
        JSON.stringify(proof, null, 2) + "\n",
      );
    expect(results).toHaveLength(3);
  }, 90_000);
});
