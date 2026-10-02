import { describe, expect, it } from "vitest";
import { getImportUrlIssue, normalizeUrl, pickAdapter } from "./url-adapters";

describe("Airbnb URL normalization", () => {
  it("converts the exact Angoulême pinned-search URL into the selected room URL", () => {
    const input =
      "https://www.airbnb.fr/s/Angoul%C3%AAme/homes?pinned_listings%5B%5D=1766783017368548898&pinned_reason=HOMEPAGE&search_type=HOMEPAGE_CAROUSEL_CLICK&place_id=ChIJmcQrA4Ut_kcR8MDuYJLTBQQ&query=Angoul%C3%AAme&refinement_paths=%2Fhomes&flexible_trip_lengths=weekend_trip&date_picker_type=FLEXIBLE_DATES&photo_id=2815124322";

    expect(getImportUrlIssue(input)).toBeNull();
    expect(normalizeUrl(input)).toBe("https://www.airbnb.fr/rooms/1766783017368548898");
    expect(pickAdapter(normalizeUrl(input)! ).source).toBe("airbnb");
  });

  it("also accepts markdown-escaped ampersands from copied links", () => {
    const input =
      "https://www.airbnb.fr/s/Angoul%C3%AAme/homes?pinned_listings%5B%5D=1766783017368548898\\&pinned_reason=HOMEPAGE\\&search_type=HOMEPAGE_CAROUSEL_CLICK";

    expect(normalizeUrl(input)).toBe("https://www.airbnb.fr/rooms/1766783017368548898");
  });

  it("strips tracking parameters from direct Airbnb room links", () => {
    expect(
      normalizeUrl(
        "https://www.airbnb.fr/rooms/21575215?search_mode=regular_search&adults=1&photo_id=405434396",
      ),
    ).toBe("https://www.airbnb.fr/rooms/21575215");
  });

  it("rejects Airbnb search pages when no single selected listing can be identified", () => {
    const input = "https://www.airbnb.fr/s/Angoul%C3%AAme/homes?query=Angoul%C3%AAme";
    expect(getImportUrlIssue(input)).toBe("airbnb_search_without_single_listing");
  });

  it("rejects Airbnb search pages with several pinned listings instead of guessing", () => {
    const input =
      "https://www.airbnb.fr/s/Angoul%C3%AAme/homes?pinned_listings%5B%5D=111111&pinned_listings%5B%5D=222222";
    expect(getImportUrlIssue(input)).toBe("airbnb_search_without_single_listing");
  });
});
