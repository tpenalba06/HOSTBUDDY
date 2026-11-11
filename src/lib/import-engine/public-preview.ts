import { z } from "zod";
import type { ExtractionResult } from "./types";
import { detectAccommodationMood } from "@/components/guest/property-media";

// Source evidence and private free text stay out of the marketing preview.
const amenities = {
  kitchen: /^(?:cuisine(?: équipée)?|kitchen(?:ette)?)$/iu,
  laundry: /^(?:lave[ -]linge|washing machine|washer)$/iu,
  parking: /^(?:parking(?: gratuit| privé)?|free parking|private parking)$/iu,
  climate: /^(?:climatisation|air conditioning)$/iu,
  heating: /^(?:chauffage|heating)$/iu,
  television: /^(?:télévision|tv|television)$/iu,
  pool: /^(?:piscine(?: privée)?|pool|swimming pool)$/iu,
} as const;

const rules = {
  noSmoking: /^(?:non[ -]fumeur|logement non[ -]fumeur|interdiction de fumer|no smoking)[.!]?$/iu,
  noParties: /^(?:pas de fêtes|fêtes interdites|no parties)[.!]?$/iu,
} as const;

function matchingKeys<K extends string>(patterns: Record<K, RegExp>, snippets: string[]) {
  return (Object.keys(patterns) as K[]).filter((key) =>
    snippets.some((snippet) => patterns[key].test(snippet)),
  );
}

export const publicPreviewSchema = z.object({
  name: z.string().max(100).optional(),
  amenities: z
    .array(z.enum(["kitchen", "laundry", "parking", "climate", "heating", "television", "pool"]))
    .max(7)
    .optional(),
  rules: z
    .array(z.enum(["noSmoking", "noParties"]))
    .max(2)
    .optional(),
  arrival: z
    .string()
    .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
    .optional(),
  departure: z
    .string()
    .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
    .optional(),
  capacity: z.number().int().min(1).max(99).optional(),
  illustration: z
    .enum(["villa-sea", "urban-hotel", "chalet", "glamping", "apartment", "countryside"])
    .optional(),
});

export type PublicImportPreview = z.infer<typeof publicPreviewSchema>;

const arrival =
  /^(?:arrivée|arrival|check[ -]?in|llegada|ankunft|arrivo|chegada)\s*:?\s*(?:à partir de |from |desde |ab |dalle |a partir das )?([01]?\d|2[0-3])(?:[:h]([0-5]\d)|\s*h)$/iu;
const departure =
  /^(?:départ|departure|check[ -]?out|salida|abreise|partenza|partida)\s*:?\s*(?:avant |before |antes de |bis |entro |até )?([01]?\d|2[0-3])(?:[:h]([0-5]\d)|\s*h)$/iu;
const capacity =
  /^(?:capacité\s*:\s*)?([1-9]\d?)\s+(?:personnes?|voyageurs?|guests?|personas?|gäste|ospiti|hóspedes)$/iu;

export function publicImportPreview(
  result: ExtractionResult,
  fromPublicUrl = false,
): PublicImportPreview {
  const title = result.propertyName?.trim() ?? "";
  const name =
    fromPublicUrl &&
    /^[\p{L}][\p{L}\p{M}\d ’'.,&()–-]{1,99}$/u.test(title) &&
    !/\d{4}|code|password|passwort|wi[ -]?fi|token|mot de passe|senha|contraseña/iu.test(title)
      ? title
      : undefined;
  const field = (key: string) => result.fields.find((candidate) => candidate.key === key);
  const value = (key: string) => {
    const candidate = field(key);
    return candidate?.issues?.length ? "" : (candidate?.value?.trim() ?? "");
  };
  const time = (key: string, pattern: RegExp) => {
    const match = value(key).match(pattern);
    return match ? `${match[1]!.padStart(2, "0")}:${match[2] ?? "00"}` : undefined;
  };
  // The source can group occupancy with bedrooms and beds on the same line.
  // Keep only explicit guest counts and withhold contradictory counts.
  const guestCounts = new Set(
    (field("capacity")?.value ?? "").split(/[\n·•]/).flatMap((part) => {
      const match = part.trim().match(capacity);
      return match ? [Number(match[1])] : [];
    }),
  );
  const snippets = (keys: string[]) =>
    keys.flatMap((key) =>
      value(key)
        .split(/[\n·•,]/)
        .map((part) => part.trim().replace(/^(?:équipements?|amenities)\s*:\s*/iu, "")),
    );
  const confirmedAmenities = matchingKeys(
    amenities,
    snippets(["equipment", "kitchen", "parking", "climate", "pool"]),
  );
  const confirmedRules = matchingKeys(rules, snippets(["rules"]));
  return {
    ...(name ? { name } : {}),
    ...(confirmedAmenities.length ? { amenities: confirmedAmenities } : {}),
    ...(confirmedRules.length ? { rules: confirmedRules } : {}),
    arrival: time("arrival", arrival),
    departure: time("departure", departure),
    capacity: guestCounts.size === 1 ? [...guestCounts][0] : undefined,
    illustration: detectAccommodationMood(result.propertyName ?? ""),
  };
}
