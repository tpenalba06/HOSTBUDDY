import { useEffect, useState } from "react";
import { GuideView } from "@/components/guest/GuideView";
import { toPublicSections } from "@/components/guest/guide-adapters";
import { Button } from "@/components/ui/button";
import type { EditorData, GuideEditorActions } from "./GuideEditor";
import type { GuideViewData } from "@/components/guest/guide-model";
import { friendlyMessage } from "./Friendly";

export function ManagerGuidePreview({
  data,
  resolveMediaUrl,
  extras,
  onBack,
  compact = false,
}: {
  data: EditorData & { property: EditorData["property"] & { name: string } };
  resolveMediaUrl: GuideEditorActions["resolveMediaUrl"];
  extras?: Partial<GuideViewData>;
  onBack: () => void;
  compact?: boolean;
}) {
  const [guide, setGuide] = useState<GuideViewData | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let live = true;
    Promise.all(
      data.media.map(async (item) => ({ ...item, storage_path: await resolveMediaUrl(item) })),
    )
      .then((media) => {
        if (live)
          setGuide({
            ...extras,
            id: data.property.id,
            name: data.property.name,
            originalLocale: "fr",
            sections: toPublicSections(data.sections, media),
          });
      })
      .catch((e) => {
        if (live) setError(friendlyMessage(e));
      });
    return () => {
      live = false;
    };
  }, [data, resolveMediaUrl, extras]);
  return (
    <div className="manager-guide-preview">
      {!compact && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" onClick={onBack}>
            Retour à l’édition
          </Button>
          <span className="text-sm text-muted-foreground">
            Aperçu · vos modifications enregistrées
          </span>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      {!guide && !error && <p role="status">Chargement de l’aperçu…</p>}
      {notice && (
        <p role="status" className="mb-3 rounded-xl bg-muted p-3">
          {notice}
        </p>
      )}
      {guide && (
        <GuideView
          guide={guide}
          onRequest={() =>
            setNotice(
              "En aperçu, aucune demande n’est envoyée. Ce bouton fonctionnera dans le guide publié.",
            )
          }
        />
      )}
    </div>
  );
}
