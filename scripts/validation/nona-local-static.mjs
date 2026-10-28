import { readFile, realpath } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

// Static output and public media only; no Vite middleware or source-file access.
export async function localStatic(root, requestPath) {
  const pathname = requestPath.split("?")[0];
  let base;
  let relative;
  if (pathname === "/nona" || pathname === "/nona/") {
    base = resolve(root, "../nona-local-runtime/interface");
    relative = "index.html";
  } else if (pathname.startsWith("/nona-ui/assets/")) {
    base = resolve(root, "../nona-local-runtime/interface/assets");
    relative = pathname.slice("/nona-ui/assets/".length);
  } else if (/^\/(demo-guide|hostbuddy-media|guide-fonts|nona)\//.test(pathname)) {
    base = resolve(root, "public");
    relative = pathname.slice(1);
  } else return null;
  try {
    relative = decodeURIComponent(relative);
    if (relative.includes(":")) return null;
    const canonicalBase = await realpath(base);
    const path = await realpath(resolve(base, relative));
    if (!path.startsWith(canonicalBase + sep)) return null;
    const type = mime[extname(path).toLowerCase()];
    if (!type) return null;
    return { content: await readFile(path), type, page: relative === "index.html" };
  } catch {
    return null;
  }
}
