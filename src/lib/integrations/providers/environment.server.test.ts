import { afterEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ getRequest: vi.fn() }));
vi.mock("@tanstack/react-start/server", () => ({ getRequest: state.getRequest }));
import { providerEncryptionConfigured, providerEncryptionKey } from "./environment.server";
import { openCredentials, sealCredentials } from "./crypto.server";
const request = (env: unknown) =>
  Object.assign(new Request("https://preview.example.test/"), {
    runtime: { name: "cloudflare", cloudflare: { env } },
  });
afterEach(() => {
  state.getRequest.mockReset();
  vi.unstubAllEnvs();
});
describe("PMS worker encryption bindings", () => {
  it("encrypts and decrypts with the request key even when Node has a different key", () => {
    vi.stubEnv("PMS_ENCRYPTION_KEY", Buffer.alloc(32, 1).toString("base64"));
    state.getRequest.mockReturnValue(
      request({ PMS_ENCRYPTION_KEY: Buffer.alloc(32, 2).toString("base64") }),
    );
    const envelope = sealCredentials("fixture-a", { token: "fictional" });
    expect(openCredentials("fixture-a", envelope)).toEqual({ token: "fictional" });
    expect(() => openCredentials("fixture-b", envelope)).toThrow();
    state.getRequest.mockReturnValue(
      request({ PMS_ENCRYPTION_KEY: Buffer.alloc(32, 3).toString("base64") }),
    );
    expect(() => openCredentials("fixture-a", envelope)).toThrow();
  });
  it("fails closed for absent worker binding instead of using a stale Node key", () => {
    vi.stubEnv("PMS_ENCRYPTION_KEY", Buffer.alloc(32, 1).toString("base64"));
    for (const env of [undefined, {}, { PMS_ENCRYPTION_KEY: 42 }]) {
      state.getRequest.mockReturnValue(request(env));
      expect(providerEncryptionConfigured()).toBe(false);
      expect(() => sealCredentials("fixture-a", {})).toThrow("provider_not_configured");
    }
  });
  it("does not mark an invalid-length key as configured", () => {
    state.getRequest.mockReturnValue(request({ PMS_ENCRYPTION_KEY: "invalid" }));
    expect(providerEncryptionConfigured()).toBe(false);
  });
  it("retains Node development support without a worker request", () => {
    vi.stubEnv("PMS_ENCRYPTION_KEY", Buffer.alloc(32, 4).toString("base64"));
    state.getRequest.mockImplementation(() => {
      throw new Error("no request");
    });
    expect(providerEncryptionKey()).toBe(process.env["PMS_ENCRYPTION_KEY"]);
    expect(providerEncryptionConfigured()).toBe(true);
  });
});
