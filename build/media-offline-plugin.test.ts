import { beforeEach, describe, expect, it, vi } from "vitest";
import { mediaOfflinePlugin } from "./media-offline-plugin";

const files = vi.hoisted(() => ({ photo: "original photo", font: "original font" }));
vi.mock("node:fs", () => ({
  readFileSync: (path: string) =>
    Buffer.from(
      path.endsWith("cover.webp")
        ? files.photo
        : path.endsWith("text.woff2")
          ? files.font
          : "codec",
    ),
  readdirSync: (path: string) => (path.endsWith("guide-fonts") ? ["text.woff2"] : ["cover.webp"]),
}));

function manifest() {
  const emitted: Array<{ fileName: string; source: string | Uint8Array }> = [];
  const plugin = mediaOfflinePlugin();
  const hook = plugin.generateBundle as (...args: unknown[]) => void;
  hook.call(
    {
      environment: { name: "client" },
      emitFile: (asset: (typeof emitted)[number]) => emitted.push(asset),
    },
    {},
    {
      js: { fileName: "assets/reader-hash.js" },
      css: { fileName: "assets/reader-hash.css" },
      codec: { fileName: "video-codec/0.12.10/ffmpeg-core.js" },
    },
    false,
  );
  return JSON.parse(
    emitted.find((asset) => asset.fileName === "offline-assets.json")!.source as string,
  ) as {
    version: string;
    assets: string[];
  };
}

beforeEach(() => {
  files.photo = "original photo";
  files.font = "original font";
});
describe("offline reader release cache", () => {
  it("changes the release when a photo is replaced at the same public URL", () => {
    const before = manifest();
    files.photo = "replacement photo";
    const after = manifest();
    expect(after.assets).toEqual(before.assets);
    expect(after.version).not.toBe(before.version);
    expect(after.version).toMatch(/^[a-f0-9]{20}$/);
  });
  it("changes the release for font bytes and stays deterministic for an identical build", () => {
    const before = manifest();
    expect(manifest().version).toBe(before.version);
    files.font = "updated font";
    expect(manifest().version).not.toBe(before.version);
  });
  it("excludes the manager video encoding engine from traveler downloads", () => {
    expect(manifest().assets.some((path) => path.includes("video-codec"))).toBe(false);
  });
});
