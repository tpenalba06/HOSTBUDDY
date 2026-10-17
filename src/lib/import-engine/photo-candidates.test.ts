import { describe, it, expect } from "vitest";
import { propertyPhotoCandidates } from "./photo-candidates";
import { privateAddress } from "./safe-public-fetch";
describe("authorized photo import candidates", () => {
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
