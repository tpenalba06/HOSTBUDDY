import { afterEach, expect, it, vi } from "vitest";
import { conciergePreviewResponse } from "./concierge-preview.server";
import { NONA_PRIVATE_PREVIEW_HOST, isNonaPrivatePreviewHost } from "./concierge-preview";

afterEach(() => vi.unstubAllEnvs());
const origin = `https://${NONA_PRIVATE_PREVIEW_HOST}`;
const request = (base = origin, suppliedOrigin = base, slug = "villa-mare-demo") =>
  new Request(`${base}/api/public/concierge-preview`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: suppliedOrigin },
    body: JSON.stringify({
      slug,
      locale: "fr",
      message: "Bonjour",
      requestId: crypto.randomUUID(),
      conversationId: crypto.randomUUID(),
    }),
  });

it("rejects published domains, lookalikes, foreign origins and production before any network", async () => {
  const fetcher = vi.spyOn(globalThis, "fetch");
  for (const host of [
    "host-buddy-concierge.lovable.app",
    `${NONA_PRIVATE_PREVIEW_HOST}.example.invalid`,
  ]) {
    expect(isNonaPrivatePreviewHost(host)).toBe(false);
    expect((await conciergePreviewResponse(request(`https://${host}`))).status).toBe(403);
  }
  expect(
    (await conciergePreviewResponse(request(origin, "https://foreign.example.invalid"))).status,
  ).toBe(403);
  vi.stubEnv("VERCEL_ENV", "production");
  expect((await conciergePreviewResponse(request())).status).toBe(403);
  expect(fetcher).not.toHaveBeenCalled();
  fetcher.mockRestore();
});

it("keeps the synthetic preview guided with no private TEST setup, even with product credentials", async () => {
  vi.stubEnv("NONA_TEST_SUPABASE_SERVICE_ROLE_KEY", "");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "product-key-never-sent");
  vi.stubEnv("OLLAMA_API_KEY", "provider-key-never-sent");
  const fetcher = vi.spyOn(globalThis, "fetch");
  const response = await conciergePreviewResponse(request());
  expect(response.status).toBe(200);
  const turn = await response.json();
  expect(turn.mode).toBe("guided");
  expect(turn.usage.modelCalls).toBe(0);
  expect(JSON.stringify(turn)).not.toContain("key-never-sent");
  expect(fetcher).not.toHaveBeenCalled();
  fetcher.mockRestore();
});

it("does not accept a browser-selected property or unrelated slug", async () => {
  expect((await conciergePreviewResponse(request(origin, origin, "another-tenant"))).status).toBe(
    400,
  );
});
