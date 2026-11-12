import { FIELD_DEFS } from "@/lib/import-engine/fields";
import { buildGuideContent, type GuideContentItem } from "./guide-content";
import type { PropertyField } from "./properties";

/** Only structural sections are proposed empty. Specific facilities require confirmed evidence. */
export function initialGuideSections(propertyId: string, fields: PropertyField[]) {
  const definitions = [
    ...new Map(FIELD_DEFS.map((def) => [def.section.key, def.section])).values(),
  ];
  return definitions.flatMap((def) => {
    const items: GuideContentItem[] = fields
      .filter(
        (field) =>
          field.status === "found" &&
          field.value &&
          !(
            ["pool", "parking", "climate"].includes(field.key) &&
            /^(?:pas de|sans|aucun|non|no)\b/i.test(field.value.trim())
          ) &&
          FIELD_DEFS.find((d) => d.key === field.key)?.section.key === def.key,
      )
      .map((field) => ({ fieldKey: field.key, label: field.label, text: field.value! }));
    if (!items.length && !["welcome", "arrival", "departure"].includes(def.key)) return [];
    return [
      {
        property_id: propertyId,
        section_key: def.key,
        title: def.title,
        icon: def.icon,
        sort_order: def.order,
        is_visible: true,
        content: buildGuideContent(def.key, {}, items),
      },
    ];
  });
}
