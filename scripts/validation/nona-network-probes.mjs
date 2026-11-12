import { lookup } from "node:dns/promises";

// Fixed destinations only. Never persist upstream errors, bodies or headers.
export function networkFailure(error) {
  const code = error?.cause?.code ?? error?.code ?? error?.name;
  if (["ENOTFOUND", "EAI_AGAIN"].includes(code)) return { stage: "dns", code };
  if (["EACCES", "EPERM"].includes(code)) return { stage: "permission", code };
  if (["ECONNREFUSED", "ENETUNREACH", "EHOSTUNREACH", "ECONNRESET"].includes(code))
    return { stage: "tcp", code };
  if (
    [
      "CERT_HAS_EXPIRED",
      "DEPTH_ZERO_SELF_SIGNED_CERT",
      "SELF_SIGNED_CERT_IN_CHAIN",
      "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
      "ERR_TLS_CERT_ALTNAME_INVALID",
      "ERR_SSL_WRONG_VERSION_NUMBER",
    ].includes(code)
  )
    return { stage: "tls", code };
  if (["TimeoutError", "AbortError", "ETIMEDOUT", "UND_ERR_CONNECT_TIMEOUT"].includes(code))
    return { stage: "timeout", code };
  return { stage: "unknown", code: "unclassified" };
}

export async function localLabStatus() {
  try {
    const page = await fetch("http://127.0.0.1:4181/", {
      redirect: "error",
      signal: AbortSignal.timeout(3000),
    });
    const cookie = page.headers
      .getSetCookie()
      .find((value) => value.startsWith("nonaLab="))
      ?.split(";")[0];
    await page.body?.cancel();
    if (!page.ok || !cookie) return { reachable: true, status: page.status, session: false };
    const response = await fetch("http://127.0.0.1:4181/status", {
      headers: { Cookie: cookie },
      redirect: "error",
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
      await response.body?.cancel();
      return { reachable: true, status: response.status };
    }
    const value = await response.json();
    return {
      reachable: true,
      status: response.status,
      configured: value.configured === true,
      gateway: value.gateway === true,
      publishedGuide: value.publishedGuide === true,
      billingVerified: value.billingVerified === true,
      ready: value.ready === true,
      ledgerEnabled: value.ledger?.enabled === true,
      capMicros: Number.isInteger(value.ledger?.cap_micros) ? value.ledger.cap_micros : null,
      reservedMicros: Number.isInteger(value.ledger?.reserved_micros)
        ? value.ledger.reserved_micros
        : null,
    };
  } catch (error) {
    return { reachable: false, ...networkFailure(error) };
  }
}

export async function probe(host, path) {
  let dns;
  try {
    // Keep HTTPS independent: a proxy can succeed despite a failed local lookup.
    await Promise.race([
      lookup(host),
      new Promise((_, reject) => {
        const timer = setTimeout(() => reject({ name: "TimeoutError" }), 5000);
        timer.unref();
      }),
    ]);
    dns = { ok: true };
  } catch (error) {
    dns = { ok: false, ...networkFailure(error) };
  }
  let https;
  try {
    const response = await fetch(`https://${host}${path}`, {
      redirect: "error",
      signal: AbortSignal.timeout(7000),
    });
    https = { reachable: true, status: response.status };
    await response.body?.cancel();
  } catch (error) {
    https = { reachable: false, ...networkFailure(error) };
  }
  return { host, dns, https };
}
