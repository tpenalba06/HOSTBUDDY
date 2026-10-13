import { afterEach, describe, expect, it, vi } from "vitest";
import { createServerFailureAlert, serverAlertConfiguration } from "./operational-alert.server";

afterEach(() => vi.unstubAllEnvs());
describe("hosted alert bindings and isolated receiver", () => {
  it("uses the actual Cloudflare request bindings without inheriting Node secrets", () => {
    vi.stubEnv("NONA_OPS_ALERT_TOKEN", "wrong-worker-secret");
    const binding = { NONA_OPS_ALERT_TOKEN: "right-worker-secret" };
    const request = Object.assign(new Request("https://example.test"), {
      runtime: { name: "cloudflare", cloudflare: { env: binding } },
    });
    expect(serverAlertConfiguration(undefined, request)).toBe(binding);
    const missing = Object.assign(new Request("https://example.test"), {
      runtime: { name: "cloudflare" },
    });
    expect(serverAlertConfiguration(undefined, missing)).toEqual({});
  });
  it("sends an existing TEST key only to the exact isolated RPC and fixed parameters", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    const config = {
      NONA_OPS_ALERT_TRANSPORT: "supabase-test-rpc",
      NONA_OPS_ALERT_URL:
        "https://mhhtnqfdkyudwyqlmnce.supabase.co/rest/v1/rpc/nona_report_operational_alert",
      NONA_OPS_ALERT_TOKEN: "sb_secret_fixture",
    };
    expect(await createServerFailureAlert(fetcher)(config)).toBe("ACKNOWLEDGED");
    expect(fetcher.mock.calls[0][1].headers).toEqual({
      "Content-Type": "application/json",
      apikey: "sb_secret_fixture",
    });
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
      _schema: "hostbuddy.operations.v1",
      _event: "server_request_failed",
      _level: "error",
      _at: expect.any(String),
    });
    expect(
      await createServerFailureAlert(fetcher)({
        ...config,
        NONA_OPS_ALERT_URL:
          "https://jzbjpaucgckggumhowns.supabase.co/rest/v1/rpc/nona_report_operational_alert",
      }),
    ).toBe("INVALID_CONFIGURATION");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
