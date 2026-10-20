import { z } from "zod";
import type { PublicGuide } from "./data/public-guide.functions";
import { readBookingConfig, serviceTotalCents } from "./service-booking";
import { NONA_PERSONALITY_VERSION, nonaLine, type NonaReplyKey } from "./nona-personality";

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
    period: z.enum(["morning", "afternoon", "evening"]).optional(),
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
    dialogueHistory: z
      .array(
        z
          .object({
            role: z.enum(["user", "assistant"]),
            text: z.string().max(700),
          })
          .strict(),
      )
      .max(10)
      .default([]),
    savedDrafts: z.array(conciergeDraftSchema).max(4).default([]),
    requestId: z.string().uuid().optional(),
    conversationId: z.string().uuid().optional(),
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
  mode: "guided" | "ai";
  text: string;
  draft: ConciergeDraft;
  services: ConciergeService[];
  facts: { title: string; text: string; original: boolean; copyValue?: string | undefined }[];
  places: {
    title: string;
    text?: string | undefined;
    address?: string | undefined;
    mapUrl?: string | undefined;
    image?: string | undefined;
  }[];
  tracking: boolean;
  quote: { totalCents: number; revision?: string } | null;
  usage: {
    modelCalls: number;
    estimatedCostMicros: number;
    metering?: {
      state: "measured" | "estimated" | "uncertain";
      inputTokens: number | null;
      outputTokens: number | null;
      costUsd: number | null;
      latencyMs: number;
    };
  };
  /** Shared voice version; factual cards always come from validated sources. */
  persona: NonaReplyKey;
  personaVersion: string;
  nextStep: "quantity" | "date" | "time" | "option" | "ready" | null;
  /** Guided buttons derived from the catalogue only; `message` is resent as user text. */
  choices: { label: string; message: string }[];
};
// Business proposal: IDs and draft fields only, never booking/payment actions.
// The server-only model schema adds separate conversation prose, not facts.
export const conciergeProposalSchema = z
  .object({
    intent: z.enum([
      "services",
      "facts",
      "tracking",
      "emergency",
      "contact",
      "greeting",
      "unknown",
    ]),
    serviceIds: z.array(z.string().max(100)).max(4).default([]),
    factKeys: z.array(z.string().max(80)).max(2).default([]),
    draft: conciergeDraftSchema.default({}),
    tonalHint: z
      .enum([
        "breakfast",
        "massage",
        "earlyArrival",
        "italian",
        "wifi",
        "arrival",
        "departure",
        "places",
      ])
      .optional(),
    // Only non-factual social microcopy; factual answers are always rendered from the guide.
    opening: z.string().trim().max(180).optional(),
  })
  .strict();
export type ConciergeProposal = z.infer<typeof conciergeProposalSchema>;
export interface ConciergeProvider {
  propose(input: { message: string; history: string[]; guide: PublicGuide }): Promise<unknown>;
}
export const normalize = (value: string) =>
  value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const emergency =
  /urgen|panne|fuite|incendie|feu |inond|(?:bloque|enferme|coince).*dehors|impossible de rentrer|plus d.?electricite|plus d.?eau|danger|agress|emergenc|broken|leak|fire|flood|locked out|no power|no water|notfall|kaputt|defekt|feuer|emergenza|guasto|perdita|incendio|averia|fuga|socorro|avaria|vazamento/;
const early =
  /arriv\w*\s+(?:plus tot|en avance|anticip)|early (?:check.?in|arrival)|arrive early|llegada anticipada|llegar (?:antes|temprano)|fruh\w* anreise|fruher anreisen|arrivo anticipato|arrivare prima|chegada antecipada|chegar mais cedo/;
