import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useI18n } from "@/lib/i18n";
import { MAX_IMPORT_CHARACTERS } from "@/lib/import-engine/document-extractor";
import {
  previewPastedDocument,
  type PublicImportPreview,
} from "@/lib/import-engine/public-preview";
import { importPublicPreview } from "@/lib/import-engine/public-preview.functions";

export function VillaMarePhone() {
  const { locale, t } = useI18n();
  const fr = locale === "fr";
  const screen = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const pastedText = useRef<HTMLTextAreaElement>(null);
  const focusTextAfterFallback = useRef(false);
  const [scale, setScale] = useState(0);
  const [mode, setMode] = useState<"url" | "text">("url");
  const [preview, setPreview] = useState<PublicImportPreview | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState("");
  useEffect(() => () => photos.forEach((url) => URL.revokeObjectURL(url)), [photos]);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (mode === "text" && !pending && focusTextAfterFallback.current) {
      focusTextAfterFallback.current = false;
      pastedText.current?.focus();
    }
  }, [mode, pending]);

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
        { type: "nona-import-preview", preview, photos },
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
  }, [preview, photos]);

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
        result = previewPastedDocument(value);
      } else {
        const response = await importPublicPreview({ data: { url: value } });
        if (response.status !== "ok") {
          if (response.status !== "limited") {
            focusTextAfterFallback.current = true;
            setMode("text");
          }
          setMessage(
            response.status === "limited"
              ? fr
                ? "Réessaie dans une minute."
                : "Try again in a minute."
              : response.status === "authorization_required"
                ? fr
                  ? "L’import automatique Airbnb nécessite un accès autorisé. Colle la description de ton annonce pour créer ton aperçu."
                  : "Automatic Airbnb import requires authorized access. Paste your listing description to create your preview."
                : fr
                  ? "Ce lien n’a pas pu être lu. Tu peux coller le texte de l’annonce."
                  : "This link could not be read. You can paste the listing text.",
          );
          return;
        }
        result = response.preview;
      }
      const count =
        [
          result.name,
          result.locality,
          result.arrival,
          result.departure,
          result.capacity,
          result.wifiAvailable,
        ].filter(Boolean).length +
        (result.places?.length ?? 0) +
        (result.amenities?.length ?? 0) +
        (result.rules?.length ?? 0) +
        Object.keys(result.text ?? {}).length;
      if (!count) {
        setMessage(
          fr
            ? "Ajoutez quelques détails, par exemple le nom du logement, l’adresse ou les horaires."
            : "Add a few details, such as the property name, address, or arrival time.",
        );
        return;
      }
      setPhotos([]);
      setPhotoError("");
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
        id="try-your-property"
        onSubmit={submit}
        className="min-w-0 space-y-3 rounded-2xl bg-card p-4 text-foreground shadow-soft xl:order-2"
      >
        <h2 className="font-display text-2xl">
          {fr ? "Essayez avec votre logement" : "Try it with your property"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {fr
            ? "Aperçu gratuit et sans compte. Si le lien est bloqué, collez le texte de l’annonce."
            : "Free preview, no account needed. If a link is blocked, paste the listing text."}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={mode === "url"}
            disabled={pending || !scale}
            className={`btn min-h-11 ${mode === "url" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setMode("url")}
          >
            {fr ? "Coller un lien" : "Paste a link"}
          </button>
          <button
            type="button"
            aria-pressed={mode === "text"}
            disabled={pending || !scale}
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
              ref={pastedText}
              key="text"
              name="listing"
              required
              maxLength={MAX_IMPORT_CHARACTERS}
              rows={4}
              className="w-full rounded-lg border bg-background px-3 py-2"
            />
          )}
        </label>
        <button className="btn btn-primary min-h-12 w-full" disabled={pending || !scale}>
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
          <div className="space-y-2 border-t pt-3">
            <a href="#property-preview" className="btn btn-secondary min-h-11 w-full xl:hidden">
              {fr ? "Voir mon aperçu" : "View my preview"}
            </a>
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="btn btn-secondary min-h-11 w-full"
            >
              {fr ? "Créer un compte pour créer mon livret" : "Create an account to build my guide"}
            </Link>
            <p className="text-xs text-muted-foreground">
              {fr ? "Cet aperçu reste dans cet onglet." : "This preview stays in this tab."}
            </p>
          </div>
        )}
        {preview && (
          <details className="space-y-2">
            <summary className="cursor-pointer text-sm">
              {fr ? "Personnaliser les photos" : "Customize photos"}
            </summary>
            <label className="block text-sm font-semibold">
              {fr ? "Ajouter mes photos" : "Add my photos"}
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                className="field mt-1 w-full"
                onChange={(event) => {
                  const files = Array.from(event.currentTarget.files ?? []);
                  event.currentTarget.value = "";
                  if (!files.length) return;
                  if (
                    files.length > 6 ||
                    files.some(
                      (file) =>
                        !/^(image\/(jpeg|png|webp))$/.test(file.type) ||
                        !file.size ||
                        file.size > 5_000_000,
                    )
                  ) {
                    setPhotoError(
                      fr
                        ? "Choisis jusqu’à 6 photos JPEG, PNG ou WebP de 5 Mo chacune."
                        : "Choose up to 6 JPEG, PNG or WebP photos, each under 5 MB.",
                    );
                    return;
                  }
                  setPhotoError("");
                  setPhotos(files.map((file) => URL.createObjectURL(file)));
                }}
              />
            </label>
            <p className="text-xs">
              {fr
                ? "Utilise des photos que tu as le droit de montrer. Elles restent dans ce navigateur."
                : "Use photos you have permission to show. They stay in this browser."}
            </p>
            {photos.length > 0 && (
              <button type="button" className="min-h-11 underline" onClick={() => setPhotos([])}>
                {fr ? "Retirer mes photos" : "Remove my photos"}
              </button>
            )}
            {photoError && <p role="alert">{photoError}</p>}
          </details>
        )}
        {preview && (
          <button
            type="button"
            className="min-h-11 underline"
            onClick={() => {
              setPreview(null);
              setPhotos([]);
              setPhotoError("");
              setMessage("");
            }}
          >
            {fr ? "Revenir à Villa Mare" : "Back to Villa Mare"}
          </button>
        )}
      </form>
      <div id="property-preview" tabIndex={-1} className="mx-auto w-full min-w-0 max-w-[350px]">
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
