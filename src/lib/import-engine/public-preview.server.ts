import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { normalizeUrl, pickAdapter } from "./url-adapters";
import { runUrlImport } from "./url-source.server";
import { publicImportPreview } from "./public-preview";

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
  const url = normalizeUrl(original.href);
  if (!url) return { status: "invalid" } as const;
  const source = pickAdapter(url).source;
  if (source === "airbnb") return { status: "authorization_required" } as const;

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
    const outcome = await runUrlImport({ url, source, localAi: false });
    return outcome.ok
      ? ({ status: "ok", preview: publicImportPreview(outcome.result, true) } as const)
      : ({ status: outcome.reason } as const);
  } finally {
    running--;
  }
}
