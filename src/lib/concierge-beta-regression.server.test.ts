import { afterEach, expect, it, vi } from "vitest";
import { conciergeRequestSchema, guidedProposal, validateConciergeTurn } from "./concierge";
import { modelContext, runConciergeModel, MAX_PROMPT_BYTES } from "./concierge-model.server";
import { localGuide } from "../../scripts/validation/nona-local-fixture";

// Synthetic provider proposals: regression coverage, NOT new Gemma evaluations.
const ready = {
  serviceId: "bf",
  quantity: 3,
  date: "2026-10-21",
  time: "10:30",
  optionId: localGuide().services!.find((s) => s.id === "bf")!.bookingConfig!.options[0]!.id,
};
const request = (message: string, locale = "fr") =>
  conciergeRequestSchema.parse({
    slug: "test",
    message,
    locale,
    draft: ready,
    timeZone: "Europe/Paris",
    requestId: crypto.randomUUID(),
    conversationId: crypto.randomUUID(),
  });
afterEach(() => vi.useRealTimers());

it("redacts translated credentials and contacts when repeated in long conversation context", () => {
  const guide = localGuide();
  guide.sections.push({
    id: "privacy-fixture",
    key: "arrival-private",
    title: "Arrival",
    content: {},
    translations: [
      {
        locale: "de",
        title: "Anreise",
        isStale: false,
        sourceType: "human",
        content: {
          items: [{ label: "Zugangscode", text: "SYNTHETIC-PRIVATE-CREDENTIAL" }],
          emails: ["private-host@example.invalid"],
        },
      },
    ],
  });
  const secret = "SYNTHETIC-PRIVATE-CREDENTIAL private-host@example.invalid";
  const context = modelContext(
    { ...request(secret), dialogueHistory: [{ role: "user", text: secret }], history: [secret] },
    guide,
  );
  expect(context).not.toContain("SYNTHETIC-PRIVATE-CREDENTIAL");
  expect(context).not.toContain("private-host@example.invalid");
});

it.each([
  [
    "fr",
    "Merci. On fête notre anniversaire ici, qu’est-ce qu’on pourrait faire pour se détendre après le trajet ?",
    "Quel joli moment à partager ! On peut regarder les services de détente ensemble, si tu en as envie.",
  ],
  [
    "de",
    "Hallo Nona, wir sind zum ersten Mal hier und feiern unseren Hochzeitstag. Hast du einen lieben Rat für einen entspannten Start?",
    "Alles Liebe zum Hochzeitstag! Lass erst einmal die Seele baumeln und genießt eure gemeinsame Auszeit.",
  ],
  [
    "en",
    "Let's change the subject, it's our anniversary.",
    "Happy anniversary! Take a little breath together and enjoy being here.",
  ],
  [
    "es",
    "Hoy es nuestro aniversario.",
    "¡Feliz aniversario! Qué alegría compartir un momento tan bonito contigo.",
  ],
  [
    "it",
    "Festeggiamo il nostro anniversario.",
    "Buon anniversario! Che bello ritagliarsi un momento di dolcezza insieme.",
  ],
  [
    "pt",
    "É o nosso aniversário de casamento.",
    "Que alegria celebrar esse carinho! Desejo que aproveites este momento com muita tranquilidade.",
  ],
])(
  "keeps %s social conversation separate from the saved breakfast",
  async (locale, message, text) => {
    vi.useFakeTimers({ now: new Date("2026-10-20T08:00:00Z") });
    const input = request(message, locale);
    const propose = vi.fn(async () => ({
      intent: "services",
      serviceIds: ["massage"],
      draft: { serviceId: "massage", quantity: 9 },
      dialogue: { text, questionFor: "none" },
    }));
    const guide = localGuide();
    const massage = guide.services!.find((s) => /massage/i.test(s.name))!;
    // The fixture's exact ID is authoritative.
    const deps = {
      reserve: async () => true,
      propose: async () => ({ ...(await propose()), serviceIds: [massage.id] }),
    };
    const turn = await runConciergeModel(input, guide, "hash", deps);
    expect(turn.mode).toBe("ai");
    expect(turn.text).toBe(text);
    expect(turn.nextStep).toBeNull();
    expect(turn.quote).toBeNull();
    expect(turn.draft).toMatchObject(ready);
    expect(turn.services.map((s) => s.id)).toEqual([massage.id]);
    expect(propose).toHaveBeenCalledTimes(1);
  },
);

