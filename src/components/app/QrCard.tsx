import { useEffect, useState } from "react";
import { absoluteQrUrl, generateQrAssets, publicGuidePath, qrFilename } from "@/lib/qr";
import { useI18n } from "@/lib/i18n";
import { Copy, Download, Printer } from "lucide-react";

export function guideUrl(slug: string) {
  const path = publicGuidePath(slug);
  if (typeof window === "undefined") return path;
  return absoluteQrUrl(path, window.location.origin);
}

export function QrCard({
  slug,
  name,
  path = publicGuidePath(slug),
}: {
  slug: string;
  name: string;
  path?: string;
}) {
  const { t } = useI18n();
  const [assets, setAssets] = useState<Awaited<ReturnType<typeof generateQrAssets>> | null>(null);
  const [resolvedPath, setResolvedPath] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState(false);
  const [printError, setPrintError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setAssets(null);
    setCopied(false);
    setCopyError(false);
    setPrintError(false);
    setGenerationError(false);
    setResolvedPath(path);
    setUrl(null);
    try {
      const destination = absoluteQrUrl(path, window.location.origin);
      setUrl(destination);
      void generateQrAssets(destination).then(
        (next) => {
          if (!cancelled) setAssets(next);
        },
        () => {
          if (!cancelled) setGenerationError(true);
        },
      );
    } catch {
      setGenerationError(true);
    }
    return () => {
      cancelled = true;
    };
  }, [path]);
  // A path change invalidates old downloads immediately, before the effect runs.
  const current = resolvedPath === path ? assets : null;
  const currentUrl = resolvedPath === path ? url : null;
  const png = current?.png;
  const svg = current?.svg;
  return (
    <div className="text-center">
      <div className="mx-auto w-60 max-w-full rounded-3xl bg-card p-4 shadow-phone">
        {png ? (
          <img
            src={png}
            alt={`${t("qr.alt")} ${name}`}
            className="w-full"
            width={1024}
            height={1024}
          />
        ) : (
          <div
            className="aspect-square animate-pulse rounded-xl bg-muted"
            aria-label={t("common.loading")}
          />
        )}
      </div>
      <p className="mt-3 break-all text-sm text-muted-foreground">{currentUrl ?? path}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {png && (
          <a
            className="btn btn-secondary min-h-11 min-w-0 px-3"
            href={png}
            download={qrFilename(slug, "png")}
          >
            <Download />
            PNG
          </a>
        )}
        {svg && (
          <a
            className="btn btn-secondary min-h-11 min-w-0 px-3"
            href={svg}
            download={qrFilename(slug, "svg")}
          >
            <Download />
            SVG
          </a>
        )}
        <button
          type="button"
          className="btn btn-secondary min-h-11 min-w-0 px-3"
          disabled={!currentUrl}
          onClick={async () => {
            setCopyError(false);
            try {
              if (!navigator.clipboard) throw new Error("unavailable");
              if (!currentUrl) return;
              await navigator.clipboard.writeText(currentUrl);
              setCopied(true);
            } catch {
              setCopyError(true);
            }
          }}
        >
          <Copy />
          {copied ? t("common.saved") : t("qr.copy")}
        </button>
        <button
          type="button"
          className="btn btn-secondary min-h-11 min-w-0 px-3"
          disabled={!png}
          onClick={() => {
            if (!png || !currentUrl) return;
            setPrintError(false);
            const popup = window.open("", "_blank");
            if (!popup) {
              setPrintError(true);
              return;
            }
            popup.opener = null;
            popup.addEventListener("load", () => popup.print(), { once: true });
            const escape = (value: string) =>
              value.replace(
                /[&<>"']/g,
                (character) =>
                  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
                    character
                  ]!,
              );
            popup.document.write(
              `<title>QR ${escape(name)}</title><style>body{font-family:system-ui;text-align:center;padding:48px;color:#29231f}img{width:min(70vw,520px)}h1{font-size:28px}p{overflow-wrap:anywhere}</style><h1>${escape(name)}</h1><img src="${png}" alt="QR"><p>${escape(currentUrl)}</p>`,
            );
            popup.document.close();
          }}
        >
          <Printer />
          {t("qr.print")}
        </button>
      </div>
      {generationError && (
        <p role="alert" className="mt-2 text-sm">
          {t("qr.failed")}
        </p>
      )}
      {printError && (
        <p role="alert" className="mt-2 text-sm">
          {t("qr.printFailed")}
        </p>
      )}
      {copyError && (
        <p role="alert" className="mt-2 text-sm">
          {t("guide.copyFailed")}
        </p>
      )}
    </div>
  );
}
