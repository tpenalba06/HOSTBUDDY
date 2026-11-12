import type { DemoProperty } from "./demo-property";

export function validStoredDemoProperty(value: unknown): value is DemoProperty {
  if (!value || typeof value !== "object") return false;
  const property = value as Partial<DemoProperty>;
  return (
    typeof property.id === "string" &&
    property.id.startsWith("demo-") &&
    typeof property.name === "string" &&
    Array.isArray(property.sections) &&
    property.sections.every(
      (section) => typeof section.section_key === "string" && !!section.content,
    ) &&
    Array.isArray(property.media) &&
    property.media.every(
      (item) => typeof item.storage_path === "string" && !item.storage_path.startsWith("blob:"),
    ) &&
    Array.isArray(property.services) &&
    Array.isArray(property.fields)
  );
}