it("does not show a stale quote during a source lookup or an unknown topic", () => {
  vi.useFakeTimers({ now: new Date("2026-10-20T08:00:00Z") });
  for (const message of ["Wi-Fi", "Qui a construit la lune ?"]) {
    const input = request(message);
    const turn = validateConciergeTurn(input, localGuide(), guidedProposal(input, localGuide()));
    expect(turn.nextStep).toBeNull();
    expect(turn.quote).toBeNull();
    expect(turn.draft.serviceId).toBe("bf");
  }
});

it("gives the model a validated massage focus without inheriting breakfast fields", async () => {
  vi.useFakeTimers({ now: new Date("2026-10-20T08:00:00Z") });
  const input = request("Je change de sujet : je voudrais un massage demain, pour une personne.");
  const guide = localGuide();
  const context = JSON.parse(modelContext(input, guide));
  const massage = guide.services!.find((s) => /massage/i.test(s.name))!;
  expect(context.latestBookingHint.draft).toMatchObject({
    serviceId: massage.id,
    quantity: 1,
    date: "2026-10-21",
  });
  expect(context.latestBookingHint.draft.optionId).toBeUndefined();
  expect(context.latestBookingHint.draft.time).toBeUndefined();
  const turn = await runConciergeModel(input, guide, "hash", {
    reserve: async () => true,
    propose: async () => ({
      intent: "services",
      serviceIds: [massage.id],
      draft: context.latestBookingHint.draft,
      dialogue: {
        text: "Un peu de détente, ça fait du bien ! À quelle heure tu aimerais ce massage ?",
        questionFor: "time",
      },
    }),
  });
  expect(turn.mode).toBe("ai");
  expect(turn.nextStep).toBe("time");
  expect(turn.quote).toBeNull();
  expect(turn.draft.quantity).toBe(1);
});

it("retains recent dialogue and saved booking state within the prompt budget", () => {
  const input = {
    ...request("MESSAGE LE PLUS RÉCENT"),
    history: Array(6).fill("DUPLICATE".repeat(100)),
    dialogueHistory: Array.from({ length: 10 }, (_, i) => ({
      role: "user" as const,
      text: `${i}:` + "é".repeat(690),
    })),
  };
  const prompt = modelContext(input, localGuide());
  const context = JSON.parse(prompt);
  expect(Buffer.byteLength(prompt)).toBeLessThanOrEqual(MAX_PROMPT_BYTES);
  expect(context.message).toBe("MESSAGE LE PLUS RÉCENT");
  expect(context.dialogueHistory.at(-1).text).toBe(input.dialogueHistory.at(-1)!.text);
  expect(context.history).toEqual([]);
  expect(context.draft).toMatchObject(ready);
});

it("diagnoses rejected prose without recording it or allowing a telemetry error to break fallback", async () => {
  const onDiagnostic = vi.fn();
  const deps = {
    reserve: async () => true,
    propose: async () => ({
      intent: "greeting",
      dialogue: { text: "PRIVATE prose 123", questionFor: "none" },
    }),
    onDiagnostic,
  };
  const turn = await runConciergeModel(request("coucou"), localGuide(), "hash", deps);
  expect(turn.mode).toBe("guided");
  expect(onDiagnostic).toHaveBeenCalledWith({ stage: "dialogue", reason: "untrusted-dialogue" });
  expect(JSON.stringify(onDiagnostic.mock.calls)).not.toContain("PRIVATE");
  await expect(
    runConciergeModel(request("coucou"), localGuide(), "hash", {
      ...deps,
      onDiagnostic: () => {
        throw new Error("telemetry");
      },
    }),
  ).resolves.toMatchObject({ mode: "guided" });
});
