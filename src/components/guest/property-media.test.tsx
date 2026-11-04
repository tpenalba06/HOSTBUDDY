import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PropertyMediaGallery } from "./PropertyMediaGallery";
import {
  detectAccommodationMood,
  offlineMediaBudget,
  resolvePropertyMedia,
  type PropertyMedia,
} from "./property-media";
import { guideCover } from "./guide-model";
import type { PublicSection } from "@/lib/data/public-guide.functions";
const photo = (id: string): PropertyMedia => ({
  id,
  path: id,
  type: "image",
  url: `https://media.example/${id}`,
  mimeType: "image/webp",
  sortOrder: 0,
  sizeBytes: 1000,
});
const welcome = (media: PropertyMedia[]): PublicSection => ({
  id: "welcome",
  key: "welcome",
  title: "Bienvenue",
  content: {
    propertyMedia: {
      version: 1,
      coverId: "b",
      galleryIds: ["b", "missing", "b"],
      fallback: { assetId: "ambient", mood: "villa-sea" },
    },
  },
  media,
});
describe("property media compatibility and readiness", () => {
  it("prefers an explicitly selected real photo and retains all existing photos", () => {
    const section = welcome([photo("a"), photo("b")]);
    const result = resolvePropertyMedia(
      [section],
      [
        {
          id: "ambient",
          mood: "villa-sea",
          url: "/ambient.webp",
          alt: "Ambiance",
          licenseReference: "approved",
        },
      ],
    );
    expect(result.cover?.id).toBe("b");
    expect(result.gallery.map((item) => item.id)).toEqual(["b", "a"]);
    expect(result.fallback).toBeUndefined();
    expect(
      guideCover({
        id: "real",
        name: "Real",
        originalLocale: "fr",
        sections: [section],
        coverUrl: "/old-fallback.webp",
      }),
    ).toBe(photo("b").url);
  });
  it("ignores missing cover references and unlicensed ambience", () => {
    expect(resolvePropertyMedia([welcome([photo("a")])]).cover?.id).toBe("a");
    expect(
      resolvePropertyMedia(
        [welcome([])],
        [{ id: "ambient", mood: "villa-sea", url: "/ambient.webp", alt: "", licenseReference: "" }],
      ).fallback,
    ).toBeUndefined();
  });
  it("keeps legacy videos playable without pretending that they are optimized", () => {
    const video: PropertyMedia = { ...photo("video"), type: "video", mimeType: "video/mp4" };
    expect(resolvePropertyMedia([welcome([video])]).video?.id).toBe("video");
    expect(offlineMediaBudget([video]).ready).toBe(false);
    expect(
      resolvePropertyMedia([welcome([{ ...video, processingStatus: "processing" }])]).video,
    ).toBeUndefined();
    const html = renderToStaticMarkup(<PropertyMediaGallery sections={[welcome([video])]} />);
    expect(html).toContain("<video");
    expect(html).toContain('preload="metadata"');
    expect(html).toContain("playsInline");
    expect(html).not.toContain("autoPlay");
  });
  it("rejects incomplete metadata, oversized, invalid or unprocessed offline videos", () => {
    const video: PropertyMedia = {
      ...photo("video"),
      type: "video",
      processingStatus: "ready",
      durationSeconds: 90,
      sizeBytes: 20 * 1024 * 1024,
    };
    expect(offlineMediaBudget([photo("cover"), video]).ready).toBe(true);
    for (const change of [
      { durationSeconds: 91 },
      { durationSeconds: NaN },
      { durationSeconds: -1 },
      { sizeBytes: 21 * 1024 * 1024 },
      { processingStatus: "processing" as const },
    ])
      expect(offlineMediaBudget([{ ...video, ...change }]).ready).toBe(false);
    expect(offlineMediaBudget([{ ...photo("x"), sizeBytes: 0 }]).ready).toBe(false);
    expect(offlineMediaBudget(Array.from({ length: 3 }, () => video)).ready).toBe(false);
  });
  it("classifies clear text but does not guess ambiguous or unknown accommodation", () => {
    expect(detectAccommodationMood("Villa avec vue mer")).toBe("villa-sea");
    expect(detectAccommodationMood("Hôtel en centre ville")).toBe("urban-hotel");
    expect(detectAccommodationMood("Une tente glamping de luxe")).toBe("glamping");
    expect(detectAccommodationMood("Appartement dans un chalet")).toBeUndefined();
    expect(detectAccommodationMood("Bienvenue pour votre séjour")).toBeUndefined();
  });
  it("adds no sample media to an empty real guide", () => {
    expect(renderToStaticMarkup(<PropertyMediaGallery sections={[welcome([])]} />)).toBe("");
  });
});
