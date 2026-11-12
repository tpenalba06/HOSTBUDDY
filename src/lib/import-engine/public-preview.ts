import { extractDocument } from "./document-extractor";
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

const textKeys = [
  "description",
  "address",
  "arrival",
  "departure",
  "equipment",
  "kitchen",
  "climate",
  "pool",
  "rules",
  "parking",
  "trash",
  "recommendations",
  "services",
  "emergency",
  "access",
  "contact",
] as const;

export const publicPreviewSchema = z.object({
  text: z.record(z.enum(textKeys), z.string().max(2400)).optional(),
  name: z.string().max(100).optional(),
  locality: z.string().max(80).optional(),
  places: z.array(z.string().max(80)).max(12).optional(),
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
  wifiAvailable: z.boolean().optional(),
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
  pastedName?: string,
): PublicImportPreview {
  const title = pastedName ?? result.propertyName?.trim() ?? "";
  const name =
    (fromPublicUrl || !!pastedName) &&
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
    const input = value(key);
    if (fromPublicUrl && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(input)) return input;
    const matches = new Set(
      input.split("\n").flatMap((line) => {
        const match = line.trim().replace(/[.!]$/, "").match(pattern);
        return match ? [match[1]!.padStart(2, "0") + ":" + (match[2] ?? "00")] : [];
      }),
    );
    return matches.size === 1 ? [...matches][0] : undefined;
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
  const wifiAvailable = value("wifi")
    .split("\n")
    .some((line) =>
      /^(?:wi[ -]?fi (?:disponible|gratuit|available|dispon[ií]vel|gratuito)|free wi[ -]?fi|kostenloses wlan|wlan verf[uü]gbar)[.!]?$/iu.test(
        line.trim(),
      ),
    );
  // Reject credential-bearing evidence as a unit, including continuation lines.
  const sensitive =
    /code|c[oó]dig[oa]|pin\b|serrure|digicode|lockbox|key box|bo[iî]te.{0,6}cl[ée]|caja.{0,12}llaves|cassetta.{0,12}chiavi|schl[üu]sselkasten|caixa.{0,12}chaves|password|mot de passe|passwort|senha|contrase[ñn]a|token|secret|identifiant|ssid|wi[ -]?fi|\d{4,}|(?:\d[ .()+-]*){7,}|@/iu;
  const text = fromPublicUrl
    ? {}
    : Object.fromEntries(
        textKeys.flatMap((key) => {
          if (field(key)?.issues?.length) return [];
          const quotes = field(key)?.evidence?.map(({ quote }) => quote) ?? [value(key)];
          const lines = [...new Set(quotes)].filter(
            (quote) =>
              quote &&
              !sensitive.test(quote) &&
              (key !== "access" ||
                !/bo[iî]te|portail|\bgate\b|\bportal\b|cache|hidden|versteck|escond/iu.test(quote)),
          );
          const content = lines.join("\n");
          return content ? [[key, content.slice(0, 2400)]] : [];
        }),
      );
  const safeLabel = (label: string) =>
    /^[\p{L}][\p{L}\p{M} .’'&()-]{1,79}$/u.test(label) && !sensitive.test(label);
  const locality = result.publicLocality?.trim();
  const places = result.publicPlaceNames?.map((label) => label.trim()).filter(safeLabel);
  const publicDescription = field("description");
  const description =
    fromPublicUrl &&
    publicDescription?.evidence?.some(
      (entry) =>
        entry.method === "structured" &&
        (entry.quote.startsWith("JSON-LD description") ||
          entry.quote === "Sunver public property introduction"),
    ) &&
    !sensitive.test(value("description"))
      ? value("description").slice(0, 800)
      : "";
  return {
    ...(fromPublicUrl && locality && safeLabel(locality) ? { locality } : {}),
    ...(fromPublicUrl && places?.length ? { places: places.slice(0, 12) } : {}),
    ...(description ? { text: { description } } : Object.keys(text).length ? { text } : {}),
    ...(name ? { name } : {}),
    ...(confirmedAmenities.length ? { amenities: confirmedAmenities } : {}),
    ...(confirmedRules.length ? { rules: confirmedRules } : {}),
    ...(wifiAvailable ? { wifiAvailable: true } : {}),
    arrival: time("arrival", arrival),
    departure: time("departure", departure),
    capacity: guestCounts.size === 1 ? [...guestCounts][0] : undefined,
    illustration:
      detectAccommodationMood(title) ??
      (/\b(?:villa|maison|house)\b/i.test(title)
        ? "countryside"
        : /\b(?:hôtel|hotel)\b/i.test(title)
          ? "urban-hotel"
          : undefined),
  };
}

/** Keep sentence boundaries before classification so one credential does not taint
 * the rest of a paragraph. Only named, bounded facts are projected to the phone. */
export function previewPastedDocument(input: string): PublicImportPreview {
  const prose = input
    .replace(/[’]/g, "'")
    .replace(/(?<=[.!?]) +(?=[\p{Lu}])/gu, "\n")
    .replace(
      /(?:^|\n)[^\n]*(?:mot de passe|password|passwort|senha|contrase[ñn]a|code d.acces|code d.accès|c[oó]dig[oa]|ssid)[^\n]*[:=][ \t]*\n[^\n]*/giu,
      "\n",
    );
  const document = prose.replace(/\bet le départ (?=avant|à )/giu, "\nDépart ");
  const result = extractDocument(document);
  const name =
    prose.match(
      /(?<!\p{L})(?:[Bb]ienvenue à|[Ww]elcome to|[Bb]ienvenid[oa]s? a|[Ww]illkommen (?:in|im|bei)|[Bb]envenut[oi] (?:a|al|alla)|[Bb]em-vind[oa]s? (?:a|ao|à)) (?:la |le |l'|the |el |der |die |a |o )?([\p{Lu}][\p{L}\p{M} '-]{1,70}?)(?=,|[.!?]|\n|$)/u,
    )?.[1] ??
    (/^(?:villa|maison|house|appartement|apartment|apartamento|wohnung|chalet|studio|g[iî]te|loft|casa|ferienwohnung|hotel|hôtel)\s/iu.test(
      result.propertyName ?? "",
    )
      ? (result.propertyName ?? undefined)
      : undefined);
  const preview = publicImportPreview(result, false, name);
  const address = prose.match(
    /\b(\d{1,3} (?:rue|avenue|boulevard|chemin|place) [\p{L} '-]{2,60}?) à ([\p{Lu}][\p{L} '-]{1,40})(?=[,.!?]|$)/u,
  );
  const times = (pattern: RegExp) => {
    const matches = new Set(
      Array.from(
        prose.matchAll(pattern),
        (match) => `${match[1]!.padStart(2, "0")}:${match[2] ?? match[3] ?? "00"}`,
      ),
    );
    return matches.size > 1 ? null : [...matches][0];
  };
  const checkIn = times(
    /arriv[ée]e? (?:se fait )?(?:à partir de |à )?([01]?\d|2[0-3])\s*(?:h\s*([0-5]\d)?|:([0-5]\d))/giu,
  );
  const checkOut = times(
    /d[ée]part (?:se fait )?(?:avant |à )?([01]?\d|2[0-3])\s*(?:h\s*([0-5]\d)?|:([0-5]\d))/giu,
  );
  const text = { ...preview.text };
  if (checkIn === null) delete text.arrival;
  if (checkOut === null) delete text.departure;
  if (address) text.address = `${address[1]}, ${address[2]}`;
  return {
    ...preview,
    ...(Object.keys(text).length || preview.text ? { text } : {}),
    arrival: checkIn === null ? undefined : (checkIn ?? preview.arrival),
    departure: checkOut === null ? undefined : (checkOut ?? preview.departure),
  };
}
