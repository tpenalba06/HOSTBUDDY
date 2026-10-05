import QRCode from "qrcode";

export function publicGuidePath(slug: string) {
  return `/l/${encodeURIComponent(slug)}`;
}

export function absoluteQrUrl(path: string, origin: string) {
  const base = new URL(origin);
  const url = new URL(path, base);
  if (url.origin !== base.origin || !/^https?:$/.test(url.protocol)) {
    throw new Error("QR destination must belong to HostBuddy");
  }
  return url.toString();
}

export function qrFilename(slug: string, extension: "png" | "svg") {
  const safe = slug.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 100) || "guide";
  return `qr-${safe}.${extension}`;
}

/** Generates both downloadable formats from exactly the same absolute destination. */
export async function generateQrAssets(url: string) {
  const destination = new URL(url);
  if (!/^https?:$/.test(destination.protocol)) throw new Error("Invalid QR destination");
  const options = { width: 1024, margin: 2, errorCorrectionLevel: "M" as const };
  const [png, svg] = await Promise.all([
    QRCode.toDataURL(destination.toString(), options),
    QRCode.toString(destination.toString(), { ...options, type: "svg" }),
  ]);
  return { url, png, svg: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` };
}
