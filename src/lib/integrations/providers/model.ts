import type { ExtractedField, ExtractionResult } from "@/lib/import-engine/types";
import { FIELD_DEFS } from "@/lib/import-engine/fields";
export interface NormalizedProperty {
  provider: string;
  externalId: string;
  name: string | null;
  importedAt: string;
  address?: string;
  coordinates?: { latitude: number; longitude: number };
  photos: string[];
  fields: ExtractedField[];
}
export interface ProviderPage {
  properties: NormalizedProperty[];
  nextOffset: number | null;
}
export interface ImportProvider {
  id: string;
  list(offset: number): Promise<ProviderPage>;
  get(externalId: string): Promise<NormalizedProperty>;
}
export const extractionFromProvider = (property: NormalizedProperty): ExtractionResult => ({
  propertyName: property.name,
  fields: FIELD_DEFS.map(
    (def) =>
      property.fields.find((field) => field.key === def.key) ?? {
        key: def.key,
        value: null,
        rawValue: null,
        status: "missing",
        confidence: 0,
      },
  ),
  photos: property.photos,
  photoRightsConfirmed: false,
});
