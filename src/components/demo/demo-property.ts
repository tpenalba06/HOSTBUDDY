import type { ManagerPropertySummary } from "@/components/app/ManagerScreens";
import type { PropertyField, GuideSection, SectionMedia } from "@/lib/data/properties";
import type { Service } from "@/lib/data/operations";
import type { ExtractionResult, ImportSource } from "@/lib/import-engine/types";
import { FIELD_DEFS } from "@/lib/import-engine/fields";
import {
  buildGuideContent,
  getGuideItems,
  mergeFieldIntoGuideContent,
} from "@/lib/data/guide-content";
import type { Json } from "@/integrations/supabase/types";

// Local adapter model. No Supabase client or server mutation is imported here.
export type DemoProperty = ManagerPropertySummary & {
  fields: PropertyField[];
  sections: GuideSection[];
  media: SectionMedia[];
  services: Service[];
  messagingEnabled: boolean;
  review: { title: string; message: string; is_enabled: boolean } | null;
  destinations: { label: string; url: string }[];
};

export function createDemoProperty(
  id: string,
  result: ExtractionResult,
  source: ImportSource = "manual",
): DemoProperty {
  const now = new Date().toISOString();
  const name = result.propertyName?.trim() || "Nouveau logement";
  const fields: PropertyField[] = FIELD_DEFS.map((def) => {
    const field = result.fields.find((item) => item.key === def.key);
    return {
      id: `${id}-${def.key}`,
      property_id: id,
      key: def.key,
      category: def.category,
      label: def.label,
      essential: def.essential,
      question: def.question,
      value: field?.value ?? null,
      status: field?.status ?? "missing",
      raw_value: field?.rawValue ?? null,
      confidence: field?.confidence ?? 0,
      source_type: field?.value ? source : null,
      source_url: null,
      imported_at: field?.value ? now : null,
      manually_verified: field?.manuallyVerified ?? false,
      manually_overridden: field?.manuallyOverridden ?? false,
      updated_at: now,
    };
  });
  return {
    id,
    name,
    slug: id,
    status: "draft",
    fields,
    sections: sectionsFromDemoFields(id, fields),
    media: [],
    services: [],
    messagingEnabled: false,
    review: null,
    destinations: [],
  };
}

export function sectionsFromDemoFields(id: string, fields: PropertyField[]): GuideSection[] {
  const definitions = [
    ...new Map(FIELD_DEFS.map((def) => [def.section.key, def.section])).values(),
  ];
  return definitions.map((def) => ({
    id: `${id}-section-${def.key}`,
    property_id: id,
    section_key: def.key,
    title: def.title,
    icon: def.icon,
    cta_label: null,
    sort_order: def.order,
    is_visible: true,
    content: buildGuideContent(
      def.key,
      {},
      fields
        .filter(
          (field) =>
            field.status === "found" &&
            field.value &&
            FIELD_DEFS.find((d) => d.key === field.key)?.section.key === def.key,
        )
        .map((field) => ({ fieldKey: field.key, label: field.label, text: field.value! })),
    ) as Json,
    created_at: "",
    updated_at: "",
  }));
}

export function fieldsFromDemoSections(
  fields: PropertyField[],
  sections: GuideSection[],
): PropertyField[] {
  return fields.map((field) => {
    const sectionKey = FIELD_DEFS.find((def) => def.key === field.key)?.section.key;
    const section = sections.find((item) => item.section_key === sectionKey);
    const item =
      section &&
      getGuideItems(section.section_key, section.content).find(
        (item) => item.fieldKey === field.key,
      );
    // The catalogue field owns its value even if a guide section was removed.
    if (!item) return field;
    return { ...field, value: item.text || null, status: item.text ? "found" : "missing" };
  });
}

export function answerDemoField(
  property: DemoProperty,
  field: PropertyField,
  value: string,
): DemoProperty {
  const updated: PropertyField = {
    ...field,
    value: value.trim() || null,
    status: value.trim() ? "found" : "missing",
    manually_verified: !!value.trim(),
    manually_overridden: true,
  };
  return {
    ...property,
    fields: property.fields.map((current) => (current.id === field.id ? updated : current)),
    sections: property.sections.map((section) => ({
      ...section,
      content:
        FIELD_DEFS.find((def) => def.key === field.key)?.section.key === section.section_key
          ? (mergeFieldIntoGuideContent(section.section_key, section.content, updated) as Json)
          : section.content,
    })),
  };
}
