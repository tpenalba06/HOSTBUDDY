import { z } from "zod";
import type { ExtractionResult } from "./types";
import { detectAccommodationMood } from "@/components/guest/property-media";

// Only bounded, typed facts cross into the marketing preview. Source titles,
// free text, evidence, URLs, images and credentials never enter the phone.
export const publicPreviewSchema = z.object({
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

export function publicImportPreview(result: ExtractionResult): PublicImportPreview {
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
  return {
    arrival: time("arrival", arrival),
    departure: time("departure", departure),
    capacity: guestCounts.size === 1 ? [...guestCounts][0] : undefined,
    illustration: detectAccommodationMood(result.propertyName ?? ""),
  };
}
