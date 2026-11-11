import { beforeEach, describe, expect, it, vi } from "vitest";
import { guestStayResponse } from "./guest-stay.server";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { rpc } }));
const origin = "https://stay.example.invalid";
const token = "a".repeat(64);
const post = (body: unknown, requestOrigin = origin) =>
  new Request(origin + "/api/public/stay-access", {
    method: "POST",
    headers: { "content-type": "application/json", origin: requestOrigin },
    body: JSON.stringify(body),
  });

describe("stay access endpoint", () => {
  beforeEach(() => rpc.mockReset());

  it("rejects other origins, malformed tokens and oversized input before reading storage", async () => {
    expect(
      (await guestStayResponse(post({ slug: "fixture", token }, "https://foreign.invalid"))).status,
    ).toBe(403);
    expect((await guestStayResponse(post({ slug: "fixture", token: "short" }))).status).toBe(400);
    expect(
      (await guestStayResponse(post({ slug: "fixture", token, extra: "x".repeat(600) }))).status,
    ).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns private data with no-store only after a successful property-bound lookup", async () => {
    const data = { entryInstructions: "TEST door" };
    rpc
      .mockResolvedValueOnce({ data, error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    const result = await guestStayResponse(post({ slug: "fixture", token }));
    expect(result.headers.get("cache-control")).toBe("private, no-store");
    expect(await result.json()).toEqual(data);
    expect(rpc).toHaveBeenCalledWith("read_guest_stay_access", { _slug: "fixture", _token: token });
    const denied = await guestStayResponse(post({ slug: "different", token }));
    expect(denied.status).toBe(404);
    expect(await denied.json()).toEqual({ error: "unavailable" });
  });
});
