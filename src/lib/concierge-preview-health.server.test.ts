import { afterEach, expect, it, vi } from "vitest";
import { conciergePreviewHealth } from "./concierge-preview-health.server";
import { NONA_PRIVATE_PREVIEW_HOST } from "./concierge-preview";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
const origin = `https://${NONA_PRIVATE_PREVIEW_HOST}`;
it("refuses foreign and production diagnostics without network access", async () => {
  const fetcher = vi.spyOn(globalThis, "fetch");
  for (const request of [
    new Request("https://nonaguide.lovable.app/api/public/concierge-preview"),
    new Request(origin, { headers: { origin: "https://foreign.invalid" } }),
    new Request(origin, { headers: { "sec-fetch-site": "cross-site" } }),
    new Request(origin, { method: "POST" }),
  ])
    expect((await conciergePreviewHealth(request)).status).toBe(403);
  vi.stubEnv("VERCEL_ENV", "production");
  expect((await conciergePreviewHealth(new Request(origin))).status).toBe(403);
  expect(fetcher).not.toHaveBeenCalled();
});
it("only reads the public catalogue and never leaks provider error content or secrets", async () => {
  vi.stubEnv("OLLAMA_API_KEY", "private-value-must-not-leak");
  const fetcher = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response("private-error-content", { status: 403 }));
  const response = await conciergePreviewHealth(new Request(origin));
  expect(await response.json()).toMatchObject({
    modelCalls: 0,
    ledgerMutations: 0,
    catalogue: { status: 403, compatible: false, reason: "catalogue-http-rejected" },
  });
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0]![0]).toBe("https://ollama.com/api/tags");
  expect(fetcher.mock.calls[0]![1]).toMatchObject({
    redirect: "manual",
    headers: { "cache-control": "no-store" },
  });
  expect(fetcher.mock.calls[0]![1]?.headers).not.toHaveProperty("authorization");
});
it("recognizes the required tools without returning raw catalogue data", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    Response.json({
      models: [{ name: "gemma4:31b", capabilities: ["completion", "tools"], private: "omit" }],
    }),
  );
  expect(await (await conciergePreviewHealth(new Request(origin))).json()).toMatchObject({
    modelCalls: 0,
    ledgerMutations: 0,
    catalogue: { status: 200, compatible: true, reason: "catalogue-ready" },
  });
});
