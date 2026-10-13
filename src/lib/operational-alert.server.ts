/** Optional SSR alert transport. Configuration belongs exclusively to server secrets.
 * No destination, network request or retry exists until explicitly configured.
 */
export type AlertDelivery =
  "DISABLED" | "INVALID_CONFIGURATION" | "SUPPRESSED" | "ACKNOWLEDGED" | "FAILED";

export function createServerFailureAlert(fetcher: typeof fetch = fetch) {
  let nextAttemptAt = 0;
  return async (configuration: unknown): Promise<AlertDelivery> => {
    const config =
      configuration && typeof configuration === "object"
        ? (configuration as Record<string, unknown>)
        : {};
    const destination = config["NONA_OPS_ALERT_URL"];
    const token = config["NONA_OPS_ALERT_TOKEN"];
    const testRpc = config["NONA_OPS_ALERT_TRANSPORT"] === "supabase-test-rpc";
    const commercialRpc = config["NONA_OPS_ALERT_TRANSPORT"] === "supabase-commercial-rpc";
    if (!destination && !token) return "DISABLED";
    if (
      typeof destination !== "string" ||
      typeof token !== "string" ||
      !token ||
      token.length > 4096 ||
      /[\r\n]/.test(token)
    )
      return "INVALID_CONFIGURATION";
    try {
      const url = new URL(destination);
      if (
        url.protocol !== "https:" ||
        !url.hostname ||
        url.username ||
        url.password ||
        url.search ||
        url.hash
      )
        return "INVALID_CONFIGURATION";
    } catch {
      return "INVALID_CONFIGURATION";
    }
    if (
      testRpc &&
      (destination !==
        "https://mhhtnqfdkyudwyqlmnce.supabase.co/rest/v1/rpc/nona_report_operational_alert" ||
        !/^sb_secret_[A-Za-z0-9_-]{1,250}$/.test(token))
    )
      return "INVALID_CONFIGURATION";

    if (
      commercialRpc &&
      (config["NONA_COMMERCIAL_OPS_APPROVED"] !== "true" ||
        destination !==
          "https://jzbjpaucgckggumhowns.supabase.co/rest/v1/rpc/nona_report_operational_alert" ||
        !/^sb_secret_[A-Za-z0-9_-]{1,250}$/.test(token))
    )
      return "INVALID_CONFIGURATION";

    // Bound incident traffic, including failed attempts. This is per worker;
    // the receiver must also enforce a global quota across workers.
    const now = Date.now();
    if (now < nextAttemptAt) return "SUPPRESSED";
    nextAttemptAt = now + 60_000;
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<AlertDelivery>((resolve) => {
      timer = setTimeout(() => {
        abort.abort();
        resolve("FAILED");
      }, 3_000);
    });
    try {
      const delivery = (async (): Promise<AlertDelivery> => {
        try {
          const response = await fetcher(destination, {
            method: "POST",
            redirect: "error",
            signal: abort.signal,
            headers:
              testRpc || commercialRpc
                ? { "Content-Type": "application/json", apikey: token }
                : { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(
              testRpc || commercialRpc
                ? {
                    _schema: "hostbuddy.operations.v1",
                    _event: "server_request_failed",
                    _level: "error",
                    _at: new Date(now).toISOString(),
                  }
                : {
                    schema: "hostbuddy.operations.v1",
                    event: "server_request_failed",
                    level: "error",
                    at: new Date(now).toISOString(),
                  },
            ),
          });
          // Never read or log the receiver's body, URL, headers or exception.
          if (response.body) void response.body.cancel().catch(() => {});
          return [200, 201, 202, 204].includes(response.status) ? "ACKNOWLEDGED" : "FAILED";
        } catch {
          return "FAILED";
        }
      })();
      return await Promise.race([delivery, timeout]);
    } finally {
      clearTimeout(timer);
    }
  };
}

export const deliverServerFailureAlert = createServerFailureAlert();

export function serverAlertConfiguration(env: unknown, request?: Request): unknown {
  const runtime = (
    request as
      (Request & { runtime?: { name?: string; cloudflare?: { env?: unknown } } }) | undefined
  )?.runtime;
  if (runtime?.cloudflare || runtime?.name === "cloudflare") return runtime.cloudflare?.env ?? {};
  // Worker bindings take precedence. Never use import.meta.env/VITE values.
  if (
    env &&
    typeof env === "object" &&
    ("NONA_OPS_ALERT_URL" in env || "NONA_OPS_ALERT_TOKEN" in env)
  )
    return env;
  return typeof process !== "undefined" ? process.env : undefined;
}
