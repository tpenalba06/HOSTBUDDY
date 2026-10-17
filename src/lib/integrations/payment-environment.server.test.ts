import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ getRequest: vi.fn() }));
vi.mock("@tanstack/react-start/server", () => ({ getRequest: state.getRequest }));
import { paymentServerEnvironment } from "./payment-environment.server";
import { paymentEnvironment } from "./payment-policy";

function requestWithBindings(env: unknown) {
  return Object.assign(new Request("https://preview.example.test/api/stripe-webhook"), {
    runtime: { name: "cloudflare", cloudflare: { env } },
  });
}

describe("payment server runtime bindings", () => {
  beforeEach(() => {
    state.getRequest.mockReset();
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_stale_node_environment");
    vi.stubEnv("STRIPE_CONNECT_WEBHOOK_SECRET", "whsec_node_environment");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("uses request bindings when native process.env does not contain the worker secrets", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", undefined);
    state.getRequest.mockReturnValue(
      requestWithBindings({
        STRIPE_SECRET_KEY: "sk_test_request_environment",
        STRIPE_CONNECT_WEBHOOK_SECRET: "whsec_request_environment",
        HOSTBUDDY_APP_URL: "https://preview.example.test",
      }),
    );
    expect(paymentEnvironment(paymentServerEnvironment())).toMatchObject({
      mode: "test",
      connect: true,
      billing: false,
    });
  });

  it("never fills absent Cloudflare secrets from stale Node or global bindings", () => {
    vi.stubGlobal("__env__", { STRIPE_SECRET_KEY: "sk_test_other_worker" });
    expect(paymentServerEnvironment(requestWithBindings({}))).toEqual({});
    expect(paymentServerEnvironment(requestWithBindings(undefined))).toEqual({});
    vi.unstubAllGlobals();
  });

  it("reads each request independently without mutating process.env", () => {
    state.getRequest.mockReturnValueOnce(
      requestWithBindings({ STRIPE_SECRET_KEY: "sk_test_first" }),
    );
    state.getRequest.mockReturnValueOnce(requestWithBindings({}));
    expect(paymentServerEnvironment()["STRIPE_SECRET_KEY"]).toBe("sk_test_first");
    expect(paymentServerEnvironment()["STRIPE_SECRET_KEY"]).toBeUndefined();
    expect(process.env["STRIPE_SECRET_KEY"]).toBe("sk_test_stale_node_environment");
  });

  it("supports Node handlers and calls outside a TanStack request", () => {
    state.getRequest.mockImplementation(() => {
      throw new Error("No StartEvent found");
    });
    expect(paymentServerEnvironment()["STRIPE_SECRET_KEY"]).toBe("sk_test_stale_node_environment");
    expect(
      paymentServerEnvironment(new Request("http://localhost/test"))["STRIPE_SECRET_KEY"],
    ).toBe("sk_test_stale_node_environment");
  });

  it("only selects string values from the payment allowlist", () => {
    expect(
      paymentServerEnvironment(
        requestWithBindings({
          STRIPE_SECRET_KEY: "sk_test_request",
          HOSTBUDDY_APP_URL: 42,
          STRIPE_LIVE_VERIFIED: true,
          SUPABASE_SERVICE_ROLE_KEY: "unrelated_secret",
          ASSETS: { fetch: () => {} },
        }),
      ),
    ).toEqual({ STRIPE_SECRET_KEY: "sk_test_request" });
  });

  it("keeps live charges disabled for unverified worker bindings", () => {
    const env = paymentServerEnvironment(
      requestWithBindings({
        STRIPE_SECRET_KEY: "sk_live_synthetic",
        STRIPE_CONNECT_WEBHOOK_SECRET: "whsec_synthetic",
      }),
    );
    expect(paymentEnvironment(env)).toMatchObject({ mode: "live", enabled: false, connect: false });
  });
});
