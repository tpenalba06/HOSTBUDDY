import { beforeEach, afterEach, afterAll, describe, it, expect, vi } from "vitest";
import { writeFile } from "node:fs/promises";
import {
  conciergeRequestSchema,
  guidedProposal,
  validateConciergeTurn,
  type ConciergeDraft,
  type ConciergeRequest,
} from "./concierge";
import { createVillaMare, demoGuide } from "@/components/demo/villa-mare-fixture";
import { readBookingConfig } from "./service-booking";
import { nonaLine, NONA_PERSONALITY_VERSION } from "./nona-personality";

beforeEach(() => vi.useFakeTimers({ now: new Date("2026-10-15T08:00:00Z") }));
afterEach(() => vi.useRealTimers());
const transcripts: {
  locale: string;
  turns: {
    guest: string;
    nona: string;
    nextStep: string | null;
    serviceIds: string[];
    quoteCents: number | null;
    mode: string;
  }[];
}[] = [];
afterAll(async () => {
  if (process.env["NONA_CAPTURE_CONVERSATIONS"] === "1")
    await writeFile(
      new URL("../../docs/evidence/nona-conversations-20261015.json", import.meta.url),
      JSON.stringify({ provider: "guided-rules-only", externalCalls: 0, transcripts }, null, 2) +
        "\n",
    );
});
function session(locale: ConciergeRequest["locale"] = "fr") {
  const guide = demoGuide(createVillaMare("fr"));
  guide.services = guide.services!.filter((s) => !/massage/i.test(s.name));
  guide.services![0]!.bookingConfig!.slots = [
    "2026-10-16T06:30:00Z",
    "2026-10-16T07:00:00Z",
    "2026-10-17T07:00:00Z",
  ];
  guide.services!.push({
    id: "massage",
    name: "Massage détente",
    description: "Massage",
    price: 50,
    pricingType: "per_person",
    bookingConfig: readBookingConfig({
      requestDate: true,
      slots: ["2026-10-16T13:00:00Z", "2026-10-16T14:00:00Z"],
      seller: "Synthetic TEST",
      cancellation: "TEST",
    }),
  });
  let draft: ConciergeDraft = {};
  const history: string[] = [];
  const savedDrafts: ConciergeDraft[] = [];
  const transcript = { locale, turns: [] as (typeof transcripts)[number]["turns"] };
  transcripts.push(transcript);
  const send = (message: string) => {
    const input = conciergeRequestSchema.parse({
      slug: "villa",
      locale,
      message,
      draft,
      history: history.slice(-6),
      savedDrafts: savedDrafts.slice(-4),
      timeZone: "Europe/Paris",
    });
    const turn = validateConciergeTurn(input, guide, guidedProposal(input, guide));
    transcript.turns.push({
      guest: message,
      nona: turn.text,
      nextStep: turn.nextStep,
      serviceIds: turn.services.map((s) => s.id),
      quoteCents: turn.quote?.totalCents ?? null,
      mode: turn.mode,
    });
    if (draft.serviceId) {
      const at = savedDrafts.findIndex((d) => d.serviceId === draft.serviceId);
      if (at >= 0) savedDrafts.splice(at, 1);
      savedDrafts.push(draft);
    }
    draft = turn.draft;
    history.push(message);
    return turn;
  };
  return { guide, send };
}
describe("Nona complete conversations, guided fallback only", () => {
  it("asks once, follows breakfast through three/tomorrow/9h/formula and verifies the existing price", () => {
    const s = session();
    const start = s.send("Je voudrais un petit-déjeuner");
    expect(start.nextStep).toBe("quantity");
    expect(start.text).toMatch(/miam|déjeuner|journée/);
    expect(s.send("Trois.").nextStep).toBe("date");
    expect(s.send("demain").nextStep).toBe("time");
    const time = s.send("vers 9 h");
    expect(time.nextStep).toBe("option");
    expect(time.draft.requestedFor).toBe("2026-10-16T07:00:00Z");
    const done = s.send("Classique");
    expect(done.nextStep).toBe("ready");
    expect(done.quote?.totalCents).toBe(7500);
    expect(done.text).toContain("rien n’est envoyé");
    expect(s.send("oui")).not.toHaveProperty("order");
  });
  it("clarifies a massage and only suggests actual afternoon slots", () => {
    const s = session();
    expect(s.send("On voudrait un massage").nextStep).toBe("quantity");
    s.send("2");
    const tomorrow = s.send("Demain après-midi");
    expect(tomorrow.nextStep).toBe("time");
    expect(tomorrow.choices.map((c) => c.label)).toEqual(["15:00", "16:00"]);
    expect(s.send("15 h").quote?.totalCents).toBe(10000);
  });
  it("routes early arrival to the host if absent, or to an assigned real service if present", () => {
    const s = session();
    expect(s.send("On arrive plus tôt que prévu").services).toEqual([]);
    s.guide.services!.push({
      id: "early",
      name: "Arrivée anticipée",
      description: "Arrivée plus tôt",
      price: 20,
      pricingType: "fixed",
      bookingConfig: readBookingConfig({ requestDate: true, seller: "TEST", cancellation: "TEST" }),
    });
    expect(s.send("On peut arriver plus tôt ?").services.map((s) => s.id)).toContain("early");
    s.send("1");
    s.send("demain");
    expect(s.send("13 h").quote?.totalCents).toBe(2000);
  });
  it("returns the exact published Wi-Fi with a copy value, or no password if absent", () => {
    const s = session();
    const wifi = s.send("J’ai besoin du Wi-Fi");
    expect(wifi.facts[0]?.text).toContain("VillaMare_5G");
    const source = s.guide.sections.find((x) => x.key.startsWith("wifi"))!;
    expect(wifi.facts[0]?.copyValue).toBe(
      source.content.items?.find((i) => /passe/.test(i.label))?.text,
    );
    s.guide.sections = [];
    const missing = s.send("Wi-Fi");
    expect(missing.facts).toEqual([]);
    expect(missing.text).toContain("ne trouve pas");
  });
  it("filters Italian recommendations, supplies exact address/link and invents none", () => {
    const s = session();
    s.guide.sections = [
      {
        id: "p",
        key: "places",
        title: "Adresses",
        content: {
          entries: [
            {
              title: "Trattoria TEST",
              text: "Cuisine italienne",
              address: "1 rue synthétique",
              mapUrl: "https://maps.google.com/?q=test",
            },
            { title: "Bistro TEST", text: "Cuisine française" },
          ],
        },
      },
    ];
    const found = s.send("Tu connais un bon italien ?");
    expect(found.places).toHaveLength(1);
    expect(found.places[0]?.address).toBe("1 rue synthétique");
    s.guide.sections[0]!.content.entries = [];
    const absent = s.send("Un italien ?");
    expect(absent.places).toEqual([]);
    expect(absent.persona).toBe("italianNone");
  });
  it("corrects date and quantity, resumes a previous request after a second service", () => {
    const s = session();
    s.send("Petit-déjeuner demain pour 3 personnes");
    s.send("9 h");
    s.send("Classique");
    expect(s.send("Finalement 4").draft.quantity).toBe(4);
    const changeTime = conciergeRequestSchema.parse({
      slug: "villa",
      locale: "fr",
      message: "plutôt 9 h",
      draft: { serviceId: "bf", quantity: 4, date: "2026-10-16" },
      timeZone: "Europe/Paris",
    });
    expect(guidedProposal(changeTime, s.guide).draft).toMatchObject({ quantity: 4, time: "09:00" });
    expect(s.send("Après-demain").draft.date).toBe("2026-10-17");
    s.send("Un massage");
    s.send("2");
    const back = s.send("Revenons au petit-déjeuner");
    expect(back.draft).toMatchObject({ serviceId: "bf", quantity: 4, date: "2026-10-17" });
  });
  it("understands hunger and a gift in the fallback without claiming general language intelligence", () => {
    const s = session();
    expect(s.send("Nona, j’ai faim !").services[0]?.id).toBe("bf");
    expect(s.send("Je voudrais faire plaisir à ma copine").services.map((s) => s.id)).toContain(
      "massage",
    );
  });
  it("drops humour for lockouts and uses only real contact details", () => {
    const s = session();
    const emergency = s.send("On est enfermés dehors, impossible de rentrer");
    expect(emergency.persona).toBe("emergency");
    expect(emergency.text).not.toMatch(/miam|🥐|🍕/);
    expect(emergency.services).toEqual([]);
    expect(emergency.text).toContain("112");
  });
  it.each([
    ["en", "Breakfast", "three", "tomorrow", "9 am"],
    ["es", "Desayuno", "tres", "mañana", "9 h"],
    ["de", "Frühstück", "drei", "morgen", "9 Uhr"],
    ["it", "Colazione", "tre", "domani", "9 h"],
    ["pt", "Pequeno-almoço", "três", "amanhã", "9 h"],
  ] as const)(
    "follows the complete dialogue in %s with source language disclosed",
    (locale, service, count, date, time) => {
      const s = session(locale);
      expect(s.send(service).nextStep).toBe("quantity");
      expect(s.send(count).nextStep).toBe("date");
      expect(s.send(date).nextStep).toBe("time");
      expect(s.send(time).nextStep).toBe("option");
      expect(s.send("Classique").quote?.totalCents).toBe(7500);
      expect(s.send("Wi-Fi").facts[0]?.original).toBe(true);
    },
  );
  it("keeps French voice familiar, versioned and free of false confirmation", () => {
    expect(NONA_PERSONALITY_VERSION).toContain(".2");
    expect(nonaLine("fr", "welcome")).toContain("t’aider");
    const s = session();
    for (const text of ["Bonjour", "Petit-déjeuner", "3", "demain", "9 h", "Classique", "suivi"]) {
      const r = s.send(text);
      expect(r.text).not.toMatch(/\b(?:vous|votre|veuillez)\b/i);
    }
  });
});
