import { expect, it, vi } from "vitest";
import { createServerFailureAlert } from "./operational-alert.server";

it("keeps the prepared commercial RPC locked to its individually approved target", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
  const config = {
    NONA_OPS_ALERT_TRANSPORT: "supabase-commercial-rpc",
    NONA_OPS_ALERT_URL:
      "https://jzbjpaucgckggumhowns.supabase.co/rest/v1/rpc/nona_report_operational_alert",
    NONA_OPS_ALERT_TOKEN: "sb_secret_fixture",
  };
  expect(await createServerFailureAlert(fetcher)(config)).toBe("INVALID_CONFIGURATION");
  expect(
    await createServerFailureAlert(fetcher)({ ...config, NONA_COMMERCIAL_OPS_APPROVED: "false" }),
  ).toBe("INVALID_CONFIGURATION");
  expect(
    await createServerFailureAlert(fetcher)({
      ...config,
      NONA_COMMERCIAL_OPS_APPROVED: "true",
      NONA_OPS_ALERT_URL:
        "https://mhhtnqfdkyudwyqlmnce.supabase.co/rest/v1/rpc/nona_report_operational_alert",
    }),
  ).toBe("INVALID_CONFIGURATION");
  expect(fetcher).not.toHaveBeenCalled();
  expect(
    await createServerFailureAlert(fetcher)({ ...config, NONA_COMMERCIAL_OPS_APPROVED: "true" }),
  ).toBe("ACKNOWLEDGED");
  expect(fetcher).toHaveBeenCalledTimes(1);
});
