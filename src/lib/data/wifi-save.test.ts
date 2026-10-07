import { beforeEach, expect, it, vi } from "vitest";
const backend = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: backend }));
vi.mock("@/lib/import-engine/url-import.functions", () => ({ importPropertyPhotos: vi.fn() }));
vi.mock("@/lib/integrations/billing.functions", () => ({ reconcileBilling: vi.fn() }));
import { saveGuideSection, saveFieldAnswer, type GuideSection } from "./properties";
beforeEach(() => {
  backend.from.mockReset();
});
it("writes all added Wi-Fi rows into information and retains imported provenance", async () => {
  const section = {
    id: "wifi-section",
    property_id: "property-a",
    section_key: "wifi-ab12",
    title: "Wi-Fi",
    icon: "wifi",
    content: { items: [] },
  } as unknown as GuideSection;
  let savedSection = section;
  const field: Record<string, unknown> = {
    key: "wifi",
    value: null,
    raw_value: "Imported original",
    source_type: "text",
    confidence: 0.8,
  };
  const filters: [string, unknown][] = [];
  backend.from.mockImplementation((table: string) => {
    if (table === "guide_sections")
      return {
        select: () => ({
          eq: () => ({ single: async () => ({ data: savedSection, error: null }) }),
        }),
        update: (values: Partial<GuideSection>) => {
          savedSection = { ...savedSection, ...values };
          return {
            eq: () => ({
              select: () => ({ single: async () => ({ data: savedSection, error: null }) }),
            }),
          };
        },
      };
    if (table === "property_fields")
      return {
        update: (values: Record<string, unknown>) => {
          Object.assign(field, values);
          const query = {
            error: null,
            eq: (key: string, value: unknown) => {
              filters.push([key, value]);
              return query;
            },
          };
          return query;
        },
      };
    throw new Error(`Unexpected table ${table}`);
  });
  await saveGuideSection(section, {
    title: "Wi-Fi",
    isVisible: true,
    items: [
      { label: "Réseau", text: "AuditWifi" },
      { label: "Mot de passe", text: "synthetic-password" },
    ],
  });
  expect(field).toMatchObject({
    value: "Réseau : AuditWifi\nMot de passe : synthetic-password",
    status: "found",
    manually_verified: true,
    manually_overridden: true,
    raw_value: "Imported original",
    source_type: "text",
    confidence: 0.8,
  });
  expect(filters).toEqual([
    ["property_id", "property-a"],
    ["key", "wifi"],
  ]);
  expect(savedSection.content).toMatchObject({
    items: [
      { label: "Réseau", text: "AuditWifi" },
      { label: "Mot de passe", text: "synthetic-password" },
    ],
  });
  await saveGuideSection(savedSection, { title: "Wi-Fi", isVisible: true, items: [] });
  expect(field).toMatchObject({ value: null, status: "missing", raw_value: "Imported original" });
});

it("updates the existing added section when answering Wi-Fi instead of inserting a second section", async () => {
  const section = {
    id: "added",
    property_id: "property-a",
    section_key: "wifi-ab12",
    content: {
      items: [
        { label: "Réseau", text: "old-network" },
        { label: "Mot de passe", text: "old-password" },
      ],
    },
  } as unknown as GuideSection;
  const field = {
    id: "wifi-field",
    property_id: "property-a",
    key: "wifi",
    label: "Wi-Fi",
    value: "old-network",
  } as import("./properties").PropertyField;
  const insert = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn().mockImplementation(() => ({ eq: async () => ({ error: null }) }));
  backend.from.mockImplementation((table: string) => {
    if (table === "property_fields")
      return {
        update: (values: object) => ({
          eq: () => ({
            select: () => ({
              single: async () => ({ data: { ...field, ...values }, error: null }),
            }),
          }),
        }),
      };
    const query = {
      eq: (_key: string, value: string): unknown =>
        value === "wifi" ? { maybeSingle: async () => ({ data: null, error: null }) } : query,
      order: async () => ({ data: [section], error: null }),
    };
    return { select: () => query, insert, update };
  });
  await saveFieldAnswer(field, "new credentials");
  expect(insert).not.toHaveBeenCalled();
  expect(update).toHaveBeenCalledWith({
    content: { items: [{ fieldKey: "wifi", label: "Wi-Fi", text: "new credentials" }] },
  });
});


it("updates all matching Wi-Fi sections and not custom sections", async () => {
  const field = {
    id: "wifi-field",
    property_id: "property-a",
    key: "wifi",
    label: "Wi-Fi",
    value: "old value",
  } as import("./properties").PropertyField;
  const sections = [
    {
      id: "canonical",
      property_id: "property-a",
      section_key: "wifi",
      content: { items: [{ fieldKey: "wifi", label: "Wi-Fi", text: "old value" }] },
    },
    {
      id: "generated",
      property_id: "property-a",
      section_key: "wifi-ab12",
      content: { items: [{ fieldKey: "wifi", label: "Wi-Fi", text: "old generated value" }] },
    },
    {
      id: "custom",
      property_id: "property-a",
      section_key: "custom-ab12",
      content: { items: [{ label: "Wi-Fi", text: "custom text" }] },
    },
  ] as unknown as GuideSection[];
  const updatedIds: string[] = [];
  const insert = vi.fn().mockResolvedValue({ error: null });

  backend.from.mockImplementation((table: string) => {
    if (table === "property_fields")
      return {
        update: (values: object) => ({
          eq: () => ({
            select: () => ({
              single: async () => ({ data: { ...field, ...values }, error: null }),
            }),
          }),
        }),
      };
    const query = {
      eq: () => query,
      order: async () => ({ data: sections, error: null }),
    };
    return {
      select: () => query,
      insert,
      update: () => ({
        eq: async (_key: string, id: string) => {
          updatedIds.push(id);
          return { error: null };
        },
      }),
    };
  });

  await saveFieldAnswer(field, "new value");

  expect(insert).not.toHaveBeenCalled();
  expect(updatedIds).toEqual(["canonical", "generated"]);
  expect(updatedIds).not.toContain("custom");
});
