import { createVillaMare, demoGuide } from "@/components/demo/villa-mare-fixture";
import { conciergeRequestSchema, guidedProposal, validateConciergeTurn } from "./concierge";
import { isNonaPrivatePreviewHost } from "./concierge-preview";
import { readPublicJson } from "./public-json";
import { conciergeIdentity } from "./concierge-identity.server";
import { createHostedOllamaTestDependencies } from "./concierge-ollama-hosted.server";
import { runConciergeModel } from "./concierge-model.server";

/** Private editor recipe only. No product database, order or payment transport. */
export async function conciergePreviewResponse(request: Request) {
  const headers: Record<string, string> = { "cache-control": "no-store" };
  const url = new URL(request.url);
  if (
    request.method !== "POST" ||
    !isNonaPrivatePreviewHost(url.hostname) ||
    url.protocol !== "https:" ||
    process.env["VERCEL_ENV"] === "production" ||
    request.headers.get("origin") !== url.origin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    return new Response(null, { status: 403, headers });
  const checked = conciergeRequestSchema.safeParse(await readPublicJson(request, 12288));
  if (!checked.success || checked.data.slug !== "villa-mare-demo")
    return new Response(null, { status: 400, headers });
  const input = checked.data;
  const guide = demoGuide(createVillaMare(input.locale));
  // Keep product Supabase credentials and all generic/monthly adapters out of
  // this path. Separate private TEST credentials are deliberately required.
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    SUPABASE_URL: "https://mhhtnqfdkyudwyqlmnce.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: process.env["NONA_TEST_SUPABASE_SERVICE_ROLE_KEY"],
    NONA_CLOUD_SCOPE: "test",
    NONA_OLLAMA_TEST_SLUG: "villa-mare-demo",
    NONA_OLLAMA_TEST_ENABLE:
      process.env["NONA_OLLAMA_PREVIEW_ENABLE"] === "private-free-test-v1"
        ? process.env["NONA_OLLAMA_TEST_ENABLE"]
        : "closed",
  };
  // Before configuration, preserve the existing demo without touching a ledger.
  if (!env["SUPABASE_SERVICE_ROLE_KEY"] || !env["NONA_OLLAMA_TEST_PROPERTY_ID"])
    return Response.json(validateConciergeTurn(input, guide, guidedProposal(input, guide)), {
      headers,
    });
  guide.id = env["NONA_OLLAMA_TEST_PROPERTY_ID"];
  const identity = conciergeIdentity(
    request,
    process.env["NONA_TEST_CONCIERGE_SESSION_SECRET"],
    undefined,
  );
  if (identity?.setCookie) headers["set-cookie"] = identity.setCookie;
  // Unknown proxy shares a conservative network quota; never trust caller IPs.
  const turn = await runConciergeModel(
    input,
    guide,
    identity?.networkHash ?? "closed-preview",
    createHostedOllamaTestDependencies(identity, env),
  );
  return Response.json(turn, { headers });
}