const italian = /ital|pizz|pasta|trattoria/;
const massage = /massag|masaj|massaggi|detente|relax|spa\b/;
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
  const counts: Record<string, number> = {
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
    cinq: 5,
    five: 5,
    cinco: 5,
    funf: 5,
    cinque: 5,
  };
  const answer = text.replace(/[.!?]/g, "").trim();
  const correction = text.match(
    /(?:finalement|plutot|actually|instead|en fait|sommes|serons|we are|somos|siamo|wir sind)\s+(\d{1,2}|\p{L}+)/u,
  )?.[1];
  const quantityAnswer = counts[correction ?? answer] ?? Number(correction ?? answer);
  if (
    previous.serviceId &&
    (correction || previous.quantity === undefined) &&
    !/\b\d{1,2}\s*(?:h|:|uhr|heures?|am|pm)\b/.test(text) &&
    Number.isInteger(quantityAnswer) &&
    quantityAnswer >= 1 &&
    quantityAnswer <= 20
  )
    next.quantity = quantityAnswer;
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
  if (
    /apres.demain|day after tomorrow|pasado manana|ubermorgen|dopodomani|depois de amanha/.test(
      text,
    )
  )
    next.date = new Date(Date.parse(`${zonedDate(now, zone)}T12:00:00Z`) + 2 * 86400000)
      .toISOString()
      .slice(0, 10);
  const time =
    text.match(/\b([01]?\d|2[0-3])\s*(?:h|:)\s*([0-5]\d)\b/) ??
    text.match(/\b([01]?\d|2[0-3])\s*(?:h|uhr|heures?|horas?)(?![a-z0-9])/) ??
    text.match(/\b(1[0-2]|0?\d)\s*(am|pm)\b/);
  if (time) {
    let hour = Number(time[1]);
    if (time[2] === "pm" && hour < 12) hour += 12;
    if (time[2] === "am" && hour === 12) hour = 0;
    const minutes = time[2] && /^\d+$/.test(time[2]) ? time[2] : "00";
    next.time = `${String(hour).padStart(2, "0")}:${minutes}`;
  }
  if (next.date !== previous.date || next.time !== previous.time) next.requestedFor = null;
  if (/apres.midi|afternoon|tarde|pomeriggio|nachmittag/.test(text)) next.period = "afternoon";
  if (/matin|morning|manana temprano|mattina|vormittag/.test(text)) next.period = "morning";
  if (/soir|evening|noche|sera|abend/.test(text)) next.period = "evening";
  if (
    !time &&
    previous.quantity !== undefined &&
    previous.date &&
    !previous.time &&
    /^\d{1,2}$/.test(answer) &&
    Number(answer) < 24
  )
    next.time = `${answer.padStart(2, "0")}:00`;
  // A bare number answers "how many people?" once a service is being prepared.
  const bare = text.trim().match(/^(\d{1,2})$/);
  if (bare && previous.serviceId && !previous.quantity) {
    const quantity = Number(bare[1]);
    if (quantity >= 1 && quantity <= 20) next.quantity = quantity;
  }
  return next;
}
export function guidedProposal(input: ConciergeRequest, guide: PublicGuide, now = new Date()) {
  guide = { ...guide, services: availableServices(guide, now) };
  const text = normalize(input.message);
  const draft = inferDraft(input.message, input.draft, now, input.timeZone);
  const current = guide.services?.find((service) => service.id === draft.serviceId);
  const words = text.split(/[^a-z0-9]+/).filter((word) => word.length >= 4);
  const option = readBookingConfig(current?.bookingConfig).options.find((item) => {
    const label = normalize(item.label);
    return (
      text.includes(label) ||
      label.split(/[^a-z0-9]+/).some((part) => words.some((word) => part.startsWith(word)))
    );
  });
  if (option) draft.optionId = option.id;
  const sectionKeys = (kind: string) =>
    guide.sections
      .filter((s) => s.key.split("-")[0] === kind)
      .map((s) => s.key)
      .slice(0, 2);
  if (/^(?:coucou|bonjour|salut|hello|hi|hola|hallo|ciao|ola)[ !?.]*$/.test(text))
    return { intent: "greeting", draft, serviceIds: [], factKeys: [] };
  // A preventative question containing "sans danger" is not itself a report
  // of danger. Keep explicit negation ("pas sans danger") and every other
  // emergency signal, including a fire/leak mentioned in the same message.
  const emergencyText = /\b(?:pas|jamais|aucunement)\b.{0,25}\bsans danger\b/.test(text)
    ? text
    : text.replace(/\bsans danger\b/g, "");
  if (emergency.test(emergencyText))
    return { intent: "emergency", draft, serviceIds: [], factKeys: sectionKeys("contact") };
  if (
    /statut|suivi|status|tracking|ou en est|where.*(?:order|breakfast)|estado|stato|pedido|bestellung/.test(
      text,
    )
  )
    return { intent: "tracking", draft, serviceIds: [], factKeys: [] };
  const earlyServices = (guide.services ?? []).filter((s) =>
    early.test(normalize(s.name + " " + s.description)),
  );
  if (early.test(text) && earlyServices.length)
    return {
      intent: "services",
      draft,
      serviceIds: earlyServices.map((s) => s.id),
      factKeys: [],
      tonalHint: "earlyArrival",
    };
  if (early.test(text))
    return {
      intent: "facts",
      draft,
      serviceIds: [],
      factKeys: sectionKeys("arrival"),
      tonalHint: "earlyArrival",
    };
  if (italian.test(text) && vocabulary["places"]!.test(text + " restaurant"))
    return {
      intent: "facts",
      draft,
      serviceIds: [],
      factKeys: sectionKeys("places"),
      tonalHint: "italian",
    };
  const breakfast =
    vocabulary["breakfast"]!.test(text) ||
    /(?:j.ai faim|i.m hungry|tengo hambre|ho fame|tenho fome|ich habe hunger|ptit dej|petit dej)/.test(
      text,
    );
  const relax = massage.test(text);
  const direct = (guide.services ?? []).filter((s) => text.includes(normalize(s.name)));
  const family = breakfast ? vocabulary["breakfast"]! : relax ? massage : null;
  const matches =
    direct.length === 1
      ? direct
      : family
        ? (guide.services ?? []).filter((s) => family.test(normalize(`${s.name} ${s.description}`)))
        : /faire plaisir|surprise|treat my|something special|sorprend|regalo/.test(text)
          ? (guide.services ?? []).filter((s) =>
              massage.test(normalize(s.name + " " + s.description)),
            )
          : direct;
  if (matches.length)
    return {
      intent: "services",
      draft,
      serviceIds: matches.map((s) => s.id).slice(0, 4),
      factKeys: [],
      ...(breakfast ? { tonalHint: "breakfast" } : relax ? { tonalHint: "massage" } : {}),
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
  if (kind === "contact")
    return { intent: "contact", draft, serviceIds: [], factKeys: sectionKeys("contact") };
  if (kind)
    return {
      intent: "facts",
      draft,
      serviceIds: [],
      factKeys: sectionKeys(kind),
      ...(["wifi", "arrival", "departure", "places"].includes(kind)
        ? { tonalHint: kind as "wifi" }
        : {}),
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
export function slotTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit" }).format(
    new Date(value),
  );
}
function zonedInstant(date: string, time: string, zone: string) {
  const nominal = Date.parse(`${date}T${time}:00Z`);
  if (!Number.isFinite(nominal)) return null;
  const matches: string[] = [];
  // Reject nonexistent and ambiguous DST wall times instead of silently changing
  // the requested hour. Only exact quarter-hour zone offsets are considered.
  for (let offset = -12 * 60; offset <= 14 * 60; offset += 15) {
    const candidate = new Date(nominal - offset * 60000);
    if (zonedDate(candidate, zone) === date && slotTime(candidate.toISOString(), zone) === time)
      matches.push(candidate.toISOString());
  }
  return matches.length === 1 ? matches[0]! : null;
}
// These social openers can be composed by the model. Never accept free-form
// factual answers: only the following complete, non-factual clauses are allowed.
const socialClauses = new Set([
  "Coucou",
  "Avec plaisir",
  "Bonne idée",
  "On regarde ça ensemble",
  "Ça donne envie",
  "Un peu de douceur",
  "Tu as bien raison",
  "Je suis là",
  "Hmmm, miam",
  "Oh, quelle bonne idée",
  "Mamma mia",
  "Hello",
  "Of course",
  "Lovely idea",
  "Let's take a look together",
  "A little treat",
  "I'm here",
  "Hola",
  "Claro",
  "Buena idea",
  "Lo miramos juntos",
  "Un pequeño capricho",
  "Hallo",
  "Gern",
  "Gute Idee",
  "Schauen wir zusammen",
  "Eine kleine Auszeit",
  "Ciao",
  "Volentieri",
  "Bella idea",
  "Guardiamo insieme",
  "Una piccola coccola",
  "Olá",
  "Com prazer",
  "Boa ideia",
  "Vamos ver juntos",
  "Um pequeno mimo",
]);
export function safeNonaOpening(value?: string) {
  if (!value) return null;
  const clauses = value
    .replace(/👋|❤️|🥐|☕|💆|🍕|🥰|😊|✨|😋/gu, "")
    .split(/[!.;?]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return clauses.length > 0 && clauses.length <= 3 && clauses.every((s) => socialClauses.has(s))
    ? value
    : null;
}
/** Trust catalogue facts, never provider claims or a browser-supplied guide. */
export function validateConciergeTurn(
  input: ConciergeRequest,
  guide: PublicGuide,
  proposal: unknown,
  now = new Date(),
  preferredStep?: ConciergeTurn["nextStep"],
): ConciergeTurn {
  guide = { ...guide, services: availableServices(guide, now) };
  const parsed = conciergeProposalSchema.safeParse(proposal);
  const p = parsed.success ? parsed.data : conciergeProposalSchema.parse({ intent: "unknown" });
  let services = (guide.services ?? []).filter((s) => p.serviceIds.includes(s.id)).slice(0, 4);
  let draft = { ...input.draft, ...p.draft };
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
  if (chosen && !services.length && p.intent === "services") services = [chosen];
  if (chosen && input.draft.serviceId && chosen.id !== input.draft.serviceId) {
    const changed = Object.fromEntries(
      Object.entries(p.draft).filter(
        ([key, value]) => value !== input.draft[key as keyof ConciergeDraft],
      ),
    );
    draft = {
      ...input.savedDrafts.find((d) => d.serviceId === chosen!.id),
      ...changed,
      serviceId: chosen.id,
    };
  }
  let quote: ConciergeTurn["quote"] = null;
  if (chosen) {
    const config = readBookingConfig(chosen.bookingConfig);
    if (draft.optionId && !config.options.some((o) => o.id === draft.optionId))
      delete draft.optionId;
    if (draft.requestedFor && config.slots.length && !config.slots.includes(draft.requestedFor))
      delete draft.requestedFor;
    if (draft.date && draft.time && config.slots.length) {
      draft.requestedFor =
        config.slots.find(
          (slot) =>
            zonedDate(new Date(slot), input.timeZone) === draft.date &&
            slotTime(slot, input.timeZone) === draft.time &&
            Date.parse(slot) > now.getTime(),
        ) ?? null;
    }
    if (!config.slots.length && config.requestDate && draft.date && draft.time)
      draft.requestedFor = zonedInstant(draft.date, draft.time, input.timeZone);
    if (draft.requestedFor && Number.isFinite(Date.parse(draft.requestedFor))) {
      draft.date = zonedDate(new Date(draft.requestedFor), input.timeZone);
      draft.time = slotTime(draft.requestedFor, input.timeZone);
    }
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
  const italianRequest = p.tonalHint === "italian";
  const places: ConciergeTurn["places"] = [];
  const facts = guide.sections
    .filter((s) => p.factKeys.includes(s.key))
    .slice(0, 2)
    .flatMap((s) => {
      const translation = s.translations?.find((t) => t.locale === input.locale && !t.isStale);
      const content = translation?.content ?? s.content;
      if (s.key.split("-")[0] === "places") {
        for (const entry of content.entries ?? []) {
          if (
            italianRequest &&
            !italian.test(normalize([entry.category, entry.title, entry.text].join(" ")))
          )
            continue;
          const media = s.media?.find((m) => m.type === "image" && entry.mediaIds?.includes(m.id));
          let mapUrl: string | undefined;
          try {
            const u = new URL(entry.mapUrl ?? "");
            if (u.protocol === "https:") mapUrl = u.href;
          } catch {
            /* No fabricated link. */
          }
          places.push({
            title: entry.title,
            text: entry.text,
            address: entry.address,
            mapUrl,
            image: media?.url ?? undefined,
          });
        }
        return [];
      }
      const text = [
        ...(content.items ?? []).map((i) => [i.label, i.text].filter(Boolean).join(" : ")),
        ...(content.entries ?? []).map((i) => [i.title, i.text].filter(Boolean).join(" : ")),
        ...(content.phones ?? []),
        ...(content.emails ?? []),
      ]
        .join("\n")
        .slice(0, 2500);
      return text
        ? [
            {
              title: translation?.title ?? s.title,
              text,
              original: !translation && guide.originalLocale !== input.locale,
              ...(s.key.split("-")[0] === "wifi"
                ? {
                    copyValue: (content.items ?? []).find((i) =>
                      /password|mot de passe|contrasena|passwort|senha/.test(normalize(i.label)),
                    )?.text,
                  }
                : {}),
            },
          ]
        : [];
    });
  let nextStep: ConciergeTurn["nextStep"] = null;
  let choices: ConciergeTurn["choices"] = [];
  if (chosen && p.intent === "services") {
    const config = readBookingConfig(chosen.bookingConfig);
    const missing: NonNullable<ConciergeTurn["nextStep"]>[] = [];
    if (draft.quantity === undefined) missing.push("quantity");
    if ((config.requestDate || config.slots.length) && !draft.date) missing.push("date");
    if ((config.requestDate || config.slots.length) && !draft.requestedFor) missing.push("time");
    if (config.options.length && !draft.optionId) missing.push("option");
    nextStep =
      preferredStep && missing.includes(preferredStep) ? preferredStep : (missing[0] ?? "ready");
    if (nextStep === "quantity")
      choices = [1, 2, 3, 4]
        .filter((n) => n <= config.maxQuantity)
        .map((n) => ({ label: String(n), message: String(n) }));
    if (nextStep === "date")
      choices = [
        ...new Set(
          config.slots
            .filter((s) => Date.parse(s) > now.getTime())
            .map((s) => zonedDate(new Date(s), input.timeZone)),
        ),
      ]
        .slice(0, 8)
        .map((d) => ({ label: d, message: d }));
    if (nextStep === "time")
      choices = config.slots
        .filter(
          (s) =>
            Date.parse(s) > now.getTime() &&
            (!draft.date || zonedDate(new Date(s), input.timeZone) === draft.date) &&
            (!draft.period ||
              (draft.period === "morning"
                ? Number(slotTime(s, input.timeZone).slice(0, 2)) < 12
                : draft.period === "afternoon"
                  ? Number(slotTime(s, input.timeZone).slice(0, 2)) >= 12 &&
                    Number(slotTime(s, input.timeZone).slice(0, 2)) < 18
                  : Number(slotTime(s, input.timeZone).slice(0, 2)) >= 18)),
        )
        .slice(0, 12)
        .map((s) => ({ label: slotTime(s, input.timeZone), message: slotTime(s, input.timeZone) }));
    if (nextStep === "option")
      choices = config.options.map((o) => ({ label: o.label, message: o.label }));
    if (nextStep !== "ready") quote = null;
  }
  const seed = [...input.history, input.message]
    .join(" ")
    .split("")
    .reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) % 2147483647, 0);
  let intro: NonaReplyKey =
    p.intent === "emergency"
      ? "emergency"
      : p.intent === "greeting"
        ? "welcome"
        : p.intent === "tracking"
          ? "tracking"
          : p.intent === "contact"
            ? "contact"
            : italianRequest
              ? places.length
                ? "italian"
                : "italianNone"
              : (p.tonalHint ??
                (services.length
                  ? "services"
                  : facts.length || places.length
                    ? "fact"
                    : !input.message
                      ? "welcome"
                      : "unknown"));
  if (p.intent === "facts" && !facts.length && !places.length && !italianRequest) intro = "unknown";
  let text = nonaLine(input.locale, intro, seed);
  if (chosen && nextStep) {
    const stage: NonaReplyKey =
      nextStep === "ready"
        ? "ready"
        : nextStep === "quantity"
          ? "askQuantity"
          : nextStep === "date"
            ? "askDate"
            : nextStep === "time"
              ? draft.time &&
                !draft.requestedFor &&
                readBookingConfig(chosen.bookingConfig).slots.length
                ? "slotUnavailable"
                : "askTime"
              : "askOption";
    const newService = input.draft.serviceId !== chosen.id;
    const family: NonaReplyKey = vocabulary["breakfast"]!.test(normalize(chosen.name))
      ? "breakfast"
      : massage.test(normalize(chosen.name))
        ? "massage"
        : early.test(normalize(chosen.name))
          ? "earlyArrival"
          : "service";
    text = [
      newService ? nonaLine(input.locale, family, seed) : "",
      nonaLine(input.locale, stage, seed),
    ]
      .filter(Boolean)
      .join(" ");
  }
  const opening = safeNonaOpening(p.opening);
  if (opening && p.intent !== "emergency") text = opening + " " + text;
  return {
    mode: "guided",
    text,
    draft,
    services,
    facts,
    places,
    tracking: p.intent === "tracking",
    quote,
    usage: { modelCalls: 0, estimatedCostMicros: 0 },
    persona: intro,
    personaVersion: NONA_PERSONALITY_VERSION,
    nextStep,
    choices,
  };
}
