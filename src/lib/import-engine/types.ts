// Universal Import Engine — shared types.
// Every field keeps provenance so human corrections can win over future syncs.

export type ImportSource = "airbnb" | "booking" | "sunver" | "website" | "text" | "document" | "pms" | "manual";

export type FieldStatus = "found" | "to_verify" | "missing";

export type Category =
  | "general" | "arrival" | "parking" | "wifi" | "pool" | "house" | "departure" | "trash" | "contact" | "rules";

export interface Provenance {
  source: ImportSource;
  raw: string | null;
  importedAt: string;
  confidence: number; // 0..1
  manuallyVerified: boolean;
  manuallyOverridden: boolean;
}

export interface ImportedField {
  key: string;
  label: string;
  category: Category;
  value: string | null;
  status: FieldStatus;
  provenance: Provenance;
  question?: string; // plain-French question for the completion flow
}

export interface ImportStage { id: string; label: string }

export interface ImportResult {
  source: ImportSource;
  propertyName: string | null;
  fields: ImportedField[];
}

export interface ImportAdapter<I = string> {
  id: string;
  source: ImportSource;
  canHandle(input: I): boolean;
  run(input: I, onStage: (stageId: string) => void): Promise<ImportResult>;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  general: "Le logement", arrival: "Arrivée", parking: "Parking", wifi: "Wi-Fi", pool: "Piscine",
  house: "La maison", departure: "Départ", trash: "Déchets", contact: "Contact", rules: "Règles",
};
