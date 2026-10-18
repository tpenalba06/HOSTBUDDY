import { describe, expect, it } from "vitest";
import { assertPublicEnvironment } from "./public-config.mjs";
describe("frontend secret guard", () => {
  it.each([
    { VITE_SUPABASE_PUBLISHABLE_KEY: "sb_secret_fictional" },
    { VITE_STRIPE_KEY: "sk_test_fictional" },
    { VITE_STRIPE_WEBHOOK_SECRET: "whsec_fictional" },
    { VITE_DB_PASSWORD: "fictional" },
    {
      VITE_SUPABASE_PUBLISHABLE_KEY: `eyJhbGciOiJIUzI1NiJ9.${Buffer.from('{"role":"service_role"}').toString("base64url")}.fictional`,
    },
  ])("blocks private configuration without including the secret in errors", (env) => {
    expect(() => assertPublicEnvironment(env)).toThrow("unsafe_frontend_configuration");
  });
  it("allows publishable configuration and keeps server-only secrets server-only", () => {
    expect(() =>
      assertPublicEnvironment({
        VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fixture",
        VITE_STRIPE_KEY: "pk_test_fixture",
        STRIPE_SECRET_KEY: "sk_test_fixture",
      }),
    ).not.toThrow();
  });
});
