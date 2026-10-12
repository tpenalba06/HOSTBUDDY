import { afterEach, describe, expect, it, vi } from "vitest";
import { createServerFailureAlert, serverAlertConfiguration } from "./operational-alert.server";

const config = {
  NONA_OPS_ALERT_URL: "https://receiver.example.test/alerts",
  NONA_OPS_ALERT_TOKEN: "private-test-fixture",
};
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("optional SSR failure alert", () => {
  it("stays offline without server configuration and rejects unsafe destinations", async () => {
    const fetcher = vi.fn();
    const send = createServerFailureAlert(fetcher);
    expect(await send({})).toBe("DISABLED");
    for (const url of [
      "http://receiver.test",
      "https://user:pass@receiver.test",
      "https://receiver.test/?token=x",
      "invalid",
    ]) {
      expect(await send({ ...config, NONA_OPS_ALERT_URL: url })).toBe("INVALID_CONFIGURATION");
    }
    expect(await send({ ...config, NONA_OPS_ALERT_TOKEN: "bad\r\nheader" })).toBe(
      "INVALID_CONFIGURATION",
    );
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("sends only fixed fields, refuses redirects and limits incident traffic", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    const send = createServerFailureAlert(fetcher);
    expect(await send({ ...config, request: "guest-email", error: "secret-exception" })).toBe(
      "ACKNOWLEDGED",
    );
    const options = fetcher.mock.calls[0][1];
    expect(options.redirect).toBe("error");
    expect(JSON.parse(options.body)).toEqual({
      schema: "hostbuddy.operations.v1",
      event: "server_request_failed",
      level: "error",
      at: expect.any(String),
    });
    expect(await send(config)).toBe("SUPPRESSED");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("bounds even a stuck transport to three seconds and aborts it", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn().mockImplementation(() => new Promise(() => {}));
    const result = createServerFailureAlert(fetcher)(config);
    await vi.advanceTimersByTimeAsync(3000);
    expect(await result).toBe("FAILED");
    expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true);
  });
  it("does not propagate receiver errors or acknowledge rejected deliveries", async () => {
    expect(
      await createServerFailureAlert(
        vi.fn().mockRejectedValue(new Error("private-provider-response")),
      )(config),
    ).toBe("FAILED");
    expect(
      await createServerFailureAlert(
        vi.fn().mockResolvedValue(new Response("secret", { status: 302 })),
      )(config),
    ).toBe("FAILED");
  });
  it("uses server bindings and never public build configuration", () => {
    vi.stubEnv("NONA_OPS_ALERT_URL", config.NONA_OPS_ALERT_URL);
    const bindings = { NONA_OPS_ALERT_TOKEN: "binding-token" };
    expect(serverAlertConfiguration(bindings)).toBe(bindings);
    expect(serverAlertConfiguration(undefined)).toBe(process.env);
  });
});
