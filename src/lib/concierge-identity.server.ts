import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type ConciergeIdentity = { visitorHash: string; networkHash: string; setCookie?: string };
const cookieName = "nonaVisitor";

/** IP headers are accepted only for the explicitly configured hosting proxy.
 * Without that configuration the network quota is shared (safe, restrictive).
 * A guest can clear cookies; the independent network and global quotas remain.
 */
export function conciergeIdentity(
  request: Request,
  secret: string | undefined,
  proxy: string | undefined,
): ConciergeIdentity | undefined {
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) return;
  const hmac = (value: string) => createHmac("sha256", secret).update(value).digest("hex");
  const raw =
    request.headers
      .get("cookie")
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith(cookieName + "="))
      ?.slice(cookieName.length + 1) ?? "";
  const [candidate, stamp] = raw.split(".");
  const valid =
    candidate &&
    /^[a-f0-9]{64}$/.test(candidate) &&
    stamp &&
    /^[a-f0-9]{64}$/.test(stamp) &&
    timingSafeEqual(Buffer.from(stamp), Buffer.from(hmac("cookie:" + candidate)));
  const visitor = valid ? candidate : randomBytes(32).toString("hex");
  const network =
    proxy === "cloudflare"
      ? request.headers.get("cf-connecting-ip")
      : proxy === "vercel"
        ? request.headers.get("x-real-ip")
        : null;
  const address = network && /^[a-fA-F0-9:.]{3,64}$/.test(network) ? network : "unknown";
  return {
    visitorHash: hmac("visitor:" + visitor),
    networkHash: hmac("network:" + address),
    ...(!valid
      ? {
          setCookie: `${cookieName}=${visitor}.${hmac("cookie:" + visitor)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`,
        }
      : {}),
  };
}
