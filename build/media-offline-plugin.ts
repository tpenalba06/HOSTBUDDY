import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import type { Plugin } from "vite";

export function mediaOfflinePlugin(): Plugin {
  return {
    name: "hostbuddy-media-offline",
    apply: "build",
    generateBundle(_options, bundle) {
      if (this.environment.name !== "client") return;
      const core = resolve("node_modules/@ffmpeg/core/dist/esm");
      const wasm = readFileSync(resolve(core, "ffmpeg-core.wasm"));
      this.emitFile({
        type: "asset",
        fileName: "video-codec/0.12.10/ffmpeg-core.js",
        source: readFileSync(resolve(core, "ffmpeg-core.js")),
      });
      const middle = Math.ceil(wasm.length / 2);
      [wasm.subarray(0, middle), wasm.subarray(middle)].forEach((source, index) =>
        this.emitFile({
          type: "asset",
          fileName: `video-codec/0.12.10/core-${index}.wasm-part`,
          source,
        }),
      );
      const assets = Object.values(bundle)
        .map((item) => `/${item.fileName}`)
        .filter((path) => /\.(js|css)$/.test(path) && !path.includes("video-codec/"));
      for (const directory of ["guide-fonts", "hostbuddy-media", "demo-guide"]) {
        for (const name of readdirSync(resolve("public", directory))) {
          if (/\.(ttf|woff2?|webp|jpe?g|png)$/.test(name)) assets.push(`/${directory}/${name}`);
        }
      }
      const version = createHash("sha256")
        .update(JSON.stringify(assets))
        .digest("hex")
        .slice(0, 20);
      this.emitFile({
        type: "asset",
        fileName: "offline-assets.json",
        source: JSON.stringify({ version, assets }),
      });
    },
  };
}
