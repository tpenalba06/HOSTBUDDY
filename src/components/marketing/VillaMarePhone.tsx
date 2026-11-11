import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useI18n } from "@/lib/i18n";
import { extractDocument } from "@/lib/import-engine/document-extractor";
import { publicImportPreview, type PublicImportPreview } from "@/lib/import-engine/public-preview";
import { importPublicPreview } from "@/lib/import-engine/public-preview.functions";

export function VillaMarePhone() {
  const { locale, t } = useI18n();
  const fr = locale === "fr";
  const screen = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(0);
  const [mode, setMode] = useState<"url" | "text">("url");
  const [preview, setPreview] = useState<PublicImportPreview | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const element = screen.current;
    if (!element) return;
    const measure = () => setScale(element.getBoundingClientRect().width / 390);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const send = () =>
      frame.current?.contentWindow?.postMessage(
        { type: "nona-import-preview", preview },
        window.location.origin,
      );
    const ready = (event: MessageEvent) => {
      if (
        event.origin === window.location.origin &&
        event.source === frame.current?.contentWindow &&
        event.data === "nona-phone-ready"
      )
        send();
    };
    window.addEventListener("message", ready);
    send();
    return () => window.removeEventListener("message", ready);
  }, [preview]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const value = String(new FormData(event.currentTarget).get("listing") ?? "").trim();
    if (!value) return;
    setPending(true);
    setMessage("");
    try {
      let result: PublicImportPreview;
      if (mode === "text") {
        result = publicImportPreview(extractDocument(value));
      } else {
        const response = await importPublicPreview({ data: { url: value } });
        if (response.status !== "ok") {
          setMessage(
            response.status === "limited"
              ? fr
                ? "Réessaie dans une minute."
                : "Try again in a minute."
              : fr
                ? "Ce lien n’a pas pu être lu. Tu peux coller le texte de l’annonce."
                : "This link could not be read. You can paste the listing text.",
          );
          return;
        }
        result = response.preview;
      }
      const count =
        [result.name, result.arrival, result.departure, result.capacity].filter(Boolean).length +
        (result.amenities?.length ?? 0) +
        (result.rules?.length ?? 0);
      setPreview(result);
      setMessage(
        fr
          ? `${count} information(s) extraite(s). À vérifier avant publication.`
          : `${count} detail(s) extracted. Review before publishing.`,
      );
    } catch {
      setMessage(
        fr
          ? "Aperçu indisponible. Vérifie le lien ou colle le texte."
          : "Preview unavailable. Check the link or paste the text.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto grid w-full min-w-0 max-w-3xl items-center gap-4 xl:grid-cols-2">
      <form
        onSubmit={submit}
        className="min-w-0 space-y-3 rounded-2xl bg-card p-4 text-foreground shadow-soft xl:order-2"
      >
        <h2 className="font-display text-2xl">
          {fr ? "Essayez avec votre logement" : "Try it with your property"}
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={mode === "url"}
            disabled={pending}
            className={`btn min-h-11 ${mode === "url" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setMode("url")}
          >
            {fr ? "Coller un lien" : "Paste a link"}
          </button>
          <button
            type="button"
            aria-pressed={mode === "text"}
            disabled={pending}
            className={`btn min-h-11 ${mode === "text" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setMode("text")}
          >
            {fr ? "Coller du texte" : "Paste text"}
          </button>
        </div>
        <label className="block space-y-1 text-sm font-semibold">
          <span>
            {mode === "url"
              ? fr
                ? "Lien public du logement"
                : "Public listing URL"
              : fr
                ? "Texte de l’annonce"
                : "Listing text"}
          </span>
          {mode === "url" ? (
            <input
              key="url"
              type="url"
              name="listing"
              required
              maxLength={2000}
              placeholder="https://"
              className="w-full rounded-lg border bg-background px-3 py-2"
            />
          ) : (
            <textarea
              key="text"
              name="listing"
              required
              maxLength={12000}
              rows={4}
              className="w-full rounded-lg border bg-background px-3 py-2"
            />
          )}
        </label>
        <button className="btn btn-primary min-h-12 w-full" disabled={pending}>
          {pending
            ? fr
              ? "Lecture…"
              : "Reading…"
            : fr
              ? "Générer mon aperçu"
              : "Generate preview"}
        </button>
        {message && (
          <p className="text-sm" role="status">
            {message}
          </p>
        )}
        {preview && (
          <button
            type="button"
            className="min-h-11 underline"
            onClick={() => {
              setPreview(null);
              setMessage("");
            }}
          >
            {fr ? "Revenir à Villa Mare" : "Back to Villa Mare"}
          </button>
        )}
      </form>
      <div className="mx-auto w-full min-w-0 max-w-[350px]">
        <div className="hb-marketing-phone shadow-phone">
          <div ref={screen} className="hb-marketing-phone-screen">
            <iframe
              ref={frame}
              src={`/phone-preview?lang=${locale}`}
              title={
                preview
                  ? fr
                    ? "Aperçu de votre logement"
                    : "Your property preview"
                  : `${t("demo.guest")} — Villa Mare`
              }
              width={390}
              height={844}
              allow="clipboard-write"
              style={{ transform: `scale(${scale})`, visibility: scale ? "visible" : "hidden" }}
            />
          </div>
        </div>
        <Link
          to="/demo"
          className="btn btn-secondary mt-4 flex min-h-12 w-full justify-center text-sm"
        >
          {t("common.demo")}
        </Link>
      </div>
    </div>
  );
}
