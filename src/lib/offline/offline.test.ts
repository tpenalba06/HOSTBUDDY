import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { boundedBlob } from "./download";
import {
  listSnapshots,
  deleteSnapshot,
  mediaDigest,
  putSnapshot,
  readSnapshot,
  restoreGuide,
  verifySnapshot,
  type OfflineSnapshot,
} from "./store";
const snapshot = async (): Promise<OfflineSnapshot> => {
  const blob = new Blob(["complete media bytes"], { type: "video/mp4" });
  return {
    version: 1,
    slug: "test-guide",
    savedAt: "2026-10-03",
    bytes: blob.size,
    shellCache: "hb-guest-shell-1",
    persistent: true,
    media: [{ id: "video-1", blob, digest: await mediaDigest(blob) }],
    guide: {
      id: "p",
      name: "Test",
      originalLocale: "fr",
      sections: [
        {
          id: "s",
          key: "welcome",
          title: "Welcome",
          content: {},
          media: [
            {
              id: "video-1",
              type: "video",
              path: "private/file.mp4",
              url: null,
              mimeType: "video/mp4",
              sortOrder: 0,
            },
          ],
        },
      ],
    },
  };
};
beforeEach(async () => {
  for (const item of await listSnapshots()) await deleteSnapshot(item.slug);
});
describe("complete persistent offline snapshots", () => {
  it("survives closing and reopening the database; locally restores media without signed URLs", async () => {
    const value = await snapshot();
    await putSnapshot(value);
    const loaded = await readSnapshot(value.slug);
    expect(loaded).toBeDefined();
    await verifySnapshot(loaded!);
    const create = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:local-video");
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const restored = restoreGuide(loaded!);
    expect(restored.guide.sections[0]!.media![0]!.url).toBe("blob:local-video");
    restored.dispose();
    expect(revoke).toHaveBeenCalledWith("blob:local-video");
    create.mockRestore();
    revoke.mockRestore();
  });
  it("rejects partial, modified or corrupt media instead of claiming an offline-ready copy", async () => {
    const value = await snapshot();
    value.media[0]!.blob = new Blob(["changed media bytes!"]);
    await expect(verifySnapshot(value)).rejects.toThrow();
    const missing = await snapshot();
    missing.media = [];
    await expect(verifySnapshot(missing)).rejects.toThrow();
  });
  it("atomically replaces a previous copy and permits local removal only", async () => {
    const first = await snapshot();
    await putSnapshot(first);
    await putSnapshot({ ...first, savedAt: "2026-10-04" });
    expect((await readSnapshot(first.slug))?.savedAt).toBe("2026-10-04");
    await deleteSnapshot(first.slug);
    expect(await readSnapshot(first.slug)).toBeUndefined();
  });
  it("rejects a missing referenced video even when the byte count is internally consistent", async () => {
    const value = await snapshot();
    value.media = [];
    value.bytes = 0;
    await expect(verifySnapshot(value)).rejects.toThrow("incomplète");
  });
  it("requires every recorded cover, poster and service image and rejects ambiguous duplicate IDs", async () => {
    const value = await snapshot();
    value.requiredMediaIds = ["video-1", "service:breakfast"];
    await expect(verifySnapshot(value)).rejects.toThrow("incomplète");
    value.requiredMediaIds = ["video-1"];
    value.media.push(value.media[0]!);
    value.bytes *= 2;
    await expect(verifySnapshot(value)).rejects.toThrow("incomplète");
  });
  it("restores the cover, poster and service image from persisted blobs without network URLs", async () => {
    const value = await snapshot();
    const photo = new Blob(["photo"], { type: "image/webp" });
    for (const id of ["guide:cover", "poster:video-1", "service:breakfast"])
      value.media.push({ id, blob: photo, digest: await mediaDigest(photo) });
    value.bytes = value.media.reduce((sum, item) => sum + item.blob.size, 0);
    value.requiredMediaIds = value.media.map((item) => item.id);
    value.guide.services = [
      {
        id: "breakfast",
        name: "Breakfast",
        description: "",
        price: 25,
        pricingType: "fixed",
        imagePath: null,
      },
    ];
    await putSnapshot(value);
    const loaded = (await readSnapshot(value.slug))!;
    await verifySnapshot(loaded);
    const create = vi.spyOn(URL, "createObjectURL").mockImplementation(() => "blob:local");
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const restored = restoreGuide(loaded);
    expect(restored.guide.coverUrl).toBe("blob:local");
    expect(restored.guide.sections[0]!.media![0]!.posterUrl).toBe("blob:local");
    expect(restored.guide.services![0]!.imagePath).toBe("blob:local");
    restored.dispose();
    expect(revoke).toHaveBeenCalledTimes(4);
    create.mockRestore();
    revoke.mockRestore();
  });
});
describe("bounded complete downloads", () => {
  it("reads actual bytes when content-length is absent", async () => {
    expect((await boundedBlob(new Response("complete"), 8)).size).toBe(8);
  });
  it("rejects oversized streams even with a dishonest header", async () => {
    await expect(
      boundedBlob(new Response("oversized", { headers: { "content-length": "1" } }), 4),
    ).rejects.toThrow("maximale");
  });
  it("rejects expired signed URLs, empty bodies and aborted downloads", async () => {
    await expect(boundedBlob(new Response("expired", { status: 403 }), 100)).rejects.toThrow();
    await expect(boundedBlob(new Response(""), 100)).rejects.toThrow();
    const controller = new AbortController();
    controller.abort();
    await expect(boundedBlob(new Response("body"), 100, controller.signal)).rejects.toThrow();
  });
  it("immediately cancels a stalled media stream without falsely saving a partial body", async () => {
    const cancel = vi.fn();
    const response = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("partial"));
        },
        cancel,
      }),
    );
    const controller = new AbortController();
    const download = boundedBlob(response, 100, controller.signal);
    await Promise.resolve();
    controller.abort();
    await expect(download).rejects.toThrow();
    expect(cancel).toHaveBeenCalledOnce();
  });
});
