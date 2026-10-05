import { beforeEach, describe, expect, it, vi } from "vitest";
import { uploadSectionMedia } from "./properties";

const mocks = vi.hoisted(() => ({
  upload: vi.fn(),
  remove: vi.fn(),
  insert: vi.fn(),
  deleted: vi.fn(),
  prepare: vi.fn(),
  validate: vi.fn(),
}));
vi.mock("@/lib/integrations/billing.functions", () => ({ reconcileBilling: vi.fn() }));
vi.mock("@/lib/import-engine/url-import.functions", () => ({ importPropertyPhotos: vi.fn() }));
vi.mock("@/lib/media/prepare-upload", () => ({
  prepareMediaUpload: mocks.prepare,
  preparedVideoMetadata: () => undefined,
}));
vi.mock("./media-validation", () => ({ validateMediaUpload: mocks.validate }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: { from: () => ({ upload: mocks.upload, remove: mocks.remove }) },
    from: () => ({
      insert: (value: unknown) => {
        mocks.insert(value);
        return {
          select: () => ({ single: async () => ({ data: { id: "new-media" }, error: null }) }),
        };
      },
      delete: () => ({ eq: mocks.deleted }),
    }),
  },
}));
const photo = () => new File(["new photo"], "photo.webp", { type: "image/webp" });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.prepare.mockImplementation(async (file: File) => file);
  mocks.validate.mockResolvedValue(undefined);
  mocks.upload.mockResolvedValue({ error: null });
  mocks.remove.mockResolvedValue({ error: null });
  mocks.deleted.mockResolvedValue({ error: null });
});
describe("media upload cancellation", () => {
  it("does not upload or insert when cancellation happens during preparation", async () => {
    const controller = new AbortController();
    mocks.prepare.mockImplementation(async (file: File) => {
      controller.abort();
      return file;
    });
    await expect(
      uploadSectionMedia("org", "property", "section", photo(), { signal: controller.signal }),
    ).rejects.toThrow("annulé");
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("removes only the new storage object when cancelled during transfer", async () => {
    const controller = new AbortController();
    mocks.upload.mockImplementation(async () => {
      controller.abort();
      return { error: null };
    });
    const progress = vi.fn();
    await expect(
      uploadSectionMedia("org", "property", "section", photo(), {
        signal: controller.signal,
        onProgress: progress,
      }),
    ).rejects.toThrow("annulé");
    const path = mocks.upload.mock.calls[0]![0];
    expect(mocks.remove).toHaveBeenCalledExactlyOnceWith([path]);
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(progress).toHaveBeenCalledExactlyOnceWith({ phase: "uploading", percent: 0 });
  });
  it("removes the newly inserted media after late cancellation and never returns it as saved", async () => {
    const controller = new AbortController();
    mocks.insert.mockImplementation(() => controller.abort());
    await expect(
      uploadSectionMedia("org", "property", "section", photo(), { signal: controller.signal }),
    ).rejects.toThrow("annulé");
    expect(mocks.deleted).toHaveBeenCalledExactlyOnceWith("id", "new-media");
    expect(mocks.remove).toHaveBeenCalledExactlyOnceWith([mocks.upload.mock.calls[0]![0]]);
  });
  it("reports completion only after storage upload and media registration succeed", async () => {
    const progress = vi.fn();
    mocks.upload.mockImplementation(async () => {
      expect(progress).toHaveBeenCalledExactlyOnceWith({ phase: "uploading", percent: 0 });
      return { error: null };
    });
    await expect(
      uploadSectionMedia("org", "property", "section", photo(), { onProgress: progress }),
    ).resolves.toEqual({ id: "new-media" });
    expect(progress.mock.calls.at(-1)?.[0]).toEqual({ phase: "uploading", percent: 100 });
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});
