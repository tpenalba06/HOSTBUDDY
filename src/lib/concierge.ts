import { z } from "zod";
import type { PublicGuide } from "./data/public-guide.functions";
import { readBookingConfig, serviceTotalCents } from "./service-booking";
import { conciergeCopy } from "./concierge-copy";

export const conciergeDraftSchema = z
  .object({
    serviceId: z.string().min(1).max(100).optional(),
    quantity: z.number().int().min(1).max(20).optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    time: z
      .string()
      .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    requestedFor: z.string().datetime({ offset: true }).nullable().optional(),
    optionId: z.string().uuid().nullable().optional(),
  })
  .strict();
export type ConciergeDraft = z.infer<typeof conciergeDraftSchema>;
export const conciergeRequestSchema = z
  .object({
    slug: z.string().min(1).max(80),
    locale: z.enum(["fr", "en", "es", "de", "it", "pt"]),
    message: z.string().trim().max(1200),
    draft: conciergeDraftSchema.default({}),
    history: z.array(z.string().max(1200)).max(6).default([]),
    timeZone: z
      .string()
      .max(80)
      .default("UTC")
      .refine((zone) => {
        try {
          new Intl.DateTimeFormat("en", { timeZone: zone });
          return true;
        } catch {
          return false;
        }
      }),
    website: z.string().max(0).default(""),
  })
  .strict();
export type ConciergeRequest = z.infer<typeof conciergeRequestSchema>;
export type ConciergeService = NonNullable<PublicGuide["services"]>[number];
export type ConciergeTurn = {
  mode: "guided";
  text: string;
  draft: ConciergeDraft;
  services: ConciergeService[];
  facts: { title: string; text: string; original: boolean }[];
  tracking: boolean;
  quote: { totalCents: number; revision?: string } | null;
  usage: { modelCalls: 0; estimatedCostMicros: 0 };
};
// A future provider may propose IDs and fields only, never booking/payment actions,
// status, prices or arbitrary factual answers. It receives no receipts or contact data.
export const conciergeProposalSchema = z
  .object({
    intent: z.enum(["services", "facts", "tracking", "unknown"]),
    serviceIds: z.array(z.string().max(100)).max(4).default([]),
    factKeys: z.array(z.string().max(80)).max(2).default([]),
    draft: conciergeDraftSchema.default({}),
  })
  .strict();
export interface ConciergeProvider {
  propose(input: { message: string; history: string[]; guide: PublicGuide }): Promise<unknown>;
}
const normalize = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const vocabulary: Record<string, RegExp> = {
  breakfast: /petit.?dejeuner|breakfast|desayuno|fruhstuck|colazione|pequeno.?almoco/,
  wifi: /wi.?fi|internet|password|mot de passe|contrasena|passwort|senha/,
  departure: /depart|check.?out|salida|abreise|partenza|saida/,
  arrival: /arriv|check.?in|llegada|anreise|chegada/,
  parking: /park|garer|stationn|aparc|parchegg|estacion/,
  pool: /piscin|pool|schwimm/,
  places: /restaurant|restaurante|ristorant|essen|bonnes adresses/,
  house:
    /equipement|equipment|washing|lave.linge|lavadora|lavatrice|waschmaschine|maquina de lavar/,
  contact: /contact|gestionnaire|host|anfitri|gastgeber|hote/,
};
const availableServices = (guide: PublicGuide, now: Date) =>
  (guide.services ?? []).filter((service) => {
    const config = readBookingConfig(service.bookingConfig);
    return !config.slots.length || config.slots.some((slot) => Date.parse(slot) > now.getTime());
  });
