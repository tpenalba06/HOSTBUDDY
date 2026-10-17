import { describe, it, expect, vi, beforeEach } from "vitest";
const backend = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: backend }));
vi.mock("@/lib/import-engine/url-import.functions", () => ({ importPropertyPhotos: vi.fn() }));
vi.mock("@/lib/integrations/billing.functions", () => ({
  reconcileBilling: vi.fn().mockResolvedValue({}),
}));
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
beforeEach(() => {
  backend.from.mockReset();
  backend.rpc.mockReset();
});
describe("publication safety", () => {
  it("coalesces double clicks and leaves existing sections, media and settings intact", async () => {
    let release!: (value: unknown) => void;
    backend.rpc.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    backend.from.mockImplementation((table) =>
      table === "guide_sections"
        ? {
            select: () => ({
              eq: () => ({ order: async () => ({ data: [section], error: null }) }),
            }),
          }
        : {},
    );
    const first = publishProperty(property, []);
    const second = publishProperty(property, []);
    expect(first).toBe(second);
    await vi.waitFor(() => expect(backend.rpc).toHaveBeenCalledOnce());
    release({ data: { id: "p", status: "published" }, error: null });
    await first;
    expect(backend.rpc).toHaveBeenCalledExactlyOnceWith("publish_property", { _property: "p" });
    expect(backend.from.mock.calls.flat()).not.toContain("section_media");
  });
  it("rejects failed publication and allows a subsequent retry", async () => {
    backend.rpc.mockResolvedValue({ error: new Error("RLS") });
    backend.from.mockImplementation((table) =>
      table === "guide_sections"
        ? {
            select: () => ({
              eq: () => ({ order: async () => ({ data: [section], error: null }) }),
            }),
          }
        : {},
    );
    await expect(publishProperty(property, [])).rejects.toThrow("publication");
    await expect(publishProperty(property, [])).rejects.toThrow("publication");
    expect(backend.rpc).toHaveBeenCalledTimes(2);
  });
  it.each(["hb_subscription_required", "hb_billing_sync_required"])(
    "preserves drafts on DB billing rejection (%s)",
    async (message) => {
      backend.rpc.mockResolvedValue({ error: { message } });
      backend.from.mockImplementation(() => ({
        select: () => ({ eq: () => ({ order: async () => ({ data: [section], error: null }) }) }),
      }));
      await expect(publishProperty(property, [])).rejects.toThrow(
        message === "hb_subscription_required"
          ? "payments.subscriptionRequired"
          : "payments.syncRequired",
      );
      expect(backend.from.mock.calls.flat()).not.toContain("properties");
    },
  );
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
