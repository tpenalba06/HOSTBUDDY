import { describe, it, expect } from "vitest";
import { lodgingPhotoCandidates, propertyPhotoCandidates } from "./photo-candidates";
import { lodgingDom } from "./lodging-dom";
import { privateAddress } from "./safe-public-fetch";
describe("authorized photo import candidates", () => {
  it("uses gallery context, responsive sources and declared images without loading decorations", () => {
    const html = `<meta property=og:image content=/cover.webp>
      <img src=/advert.jpg>
      <section class="listing-photos">
        <picture><source srcset="/room.webp?w=640 640w, /room.webp?w=1280 1280w"><img src=/room.webp alt="Chambre double"></picture>
        <img src="/room.webp?w=320" alt="Chambre double">
        <figure><img data-src=/cooking.webp><figcaption>Cuisine</figcaption></figure>
        <img src=/swim.webp alt=Piscine><img src=/garden.webp alt=Terrasse>
        <img src=/lounge.webp alt=Salon><img src=/wash.webp alt="Salle de bain">
        <img src=/bbq.webp alt=Barbecue><img src=/host-logo.webp><img width=32 src=/tiny.webp>
        <img src="https://127.0.0.1/private.webp">
      </section>`;
    const photos = lodgingPhotoCandidates(lodgingDom(html), "https://example.test/room");
    expect(photos.map((photo) => [new URL(photo.url).pathname, photo.role])).toEqual([
      ["/cover.webp", "cover"],
      ["/room.webp", "bedrooms"],
      ["/cooking.webp", "kitchen"],
      ["/swim.webp", "pool"],
      ["/garden.webp", "outdoors"],
      ["/lounge.webp", "living"],
      ["/wash.webp", "bathroom"],
      ["/bbq.webp", "equipment"],
    ]);
    expect(photos[1]?.url).toContain("w=1280");
  });
  it("keeps a bounded property gallery with more than eight photos, without copying files", () => {
    const photos = Array.from(
      { length: 45 },
      (_, i) => `https://example.invalid/property/${i}.webp`,
    );
    const html = `<script type="application/ld+json">${JSON.stringify({ "@type": "VacationRental", image: [...photos, photos[0]] })}</script>`;
    expect(propertyPhotoCandidates(html, "https://example.invalid/property")).toEqual(
      photos.slice(0, 30),
    );
  });
  it("extracts and deduplicates property metadata images, excluding arbitrary page imagery", () => {
    const html = `<script type="application/ld+json">{"@type":"VacationRental","image":["/villa.jpg",{"url":"https://cdn.test/2.webp"}]}</script><meta content="/villa.jpg" property="og:image"><img src="/advert.jpg">`;
    expect(propertyPhotoCandidates(html, "https://example.test/room")).toEqual([
      "https://example.test/villa.jpg",
      "https://cdn.test/2.webp",
    ]);
  });
  it("rejects unsafe schemes, credentials and malformed JSON", () => {
    expect(
      propertyPhotoCandidates(
        `<script type="application/ld+json">broken</script><meta property="og:image" content="javascript:alert(1)"><meta property="og:image" content="https://user:secret@example.test/a">`,
        "https://example.test",
      ),
    ).toEqual([]);
  });
  it("blocks loopback, LAN, link local, IPv6 and cloud metadata destinations", () => {
    for (const host of [
      "127.0.0.1",
      "10.2.3.4",
      "172.16.0.4",
      "192.168.1.1",
      "169.254.169.254",
      "::1",
      "fd00::1",
      "fe80::1",
      "::ffff:127.0.0.1",
      "localhost",
      "a.internal",
    ])
      expect(privateAddress(host)).toBe(true);
    expect(privateAddress("8.8.8.8")).toBe(false);
  });
});
