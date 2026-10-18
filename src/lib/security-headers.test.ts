import { describe, expect, it } from "vitest";
import { secureResponse } from "./security-headers";

describe("security response headers", () => {
  it("preserves body/status and public cache policy while preventing token referrer leaks", async () => {
    const response = secureResponse(
      new Request("https://host.test/l/guide"),
      new Response("guide", { headers: { "cache-control": "public,max-age=60" } }),
    );
    expect(await response.text()).toBe("guide");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("cache-control")).toBe("public,max-age=60");
    expect(response.headers.get("strict-transport-security")).toBe("max-age=31536000");
  });
  it.each([
    "/app",
    "/app/property/x",
    "/auth",
    "/pay/private-token",
    "/api/public/payment-info",
    "/_server/fn",
  ])("never caches private or API responses: %s", (path) => {
    expect(
      secureResponse(new Request(`https://host.test${path}`), new Response(null)).headers.get(
        "cache-control",
      ),
    ).toBe("no-store");
  });
  it("does not apply HSTS to local HTTP", () => {
    expect(
      secureResponse(new Request("http://localhost/"), new Response(null)).headers.has(
        "strict-transport-security",
      ),
    ).toBe(false);
  });
});