export function zonedDate(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
function inferDraft(
  message: string,
  previous: ConciergeDraft,
  now: Date,
  zone: string,
): ConciergeDraft {
  const text = normalize(message);
  const next = { ...previous };
  const count = text.match(
    /(?:pour|for|para|fur|per)\s+(\d{1,2}|un|une|one|uno|uma|dois|duas|deux|two|dos|zwei|due|trois|three|tres|drei|tre|quatre|four|cuatro|vier|quattro)(?:\s|$)/,
  );
  if (count) {
    const words: Record<string, number> = {
      un: 1,
      une: 1,
      one: 1,
      uno: 1,
      uma: 1,
      deux: 2,
      two: 2,
      dos: 2,
      dois: 2,
      duas: 2,
      zwei: 2,
      due: 2,
      trois: 3,
      three: 3,
      tres: 3,
      drei: 3,
      tre: 3,
      quatre: 4,
      four: 4,
      cuatro: 4,
      vier: 4,
      quattro: 4,
    };
    const quantity = words[count[1]!] ?? Number(count[1]);
    if (quantity >= 1 && quantity <= 20) next.quantity = quantity;
  }
  const date = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (
    date &&
    !Number.isNaN(Date.parse(`${date[1]}T00:00:00Z`)) &&
    new Date(`${date[1]}T00:00:00Z`).toISOString().startsWith(date[1]!)
  )
    next.date = date[1];
  if (/demain|tomorrow|manana|morgen|domani|amanha/.test(text)) {
    const today = zonedDate(now, zone);
    next.date = new Date(Date.parse(`${today}T12:00:00Z`) + 86400000).toISOString().slice(0, 10);
  }
  const time = text.match(/\b([01]?\d|2[0-3])\s*(?:h|:)\s*([0-5]\d)\b/);
  if (time) next.time = `${time[1]!.padStart(2, "0")}:${time[2]}`;
  return next;
}
export function guidedProposal(input: ConciergeRequest, guide: PublicGuide, now = new Date()) {
  guide = { ...guide, services: availableServices(guide, now) };
  const text = normalize(input.message);
  const draft = inferDraft(input.message, input.draft, now, input.timeZone);
  const current = guide.services?.find((service) => service.id === draft.serviceId);
  const option = readBookingConfig(current?.bookingConfig).options.find((item) =>
    text.includes(normalize(item.label)),
  );
  if (option) draft.optionId = option.id;
  if (
    /statut|suivi|status|tracking|ou en est|where.*(?:order|breakfast)|estado|stato|pedido|bestellung/.test(
      text,
    )
  )
    return { intent: "tracking", draft, serviceIds: [], factKeys: [] };
  const breakfast = vocabulary["breakfast"]!.test(text);
  const direct = (guide.services ?? []).filter((s) => text.includes(normalize(s.name)));
  const matches = breakfast
    ? (guide.services ?? []).filter((s) =>
        vocabulary["breakfast"]!.test(normalize(`${s.name} ${s.description}`)),
      )
    : direct;
  if (matches.length)
    return {
      intent: "services",
      draft,
      serviceIds: matches.map((s) => s.id).slice(0, 4),
      factKeys: [],
    };
  if (/service|prestation|servizi|servico|dienstleistung/.test(text))
    return {
      intent: "services",
      draft,
      serviceIds: (guide.services ?? []).slice(0, 4).map((s) => s.id),
      factKeys: [],
    };
  const kind = Object.entries(vocabulary).find(
    ([key, pattern]) => key !== "breakfast" && pattern.test(text),
  )?.[0];
  if (kind)
    return {
      intent: "facts",
      draft,
      serviceIds: [],
      factKeys: guide.sections
        .filter((s) => s.key.split("-")[0] === kind)
        .map((s) => s.key)
        .slice(0, 2),
    };
  if (
    draft.serviceId &&
    (input.message === "" ||
      /^(oui|yes|si|sim|ja|ok)[.! ]*$/.test(text) ||
      draft.date !== input.draft.date ||
      draft.time !== input.draft.time ||
      draft.quantity !== input.draft.quantity ||
      draft.optionId !== input.draft.optionId)
  )
    return { intent: "services", draft, serviceIds: [draft.serviceId], factKeys: [] };
  return { intent: "unknown", draft, serviceIds: [], factKeys: [] };
}
/** Trust catalogue facts, never provider claims or a browser-supplied guide. */
export function validateConciergeTurn(
  input: ConciergeRequest,
  guide: PublicGuide,
  proposal: unknown,
  now = new Date(),
): ConciergeTurn {
  guide = { ...guide, services: availableServices(guide, now) };
  const c = conciergeCopy(input.locale);
  const parsed = conciergeProposalSchema.safeParse(proposal);
  const p = parsed.success ? parsed.data : conciergeProposalSchema.parse({ intent: "unknown" });
  const services = (guide.services ?? []).filter((s) => p.serviceIds.includes(s.id)).slice(0, 4);
  const draft = { ...input.draft, ...p.draft };
  let chosen = (guide.services ?? []).find((s) => s.id === draft.serviceId);
  if (services.length === 1) {
    chosen = services[0];
    draft.serviceId = chosen!.id;
  }
  if (!chosen) {
    delete draft.serviceId;
    delete draft.optionId;
    delete draft.requestedFor;
  }
  if (chosen && input.draft.serviceId && chosen.id !== input.draft.serviceId) {
    delete draft.optionId;
    delete draft.requestedFor;
  }
  let quote: ConciergeTurn["quote"] = null;
  if (chosen) {
    const config = readBookingConfig(chosen.bookingConfig);
    if (draft.optionId && !config.options.some((o) => o.id === draft.optionId))
      delete draft.optionId;
    if (draft.requestedFor && config.slots.length && !config.slots.includes(draft.requestedFor))
      delete draft.requestedFor;
    const date = draft.requestedFor ? Date.parse(draft.requestedFor) : NaN;
    const validDate = draft.requestedFor
      ? Number.isFinite(date) &&
        date >= now.getTime() - 300000 &&
        date <= now.getTime() + 2 * 366 * 86400000
      : !config.requestDate && !config.slots.length;
    try {
      const totalCents = serviceTotalCents(
        chosen.price,
        draft.quantity ?? 1,
        config,
        draft.optionId ?? undefined,
      );
      if (
        validDate &&
        (totalCents === 0 || totalCents >= 50) &&
        (!totalCents || (config.seller && config.cancellation))
      )
        quote = { totalCents, ...(chosen.revision ? { revision: chosen.revision } : {}) };
    } catch {
      /* Missing option or quantity never produces a quote. */
    }
  }
  const facts = guide.sections
    .filter((s) => p.factKeys.includes(s.key))
    .slice(0, 2)
    .flatMap((s) => {
      const translation = s.translations?.find((t) => t.locale === input.locale && !t.isStale);
      const content = translation?.content ?? s.content;
      const text = [
        ...(content.items ?? []).map((i) => [i.label, i.text].filter(Boolean).join(" : ")),
        ...(content.entries ?? []).map((i) => [i.title, i.text].filter(Boolean).join(" : ")),
      ]
        .join("\n")
        .slice(0, 2500);
      return text
        ? [
            {
              title: translation?.title ?? s.title,
              text,
              original: !translation && guide.originalLocale !== input.locale,
            },
          ]
        : [];
    });
  return {
    mode: "guided",
    text:
      p.intent === "tracking"
        ? c.tracking
        : services.length
          ? c.configure
          : facts.length
            ? c.source
            : c.unknown,
    draft,
    services,
    facts,
    tracking: p.intent === "tracking",
    quote,
    usage: { modelCalls: 0, estimatedCostMicros: 0 },
  };
}
