import { FIELD_DEFS, FIELD_BY_KEY } from "@/lib/import-engine/fields";

export type GuideContentItem = {
  label: string;
  text: string;
  fieldKey?: string;
};

export type GuideContent = {
  items?: GuideContentItem[];
  phones?: string[];
  emails?: string[];
  [key: string]: unknown;
};

const cleanString = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

export function readGuideContent(value: unknown): GuideContent {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const items = Array.isArray(source.items)
    ? source.items.flatMap((entry) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
        const item = entry as Record<string, unknown>;
        const label = cleanString(item.label, 120);
        const text = cleanString(item.text, 10_000);
        const fieldKey = cleanString(item.fieldKey, 80);
        return [{ label, text, ...(fieldKey ? { fieldKey } : {}) }];
      })
    : [];
  const phones = Array.isArray(source.phones) ? source.phones.filter((v): v is string => typeof v === "string") : undefined;
  const emails = Array.isArray(source.emails) ? source.emails.filter((v): v is string => typeof v === "string") : undefined;
  return { ...source, items, ...(phones ? { phones } : {}), ...(emails ? { emails } : {}) };
}

function inferredFieldKey(sectionKey: string, item: GuideContentItem) {
  if (item.fieldKey && FIELD_BY_KEY[item.fieldKey]?.section.key === sectionKey) return item.fieldKey;
  const normalized = item.label.trim().toLocaleLowerCase("fr");
  if (!normalized) return undefined;
  return FIELD_DEFS.find((field) =>
    field.section.key === sectionKey && field.label.trim().toLocaleLowerCase("fr") === normalized,
  )?.key;
}

export function getGuideItems(sectionKey: string, value: unknown): GuideContentItem[] {
  return (readGuideContent(value).items ?? []).map((item) => {
    const fieldKey = inferredFieldKey(sectionKey, item);
    return fieldKey ? { ...item, fieldKey } : item;
  });
}

export function sanitizeGuideItems(sectionKey: string, items: GuideContentItem[]): GuideContentItem[] {
  const seenFieldKeys = new Set<string>();
  return items.flatMap((item) => {
    const label = item.label.trim().slice(0, 120);
    const text = item.text.trim().slice(0, 10_000);
    const fieldKey = inferredFieldKey(sectionKey, { ...item, label, text });
    if (fieldKey) {
      if (seenFieldKeys.has(fieldKey)) return [];
      seenFieldKeys.add(fieldKey);
      return [{ label: label || FIELD_BY_KEY[fieldKey]?.label || "", text, fieldKey }];
    }
    if (!label && !text) return [];
    return [{ label, text }];
  });
}

export function contactContent(text: string) {
  const phones = [...text.matchAll(/(\+33|0)\s?[1-9](?:[\s.-]?\d{2}){4}/g)].map((match) =>
    match[0].replace(/[\s.-]/g, "").replace(/^0/, "+33"),
  );
  const emails = [...text.matchAll(/[\w.+-]+@[\w-]+\.[\w.]+/g)].map((match) => match[0]);
  return { phones: [...new Set(phones)].slice(0, 3), emails: [...new Set(emails)].slice(0, 2) };
}

export function buildGuideContent(sectionKey: string, previous: unknown, items: GuideContentItem[]): GuideContent {
  const base = readGuideContent(previous);
  const visibleItems = sanitizeGuideItems(sectionKey, items).filter((item) => item.text.length > 0);
  const next: GuideContent = { ...base, items: visibleItems };
  if (sectionKey === "contact") {
    Object.assign(next, contactContent(visibleItems.map((item) => item.text).join("\n")));
  }
  return next;
}

export function mergeFieldIntoGuideContent(
  sectionKey: string,
  previous: unknown,
  field: { key: string; label: string; value: string | null },
): GuideContent {
  const items = getGuideItems(sectionKey, previous);
  const index = items.findIndex((item) => item.fieldKey === field.key);
  const nextItem: GuideContentItem = { fieldKey: field.key, label: field.label, text: field.value?.trim() ?? "" };
  const nextItems = [...items];
  if (index >= 0) {
    if (nextItem.text) nextItems[index] = nextItem;
    else nextItems.splice(index, 1);
  } else if (nextItem.text) {
    nextItems.push(nextItem);
  }
  return buildGuideContent(sectionKey, previous, nextItems);
}

export function fieldUpdatesForGuideSection(sectionKey: string, previous: unknown, items: GuideContentItem[]) {
  const before = getGuideItems(sectionKey, previous);
  const after = sanitizeGuideItems(sectionKey, items);
  const keys = new Set<string>();
  before.forEach((item) => item.fieldKey && keys.add(item.fieldKey));
  after.forEach((item) => item.fieldKey && keys.add(item.fieldKey));
  return [...keys]
    .filter((key) => FIELD_BY_KEY[key]?.section.key === sectionKey)
    .map((key) => ({ key, value: after.find((item) => item.fieldKey === key)?.text.trim() || null }));
}
