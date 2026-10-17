import { expect, it } from "vitest";
import { conciergeRequestSchema, guidedProposal, validateConciergeTurn } from "./concierge";
import { modelContext, runConciergeModel } from "./concierge-model.server";
import { nonaModelResponseSchema } from "./nona-dialogue.server";
import { createVillaMare, demoGuide } from "@/components/demo/villa-mare-fixture";

const guide = () => demoGuide(createVillaMare("fr"));
const request = (message: string) =>
  conciergeRequestSchema.parse({
    slug: "villa",
    locale: "fr",
    message,
    requestId: crypto.randomUUID(),
    conversationId: crypto.randomUUID(),
  });
it("retains both speakers and redacts contacts without sending source bodies", () => {
  const input = request("et demain ?");
  input.dialogueHistory = [
    { role: "assistant", text: "Quel jour te ferait plaisir ?" },
    { role: "user", text: "contact@example.invalid" },
  ];
  const context = JSON.parse(modelContext(input, guide()));
  expect(context.dialogueHistory[0]).toEqual(input.dialogueHistory[0]);
  expect(context.dialogueHistory[1].text).toBe("[contact]");
});
it("accepts independently generated wording, rather than prepending it to a scripted answer", async () => {
  const text = "Ton estomac a pris les commandes, je vois ! Qu'est-ce qui te ferait plaisir ?";
  const turn = await runConciergeModel(
    request("J'ai faim mais je sais pas quoi"),
    guide(),
    "hash",
    {
      reserve: async () => true,
      propose: async () => ({ intent: "unknown", dialogue: { text, questionFor: "none" } }),
    },
  );
  expect(turn.mode).toBe("ai");
  expect(turn.text).toBe(text);
  expect(turn.quote).toBeNull();
});
it("rejects unknown source IDs and retains the entire attempt reservation", async () => {
  const turn = await runConciergeModel(request("un cadeau"), guide(), "hash", {
    reserve: async () => true,
    propose: async () => ({
      intent: "services",
      serviceIds: ["invented"],
      dialogue: { text: "Une petite attention, quelle belle idée !", questionFor: "none" },
    }),
  });
  expect(turn.mode).toBe("guided");
  expect(turn.usage.estimatedCostMicros).toBe(20000);
});
it("cannot skip required fields by claiming readiness or invent booking actions", () => {
  const input = request("Petit déjeuner");
  const turn = validateConciergeTurn(
    input,
    guide(),
    guidedProposal(input, guide()),
    new Date(),
    "ready",
  );
  expect(turn.nextStep).toBe("quantity");
  expect(
    nonaModelResponseSchema.safeParse({
      intent: "services",
      action: "book",
      dialogue: { text: "Avec plaisir", questionFor: "ready" },
    }).success,
  ).toBe(false);
});
it("guided massage questions use neutral vocabulary, for every variant", () => {
  for (let i = 0; i < 10; i++) {
    const g = guide();
    const service = {
      ...g.services![0]!,
      id: "massage-test",
      name: "Massage",
      description: "Un moment de détente",
    };
    g.services = [service];
    const input = request("Un massage " + "!".repeat(i));
    const turn = validateConciergeTurn(input, g, {
      intent: "services",
      serviceIds: [service.id],
      tonalHint: "massage",
    });
    expect(turn.text).not.toMatch(/gourmand|miam|croissant/i);
  }
});
