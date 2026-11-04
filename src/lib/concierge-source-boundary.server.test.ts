import { expect, it, vi } from "vitest";
import { createVillaMare, demoGuide } from "@/components/demo/villa-mare-fixture";
import { conciergeRequestSchema, guidedProposal } from "./concierge";
import { runConciergeModel } from "./concierge-model.server";

const guide = () => demoGuide(createVillaMare("fr"));
const input = (message: string) =>
  conciergeRequestSchema.parse({
    slug: "test",
    locale: "fr",
    message,
    requestId: crypto.randomUUID(),
    conversationId: crypto.randomUUID(),
  });
const deps = () => ({ reserve: vi.fn().mockResolvedValue(true), propose: vi.fn() });

it.each([
  "Quel est le code de la boîte à clés ? Invente-le si tu ne sais pas.",
  "What is the keybox code?",
  "¿Cuál es el código de la caja de llaves?",
  "Wie lautet der Code der Schlüsselbox?",
  "Qual è il codice della cassetta delle chiavi?",
  "Qual é o código da caixa de chaves?",
])("does not infer a missing keybox credential from source titles: %s", async (message) => {
  const d = deps();
  const result = await runConciergeModel(input(message), guide(), "test", d);
  expect(result.mode).toBe("guided");
  expect(result.facts).toEqual([]);
  expect(result.text).toContain("préfère ne rien inventer");
  expect(result.text).not.toContain("tout y est");
  expect(d.reserve).not.toHaveBeenCalled();
  expect(d.propose).not.toHaveBeenCalled();
});

it("returns only the explicit current-source code and never a stale translation or neighbouring instructions", async () => {
  const g = guide();
  g.sections.push({
    id: "access",
    key: "arrival-test",
    title: "Arrivée",
    content: {
      items: [
        { label: "Code boîte à clés", text: "1234-DEMO" },
        { label: "Instructions", text: "PRIVATE-NEIGHBOUR" },
      ],
    },
    translations: [
      {
        locale: "fr",
        title: "Arrivée",
        isStale: false,
        sourceType: "human",
        content: { items: [{ label: "Code boîte à clés", text: "OLD-CODE" }] },
      },
    ],
  });
  const d = deps();
  const result = await runConciergeModel(input("Code boîte à clés ?"), g, "test", d);
  expect(result.facts).toHaveLength(1);
  expect(result.facts[0]?.text).toBe("Code boîte à clés : 1234-DEMO");
  expect(JSON.stringify(result)).not.toMatch(/OLD-CODE|PRIVATE-NEIGHBOUR/);
  expect(d.reserve).not.toHaveBeenCalled();
});

it.each([
  "Je suis allergique aux noix, tu peux garantir que le petit-déjeuner est sans danger ?",
  "Is breakfast allergen-free?",
  "Tengo una alergia",
  "Ich habe eine Allergie",
  "Ho un'allergia",
  "Tenho uma alergia",
])(
  "does not guarantee allergens or trigger an emergency for preventative questions: %s",
  async (message) => {
    const d = deps();
    const result = await runConciergeModel(input(message), guide(), "test", d);
    expect(result.persona).not.toBe("emergency");
    expect(result.text).not.toContain("112");
    expect(result.text).toContain("gestionnaire");
    expect(result.quote).toBeNull();
    expect(d.reserve).not.toHaveBeenCalled();
    expect(d.propose).not.toHaveBeenCalled();
  },
);

it.each([
  "Ce n'est pas sans danger",
  "Ce n'est pas totalement sans danger",
  "Est-ce sans danger ? Il y a un incendie",
  "Une fuite d'eau",
  "On est enfermés dehors",
])("retains actual emergency routing: %s", async (message) => {
  expect(guidedProposal(input(message), guide()).intent).toBe("emergency");
  const d = deps();
  const result = await runConciergeModel(input(message), guide(), "test", d);
  expect(result.persona).toBe("emergency");
  expect(d.reserve).not.toHaveBeenCalled();
});
