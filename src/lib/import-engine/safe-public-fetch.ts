import { resolve4, resolve6 } from "node:dns/promises";
import { isIP } from "node:net";

export function privateAddress(address: string): boolean {
  const host = address.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (isIP(host) === 4) {
    const [a, b] = host.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b! >= 16 && b! <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b! >= 64 && b! <= 127) ||
      a! >= 224
    );
  }
  if (isIP(host) === 6)
    return (
      host === "::" ||
      host === "::1" ||
      /^(fc|fd|fe[89ab])/.test(host) ||
      host.startsWith("::ffff:")
    );
  return false;
}
export async function safePublicFetch(value: string, init: RequestInit, maxBytes: number) {
  let url = new URL(value);
  for (let hops = 0; hops < 4; hops++) {
    if (
      !/^https?:$/.test(url.protocol) ||
      url.username ||
      url.password ||
      (url.port !== "" && !["80", "443"].includes(url.port)) ||
      privateAddress(url.hostname)
    )
      throw new Error("blocked");
    const host = url.hostname.replace(/^\[|\]$/g, "");
    const addresses = isIP(host)
      ? [host]
      : (await Promise.allSettled([resolve4(host), resolve6(host)])).flatMap((result) =>
          result.status === "fulfilled" ? result.value : [],
        );
    if (!addresses.length || addresses.some(privateAddress)) throw new Error("blocked");
    const response = await fetch(url.href, {
      ...init,
      redirect: "manual",
      signal: AbortSignal.timeout(12000),
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const next = response.headers.get("location");
      if (!next) throw new Error("blocked");
      await response.body?.cancel();
      url = new URL(next, url);
      continue;
    }
    if (Number(response.headers.get("content-length")) > maxBytes) {
      await response.body?.cancel();
      throw new Error("size");
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error("empty");
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.length;
        if (bytes > maxBytes) throw new Error("size");
        chunks.push(value);
      }
    } catch (error) {
      await reader.cancel();
      throw error;
    }
    const buffer = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.length;
    }
    return { response, buffer, url: url.href };
  }
  throw new Error("redirect");
}
