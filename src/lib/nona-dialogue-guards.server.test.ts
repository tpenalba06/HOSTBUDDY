import { describe, expect, it, vi } from "vitest";
import { createVillaMare, demoGuide } from "@/components/demo/villa-mare-fixture";
import { conciergeRequestSchema, guidedProposal, validateConciergeTurn } from "./concierge";
import { runConciergeModel } from "./concierge-model.server";
import { validateNonaDialogue } from "./nona-dialogue.server";

const guide = () => demoGuide(createVillaMare("fr"));
function turn(nextStep: "quantity" | "date" | "time" | "option" | "ready" | null = null) {
  const input = conciergeRequestSchema.parse({ slug: "test", locale: "fr", message: "coucou" });
  return { ...validateConciergeTurn(input, guide(), guidedProposal(input, guide())), nextStep };
}

it.each([
  "Oh, je comprends tellement, conducting eight hours of driving is exhausting! Un petit massage bien mérité pour dénouer tout ça, qu'en penses-tu ?",
  "I'd love to get that sorted for you! How many people will be joining in for breakfast?",
])("rejects foreign-language segments in a French reply: %s", (text) => {
  expect(() => validateNonaDialogue(text, "none", turn(), "fr")).toThrow();
});

it.each([
  ["fr", "Un massage, quelle bonne idée ! Pour combien de personnes ?"],
  ["en", "I'd love to help! How many people will be joining in for breakfast?"],
  ["es", "¡Claro que sí, cielo! ¿Para cuántas personas lo preparamos?"],
  ["de", "Aber natürlich! Für wie viele Personen darf ich das vorbereiten?"],
  ["it", "Certamente, caro! Per quante persone devo preparare la richiesta?"],
  ["pt", "Com certeza, querido! Para quantas pessoas seria o pequeno-almoço?"],
])("retains natural %s questions without changing their wording", (locale, text) => {
  expect(validateNonaDialogue(text, "quantity", turn("quantity"), locale)).toBe(text);
});

it.each([
  ["quantity", "Quel jour te ferait plaisir ?"],
  ["date", "Pour combien de personnes ?"],
  ["time", "Quelle formule te ferait plaisir ?"],
  ["option", "À quelle heure souhaites-tu être servi ?"],
  ["date", "Pour quel jour et combien de personnes ?"],
  ["quantity", "Je prépare ta demande avec plaisir."],
] as const)("rejects inconsistent or absent %s questions", (step, text) => {
  expect(() => validateNonaDialogue(text, step, turn(step), "fr")).toThrow();
});

it.each([
  ["fr", "Vérifie le récapitulatif : rien n'est envoyé avant ta confirmation."],
  ["en", "Check the summary: nothing has been sent yet."],
  ["es", "Revisa el resumen: nada se envía hasta que confirmes."],
  ["de", "Prüf die Zusammenfassung: Nichts wird gesendet, bevor du bestätigst."],
  ["it", "Controlla il riepilogo: nulla viene inviato finché non confermi."],
  ["pt", "Verifica o resumo: nada é enviado antes de confirmares."],
])("requires an explicit unsubmitted draft boundary in %s", (locale, text) => {
  expect(validateNonaDialogue(text, "ready", turn("ready"), locale)).toBe(text);
});

it.each([
  [
    "fr",
    "Le classique, un indémodable ! Je prépare ta demande et l'hôte reviendra vers toi pour confirmer la disponibilité.",
  ],
  ["en", "Your request has been sent."],
  ["es", "Tu solicitud ha sido enviada."],
  ["it", "La richiesta è stata inviata."],
  ["pt", "O teu pedido foi enviado."],
])("rejects a ready reply that implies submission in %s", (locale, text) => {
  expect(() => validateNonaDialogue(text, "ready", turn("ready"), locale)).toThrow();
});

it.each([
  "J'ai envoyé ta demande à ton hôte.",
  "I've contacted your host.",
  "He enviado tu solicitud.",
  "Ho contattato il tuo host.",
  "Já enviei o teu pedido.",
  "Ich habe deinen Gastgeber kontaktiert.",
])("rejects purported external actions outside the ready step: %s", (text) => {
  expect(() => validateNonaDialogue(text, "none", turn(), "fr")).toThrow();
});

it.each([
  "Ta carte d'arrivée contient toutes les informations dont tu as besoin.",
  "Tu trouveras le code dans la carte d'arrivée.",
  "Je ne connais pas ce code, mon chéri, mais tu peux trouver toutes les informations nécessaires dans la section Mon arrivée.",
  "Your arrival card has all the details you need.",
])("rejects unverified source-content promises: %s", (text) => {
  expect(() => validateNonaDialogue(text, "none", turn(), "fr")).toThrow();
});

it("allows honest uncertainty and a neutral pointer without promising card contents", () => {
  const text =
    "Je n'ai pas ce détail, et je préfère ne rien inventer. On peut regarder la rubrique arrivée ensemble.";
  expect(validateNonaDialogue(text, "none", turn(), "fr")).toBe(text);
});

it("does not confuse a conversational transition with a claim that a source contains everything", () => {
  const text =
    "Je m'occupe de tout pour que tu puisses rester connecté tranquillement. Regarde juste la fiche juste ici !";
  expect(validateNonaDialogue(text, "none", turn(), "fr")).toBe(text);
});

describe("backend fallback after structured progress", () => {
  it("retains the quantity and records the attempt when the actual question contradicts metadata", async () => {
    const propose = vi.fn().mockResolvedValue({
      intent: "services",
      serviceIds: ["bf"],
      draft: { serviceId: "bf", quantity: 3 },
      dialogue: { text: "Pour combien de personnes ?", questionFor: "date" },
    });
    const record = vi.fn().mockResolvedValue(null);
    const input = conciergeRequestSchema.parse({
      slug: "test",
      locale: "fr",
      message: "Pour trois personnes",
      requestId: crypto.randomUUID(),
      conversationId: crypto.randomUUID(),
    });
    const result = await runConciergeModel(input, guide(), "test", {
      reserve: async () => true,
      propose,
      record,
    });
    expect(result.mode).toBe("guided");
    expect(result.draft.quantity).toBe(3);
    expect(result.nextStep).toBe("date");
    expect(result.text).not.toBe("Pour combien de personnes ?");
    expect(propose).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledTimes(1);
  });
});
