import { expect, it, vi } from "vitest";
import { createServerFailureAlert } from "./operational-alert.server";

const config = {
  NONA_OPS_ALERT_TRANSPORT: "supabase-commercial-rpc",
  NONA_OPS_ALERT_URL:
    "https://jzbjpaucgckggumhowns.supabase.co/rest/v1/rpc/nona_report_operational_alert",
  NONA_COMMERCIAL_OPS_APPROVED: "true",
  SUPABASE_URL: "https://jzbjpaucgckggumhowns.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "sb_secret_fixture",
};

it("reuses only the approved backend's server binding without duplicating a secret", async () => {
  const send = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
  expect(await createServerFailureAlert(send)(config)).toBe("ACKNOWLEDGED");
  expect(send.mock.calls[0]?.[1].headers.apikey).toBe(config.SUPABASE_SERVICE_ROLE_KEY);
  expect(send.mock.calls[0]?.[1].body).not.toContain("sb_secret_");
});

it("does not reuse a credential across targets or without explicit approval", async () => {
  const send = vi.fn();
  for (const changed of [
    { NONA_COMMERCIAL_OPS_APPROVED: "false" },
    { SUPABASE_URL: "https://mhhtnqfdkyudwyqlmnce.supabase.co" },
    { NONA_OPS_ALERT_URL: "https://other.example/rpc" },
    { NONA_OPS_ALERT_TRANSPORT: "supabase-test-rpc" },
    {
      SUPABASE_SERVICE_ROLE_KEY: undefined,
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fixture",
    },
    { NONA_OPS_ALERT_TOKEN: "" },
  ]) {
    expect(await createServerFailureAlert(send)({ ...config, ...changed })).toBe(
      "INVALID_CONFIGURATION",
    );
  }
  expect(send).not.toHaveBeenCalled();
});
