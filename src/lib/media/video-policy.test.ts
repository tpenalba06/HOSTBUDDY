import { describe, expect, it } from "vitest";
import { parseVideoProbe, videoEncodingArgs, VIDEO_POLICY } from "./video-policy";
describe("video preparation policy", () => {
  const probe = (
    duration: string,
    streams = [{ codec_type: "video", width: 1920, height: 1080 }],
  ) => JSON.stringify({ format: { duration }, streams });
  it("accepts a finite video within the 90-second cap", () =>
    expect(parseVideoProbe(probe("89.8"))).toEqual({
      durationSeconds: 89.8,
      width: 1920,
      height: 1080,
    }));
  it("rejects long, infinite, empty and audio-only source files", () => {
    for (const duration of ["91", "Infinity", "0", "NaN"])
      expect(() => parseVideoProbe(probe(duration))).toThrow();
    expect(() => parseVideoProbe(probe("5", []))).toThrow();
  });
  it("produces broadly compatible H264/AAC MP4 with bounded bitrate and fast start", () => {
    const args = videoEncodingArgs("input");
    expect(args).toContain("libx264");
    expect(args).toContain("aac");
    expect(args).toContain("yuv420p");
    expect(args).toContain("+faststart");
    expect(args).toContain("1200k");
    expect(args.at(-1)).toBe("output.mp4");
    expect(VIDEO_POLICY.outputBytes).toBe(20 * 1024 * 1024);
  });
});
