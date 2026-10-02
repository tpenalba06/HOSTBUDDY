import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useI18n } from "@/lib/i18n";
import { Copy, Download, Printer } from "lucide-react";

export function guideUrl(slug: string) {
  if (typeof window === "undefined") return `/l/${slug}`;
  return new URL(`/l/${slug}`, window.location.origin).toString();
}

export function QrCard({
  slug,
  name,
  path = `/l/${slug}`,
}: {
  slug: string;
  name: string;
  path?: string;
}) {
  const { t } = useI18n();
  const [url, setUrl] = useState(path);
  const [png, setPng] = useState<string | null>(null);
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => setUrl(new URL(path, window.location.origin).toString()), [path]);
  useEffect(() => {
    QRCode.toDataURL(url, { width: 1024, margin: 2, errorCorrectionLevel: "M" })
      .then(setPng)
      .catch(() => setPng(null));
    QRCode.toString(url, { type: "svg", width: 1024, margin: 2, errorCorrectionLevel: "M" })
      .then((value) => setSvg(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(value)}`))
      .catch(() => setSvg(null));
  }, [url]);
  return (
    <div className="text-center">
      <div className="mx-auto w-60 rounded-3xl bg-card p-4 shadow-phone">
        {png ? (
          <img src={png} alt={`QR code du livret ${name}`} className="w-full" />
        ) : (
          <div className="aspect-square animate-pulse rounded-xl bg-muted" />
        )}
      </div>
      <p className="mt-3 break-all text-sm text-muted-foreground">{url}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {png && (
          <a className="btn btn-secondary px-3" href={png} download={`qr-${slug}.png`}>
            <Download />
            PNG
          </a>
        )}
        {svg && (
          <a className="btn btn-secondary px-3" href={svg} download={`qr-${slug}.svg`}>
            <Download />
            SVG
          </a>
        )}
        <button
          className="btn btn-secondary px-3"
          onClick={() => navigator.clipboard?.writeText(url)}
        >
          <Copy />
          {t("qr.copy")}
        </button>
        <button
          className="btn btn-secondary px-3"
          onClick={() => {
            const popup = window.open("", "_blank", "noopener,noreferrer");
            if (!popup || !png) return;
            popup.document.write(
              `<title>QR ${name.replace(/[<>]/g, "")}</title><style>body{font-family:system-ui;text-align:center;padding:48px;color:#29231f}img{width:min(70vw,520px)}h1{font-size:28px}</style><h1>${name.replace(/[<>]/g, "")}</h1><img src="${png}" alt="QR"><p>${url}</p><script>onload=()=>print()</script>`,
            );
            popup.document.close();
          }}
        >
          <Printer />
          {t("qr.print")}
        </button>
      </div>
    </div>
  );
}
