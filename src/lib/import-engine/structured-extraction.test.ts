import { describe, expect, it } from "vitest";
import { extractStructuredFields } from "./url-source.server";

describe("structured listing evidence", () => {
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
