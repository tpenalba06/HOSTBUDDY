import type { GuideSection } from "@/lib/data/properties";

export const isEditorialSection = (section: GuideSection) =>
  !["welcome", "services"].includes(section.section_key.split("-")[0]!);

/** Only editorial slots move; structural media and services cannot be dragged. */
export function reorderEditorialSections(
  sections: GuideSection[],
  activeId: string,
  overId: string,
) {
  const editorial = sections.filter(isEditorialSection);
  const from = editorial.findIndex((s) => s.id === activeId);
  const to = editorial.findIndex((s) => s.id === overId);
  if (from < 0 || to < 0 || from === to) return sections;
  const next = [...editorial];
  next.splice(to, 0, next.splice(from, 1)[0]!);
  let index = 0;
  return sections.map((section, order) => ({
    ...(isEditorialSection(section) ? next[index++]! : section),
    sort_order: order,
  }));
}
