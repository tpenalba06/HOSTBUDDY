import { z } from "zod";
import type { NormalizedProperty, ProviderPage } from "./model";
const listing = z.object({
  _id: z.string().min(1).max(120),
  title: z.string().max(500).optional(),
  nickname: z.string().max(500).optional(),
  address: z
    .object({
      full: z.string().max(1000).optional(),
      lat: z.number().optional(),
      lng: z.number().optional(),
    })
    .optional(),
  publicDescription: z
    .object({
      summary: z.string().max(100000).optional(),
      space: z.string().max(100000).optional(),
    })
    .optional(),
  amenities: z.array(z.string().max(1000)).max(500).optional(),
  pictures: z
    .array(z.object({ original: z.string().optional(), thumbnail: z.string().optional() }))
    .max(500)
    .optional(),
  defaultCheckInTime: z.string().max(30).optional(),
  defaultCheckOutTime: z.string().max(30).optional(),
});
export function normalizeGuesty(
  value: unknown,
  now = new Date().toISOString(),
): NormalizedProperty {
  const row = listing.parse(value);
  const fields: NormalizedProperty["fields"] = [];
  const put = (key: string, text: string | undefined) => {
    if (text?.trim())
      fields.push({
        key,
        value: text.trim(),
        rawValue: text,
        status: "to_verify",
        confidence: 0.95,
      });
  };
  put("address", row.address?.full);
  put(
    "description",
    [row.publicDescription?.summary, row.publicDescription?.space].filter(Boolean).join("\n\n"),
  );
  put("equipment", row.amenities?.join("\n"));
  put("arrival", row.defaultCheckInTime);
  put("departure", row.defaultCheckOutTime);
  const photos = [
    ...new Set(
      (row.pictures ?? []).flatMap((picture) => {
        try {
          const url = new URL(picture.original ?? picture.thumbnail ?? "");
          return url.protocol === "https:" && !url.username && !url.password ? [url.href] : [];
        } catch {
          return [];
        }
      }),
    ),
  ].slice(0, 30);
  return {
    provider: "guesty",
    externalId: row._id,
    name: row.title?.trim() || row.nickname?.trim() || null,
    importedAt: now,
    ...(row.address?.full ? { address: row.address.full } : {}),
    ...(row.address?.lat !== undefined && row.address.lng !== undefined
      ? { coordinates: { latitude: row.address.lat, longitude: row.address.lng } }
      : {}),
    photos,
    fields,
  };
}
export function guestyPage(value: unknown, offset: number): ProviderPage {
  const page = z
    .object({
      results: z.array(z.unknown()).max(100),
      count: z.number().int().nonnegative().optional(),
    })
    .parse(value);
  return {
    properties: page.results.map((row) => normalizeGuesty(row)),
    nextOffset:
      page.results.length === 100 && (page.count === undefined || offset + 100 < page.count)
        ? offset + 100
        : null,
  };
}
