import { describe, expect, it, vi } from "vitest";
import { readOrganizationTeam, requireOrganizationOwner } from "./team-access";
type Client = Parameters<typeof readOrganizationTeam>[0];
describe("team user context", () => {
  const client = (role: string, rpc: unknown) => {
    const query: Record<string, unknown> = {};
    for (const name of ["select", "eq"]) query[name] = () => query;
    query["maybeSingle"] = async () => ({ data: { role }, error: null });
    return { from: () => query, rpc } as unknown as Client;
  };
  it("uses the authenticated owner's client for the auth.uid-protected RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ role: "owner" }], error: null });
    await readOrganizationTeam(client("owner", rpc), "org-1", "user-1");
    expect(rpc).toHaveBeenCalledExactlyOnceWith("get_organization_team", { _org: "org-1" });
  });
  it.each(["admin", "member", "unknown"])(
    "denies %s access before invoking the team RPC",
    async (role) => {
      const rpc = vi.fn();
      await expect(
        readOrganizationTeam(client(role, rpc), "org-1", "user-1"),
      ).rejects.toBeInstanceOf(Response);
      expect(rpc).not.toHaveBeenCalled();
    },
  );
  it("fails closed when membership lookup fails", async () => {
    const query: Record<string, unknown> = {};
    const eq = vi.fn(() => query);
    query["select"] = () => query;
    query["eq"] = eq;
    query["maybeSingle"] = async () => ({ data: null, error: { message: "database unavailable" } });
    const rpc = vi.fn();
    const backend = { from: () => query, rpc } as unknown as Client;
    await expect(
      requireOrganizationOwner(backend, "organization-b", "user-a"),
    ).rejects.toMatchObject({ status: 403 });
    expect(eq.mock.calls).toEqual([
      ["organization_id", "organization-b"],
      ["user_id", "user-a"],
    ]);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("returns a safe error when the user-context RPC rejects access", async () => {
    const rpc = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: "private database details" } });
    await expect(readOrganizationTeam(client("owner", rpc), "org-1", "user-1")).rejects.toThrow(
      "team unavailable",
    );
  });
});
