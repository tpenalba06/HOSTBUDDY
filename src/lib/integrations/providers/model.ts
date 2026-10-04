import type { ExtractedField, ExtractionResult } from "@/lib/import-engine/types";
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
  fields: property.fields,
  photos: property.photos,
  photoRightsConfirmed: false,
});
