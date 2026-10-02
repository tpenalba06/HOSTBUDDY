// Universal Import Engine — shared types.
// Every field keeps provenance so human corrections win over future syncs.

export type ImportSource =
  "airbnb" | "booking" | "sunver" | "website" | "text" | "document" | "pms" | "manual";
export type FieldStatus = "found" | "to_verify" | "missing";

export interface ExtractedField {
  key: string;
  value: string | null;
  status: FieldStatus;
  rawValue: string | null; // exact source snippet(s)
  confidence: number; // 0..1
  manuallyVerified?: boolean;
  manuallyOverridden?: boolean;
}

export interface ExtractionResult {
  propertyName: string | null;
  fields: ExtractedField[];
}

/** Any extractor (deterministic rules today, structured AI tomorrow) implements this. */
export interface Extractor {
  id: string;
  extract(text: string): Promise<ExtractionResult>;
}

export type UrlImportOutcome =
  | { ok: true; source: ImportSource; result: ExtractionResult }
  | {
      ok: false;
      source: ImportSource;
      reason: "blocked" | "insufficient" | "unreachable" | "invalid";
    };

/** One adapter per source; official APIs/OAuth can replace an implementation without UI changes. */
export interface UrlSourceAdapter {
  source: ImportSource;
  matches(host: string): boolean;
  run(url: string): Promise<UrlImportOutcome>;
}
