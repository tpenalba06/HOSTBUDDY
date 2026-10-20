import { expect, it } from "vitest";
import { conciergeRequestSchema } from "./concierge";
import { runLocalNona, LOCAL_NONA_MODEL, LOCAL_NONA_ORIGIN } from "./nona-local-model.server";
import { localGuide } from "../../scripts/validation/nona-local-fixture";

const request = (message: string) =>
  conciergeRequestSchema.parse({ slug: "nona-local", locale: "fr", message });
const response = (value: unknown) =>
  new Response(
    JSON.stringify({
      model: LOCAL_NONA_MODEL,
      done: true,
      done_reason: "stop",
      message: { content: JSON.stringify(value) },
      prompt_eval_count: 50,
      eval_count: 20,
    }),
  );

it("retries a French reply when English was selected and preserves the selected output language", async () => {
  let calls = 0;
  const input = conciergeRequestSchema.parse({
    slug: "nona-local",
    locale: "en",
    message: "How do I connect to Wi-Fi?",
  });
  const turn = await runLocalNona(input, localGuide("en"), async (_url, options) => {
    const wire = JSON.parse(options!.body as string);
    expect(wire.messages[0].content).toContain("FINAL OUTPUT LANGUAGE: English");
    return response({
      text:
        ++calls === 1
          ? "Bonjour, regarde les informations ci-dessous."
          : "You'll find the connection details in the cards below.",
    });
  });
  expect(turn.text).toBe("You'll find the connection details in the cards below.");
  expect(turn.usage).toEqual({ modelCalls: 2, estimatedCostMicros: 0 });
});

it("accepts a natural question naming only published breakfast options", async () => {
  const guide = localGuide();
  const breakfast = guide.services!.find((service) => service.id === "bf")!;
  const input = conciergeRequestSchema.parse({
    slug: "nona-local",
    locale: "fr",
    message: "Petit-déjeuner",
    draft: {
      serviceId: breakfast.id,
      quantity: 2,
      requestedFor: breakfast.bookingConfig!.slots[0],
    },
  });
  const turn = await runLocalNona(input, guide, async () =>
    response({ text: "Quelle formule préfères-tu, Classique ou Végétarien ?" }),
  );
  expect(turn.nextStep).toBe("option");
  expect(turn.usage.modelCalls).toBe(1);
  expect(turn.quote).toBeNull();
});

it("generates original dialogue locally, while the shared server calculates missing fields and never reserves paid budget", async () => {
  const guide = localGuide();
  const calls: { url: string; wire: Record<string, unknown> }[] = [];
  const turn = await runLocalNona(request("Un massage pour deux"), guide, async (url, options) => {
    expect(options?.redirect).toBe("error");
    expect(options?.headers).toEqual({ "content-type": "application/json" });
    const wire = JSON.parse(options?.body as string);
    calls.push({ url: String(url), wire });
    return response({
      text: "Tes épaules vont apprécier la pause ! Quel jour te ferait plaisir ?",
    });
  });
  expect(turn.mode).toBe("ai");
  expect(turn.text).toContain("Tes épaules");
  expect(turn.nextStep).toBe("date");
  expect(turn.quote).toBeNull();
  expect(turn.usage).toEqual({ modelCalls: 1, estimatedCostMicros: 0 });
  expect(calls.every((call) => call.url === LOCAL_NONA_ORIGIN + "/api/chat")).toBe(true);
  expect(
    calls.every((call) => call.wire["model"] === LOCAL_NONA_MODEL && !("tools" in call.wire)),
  ).toBe(true);
  const prompt = JSON.stringify(calls[0]);
  expect(prompt).not.toContain("Hmmm, miam");
  expect(prompt).toContain("etapeSuivante");
});

it("cannot let the model mutate business fields or invent source identifiers", async () => {
  let calls = 0;
  await expect(
    runLocalNona(request("Un massage"), localGuide(), async () => {
      calls++;
      return response({
        text: "Avec plaisir !",
        serviceIds: ["invented"],
        draft: { quantity: 20 },
      });
    }),
  ).rejects.toThrow();
  expect(calls).toBe(1);
});

it("rejects a generated booking confirmation and disallowed business action", async () => {
  await expect(
    runLocalNona(request("Bonjour"), localGuide(), async () => {
      return response({ text: "C'est réservé et confirmé !" });
    }),
  ).rejects.toThrow("untrusted-dialogue");
  await expect(
    runLocalNona(request("Bonjour"), localGuide(), async () =>
      response({ intent: "greeting", action: "book", serviceIds: [], factKeys: [], draft: {} }),
    ),
  ).rejects.toThrow();
});

it("retains the shared emergency path without calling the model and labels it accurately", async () => {
  const turn = await runLocalNona(request("Urgence incendie"), localGuide(), async () => {
    throw new Error("Model must not be called");
  });
  expect(turn.mode).toBe("guided");
  expect(turn.provider).toBe("server-rules");
  expect(turn.usage.modelCalls).toBe(0);
});

it("keeps a supplied instant in the authoritative draft without sending its numeric literal to the voice model", async () => {
  let wire = "";
  const input = conciergeRequestSchema.parse({
    slug: "nona-local",
    locale: "fr",
    timeZone: "Europe/Paris",
    message: "Un massage pour 2 demain à 14:00",
  });
  const turn = await runLocalNona(input, localGuide(), async (url, options) => {
    wire = options?.body as string;
    return response({
      text: "Tu peux vérifier le récapitulatif : rien n'est envoyé avant ta confirmation.",
    });
  });
  expect(turn.draft.quantity).toBe(2);
  expect(turn.draft.time).toBe("14:00");
  expect(turn.nextStep).toBe("ready");
  expect(turn.quote?.totalCents).toBeGreaterThan(0);
  expect(wire).not.toContain("14:00");
  expect(turn.usage.estimatedCostMicros).toBe(0);
});
