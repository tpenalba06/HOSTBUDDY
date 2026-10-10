import { describe, expect, it } from "vitest";
import { absoluteQrUrl, generateQrAssets, publicGuidePath, qrFilename } from "./qr";

describe("public guide QR destinations", () => {
  it("encodes a slug as one route segment and keeps the current preview origin", () => {
    expect(absoluteQrUrl(publicGuidePath("villa mare/été?"), "https://preview.example.test")).toBe(
      "https://preview.example.test/l/villa%20mare%2F%C3%A9t%C3%A9%3F",
    );
    expect(absoluteQrUrl("/demo", "https://preview.example.test")).toBe(
      "https://preview.example.test/demo",
    );
  });

  it("rejects destinations outside the application or executable URLs", () => {
    for (const path of [
      "https://untrusted.example/l/villa",
      "//untrusted.example",
      "javascript:alert(1)",
    ]) {
      expect(() => absoluteQrUrl(path, "https://hostbuddy.example")).toThrow();
    }
  });

  it("creates portable filenames without slash or query injection", () => {
    expect(qrFilename("villa/été?", "png")).toBe("qr-villa--t--.png");
    expect(qrFilename("", "svg")).toBe("qr-guide.svg");
  });
});

describe("downloadable QR encoding", () => {
  it("produces a real 1024px PNG and a complete vector image for the absolute guide URL", async () => {
    const url = "https://preview.example.test/l/villa-mare";
    const assets = await generateQrAssets(url);
    const png = Buffer.from(assets.png.replace(/^data:image\/png;base64,/, ""), "base64");
    expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    // PNG IHDR dimensions: catches a broken data URL or thumbnail-sized export.
    expect(png.readUInt32BE(16)).toBe(1024);
    expect(png.readUInt32BE(20)).toBe(1024);
    const svg = decodeURIComponent(assets.svg.split(",")[1]!);
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(assets.url).toBe(url);
  });

  it("does not encode a relative route that a scanner cannot open", async () => {
    await expect(generateQrAssets("/l/villa-mare")).rejects.toThrow();
  });
});
