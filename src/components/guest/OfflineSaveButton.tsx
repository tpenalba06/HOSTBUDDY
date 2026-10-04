import { useEffect, useRef, useState } from "react";
import { Download, Check } from "lucide-react";
import type { GuideViewData } from "./guide-model";
import { readSnapshot } from "@/lib/offline/store";
import { useI18n, type Locale } from "@/lib/i18n";
const copy: Record<
  Locale,
  {
    save: string;
    update: string;
    open: string;
    cancel: string;
    hint: string;
    saved: string;
    fragile: string;
  }
> = {
  fr: {
    save: "Enregistrer hors connexion",
    update: "Actualiser la copie",
    open: "Ouvrir la copie enregistrée",
    cancel: "Annuler",
    hint: "Informations et photos · 50 Mo maximum",
    saved: "Guide et médias enregistrés sur cet appareil",
    fragile:
      "La copie reste disponible après fermeture. Le navigateur peut l’effacer si l’appareil manque d’espace.",
  },
  en: {
    save: "Save offline",
    update: "Update saved copy",
    open: "Open saved copy",
    cancel: "Cancel",
    hint: "Information and photos · 50 MB maximum",
    saved: "Guide and media saved on this device",
    fragile: "The copy survives closing the browser. Your browser may remove it if storage is low.",
  },
  es: {
    save: "Guardar sin conexión",
    update: "Actualizar copia",
    open: "Abrir copia guardada",
    cancel: "Cancelar",
    hint: "Información y fotos · máximo 50 MB",
    saved: "Guía y medios guardados en este dispositivo",
    fragile: "La copia se conserva al cerrar. El navegador puede borrarla si falta espacio.",
  },
  de: {
    save: "Offline speichern",
    update: "Kopie aktualisieren",
    open: "Gespeicherte Kopie öffnen",
    cancel: "Abbrechen",
    hint: "Informationen und Fotos · maximal 50 MB",
    saved: "Guide und Medien auf diesem Gerät gespeichert",
    fragile:
      "Die Kopie bleibt nach dem Schließen erhalten. Bei wenig Speicher kann der Browser sie entfernen.",
  },
  it: {
    save: "Salva offline",
    update: "Aggiorna copia",
    open: "Apri copia salvata",
    cancel: "Annulla",
    hint: "Informazioni e foto · massimo 50 MB",
    saved: "Guida e media salvati su questo dispositivo",
    fragile: "La copia resta dopo la chiusura. Il browser può rimuoverla se manca spazio.",
  },
  pt: {
    save: "Guardar offline",
    update: "Atualizar cópia",
    open: "Abrir cópia guardada",
    cancel: "Cancelar",
    hint: "Informações e fotografias · máximo 50 MB",
    saved: "Guia e média guardados neste dispositivo",
    fragile: "A cópia permanece após fechar. O navegador pode removê-la se faltar espaço.",
  },
};
export function OfflineSaveButton({ guide, slug }: { guide: GuideViewData; slug: string }) {
  const { locale } = useI18n();
  const labels = copy[locale];
  const [saved, setSaved] = useState(false);
  const [persistent, setPersistent] = useState(true);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const abort = useRef<AbortController | null>(null);
  useEffect(() => {
    let live = true;
    readSnapshot(slug)
      .then((value) => {
        if (live && value) {
          setSaved(true);
          setPersistent(value.persistent);
        }
      })
      .catch(() => {});
    return () => {
      live = false;
      abort.current?.abort();
    };
  }, [slug]);
  const save = async () => {
    if (abort.current) return;
    const controller = new AbortController();
    abort.current = controller;
    setError("");
    setProgress("Préparation du guide…");
    try {
      const { saveGuideOffline } = await import("@/lib/offline/download");
      const result = await saveGuideOffline(guide, slug, setProgress, controller.signal);
      setSaved(true);
      setPersistent(result.persistent);
    } catch (e) {
      setError(
        controller.signal.aborted
          ? "Enregistrement annulé. Votre copie précédente est conservée."
          : e instanceof Error
            ? e.message
            : "L’enregistrement a échoué. Réessayez.",
      );
    } finally {
      abort.current = null;
      setProgress("");
    }
  };
  return (
    <section className="hb-offline-save" aria-label={labels.save}>
      <button
        className="hb-button hb-button-light"
        disabled={!!progress}
        onClick={() => void save()}
      >
        {saved ? <Check size={18} /> : <Download size={18} />} {saved ? labels.update : labels.save}
      </button>
      {progress ? (
        <div role="status">
          <p>{progress}</p>
          <button className="hb-button hb-button-light" onClick={() => abort.current?.abort()}>
            {labels.cancel}
          </button>
        </div>
      ) : (
        <p>{saved ? labels.saved : labels.hint}</p>
      )}
      {saved && (
        <a className="hb-offline-link" href={`/offline?slug=${encodeURIComponent(slug)}`}>
          {labels.open}
        </a>
      )}
      {saved && !persistent && <p>{labels.fragile}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
