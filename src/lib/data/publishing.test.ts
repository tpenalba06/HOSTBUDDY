import { describe, it, expect, vi, beforeEach } from "vitest";
const backend = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: backend }));
vi.mock("@/lib/import-engine/url-import.functions", () => ({ importPropertyPhotos: vi.fn() }));
import { publishProperty, saveGuideSection } from "./properties";
import type { Property, GuideSection } from "./properties";
const property = { id: "p" } as Property;
const section = {
  id: "s",
  property_id: "p",
  section_key: "welcome",
  title: "Bienvenue",
  icon: "👋",
  content: { items: [], propertyMedia: { version: 1, coverId: "old" } },
  is_visible: true,
  cta_label: null,
  sort_order: 0,
  created_at: "",
  updated_at: "",
} as GuideSection;
beforeEach(() => backend.from.mockReset());
describe("publication safety", () => {
  it("coalesces double clicks and leaves existing sections, media and settings intact", async () => {
    let release!: (value: unknown) => void;
    const update = vi.fn(() => ({
      eq: () => ({
        select: () => ({
          single: () =>
            new Promise((resolve) => {
              release = resolve;
            }),
        }),
      }),
    }));
    backend.from.mockImplementation((table) =>
      table === "guide_sections"
        ? {
            select: () => ({
              eq: () => ({ order: async () => ({ data: [section], error: null }) }),
            }),
          }
        : { update },
    );
    const first = publishProperty(property, []);
    const second = publishProperty(property, []);
    expect(first).toBe(second);
    await Promise.resolve();
    await Promise.resolve();
    release({ data: { id: "p", status: "published" }, error: null });
    await first;
    expect(update).toHaveBeenCalledTimes(1);
    expect(backend.from.mock.calls.flat()).not.toContain("section_media");
  });
  it("rejects failed publication and allows a subsequent retry", async () => {
    const update = vi.fn(() => ({
      eq: () => ({
        select: () => ({ single: async () => ({ data: null, error: new Error("RLS") }) }),
      }),
    }));
    backend.from.mockImplementation((table) =>
      table === "guide_sections"
        ? {
            select: () => ({
              eq: () => ({ order: async () => ({ data: [section], error: null }) }),
            }),
          }
        : { update },
    );
    await expect(publishProperty(property, [])).rejects.toThrow("publication");
    await expect(publishProperty(property, [])).rejects.toThrow("publication");
    expect(update).toHaveBeenCalledTimes(2);
  });
  it("preserves the latest gallery config when a text edit uses an older section snapshot", async () => {
    let payload: Record<string, unknown> = {};
    const latest = {
      items: [],
      propertyMedia: { version: 1, coverId: "new", galleryIds: ["new", "other"] },
      entries: [{ title: "Existing" }],
    };
    backend.from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: { content: latest }, error: null }) }),
      }),
      update: (values: Record<string, unknown>) => {
        payload = values;
        return {
          eq: () => ({
            select: () => ({
              single: async () => ({ data: { ...section, ...values }, error: null }),
            }),
          }),
        };
      },
    }));
    await saveGuideSection(section, {
      title: "Nouvel accueil",
      items: [{ label: "", text: "Texte modifié" }],
      isVisible: true,
    });
    expect((payload["content"] as typeof latest).propertyMedia).toEqual(latest.propertyMedia);
    expect((payload["content"] as typeof latest).entries).toEqual(latest.entries);
  });
  it("changes property media metadata without overwriting newer text or visibility", async () => {
    let payload: Record<string, unknown> = {};
    const latest = {
      items: [{ label: "", text: "Newer saved text" }],
      propertyMedia: { version: 1, coverId: "old" },
    };
    backend.from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: { content: latest }, error: null }) }),
      }),
      update: (values: Record<string, unknown>) => {
        payload = values;
        return {
          eq: () => ({
            select: () => ({
              single: async () => ({ data: { ...section, ...values }, error: null }),
            }),
          }),
        };
      },
    }));
    await saveGuideSection(section, {
      title: "Old title",
      items: [],
      isVisible: true,
      propertyMedia: { version: 1, coverId: "new" },
    });
    expect(Object.keys(payload)).toEqual(["content"]);
    expect((payload["content"] as typeof latest).items).toEqual(latest.items);
  });
});
