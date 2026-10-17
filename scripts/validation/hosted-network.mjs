import { writeFileSync } from "node:fs";
const origin = "https://host-buddy-concierge.lovable.app";
const slug = "audit-hostbuddy-04-10-2026-7ad333";
const safeHeaders = (response) => ({
  cacheControl: response.headers.get("cache-control"),
  contentType: response.headers.get("content-type"),
  contentEncoding: response.headers.get("content-encoding"),
  serverTiming: (response.headers.get("server-timing") ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => /^(guide_snapshot|guide_media);dur=\d+(?:\.\d+)?$/.test(part)),
});
async function get(url) {
  const start = performance.now();
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000), redirect: "error" });
  const headersMs = performance.now() - start;
  const bytes = new Uint8Array(await response.arrayBuffer());
  return {
    response,
    bytes,
    metrics: {
      status: response.status,
      headersMs,
      totalMs: performance.now() - start,
      decodedBytes: bytes.byteLength,
      ...safeHeaders(response),
    },
  };
}
const home = await get(`${origin}/`);
const guide = await get(`${origin}/l/${slug}`);
if (
  home.response.status !== 200 ||
  guide.response.status !== 200 ||
  !new TextDecoder().decode(guide.bytes).includes("AUDIT HostBuddy 04-10-2026")
)
  throw Error("public_test_guide_unavailable");
const homeHTML = new TextDecoder().decode(home.bytes);
const guideHTML = new TextDecoder().decode(guide.bytes);
const hrefs = [...homeHTML.matchAll(/<link\b[^>]*href="([^"]+)"[^>]*>/g)]
  .map((match) => new URL(match[1].replaceAll("&amp;", "&"), origin))
  .filter((url) => url.origin === origin && url.pathname.endsWith(".css"));
const css = hrefs.length ? await get(hrefs[0].href) : null;
const cssText = css ? new TextDecoder().decode(css.bytes) : "";
const image = [...guideHTML.matchAll(/<img\b[^>]*src="([^"]+)"[^>]*>/g)]
  .map((match) => new URL(match[1].replaceAll("&amp;", "&"), origin))
  .find(
    (url) =>
      url.hostname === "jzbjpaucgckggumhowns.supabase.co" &&
      url.pathname.startsWith("/storage/v1/object/sign/guide-media/"),
  );
// Use the page-authorized capability only for its intended image request.
// Never serialize its URL, path, query/token, body or response cookies.
const cover = image ? await get(image.href) : null;
const result = {
  scope: "anonymous-public-HTTP-not-throttled; Lighthouse is the slow-network proof",
  at: new Date().toISOString(),
  home: home.metrics,
  guide: guide.metrics,
  appCSS: css?.metrics ?? null,
  cover: cover?.metrics ?? null,
  localFonts: {
    woff2: cssText.includes("/guide-fonts/manrope-400.woff2"),
    ttf: cssText.includes("/guide-fonts/manrope-400.ttf"),
  },
  heroHighPriority: /<img[^>]*hostbuddy-arrival\.jpg[^>]*fetch[Pp]riority="high"/.test(homeHTML),
};
writeFileSync(process.argv[2], JSON.stringify(result, null, 2) + "\n");
