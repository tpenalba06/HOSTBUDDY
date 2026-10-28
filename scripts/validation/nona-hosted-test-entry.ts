import { createHash } from "node:crypto";
import { localGuide } from "./nona-local-fixture";
import { conciergeRequestSchema } from "../../src/lib/concierge";
import { runConciergeModel } from "../../src/lib/concierge-model.server";
import { conciergeIdentity } from "../../src/lib/concierge-identity.server";
import { createHostedOllamaTestDependencies } from "../../src/lib/concierge-ollama-hosted.server";
import { readPublicJson } from "../../src/lib/public-json";

// Isolated synthetic TEST only. Same shared business validator and renderer.
// No order, payment, manager, import, customer or production endpoint exists.
export async function hostedTestResponse(request: Request) {
  const url = new URL(request.url);
  const headers: Record<string, string> = {
    "cache-control": "no-store",
    "referrer-policy": "no-referrer",
  };
  if (process.env.VERCEL_ENV === "production") return new Response(null, { status: 403, headers });
  const origin = request.headers.get("origin");
  if ((origin && origin !== url.origin) || request.headers.get("sec-fetch-site") === "cross-site")
    return new Response(null, { status: 403, headers });
  const locale = url.searchParams.get("locale") || "fr";
  if (!["fr", "en", "es", "de", "it", "pt"].includes(locale))
    return new Response(null, { status: 400, headers });
  const guide = localGuide(locale as "fr");
  guide.id = process.env.NONA_OLLAMA_TEST_PROPERTY_ID || "nona-inactive-test-fixture";
  guide.name = "Villa Mare — démonstration TEST, données fictives";
  if (url.searchParams.get("kind") === "guide" && request.method === "GET")
    return Response.json(guide, { headers });
  if (url.searchParams.get("kind") !== "chat" || request.method !== "POST")
    return new Response(null, { status: 405, headers });
  const checked = conciergeRequestSchema.safeParse(await readPublicJson(request, 12288));
  if (
    !checked.success ||
    checked.data.slug !== (process.env.NONA_OLLAMA_TEST_SLUG || "nona-hosted-test")
  )
    return new Response(null, { status: 400, headers });
  const input = checked.data;
  const localized = localGuide(input.locale);
  localized.id = guide.id;
  localized.name = guide.name;
  const identity = conciergeIdentity(request, process.env.NONA_CONCIERGE_SESSION_SECRET, "vercel");
  if (identity?.setCookie) headers["set-cookie"] = identity.setCookie;
  const fingerprint =
    identity?.networkHash || createHash("sha256").update("shared-closed-test").digest("hex");
  const turn = await runConciergeModel(
    input,
    localized,
    fingerprint,
    createHostedOllamaTestDependencies(identity),
  );
  return Response.json(turn, { headers });
}
