import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Trash2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GuideSection, SectionMedia } from "@/lib/data/properties";
import type { GuideEditorActions, EditorProperty } from "./GuideEditor";
import { getGuideItems } from "@/lib/data/guide-content";
import type { PropertyMediaConfig } from "@/components/guest/property-media";
import type { Json } from "@/integrations/supabase/types";
import { friendlyMessage } from "./Friendly";
import { ambienceFor } from "@/components/guest/visual-library";

export function PropertyMediaEditor({
  property,
  section,
  media,
  actions,
  onSection,
  onMedia,
  onPreview,
  onBusyChange,
}: {
  property: EditorProperty;
  section: GuideSection | undefined;
  media: SectionMedia[];
  actions: GuideEditorActions;
  onSection: (section: GuideSection) => void;
  onMedia: (media: SectionMedia[]) => void;
  onPreview: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    onBusyChange(busy);
    return () => onBusyChange(false);
  }, [busy, onBusyChange]);
  const [error, setError] = useState("");
  const [videoProgress, setVideoProgress] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);
  const [dragged, setDragged] = useState<string | null>(null);
  const own = media
    .filter((item) => item.section_id === section?.id)
    .sort((a, b) => a.sort_order - b.sort_order);
  const images = own.filter((item) => item.media_type === "image");
  const raw = section?.content as { propertyMedia?: PropertyMediaConfig } | undefined;
  const config = raw?.propertyMedia ?? { version: 1 };
  const cover = images.find((item) => item.id === config.coverId) ?? images[0];
  useEffect(() => {
    let live = true;
    Promise.all(
      media
        .filter((item) => item.section_id === section?.id)
        .map(async (item) => [item.id, await actions.resolveMediaUrl(item)] as const),
    )
      .then((entries) => {
        if (live) setUrls(Object.fromEntries(entries));
      })
      .catch((e) => {
        if (live) setError(friendlyMessage(e));
      });
    return () => {
      live = false;
    };
  }, [media, section?.id, actions]);
  const run = async (task: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (e) {
      setError(e instanceof Error ? e.message : friendlyMessage(e));
    } finally {
      setBusy(false);
      setVideoProgress("");
      abortRef.current = null;
    }
  };
  const saveConfig = async (current: GuideSection, next: PropertyMediaConfig) => {
    const updated = await actions.save(
      {
        ...current,
        content: { ...(current.content as object), propertyMedia: next } as unknown as Json,
      },
      {
        title: current.title,
        items: getGuideItems(current.section_key, current.content),
        isVisible: current.is_visible,
        icon: current.icon ?? "👋",
        ctaLabel: current.cta_label ?? "",
        propertyMedia: next,
      },
    );
    onSection(updated);
  };
  const getSection = async () => {
    if (section) return section;
    const created = await actions.add(property.id, 0, {
      key: "welcome",
      title: "Bienvenue",
      icon: "👋",
    });
    onSection(created);
    return created;
  };
  const upload = (file: File, replacement?: SectionMedia, primary = false) =>
    run(async () => {
      const current = await getSection();
      const controller = new AbortController();
      abortRef.current = controller;
      const item = await actions.upload(property.organization_id, property.id, current.id, file, {
        signal: controller.signal,
        onProgress: ({ phase, percent }) =>
          setVideoProgress(
            phase === "loading"
              ? "Préparation vidéo…"
              : phase === "encoding"
                ? `Optimisation vidéo · ${percent} %`
                : "Envoi de la vidéo…",
          ),
      });
      // Persist the replacement before removing the previous file; a failed upload never destroys it.
      if (primary || replacement?.id === cover?.id || (!cover && item.media_type === "image"))
        await saveConfig(current, { ...config, coverId: item.id });
      if (item.media_type === "video")
        await saveConfig(current, { ...config, presentationVideoId: item.id });
      if (replacement) await actions.removeMedia(replacement);
      onMedia([...media.filter((m) => m.id !== replacement?.id), item]);
    });
  const reorder = (id: string, target: string) =>
    run(async () => {
      if (!section || id === target) return;
      const next = images.filter((item) => item.id !== id);
      const item = images.find((item) => item.id === id);
      if (!item) return;
      next.splice(
        Math.max(
          0,
          next.findIndex((item) => item.id === target),
        ),
        0,
        item,
      );
      const ordered = await Promise.all(
        next.map((item, index) => actions.updateMedia(item, { sortOrder: index })),
      );
      await saveConfig(section, { ...config, galleryIds: ordered.map((item) => item.id) });
      onMedia([...media.filter((item) => !ordered.some((m) => m.id === item.id)), ...ordered]);
    });
  const input = (label: string, accept: string, replace?: SectionMedia, primary = false) => (
    <label className={`btn btn-secondary cursor-pointer ${busy ? "opacity-50" : ""}`}>
      <input
        type="file"
        className="sr-only"
        accept={accept}
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file, replace, primary);
          e.target.value = "";
        }}
      />
      {label}
    </label>
  );
  return (
    <section
      className="property-media-editor surface mb-6 p-4 sm:p-6"
      aria-label="Médias du logement"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl">Médias du logement</h2>
        <Button variant="outline" disabled={busy} onClick={onPreview}>
          Aperçu voyageur
        </Button>
      </div>
      {(section?.content as { mediaImportWarning?: string })?.mediaImportWarning && (
        <p role="status" className="mb-3 text-sm text-warning">
          {(section!.content as { mediaImportWarning: string }).mediaImportWarning}
        </p>
      )}
      {videoProgress && (
        <div role="status" className="mb-3 flex items-center gap-3">
          <span>{videoProgress}</span>
          {!videoProgress.startsWith("Envoi") && (
            <Button variant="outline" onClick={() => abortRef.current?.abort()}>
              Annuler
            </Button>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="mb-3 rounded-xl bg-warning-soft p-3">
          {error}
        </p>
      )}
      <div className="relative mb-4 overflow-hidden rounded-2xl">
        <img
          className="aspect-[2/1] w-full object-cover"
          src={
            cover
              ? urls[cover.id]
              : property.coverUrl ||
                ambienceFor(
                  `${property.name ?? ""} ${
                    section
                      ? getGuideItems(section.section_key, section.content)
                          .map((item) => item.text)
                          .join(" ")
                      : ""
                  }`,
                )
          }
          alt="Couverture du logement"
        />
        <div className="absolute bottom-3 right-3">
          {input(
            "Modifier la couverture",
            "image/jpeg,image/png,image/webp,image/avif",
            cover,
            true,
          )}
        </div>
        {!cover && (
          <span className="absolute left-3 top-3 rounded-full bg-card/90 px-3 py-1 text-xs">
            Ambiance HostBuddy
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((item, index) => (
          <div
            key={item.id}
            draggable={!busy}
            onDragStart={() => setDragged(item.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragged) void reorder(dragged, item.id);
              setDragged(null);
            }}
            className="overflow-hidden rounded-xl border bg-card"
          >
            <img
              src={urls[item.id]}
              alt={item.alt_text || `Photo ${index + 1}`}
              className="aspect-[4/3] w-full object-cover"
            />
            <div className="grid gap-1 p-2">
              <Button
                variant="ghost"
                disabled={busy}
                aria-pressed={cover?.id === item.id}
                onClick={() =>
                  void run(async () => {
                    if (section) await saveConfig(section, { ...config, coverId: item.id });
                  })
                }
              >
                {cover?.id === item.id ? "✓ Principale" : "Photo principale"}
              </Button>
              {input("Remplacer", "image/jpeg,image/png,image/webp,image/avif", item)}
              <div className="flex justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Avancer la photo"
                  disabled={busy || index === 0}
                  onClick={() => void reorder(item.id, images[index - 1]!.id)}
                >
                  <ArrowUp size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Reculer la photo"
                  disabled={busy || index === images.length - 1}
                  onClick={() => void reorder(images[index + 1]!.id, item.id)}
                >
                  <ArrowDown size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Supprimer la photo"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await actions.removeMedia(item);
                      onMedia(media.filter((m) => m.id !== item.id));
                    })
                  }
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <span className="inline-flex items-center gap-2">
          <ImagePlus size={18} />
          {input("Ajouter des photos", "image/jpeg,image/png,image/webp,image/avif")}
        </span>
        <span className="inline-flex items-center gap-2">
          <Video size={18} />
          {input("Ajouter une vidéo", "video/mp4,video/webm")}
        </span>
      </div>
      {own
        .filter((item) => item.media_type === "video")
        .map((item) => (
          <div key={item.id} className="mt-4">
            <video
              controls
              playsInline
              preload="metadata"
              src={urls[item.id]}
              className="aspect-video w-full rounded-xl"
            />
            <div className="mt-2 flex gap-2">
              {input("Remplacer la vidéo", "video/mp4,video/webm", item)}
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await actions.removeMedia(item);
                    onMedia(media.filter((m) => m.id !== item.id));
                  })
                }
              >
                Supprimer
              </Button>
            </div>
          </div>
        ))}
      <p role="status" className="mt-3 text-sm text-muted-foreground">
        {busy
          ? "Enregistrement…"
          : "Photos : 10 Mo max. Vidéo : 50 Mo max., 90 secondes. Glissez les photos pour les réordonner."}
      </p>
    </section>
  );
}
