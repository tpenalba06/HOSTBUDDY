import { describe, expect, it, vi } from "vitest";
import { readOrganizationTeam } from "./team-access";
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
  it("denies non-owner access before invoking the team RPC", async () => {
    const rpc = vi.fn();
    await expect(
      readOrganizationTeam(client("member", rpc), "org-1", "user-1"),
    ).rejects.toBeInstanceOf(Response);
    expect(rpc).not.toHaveBeenCalled();
  });
});
