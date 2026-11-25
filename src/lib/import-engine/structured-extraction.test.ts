import { describe, expect, it } from "vitest";
import { extractAccessibleHtml, extractStructuredFields, runUrlImport } from "./url-source.server";
import { authorizedEvaluationSources } from "./authorized-source";
import { publicImportPreview } from "./public-preview";

it.runIf(process.env["NONA_HTML_LIVE_RECIPE"] === "owned")(
  "imports both owned pages by direct HTTP",
  async () => {
    for (const [index, url] of authorizedEvaluationSources.entries()) {
      const start = performance.now();
      const outcome = await runUrlImport({ url, source: "website" });
      expect(outcome).toMatchObject({ ok: true });
      if (!outcome.ok) continue;
      const preview = publicImportPreview(outcome.result, true);
      expect(preview.name).toMatch(index === 0 ? /Villa NONA TEST/ : /Chalet NONA TEST/);
      expect(outcome.result.fields.find((field) => field.key === "kitchen")?.value).toBeTruthy();
      console.info(
        `${preview.name}: ${Math.round(performance.now() - start)} ms; ${outcome.result.fields.filter((field) => field.value).length} fields`,
      );
    }
  },
  35_000,
);

describe("structured listing evidence", () => {
  it("uses explicit Airbnb listing facts and ranks the deduplicated primary photograph first", async () => {
    const url = "https://www.airbnb.fr/rooms/21751466";
    const imageRoot = "https://a0.muscache.com/pictures/hosting";
    const result = await extractAccessibleHtml(
      `<meta property=og:image content="${imageRoot}/cover.jpeg?im_w=1200">
      <script type="application/ld+json">${JSON.stringify({
        "@type": "VacationRental",
        name: "Villa\u00a0Porto-Vecchio",
        description: "La terrasse donne sur le jardin. Le Wi-Fi est disponible.",
        image: [`${imageRoot}/kitchen.jpeg?im_w=480`, `${imageRoot}/cover.jpeg?im_w=480`],
      })}</script>
      <h2>Logement entier : villa - Porto-Vecchio, France</h2><p>8 voyageurs</p>
      <h2>Ce que propose ce logement</h2><div>Four à micro-ondes</div><div>Wifi</div>
      <div>Indisponible : Détecteur de fumée</div><div>Afficher les 48 équipements</div>
      <h2>Sélectionnez la date d'arrivée</h2><div>1 voyageur</div>
      <img src="${imageRoot}/kitchen.jpeg?im_w=800" alt="Cuisine">
      <img src="https://a0.muscache.com/pictures/airbnb-platform-assets/logo.png">`,
      url,
    );
    expect(result.photoCandidates?.map(({ role }) => role)).toEqual(["cover", "kitchen"]);
    expect(result.photoCandidates?.[0]?.url).toBe(`${imageRoot}/cover.jpeg?im_w=1200`);
    const preview = publicImportPreview(result, true);
    expect(preview).toMatchObject({
      name: "Villa Porto-Vecchio",
      capacity: 8,
      wifiAvailable: true,
      text: { description: "La terrasse donne sur le jardin.", equipment: "Four à micro-ondes" },
    });
    expect(preview.arrival).toBeUndefined();
    expect(JSON.stringify(preview)).not.toContain("muscache");
  });

  it("reads public typed embedded JSON and HTML into the existing preview without exposing photo URLs", async () => {
    const url = "https://example.test/lodging";
    const result = await extractAccessibleHtml(
      `<meta property=og:title content="Mauvais titre">
      <meta property=og:image content=/cover.webp>
      <script type="application/json">{"props":{"pageProps":{"listing":{"@type":["Accommodation"],"name":"Villa Olive","description":"Une villa lumineuse avec terrasse.","address":{"addressLocality":"Nice"},"occupancy":{"maxValue":4},"checkinTime":"16:00","amenityFeature":[{"name":"Cuisine équipée","value":true}]}}}}</script>
      <section><h2>Mon départ</h2><p>Départ avant 11:00.</p></section>`,
      url,
    );
    expect(result.propertyName).toBe("Villa Olive");
    expect(result.photoCandidates).toEqual([
      { url: "https://example.test/cover.webp", role: "cover", label: "" },
    ]);
    expect(result.photoRightsConfirmed).toBe(false);
    const preview = publicImportPreview(result, true);
    expect(preview).toMatchObject({
      name: "Villa Olive",
      locality: "Nice",
      capacity: 4,
      arrival: "16:00",
      amenities: ["kitchen"],
      text: { description: "Une villa lumineuse avec terrasse." },
    });
    expect(JSON.stringify(preview)).not.toContain("cover.webp");
  });
  it("does not import explicitly unavailable JSON-LD amenities", () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      "@type": "VacationRental",
      name: "Synthetic Villa",
      amenityFeature: [
        { name: "Pool", value: false },
        { name: "Parking", value: "false" },
        { name: "Wi-Fi", value: true },
      ],
    })}</script>`;
    const result = extractStructuredFields(html, "https://synthetic.example.invalid/villa");
    expect(result.fields["equipment"]?.value).toBe("Wi-Fi");
    expect(result.fields["equipment"]?.rawValue).not.toContain("Pool");
    expect(result.fields["address"]).toBeUndefined();
    expect(result.fields["contact"]).toBeUndefined();
  });
});
