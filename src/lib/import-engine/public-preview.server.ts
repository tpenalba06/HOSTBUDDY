import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { normalizeUrl, pickAdapter } from "./url-adapters";
import { runUrlImport } from "./url-source.server";
import { publicImportPreview } from "./public-preview";
import { authorizedEvaluationSource } from "./authorized-source";
import { otaListing, otaPlatformHost } from "./ota-listing";
import { authorizedOtaSource, otaFirecrawlTrial } from "./ota-access.server";

const attempts = new Map<string, number>();
let windowEnds = 0;
let total = 0;
let running = 0;

export async function runPublicPreview(input: string) {
  setResponseHeader("Cache-Control", "no-store");
  const request = getRequest();
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return { status: "invalid" } as const;

  const original = new URL(input);
  if (original.protocol !== "https:" || original.username || original.password || original.port)
    return { status: "invalid" } as const;
  // Avoid sending links containing private query parameters to the fetcher.
  original.search = "";
  original.hash = "";
  const listing = otaListing(original.href);
  if (!listing && otaPlatformHost(original.hostname)) return { status: "invalid" } as const;
  const url = listing?.url ?? normalizeUrl(original.href);
  if (!url) return { status: "invalid" } as const;
  const source = pickAdapter(url).source;
  if (listing && !authorizedOtaSource(url) && !otaFirecrawlTrial(url))
    return { status: "authorization_required", platform: listing.platform } as const;

  const now = Date.now();
  if (now >= windowEnds) {
    attempts.clear();
    total = 0;
    windowEnds = now + 60_000;
  }
  const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const count = attempts.get(ip) ?? 0;
  if (count >= 3 || total >= 20 || running >= 3) return { status: "limited" } as const;
  attempts.set(ip, count + 1);
  total++;
  running++;
  try {
    if (authorizedEvaluationSource(url) || listing) {
      const { importAuthorizedEvaluationUrl } = await import("./firecrawl.server");
      return await importAuthorizedEvaluationUrl(url, {
        testEnvironment:
          process.env["VERCEL_ENV"] === "preview" &&
          process.env["VITE_SUPABASE_PROJECT_ID"] === "mhhtnqfdkyudwyqlmnce",
      });
    }
    const outcome = await runUrlImport({ url, source, localAi: false });
    return outcome.ok
      ? ({ status: "ok", preview: publicImportPreview(outcome.result, true) } as const)
      : ({ status: outcome.reason } as const);
  } finally {
    running--;
  }
}
