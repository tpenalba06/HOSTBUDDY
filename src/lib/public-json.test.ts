import { describe, it, expect } from "vitest";
import { readPublicJson } from "./public-json";
import { parseThreadSession } from "./guest-thread";
describe("bounded public inputs", () => {
  it("accepts a valid JSON form", async () => {
    expect(
      await readPublicJson(
        new Request("https://example.test", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: '{"message":"Hello"}',
        }),
      ),
    ).toEqual({ message: "Hello" });
  });
  it("rejects oversized bytes even with a forged header", async () => {
    expect(
      await readPublicJson(
        new Request("https://example.test", {
          method: "POST",
          headers: { "content-type": "application/json", "content-length": "1" },
          body: JSON.stringify({ message: "x".repeat(20000) }),
        }),
      ),
    ).toBeNull();
  });
  it("rejects invalid JSON and non-JSON requests", async () => {
    expect(
      await readPublicJson(
        new Request("https://example.test", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{",
        }),
      ),
    ).toBeNull();
    expect(
      await readPublicJson(new Request("https://example.test", { method: "POST", body: "{}" })),
    ).toBeNull();
  });
  it("never restores malformed or incomplete conversation capabilities", () => {
    expect(parseThreadSession({ id: "bad", token: "a".repeat(64) })).toBeNull();
    expect(
      parseThreadSession({ id: "00000000-0000-4000-8000-000000000000", token: "short" }),
    ).toBeNull();
    expect(
      parseThreadSession({ id: "00000000-0000-4000-8000-000000000000", token: "a".repeat(64) }),
    ).toEqual({ id: "00000000-0000-4000-8000-000000000000", token: "a".repeat(64) });
  });
});
