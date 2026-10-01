import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useI18n } from "@/lib/i18n";

export function guideUrl(slug: string) {
  if (typeof window === "undefined") return `/l/${slug}`;
  return new URL(`/l/${slug}`, window.location.origin).toString();
}

export function QrCard({ slug, name }: { slug: string; name: string }) {
  const { t } = useI18n();
  const [url, setUrl] = useState(`/l/${slug}`);
  const [png, setPng] = useState<string | null>(null);
  useEffect(() => setUrl(guideUrl(slug)), [slug]);
  useEffect(() => {
    QRCode.toDataURL(url, { width: 1024, margin: 2, errorCorrectionLevel: "M" }).then(setPng).catch(() => setPng(null));
  }, [url]);
  return (
    <div className="text-center">
      <div className="mx-auto w-60 rounded-3xl bg-card p-4 shadow-phone">
        {png ? <img src={png} alt={`QR code du livret ${name}`} className="w-full" /> : <div className="aspect-square animate-pulse rounded-xl bg-muted" />}
      </div>
      <p className="mt-3 break-all text-sm text-muted-foreground">{url}</p>
      {png && (
        <a className="btn btn-secondary mt-4" href={png} download={`qr-${slug}.png`}>{t("common.save")} QR</a>
      )}
    </div>
  );
}
