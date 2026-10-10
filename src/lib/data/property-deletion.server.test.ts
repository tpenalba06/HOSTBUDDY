import { expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { deletePropertyOnServer } from "./property-deletion.server";
const propertyId = "30000000-0000-4000-8000-000000000001";
const org = "10000000-0000-4000-8000-000000000001";
const input = { propertyId, confirmedName: "Synthetic" };
function fixture({
  rpcError = false,
  storageError = false,
  billingError = false,
  foreignPath = false,
} = {}) {
  const paths = Array.from({ length: 205 }, (_, i) => `${org}/${propertyId}/${i}.jpg`);
  if (foreignPath) paths.push(`${org}/another-property/a.jpg`);
  const rpc = vi.fn().mockResolvedValue({
    data: {
      property_id: propertyId,
      organization_id: org,
      confirmed_name: input.confirmedName,
      paths,
    },
    error: rpcError ? {} : null,
  });
  const remove = vi.fn().mockResolvedValue({ error: storageError ? {} : null });
  const query = {
    eq: vi.fn().mockReturnThis(),
    then: (resolve: (r: object) => unknown) => Promise.resolve({ error: null }).then(resolve),
  };
  const deleteJob = vi.fn(() => query);
  const billing = vi.fn().mockImplementation(async () => {
    if (billingError) throw Error("billing");
    return { pending: false };
  });
  const authenticated = { rpc } as unknown as SupabaseClient<Database>;
  const admin = {
    storage: { from: vi.fn(() => ({ remove })) },
    from: vi.fn(() => ({ delete: deleteJob })),
  } as unknown as SupabaseClient<Database>;
  return { authenticated, admin, rpc, remove, deleteJob, billing, paths, query };
}
it("deletes only the authorized manifest in batches, removes the durable job and recalculates billing", async () => {
  const f = fixture();
  expect(await deletePropertyOnServer(f.authenticated, f.admin, input, f.billing)).toEqual({
    deleted: true,
    cleanupPending: false,
    billingPending: false,
  });
  expect(f.rpc).toHaveBeenCalledWith("delete_property_permanently", {
    _property: propertyId,
    _confirmed_name: "Synthetic",
  });
  expect(f.remove.mock.calls.flatMap((c) => c[0])).toEqual(f.paths);
  expect(f.remove).toHaveBeenCalledTimes(3);
  expect(f.query.eq.mock.calls).toEqual([
    ["property_id", propertyId],
    ["organization_id", org],
  ]);
  expect(f.billing).toHaveBeenCalledWith(org);
});
it("keeps the job for retry when storage fails and still recalculates billing", async () => {
  const f = fixture({ storageError: true });
  expect(await deletePropertyOnServer(f.authenticated, f.admin, input, f.billing)).toMatchObject({
    cleanupPending: true,
    billingPending: false,
  });
  expect(f.deleteJob).not.toHaveBeenCalled();
  expect(f.billing).toHaveBeenCalledWith(org);
});
it("does not reverse deletion when billing is unavailable; the SQL billing queue remains retryable", async () => {
  const f = fixture({ billingError: true });
  expect(await deletePropertyOnServer(f.authenticated, f.admin, input, f.billing)).toMatchObject({
    cleanupPending: false,
    billingPending: true,
  });
  expect(f.remove).toHaveBeenCalled();
});
it.each([{ rpcError: true }, { foreignPath: true }])(
  "never runs service-role Storage removal on denied or out-of-scope requests (%j)",
  async (options) => {
    const f = fixture(options);
    await expect(
      deletePropertyOnServer(f.authenticated, f.admin, input, f.billing),
    ).rejects.toThrow();
    expect(f.remove).not.toHaveBeenCalled();
    expect(f.billing).not.toHaveBeenCalled();
  },
);
