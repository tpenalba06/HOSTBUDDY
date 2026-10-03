import { describe, expect, it } from "vitest";
import { readVideoProbeResult } from "./video-policy";

const valid = JSON.stringify({
  format: { duration: "6" },
  streams: [{ codec_type: "video", width: 640, height: 360 }],
});

describe("WASM probe result validation", () => {
  it.each([0, -1])("accepts fresh valid metadata for core return %i", async (code) => {
    await expect(readVideoProbeResult(code, async () => valid)).resolves.toEqual({
      durationSeconds: 6,
      width: 640,
      height: 360,
    });
  });
  it("rejects a real timeout even if output exists", async () => {
    await expect(readVideoProbeResult(1, async () => valid)).rejects.toThrow();
  });
  it("does not turn the -1 quirk into an unchecked success", async () => {
    await expect(
      readVideoProbeResult(-1, async () => {
        throw new Error("missing");
      }),
    ).rejects.toThrow();
    await expect(readVideoProbeResult(-1, async () => "{}")).rejects.toThrow();
    await expect(
      readVideoProbeResult(-1, async () => valid.replace('"6"', '"91"')),
    ).rejects.toThrow("90 secondes");
  });
});
