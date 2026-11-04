import { useState, type ImgHTMLAttributes } from "react";

/** Original hosted artwork when available, bundled approved imagery otherwise. */
export function MarketingPhoto({
  src,
  fallback,
  fallbackAlt,
  alt,
  ...props
}: ImgHTMLAttributes<HTMLImageElement> & { fallback: string; fallbackAlt?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <img
      {...props}
      src={failed ? fallback : src}
      alt={failed ? (fallbackAlt ?? alt) : alt}
      onError={() => setFailed(true)}
    />
  );
}
