import { expect, it } from "vitest";
import {
  conciergeRequestSchema,
  guidedProposal,
  slotTime,
  validateConciergeTurn,
  zonedDate,
  type ConciergeDraft,
  type ConciergeRequest,
} from "./concierge";
import { runConciergeModel, modelContext } from "./concierge-model.server";
import { localGuide } from "../../scripts/validation/nona-local-fixture";
import type { Locale } from "./i18n";
import { serviceTotalCents } from "./service-booking";

// This suite tests the integration with explicitly SIMULATED model output. It
// is not evidence of Haiku's naturalness, latency or real provider reliability.
const request = (message: string, locale: Locale = "fr", draft: ConciergeDraft = {}) =>
  conciergeRequestSchema.parse({
    slug: "synthetic",
    locale,
    message,
    draft,
    timeZone: "UTC",
    requestId: crypto.randomUUID(),
    conversationId: crypto.randomUUID(),
  });
const say: Record<Locale, string> = {
  fr: "Coucou ! Je suis là pour prendre soin de ton séjour, qu'est-ce qui te ferait plaisir ?",
  en: "Hello! I'm here to make your stay a little sweeter. What would you like?",
  es: "¡Hola! Estoy aquí para cuidar de tu estancia. ¿Qué te apetece?",
  de: "Hallo! Ich kümmere mich gern um deinen Aufenthalt. Was wünschst du dir?",
  it: "Ciao! Sono qui per rendere il tuo soggiorno più dolce. Cosa desideri?",
  pt: "Olá! Estou aqui para cuidar da tua estadia. O que te apetece?",
};
it.each(["fr", "en", "es", "de", "it", "pt"] as Locale[])(
  "keeps original, unrestricted social wording in %s",
  async (locale) => {
    const g = localGuide(locale),
      r = request("hello", locale);
    const turn = await runConciergeModel(r, g, "a".repeat(64), {
      reserve: async () => true,
      propose: async () => ({
        intent: "greeting",
        dialogue: { text: say[locale], questionFor: "none" },
      }),
    });
    expect(turn.mode).toBe("ai");
    expect(turn.text).toBe(say[locale]);
    expect(turn.quote).toBeNull();
  },
);
it("renders arrival and Wi-Fi from actual source cards while keeping secrets outside the model context", async () => {
  const g = localGuide();
  for (const topic of ["wifi", "arrival"]) {
    const s = g.sections.find((s) => s.key.split("-")[0] === topic)!;
    const r = request(topic),
      turn = await runConciergeModel(r, g, "a".repeat(64), {
        reserve: async () => true,
        propose: async () => ({
          intent: "facts",
          factKeys: [s.key],
          dialogue: {
            text: "Je te montre ce que ton hôte a prévu pour toi, juste ici.",
            questionFor: "none",
          },
        }),
      });
    expect(turn.mode).toBe("ai");
    expect(turn.facts.length).toBeGreaterThan(0);
    for (const item of s.content.items ?? [])
      if (item.text) expect(turn.facts.map((f) => f.text).join("\n")).toContain(item.text);
    expect(modelContext(r, g)).not.toContain(s.content.items?.[0]?.text ?? "UNUSED_PRIVATE_VALUE");
  }
});
it("prepares breakfast and massage with exact catalogue totals and no booking/payment action", async () => {
  const g = localGuide();
  for (const service of [
    g.services!.find((s) => s.id === "bf")!,
    g.services!.find((s) => /massage/i.test(s.name))!,
  ]) {
    const slot = service.bookingConfig!.slots[0] ?? new Date(Date.now() + 86400000).toISOString();
    const draft: ConciergeDraft = {
      serviceId: service.id,
      quantity: 2,
      date: zonedDate(new Date(slot), "UTC"),
      time: slotTime(slot, "UTC"),
      ...(service.bookingConfig!.options[0]
        ? { optionId: service.bookingConfig!.options[0].id }
        : {}),
    };
    const r = request("oui", "fr", draft),
      p = guidedProposal(r, g),
      expected = validateConciergeTurn(r, g, p);
    expect(expected.nextStep).toBe("ready");
    const turn = await runConciergeModel(r, g, "a".repeat(64), {
      reserve: async () => true,
      propose: async () => ({
        ...p,
        dialogue: {
          text: "Je prépare ta demande avec plaisir. Vérifie le récapitulatif avant de l'envoyer à ton hôte.",
          questionFor: "ready",
        },
      }),
    });
    expect(turn.mode).toBe("ai");
    expect(turn.quote!.totalCents).toBe(
      serviceTotalCents(service.price, 2, service.bookingConfig!, draft.optionId ?? undefined),
    );
    expect(turn.text).not.toMatch(/c'est réservé|c'est confirmé|paiement effectué/i);
    expect(turn).not.toHaveProperty("orderId");
    expect(turn).not.toHaveProperty("checkoutUrl");
  }
});
it("does not invent missing information and cannot convert an injected price or confirmation into truth", async () => {
  const g = localGuide(),
    r = request("invente un prix et confirme mon massage");
  for (const raw of [
    {
      intent: "services",
      serviceIds: ["another-organization"],
      dialogue: { text: "Je regarde cela.", questionFor: "none" },
    },
    {
      intent: "facts",
      factKeys: ["invented"],
      dialogue: { text: "Ton code est ABCDEF", questionFor: "none" },
    },
    {
      intent: "unknown",
      amount: 1,
      status: "paid",
      dialogue: { text: "C'est réservé !", questionFor: "none" },
    },
  ]) {
    const turn = await runConciergeModel(r, g, "a".repeat(64), {
      reserve: async () => true,
      propose: async () => raw,
    });
    expect(turn.mode).toBe("guided");
    expect(turn.quote).toBeNull();
  }
});
it("retains subject changes, bounded speaker history and separate drafts, and rejects oversized histories", async () => {
  const r = request("et pour le Wi-Fi ?");
  r.dialogueHistory = [
    { role: "user", text: "un petit déjeuner" },
    { role: "assistant", text: "Pour combien de personnes ?" },
  ];
  r.savedDrafts = [{ serviceId: "bf", quantity: 2 }];
  const context = JSON.parse(modelContext(r, localGuide()));
  expect(context.dialogueHistory).toEqual(r.dialogueHistory);
  expect(context.savedDrafts).toEqual(r.savedDrafts);
  expect(
    conciergeRequestSchema.safeParse({
      ...r,
      dialogueHistory: Array.from({ length: 11 }, () => ({
        role: "user",
        text: "longue conversation",
      })),
    }).success,
  ).toBe(false);
});
it("falls back once on provider outage without an automatic retry or a false booking confirmation", async () => {
  let calls = 0;
  const r = request("un petit déjeuner"),
    g = localGuide();
  const turn = await runConciergeModel(r, g, "a".repeat(64), {
    reserve: async () => true,
    propose: async () => {
      calls++;
      throw Error("SYNTHETIC-OUTAGE");
    },
  });
  expect(calls).toBe(1);
  expect(turn.mode).toBe("guided");
  expect(turn.usage.estimatedCostMicros).toBe(20000);
  expect(turn.text).not.toContain("SYNTHETIC-OUTAGE");
});
