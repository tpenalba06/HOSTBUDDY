import { describe, expect, it, vi } from "vitest";
import { resolvePublishedMedia } from "./published-media.server";
import type { PublicGuide } from "./public-guide.functions";
vi.mock("@/lib/operational-events.server", () => ({ reportOperationalEvent: vi.fn() }));
import { reportOperationalEvent } from "@/lib/operational-events.server";
const property = "00000000-0000-4000-8000-000000000002";
const photo = `org/${property}/welcome/cover.webp`;
const service = `org/${property}/services/service.webp`;
const fixture = (): PublicGuide => ({
  id: property,
  name: "TEST",
  originalLocale: "fr",
  sections: [
    {
      id: "welcome",
      key: "welcome",
      title: "Bienvenue",
      content: { items: [{ label: "", text: "Published text" }] },
      media: [{ id: "cover", type: "image", path: photo, mimeType: "image/webp", sortOrder: 0 }],
    },
  ],
  services: [
    {
      id: "service",
      name: "Breakfast",
      description: "",
      price: 10,
      pricingType: "fixed",
      imagePath: service,
    },
  ],
});
describe("published private media resolution", () => {
  it("signs independent service images, even when there is no section media", async () => {
    const guide = fixture();
    guide.sections[0]!.media = [];
    const sign = vi.fn(async (paths: string[]) => ({
      data: paths.map((path) => ({
        path,
        signedUrl: `https://storage.test/${path}?token=fixture`,
      })),
    }));
    const output = await resolvePublishedMedia(guide, sign);
    expect(sign).toHaveBeenCalledExactlyOnceWith([service]);
    expect(output.services?.[0]!.imagePath).toContain(service);
    expect(guide.services?.[0]!.imagePath).toBe(service);
  });
  it("deduplicates paths in one batch and preserves section order and video metadata", async () => {
    const guide = fixture();
    guide.services![0]!.imagePath = photo;
    guide.sections[0]!.content.mediaMetadata = { cover: { revision: "saved-revision" } } as never;
    const sign = vi.fn(async () => ({
      data: [{ path: photo, signedUrl: "https://storage.test/cover" }],
    }));
    const output = await resolvePublishedMedia(guide, sign);
    expect(sign).toHaveBeenCalledExactlyOnceWith([photo]);
    expect(output.sections.map((s) => s.id)).toEqual(guide.sections.map((s) => s.id));
    expect(output.sections[0]!.media![0]!.revision).toBe("saved-revision");
    expect(output.sections[0]!.media![0]!.url).toBe(output.services![0]!.imagePath);
  });
  it("never signs another property, encoded traversal or absolute URLs", async () => {
    const guide = fixture();
    guide.services![0]!.imagePath = "org/other-property/section/private.webp";
    guide.sections[0]!.media = [
      "https://private.test/a",
      `org/${property}/section/%2e%2e`,
      `org/${property}/../a.webp`,
    ].map((path, i) => ({
      id: String(i),
      type: "image",
      path,
      mimeType: "image/webp",
      sortOrder: i,
    }));
    const sign = vi.fn();
    const output = await resolvePublishedMedia(guide, sign);
    expect(sign).not.toHaveBeenCalled();
    expect(output.sections[0]!.media!.every((m) => m.url === null)).toBe(true);
    expect(output.services![0]!.imagePath).toBeNull();
  });
  it("keeps published text available on Storage failure and emits a safe event", async () => {
    const guide = fixture();
    const output = await resolvePublishedMedia(guide, async () => {
      throw Error("token=private");
    });
    expect(output.sections[0]!.content.items).toEqual(guide.sections[0]!.content.items);
    expect(output.sections[0]!.media![0]!.url).toBeNull();
    expect(reportOperationalEvent).toHaveBeenCalledWith("guide_media_signing_failed");
  });
});
