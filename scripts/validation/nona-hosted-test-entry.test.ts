import { afterEach, expect, it, vi } from "vitest";
import { hostedTestResponse } from "./nona-hosted-test-entry";
import type { ConciergeTurn } from "../../src/lib/concierge";
import { slotTime, zonedDate } from "../../src/lib/concierge";
import { localGuide } from "./nona-local-fixture";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
const request = (kind = "guide", body?: unknown, headers: Record<string, string> = {}) =>
  new Request(`https://test.example/api/test?kind=${kind}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
it("exposes a clearly synthetic guide without customer data or inference", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const response = await hostedTestResponse(request());
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect((await response.json()).name).toContain("données fictives");
  expect(fetcher).not.toHaveBeenCalled();
});
it("refuses a production runtime and cross-site access", async () => {
  expect(
    (await hostedTestResponse(request("guide", undefined, { origin: "https://foreign.example" })))
      .status,
  ).toBe(403);
  vi.stubEnv("VERCEL_ENV", "production");
  expect((await hostedTestResponse(request())).status).toBe(403);
});
it("has no order or payment endpoint and refuses malformed and foreign guide requests", async () => {
  expect((await hostedTestResponse(request("order", {}))).status).toBe(405);
  expect((await hostedTestResponse(request("payment", {}))).status).toBe(405);
  expect(
    (
      await hostedTestResponse(
        request("chat", { slug: "foreign", locale: "fr", message: "Coucou" }),
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await hostedTestResponse(
        request("chat", { slug: "nona-hosted-test", message: "x".repeat(13000) }),
      )
    ).status,
  ).toBe(400);
});
it("calculates the breakfast draft at 75 EUR with inactive AI, without submitting anything", async () => {
  vi.stubEnv("OLLAMA_API_KEY", "");
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  let draft = {};
  let turn: ConciergeTurn | undefined;
  const slot = localGuide().services!.find((s) => s.id === "bf")!.bookingConfig!.slots[0]!;
  for (const message of [
    `Petit-déjeuner pour le ${zonedDate(new Date(slot), "Europe/Paris")}`,
    "Pour trois personnes",
    slotTime(slot, "Europe/Paris"),
    "Classique",
  ]) {
    const response = await hostedTestResponse(
      request("chat", {
        slug: "nona-hosted-test",
        locale: "fr",
        message,
        draft,
        timeZone: "Europe/Paris",
        requestId: crypto.randomUUID(),
        conversationId: crypto.randomUUID(),
      }),
    );
    expect(response.status).toBe(200);
    turn = await response.json();
    draft = turn.draft;
    expect(turn.mode).toBe("guided");
    expect(turn.usage.modelCalls).toBe(0);
  }
  expect(turn?.nextStep).toBe("ready");
  expect(turn?.quote?.totalCents).toBe(7500);
  expect(fetcher).not.toHaveBeenCalled();
});
