import { z } from "zod";
import { authorizedEvaluationSource } from "./authorized-source";
import { previewPastedDocument } from "./public-preview";
import { extractAccessibleHtml } from "./url-source.server";
import { htmlDocumentText } from "./html-document";

const responseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    markdown: z.string().max(200_000).optional(),
    html: z.string().max(1_500_000).optional(),
    metadata: z
      .object({ statusCode: z.number(), sourceURL: z.string().url().optional() })
      .passthrough(),
  }),
});
export async function importAuthorizedEvaluationUrl(
  url: string,
  options: {
    testEnvironment: boolean;
    fetcher?: typeof fetch;
  },
) {
  if (!options.testEnvironment || !authorizedEvaluationSource(url))
    return { status: "authorization_required" } as const;
  // Keyless evaluation only: no account credential, purchased credit or paid fallback.
  // No browser actions, stealth proxy, captcha handling, crawl or remote AI.
  try {
    const response = await (options.fetcher ?? fetch)("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(25_000),
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown", "html"], proxy: "basic", timeout: 15000 }),
    });
    if (!response.ok)
      return { status: response.status === 429 ? "limited" : "unreachable" } as const;
    if (!response.headers.get("content-type")?.includes("json") || !response.body)
      return { status: "unreachable" } as const;
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 2_000_000) return { status: "insufficient" } as const;
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    const buffer = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const result = responseSchema.safeParse(JSON.parse(new TextDecoder().decode(buffer)));
    if (!result.success) return { status: "insufficient" } as const;
    const data = result.data.data;
    if (
      data.metadata.statusCode !== 200 ||
      (data.metadata.sourceURL && data.metadata.sourceURL !== url)
    )
      return { status: "blocked" } as const;
    // Reuse the existing HTML reader when available, then the same six-language
    // document projection as pasted text. Scrape responses are untrusted input.
    const extracted = data.html ? await extractAccessibleHtml(data.html, url, false) : null;
    const source = [
      data.html ? htmlDocumentText(htmlDocumentText(data.html)) : "",
      data.markdown
        ? htmlDocumentText(htmlDocumentText(data.markdown.replace(/^#{1,6}\s+/gm, "")))
        : "",
    ]
      .filter(Boolean)
      .join("\n");
    const title = extracted?.propertyName;
    const preview = previewPastedDocument(
      [title ? `Nom du logement : ${title}` : "", source].filter(Boolean).join("\n"),
    );
    if (!preview.name || Object.keys(preview.text ?? {}).length < 2)
      return { status: "insufficient" } as const;
    return {
      status: "ok",
      preview,
      provenance: {
        provider: "firecrawl",
        sourceUrl: url,
        evaluationOnly: true,
        photoRights: "unconfirmed",
        photosReused: 0,
      },
    } as const;
  } catch {
    return { status: "unreachable" } as const;
  }
}
