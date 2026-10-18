import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { uxCopy } from "@/lib/ux-copy";

export function CopyButton({ value, label }: { value: string; label: string }) {
  const { locale } = useI18n();
  const ux = uxCopy(locale);
  const [status, setStatus] = useState<"idle" | "pending" | "copied" | "error">("idle");
  useEffect(() => {
    if (status !== "copied") return;
    const timer = setTimeout(() => setStatus("idle"), 2500);
    return () => clearTimeout(timer);
  }, [status]);
  return (
    <div>
      <Button
        type="button"
        variant="outline"
        disabled={status === "pending"}
        onClick={async () => {
          setStatus("pending");
          try {
            if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
            await navigator.clipboard.writeText(value);
            setStatus("copied");
          } catch {
            setStatus("error");
          }
        }}
      >
        {status === "copied" ? ux.copied : label}
      </Button>
      <span role="status" className={status === "error" ? "mt-2 block text-sm" : "sr-only"}>
        {status === "error" ? ux.copyFailed : status === "copied" ? ux.copied : ""}
      </span>
    </div>
  );
}
