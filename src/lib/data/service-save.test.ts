import { beforeEach, expect, it, vi } from "vitest";
import { saveService } from "./operations";

const db = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("@/lib/service-database-client", () => ({ supabase: db }));
vi.mock("./properties", () => ({
  FriendlyError: class extends Error {},
  listProperties: vi.fn(),
  uploadSectionMedia: vi.fn(),
}));
beforeEach(() => {
  vi.clearAllMocks();
  db.from.mockReturnValue(db);
  db.select.mockReturnValue(db);
  db.eq.mockReturnValue(db);
});
const values = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Synthetic TEST draft",
  description: "No real service",
  price: 25,
  pricingType: "per_person" as const,
  isActive: false,
};
it("creates a new draft with its stable client ID when no earlier row exists", async () => {
  db.maybeSingle.mockResolvedValue({ data: null, error: null });
  db.rpc.mockResolvedValue({ data: { id: values.id }, error: null });
  await expect(saveService("org", "property", values)).resolves.toEqual({ id: values.id });
  expect(db.rpc).toHaveBeenCalledWith(
    "save_service_catalog",
    expect.objectContaining({
      _org: "org",
      _property: "property",
      _service: values.id,
      _values: expect.objectContaining({ is_active: false, price: 25 }),
    }),
  );
});
it("does not turn a denied existing-row lookup into a creation attempt", async () => {
  db.maybeSingle.mockResolvedValue({ data: null, error: { code: "42501" } });
  await expect(saveService("org", "property", values)).rejects.toThrow();
  expect(db.rpc).not.toHaveBeenCalled();
});
