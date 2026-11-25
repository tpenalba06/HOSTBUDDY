import { z } from "zod";
import { authorizedEvaluationSource } from "./authorized-source";
import { previewPastedDocument } from "./public-preview";
import { extractAccessibleHtml } from "./url-source.server";
import { htmlDocumentText } from "./html-document";
import { authorizedOtaSource } from "./ota-access.server";
import { safePublicFetch } from "./safe-public-fetch";
import { analyzeImportDocument } from "./intelligence.server";
import { publicImportPreview } from "./public-preview";
import { otaDocument } from "./ota-document";

const responseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    markdown: z.string().max(200_000).optional(),
    html: z.string().max(1_500_000).optional(),
    images: z.array(z.string().max(4000)).max(1000).optional(),
    metadata: z
      .object({ statusCode: z.number(), sourceURL: z.string().url().optional() })
      .passthrough(),
  }),
});
export async function readFirecrawlEvaluationUrl(
  url: string,
  options: {
    testEnvironment: boolean;
    env?: Record<string, string | undefined>;
    fetcher?: typeof fetch;
  },
) {
  const ota = authorizedOtaSource(url, options.env);
  const experimentalPublic = ota !== null;
  if (!options.testEnvironment || (!authorizedEvaluationSource(url) && !ota))
    return { status: "authorization_required" } as const;
  if (ota) url = ota.url;
  const started = Date.now();
  const diagnostics: {
    experimentalPublic: boolean;
    providerHttpStatus?: number;
    targetHttpStatus?: number;
    markdownCharacters?: number;
    htmlCharacters?: number;
    discoveredImages?: number;
    propertyImageCandidates?: number;
    providerCode?: string;
    providerMessage?: string;
    latencyMs?: number;
    fields?: { key: string; characters: number; present: boolean }[];
    displayedFields?: string[];
    failureStage?: string;
  } = { experimentalPublic };
  // Keyless evaluation only: no account credential, purchased credit or paid fallback.
  // No browser actions, stealth proxy, captcha handling, crawl or remote AI.
  try {
    const request = {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(25_000),
      headers: ota
        ? { "content-type": "application/json", authorization: `Bearer ${ota.token}` }
        : { "content-type": "application/json" },
      body: JSON.stringify(
        ota
          ? { url, platform: ota.platform }
          : {
              url,
              formats: ["markdown", "html", "images"],
              proxy: "basic",
              timeout: 15000,
              storeInCache: false,
              maxAge: 0,
            },
      ),
    } satisfies RequestInit;
    const endpoint = ota?.endpoint ?? "https://api.firecrawl.dev/v2/scrape";
    const fetched =
      ota && !options.fetcher
        ? await safePublicFetch(endpoint, request, 2_000_000, async () => false)
        : undefined;
    const response = fetched?.response ?? (await (options.fetcher ?? fetch)(endpoint, request));
    diagnostics.providerHttpStatus = response.status;
    if (!response.headers.get("content-type")?.includes("json") || !response.body)
      return { status: "unreachable", diagnostics } as const;
    const reader = fetched ? undefined : response.body.getReader();
    const chunks: Uint8Array[] = [];
    let bytes = fetched?.buffer.length ?? 0;
    try {
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 2_000_000) return { status: "insufficient" } as const;
        chunks.push(value);
      }
    } finally {
      await reader?.cancel();
    }
    const buffer = fetched?.buffer ?? new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const payload: unknown = JSON.parse(new TextDecoder().decode(buffer));
    if (!response.ok) {
      const error = z
        .object({ code: z.string().max(120).optional(), error: z.string().max(2000).optional() })
        .safeParse(payload);
      if (!ota && error.success) {
        if (error.data.code) diagnostics.providerCode = error.data.code;
        if (error.data.error)
          diagnostics.providerMessage = error.data.error.replace(/[\r\n]/g, " ").slice(0, 240);
      }
      diagnostics.latencyMs = Date.now() - started;
      return { status: response.status === 429 ? "limited" : "blocked", diagnostics } as const;
    }
    const result = responseSchema.safeParse(payload);
    if (!result.success) return { status: "insufficient", diagnostics } as const;
    const data = result.data.data;
    diagnostics.targetHttpStatus = data.metadata.statusCode;
    diagnostics.markdownCharacters = data.markdown?.length ?? 0;
    diagnostics.htmlCharacters = data.html?.length ?? 0;
    diagnostics.discoveredImages = data.images?.length ?? 0;
    if (
      data.metadata.statusCode !== 200 ||
      (ota
        ? data.metadata.sourceURL !== url
        : !!data.metadata.sourceURL && data.metadata.sourceURL !== url)
    )
      return { status: "blocked", diagnostics } as const;
    if (ota && typeof data.metadata["url"] === "string" && data.metadata["url"] !== url)
      return { status: "blocked", diagnostics } as const;
    if (
      /(?:verify (?:that )?you(?:'re| are) (?:a human|not a robot)|captcha challenge|access denied|just a moment|enable javascript to continue)/i.test(
        (data.markdown ?? "").slice(0, 2500),
      )
    )
      return {
        status: "blocked",
        diagnostics: { ...diagnostics, failureStage: "target_challenge" },
      } as const;
    // Reuse the existing HTML reader when available, then the same six-language
    // document projection as pasted text. Scrape responses are untrusted input.
    const extracted = data.html ? await extractAccessibleHtml(data.html, url, false) : null;
    const document =
      experimentalPublic && data.markdown
        ? otaDocument(data.markdown, url, data.metadata)
        : undefined;
    const source =
      document?.text ??
      [
        data.html ? htmlDocumentText(htmlDocumentText(data.html)) : "",
        data.markdown
          ? htmlDocumentText(htmlDocumentText(data.markdown.replace(/^#{1,6}\s+/gm, "")))
          : "",
      ]
        .filter(Boolean)
        .join("\n");
    const title = document?.title ?? extracted?.propertyName;
    const preview = previewPastedDocument(
      [title ? `Nom du logement : ${title}` : "", source].filter(Boolean).join("\n"),
      title ?? undefined,
    );
    if (experimentalPublic) preview.experimentalPublic = true;
    if (document && preview.text) {
      for (const key of Object.keys(preview.text) as (keyof typeof preview.text)[]) {
        preview.text[key] = preview.text[key]!.replace(/^#{1,6}\s+/gm, "");
      }
      // Preserve explicit policy ranges verbatim. They are ranges, not a
      // contradictory pair of single check-in/out times, and contain no secrets.
      for (const [key, label] of [
        ["arrival", "Arrivée"],
        ["departure", "Départ"],
      ] as const) {
        const ranges = new Set(
          Array.from(
            source.matchAll(
              new RegExp(
                `^${label}\\s*\\n+((?:De\\s+)?(?:[01]?\\d|2[0-3]):[0-5]\\d\\s+à\\s+(?:[01]?\\d|2[0-3]):[0-5]\\d)\\s*$`,
                "gmi",
              ),
            ),
            (match) => match[1]!,
          ),
        );
        if (ranges.size === 1) preview.text[key] = `${label} : ${[...ranges][0]}`;
      }
      if (
        /^(?:Connexion Wi-Fi gratuite|Wi-Fi gratuit|Une connexion Wi-Fi est disponible[^\n.]*gratuitement\.)\s*$/im.test(
          source,
        )
      )
        preview.wifiAvailable = true;
    }
    // Booking/calendar prose can trigger broad conflict detection. Only an
    // explicit, unique policy sentence can establish a single check-in/out time.
    if (document) {
      for (const [key, label] of [
        ["arrival", "Arrivée à partir de"],
        ["departure", "Départ avant"],
      ] as const) {
        const values = new Set(
          Array.from(
            source.matchAll(new RegExp(`${label}\\s+([0-2]\\d:[0-5]\\d)`, "gi")),
            (match) => match[1]!,
          ),
        );
        if (values.size === 1) preview[key] = [...values][0]!;
      }
    }
    const extraction = document
      ? {
          ...(await analyzeImportDocument(source, { sourceUrl: url, localAi: false })),
          propertyName: title ?? null,
          ...(document.location ? { publicLocality: document.location } : {}),
        }
      : (extracted ?? (await analyzeImportDocument(source, { sourceUrl: url, localAi: false })));
    const locality =
      document?.location ?? (extracted ? publicImportPreview(extracted, true).locality : undefined);
    if (locality && /^[\p{L}\p{M}][\p{L}\p{M} .,’'&()-]{1,79}$/u.test(locality))
      preview.locality = locality;
    diagnostics.propertyImageCandidates = extracted?.photos?.length ?? 0;
    diagnostics.fields = extraction.fields.map((field) => ({
      key: field.key,
      characters: field.value?.length ?? 0,
      present: !!field.value,
    }));
    diagnostics.displayedFields = Object.keys(preview.text ?? {});
    diagnostics.latencyMs = Date.now() - started;
    if (!preview.name || Object.keys(preview.text ?? {}).length < 2)
      return { status: "insufficient", diagnostics } as const;
    return {
      status: "ok",
      preview,
      extraction,
      diagnostics,
      provenance: {
        provider: ota ? "authorized-connector" : "firecrawl",
        sourceUrl: url,
        evaluationOnly: true,
        photoRights: "unconfirmed",
        photosReused: 0,
      },
    } as const;
  } catch {
    return {
      status: "unreachable",
      diagnostics: {
        ...diagnostics,
        latencyMs: Date.now() - started,
        failureStage: "transport_or_parse",
      },
    } as const;
  }
}

/** Raw source/extraction stays server-side. Only redacted projection and counts
 * cross the anonymous preview boundary; nothing is persisted. */
export async function importAuthorizedEvaluationUrl(
  url: string,
  options: Parameters<typeof readFirecrawlEvaluationUrl>[1],
) {
  const outcome = await readFirecrawlEvaluationUrl(url, options);
  if (outcome.status !== "ok") return outcome;
  const { extraction: _privateExtraction, ...projection } = outcome;
  return projection;
}
