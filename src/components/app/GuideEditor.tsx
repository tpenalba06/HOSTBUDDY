import type { UploadPreparation } from "@/lib/media/video-policy";
import type { PropertyMediaConfig } from "@/components/guest/property-media";
import { useBlocker } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Eye, Home, ImagePlus, Plus, Trash2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  addGuideSection,
  deleteGuideSection,
  ensureGuideSections,
  removeSectionMedia,
  reorderGuideSections,
  saveGuideSection,
  updateSectionMedia,
  uploadSectionMedia,
  type GuideSection,
  type PropertyField,
  type SectionMedia,
} from "@/lib/data/properties";
import { friendlyMessage } from "./Friendly";
import { useI18n } from "@/lib/i18n";
import { ManagerGuidePreview } from "./ManagerGuidePreview";
import { PropertyMediaEditor } from "./PropertyMediaEditor";
import { sectionVisual } from "@/components/guest/visual-library";
import { getGuideItems, type GuideContentItem } from "@/lib/data/guide-content";

export type EditorProperty = {
  id: string;
  organization_id: string;
  status: string;
  name?: string;
  coverUrl?: string | null;
};
export type EditorData = {
  property: EditorProperty;
  fields: PropertyField[];
  sections: GuideSection[];
  media: SectionMedia[];
};
export type GuideEditorActions = {
  ensure: (propertyId: string, fields: PropertyField[]) => Promise<GuideSection[]>;
  add: (
    propertyId: string,
    order: number,
    template: { key: string; title: string; icon: string },
  ) => Promise<GuideSection>;
  save: (
    section: GuideSection,
    values: {
      title: string;
      items: GuideContentItem[];
      isVisible: boolean;
      icon: string;
      ctaLabel: string;
      propertyMedia?: PropertyMediaConfig;
    },
  ) => Promise<GuideSection>;
  reorder: (sections: GuideSection[]) => Promise<void>;
  remove: (sectionId: string) => Promise<void>;
  upload: (
    orgId: string,
    propertyId: string,
    sectionId: string,
    file: File,
    options?: UploadPreparation,
  ) => Promise<SectionMedia>;
  updateMedia: (
    media: SectionMedia,
    values: { caption?: string; altText?: string; sortOrder?: number },
  ) => Promise<SectionMedia>;
  removeMedia: (media: SectionMedia) => Promise<void>;
  resolveMediaUrl: (media: SectionMedia) => Promise<string>;
};
export const realGuideEditorActions: GuideEditorActions = {
  ensure: ensureGuideSections,
  add: addGuideSection,
  save: saveGuideSection,
  reorder: reorderGuideSections,
  remove: deleteGuideSection,
  upload: uploadSectionMedia,
  updateMedia: updateSectionMedia,
  removeMedia: removeSectionMedia,
  resolveMediaUrl: async (item) =>
    (await supabase.storage.from("guide-media").createSignedUrl(item.storage_path, 900)).data
      ?.signedUrl ?? "",
};
const itemsOf = (section: GuideSection) => getGuideItems(section.section_key, section.content);
const blankItem = (): GuideContentItem => ({ label: "", text: "" });
const ICONS = ["🔑", "📶", "🏡", "📍", "✨", "🧳", "💬", "🅿️", "🏊", "📋", "🛏️", "🍽️", "🚲", "📌"];
const TEMPLATE_KEYS = [
  "arrival",
  "wifi",
  "house",
  "parking",
  "pool",
  "rules",
  "amenities",
  "places",
  "services",
  "departure",
  "contact",
  "custom",
] as const;
const SYSTEM_SECTION_KEYS = new Set<string>([
  "welcome",
  ...TEMPLATE_KEYS.filter((key) => key !== "custom"),
]);
const sectionKind = (section: GuideSection) => section.section_key.split("-")[0] ?? "custom";
const sectionLabel = (section: GuideSection, t: (key: string) => string) => {
  const kind = sectionKind(section);
  return SYSTEM_SECTION_KEYS.has(kind) ? t(`section.${kind}`) : section.title;
};

export function GuideEditor({
  data,
  onChanged,
  onPreview,
  onPublish,
  actions = realGuideEditorActions,
  compact = false,
}: {
  data: EditorData;
  onChanged: () => void;
  onPreview: () => void | Promise<void>;
  onPublish?: () => Promise<void>;
  actions?: GuideEditorActions;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const flushers = useRef(new Map<string, () => Promise<void>>());
  const actionLock = useRef(false);
  const [sections, setSections] = useState(data.sections);
  const [media, setMedia] = useState(data.media);
  const [open, setOpen] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [publishedSaved, setPublishedSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [transfers, setTransfers] = useState(0);
  const [templates, setTemplates] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setSections(data.sections);
    setMedia(data.media);
  }, [data.sections, data.media]);
  useEffect(() => {
    if (sections.length) return;
    actions
      .ensure(data.property.id, data.fields)
      .then(setSections)
      .catch((e) => setError(friendlyMessage(e)));
  }, [actions, data.fields, data.property.id, sections.length]);
  useBlocker({
    shouldBlockFn: async () => {
      if (mediaBusy || transfers > 0) return true;
      try {
        await Promise.all([...flushers.current.values()].map((flush) => flush()));
        return false;
      } catch {
        return true;
      }
    },
    enableBeforeUnload: () => saving || mediaBusy || transfers > 0,
  });
  const sorted = useMemo(
    () => [...sections].sort((a, b) => a.sort_order - b.sort_order),
    [sections],
  );
  const flash = (published = false) => {
    setPublishedSaved(published);
    setSaving(false);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
    onChanged();
  };
  const proceed = async (publish = false) => {
    if (actionLock.current || mediaBusy || transfers > 0) return;
    actionLock.current = true;
    setSaving(true);
    setError("");
    try {
      await Promise.all([...flushers.current.values()].map((flush) => flush()));
      if (publish) {
        await onPublish?.();
        flash(true);
      } else await onPreview();
    } catch (e) {
      setError(friendlyMessage(e));
    } finally {
      setSaving(false);
      actionLock.current = false;
    }
  };
  const move = async (id: string, direction: -1 | 1) => {
    const index = sorted.findIndex((item) => item.id === id);
    const target = index + direction;
    if (target < 0 || target >= sorted.length) return;
    const next = [...sorted];
    const current = next[index];
    const replacement = next[target];
    if (!current || !replacement) return;
    next[index] = replacement;
    next[target] = current;
    const ordered = next.map((item, i) => ({ ...item, sort_order: i }));
    setSections(ordered);
    try {
      await actions.reorder(ordered);
      flash();
    } catch (e) {
      setSections(sorted);
      onChanged();
      setError(friendlyMessage(e));
    }
  };
  const add = async (key: (typeof TEMPLATE_KEYS)[number]) => {
    const template = {
      key,
      title: t(`section.${key}`),
      icon: ICONS[TEMPLATE_KEYS.indexOf(key)] ?? "📌",
    };
    setSaving(true);
    try {
      const created = await actions.add(data.property.id, sorted.length, template);
      setSections([...sorted, created]);
      setOpen(created.id);
      setTemplates(false);
      flash();
    } catch (e) {
      setSaving(false);
      setError(friendlyMessage(e));
    }
  };
  return (
    <div className={`guide-editor-workspace ${compact ? "guide-editor-compact" : ""}`}>
      <nav className="guide-editor-rail" aria-label={t("manager.editContent")}>
        <button type="button" aria-pressed={!open} onClick={() => setOpen(null)}>
          <Home size={17} />
          {t("manager.general")}
        </button>
        {sorted.map((section) => (
          <button
            type="button"
            key={section.id}
            aria-pressed={open === section.id}
            onClick={() => setOpen(section.id)}
          >
            <span className="editor-rail-mark" />
            {sectionLabel(section, t)}
          </button>
        ))}
      </nav>
      <div className="guide-editor-form space-y-4">
        <div className="grid gap-3 @sm:grid-cols-[minmax(0,1fr)_auto] @sm:items-center">
          <h2 className="text-2xl font-semibold @sm:text-3xl">{t("manager.editContent")}</h2>
          <Button
            onClick={() => void proceed()}
            disabled={saving || mediaBusy || transfers > 0}
            variant="outline"
            className="min-h-12 w-full rounded-xl @sm:w-auto"
          >
            <Eye />
            <span>{t("manager.preview")}</span>
          </Button>
        </div>
        {onPublish && (
          <Button
            className="min-h-12 w-full rounded-full"
            disabled={saving || mediaBusy || transfers > 0}
            onClick={() => void proceed(true)}
          >
            {saving
              ? t("common.saving")
              : data.property.status === "published"
                ? t("manager.publishChanges")
                : t("property.publish")}
          </Button>
        )}
        <div hidden={open !== null}>
          <PropertyMediaEditor
            property={data.property}
            section={sections.find((section) => section.section_key.split("-")[0] === "welcome")}
            media={media}
            actions={actions}
            onSection={(updated) => {
              setSections((current) =>
                current.some((s) => s.id === updated.id)
                  ? current.map((s) => (s.id === updated.id ? updated : s))
                  : [...current, updated],
              );
              onChanged();
            }}
            onMedia={(updated) => {
              setMedia(updated);
              onChanged();
            }}
            onPreview={() => void proceed()}
            onBusyChange={setMediaBusy}
          />
        </div>
        <Button
          onClick={() => setTemplates(!templates)}
          className="min-h-14 w-full rounded-full text-base"
        >
          <Plus />
          {t("manager.addSection")}
        </Button>
        {templates && (
          <div className="surface grid gap-2 p-4 @sm:grid-cols-2">
            <p className="col-span-full font-bold">{t("manager.chooseTemplate")}</p>
            {TEMPLATE_KEYS.map((key) => (
              <button
                key={key}
                disabled={saving || mediaBusy || transfers > 0}
                onClick={() => add(key)}
                className="flex min-h-14 min-w-0 items-center gap-3 rounded-lg border bg-card px-4 text-left font-semibold hover:border-primary"
              >
                <span className="shrink-0 text-xl">{ICONS[TEMPLATE_KEYS.indexOf(key)]}</span>
                <span className="min-w-0">{t(`section.${key}`)}</span>
              </button>
            ))}
          </div>
        )}
        {error && (
          <p role="alert" className="rounded-lg bg-warning-soft p-3 text-foreground">
            {error}
          </p>
        )}
        <div className="space-y-3">
          {sorted.map((section, index) => (
            <div key={section.id} hidden={open !== section.id}>
              <SectionRow
                section={section}
                displayTitle={sectionLabel(section, t)}
                media={media.filter((item) => item.section_id === section.id)}
                open={open === section.id}
                onToggle={() => setOpen(open === section.id ? null : section.id)}
                actions={actions}
                registerFlush={(flush) => {
                  if (flush) flushers.current.set(section.id, flush);
                  else flushers.current.delete(section.id);
                }}
                onSave={async (values) => {
                  const updated = await actions.save(section, values);
                  setSections((current) =>
                    current.map((item) => (item.id === updated.id ? updated : item)),
                  );
                  flash();
                }}
                onUpload={async (file) => {
                  setTransfers((current) => current + 1);
                  try {
                    const created = await actions.upload(
                      data.property.organization_id,
                      data.property.id,
                      section.id,
                      file,
                    );
                    setMedia((current) => [...current, created]);
                    flash();
                  } finally {
                    setTransfers((current) => current - 1);
                  }
                }}
                onMediaChange={(updated) =>
                  setMedia(media.map((item) => (item.id === updated.id ? updated : item)))
                }
                onMediaRemove={async (item) => {
                  await actions.removeMedia(item);
                  setMedia((current) => current.filter((m) => m.id !== item.id));
                  flash();
                }}
                onMoveUp={() => move(section.id, -1)}
                onMoveDown={() => move(section.id, 1)}
                canUp={index > 0}
                canDown={index < sorted.length - 1}
                onDelete={async () => {
                  if (!window.confirm(`${t("common.delete")} ?`)) return;
                  try {
                    await actions.remove(section.id);
                    setSections((current) => current.filter((item) => item.id !== section.id));
                    flash();
                  } catch (e) {
                    setError(friendlyMessage(e));
                  }
                }}
              />
            </div>
          ))}
        </div>
      </div>
      <aside className="guide-editor-preview">
        <h3>{t("manager.preview")}</h3>
        <div className="guide-editor-phone">
          <ManagerGuidePreview
            compact
            data={{
              ...data,
              property: { ...data.property, name: data.property.name ?? "" },
              sections,
              media,
            }}
            resolveMediaUrl={actions.resolveMediaUrl}
            onBack={() => void proceed()}
          />
        </div>
      </aside>
      <div
        aria-live="polite"
        className={`fixed bottom-20 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-5 py-3 font-semibold text-ink-foreground shadow-phone transition ${saved || saving ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        {saving
          ? t("common.saving")
          : publishedSaved
            ? `✓ ${t("manager.guideUpdated")}`
            : `✓ ${t("common.saved")}`}
      </div>
    </div>
  );
}

function SectionRow({
  section,
  displayTitle,
  media,
  open,
  onToggle,
  onSave,
  onUpload,
  onMediaChange,
  onMediaRemove,
  onMoveUp,
  onMoveDown,
  canUp,
  canDown,
  onDelete,
  actions,
  registerFlush,
}: {
  registerFlush: (flush: (() => Promise<void>) | null) => void;
  section: GuideSection;
  displayTitle: string;
  media: SectionMedia[];
  open: boolean;
  onToggle: () => void;
  onSave: (v: {
    title: string;
    items: GuideContentItem[];
    isVisible: boolean;
    icon: string;
    ctaLabel: string;
  }) => Promise<void>;
  onUpload: (f: File) => Promise<void>;
  onMediaChange: (m: SectionMedia) => void;
  onMediaRemove: (m: SectionMedia) => Promise<void>;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canUp: boolean;
  canDown: boolean;
  onDelete: () => void;
  actions: GuideEditorActions;
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState(section.title);
  const [items, setItems] = useState<GuideContentItem[]>(() => {
    const current = itemsOf(section);
    return current.length ? current : [blankItem()];
  });
  const [visible, setVisible] = useState(section.is_visible);
  const [icon, setIcon] = useState(section.icon ?? "📌");
  const [ctaLabel, setCtaLabel] = useState(section.cta_label ?? "");
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [rowError, setRowError] = useState("");
  const pending = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dirty = useRef(false);
  const version = useRef(0);
  const queue = useRef(Promise.resolve());
  const draft = useRef({ title, items, isVisible: visible, icon, ctaLabel });
  draft.current = { title, items, isVisible: visible, icon, ctaLabel };
  const hydrated = useRef(false);
  const saveRef = useRef(onSave);
  useEffect(() => {
    saveRef.current = onSave;
  }, [onSave]);
  const flush = async () => {
    clearTimeout(pending.current);
    if (!dirty.current) {
      await queue.current;
      return;
    }
    const values = draft.current;
    const revision = version.current;
    if (!values.title.trim()) throw new Error("Donnez un titre à la rubrique.");
    setBusy(true);
    setRowError("");
    const task = queue.current.catch(() => {}).then(() => saveRef.current(values));
    queue.current = task;
    try {
      await task;
      if (version.current === revision) dirty.current = false;
    } catch (e) {
      setRowError(friendlyMessage(e));
      throw e;
    } finally {
      setBusy(false);
    }
  };
  const flushRef = useRef(flush);
  flushRef.current = flush;
  const registerRef = useRef(registerFlush);
  registerRef.current = registerFlush;
  useEffect(() => {
    registerRef.current(() => flushRef.current());
    return () => {
      registerRef.current(null);
      clearTimeout(pending.current);
    };
  }, [section.id]);
  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    dirty.current = true;
    version.current += 1;
    pending.current = setTimeout(() => {
      void flushRef.current().catch(() => {});
    }, 800);
    return () => clearTimeout(pending.current);
  }, [title, items, visible, icon, ctaLabel]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  const updateItem = (index: number, patch: Partial<GuideContentItem>) =>
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  return (
    <article className="rounded-lg border bg-card">
      <div className="flex items-center gap-2 pr-4">
        <button
          onClick={onToggle}
          className="grid min-h-16 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 text-left"
        >
          <img
            src={sectionVisual({ id: section.id, key: section.section_key, title, content: {} })}
            alt=""
            className="h-12 w-12 rounded-xl object-cover"
          />
          <span className="min-w-0">
            <span className="block truncate text-lg font-bold">{displayTitle}</span>
            <span className="text-sm text-muted-foreground">
              {visible ? t("manager.visible") : t("manager.hidden")}
              {media.length ? ` · ${media.length}` : ""}
            </span>
          </span>
          {open ? <ChevronUp /> : <ChevronDown />}
        </button>
        <input
          type="checkbox"
          aria-label={`${t("manager.showSection")} : ${displayTitle}`}
          checked={visible}
          onChange={(e) => setVisible(e.target.checked)}
          className="h-6 w-6 shrink-0 accent-primary"
        />
      </div>
      {open && (
        <div className="space-y-5 border-t p-4">
          <label className="block">
            <span className="mb-1 block font-semibold">{t("manager.sectionTitle")}</span>
            <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          {section.section_key.split("-")[0] !== "welcome" && (
            <>
              <div>
                <p className="font-semibold">{t("manager.media")}</p>
                <p className="text-sm text-muted-foreground">{t("manager.mediaHelp")}</p>
                <div className="mt-3 grid gap-3 @sm:grid-cols-2">
                  {[...media]
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((item) => (
                      <MediaItem
                        key={item.id}
                        item={item}
                        actions={actions}
                        onChange={onMediaChange}
                        onRemove={() => onMediaRemove(item)}
                      />
                    ))}
                </div>
                <div className="mt-3 grid gap-2 @sm:grid-cols-2">
                  <UploadButton
                    icon={<ImagePlus />}
                    label={t("manager.addPhoto")}
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    busy={uploading}
                    onFile={async (file) => {
                      setUploading(true);
                      try {
                        await onUpload(file);
                      } catch (e) {
                        setRowError(friendlyMessage(e));
                      } finally {
                        setUploading(false);
                      }
                    }}
                  />
                  <UploadButton
                    icon={<Video />}
                    label={t("manager.addVideo")}
                    accept="video/mp4,video/webm"
                    busy={uploading}
                    onFile={async (file) => {
                      setUploading(true);
                      try {
                        await onUpload(file);
                      } catch (e) {
                        setRowError(friendlyMessage(e));
                      } finally {
                        setUploading(false);
                      }
                    }}
                  />
                </div>
              </div>
            </>
          )}
          <div>
            <p className="mb-2 font-semibold">{t("manager.sectionContent")}</p>
            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={`${item.fieldKey ?? "custom"}-${index}`}
                  className="rounded-xl border bg-background p-3"
                >
                  <div className="grid gap-2 @sm:grid-cols-[minmax(0,.7fr)_minmax(0,1.3fr)_auto]">
                    <input
                      className="field"
                      aria-label={t("manager.itemLabel")}
                      placeholder={t("manager.itemLabel")}
                      value={item.label}
                      onChange={(e) => updateItem(index, { label: e.target.value })}
                    />
                    <textarea
                      className="field min-h-24"
                      aria-label={t("manager.itemText")}
                      placeholder={t("manager.contentPlaceholder")}
                      value={item.text}
                      onChange={(e) => updateItem(index, { text: e.target.value })}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-12 w-12 text-destructive"
                      aria-label={t("common.delete")}
                      onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              className="mt-3 w-full"
              onClick={() => setItems((current) => [...current, blankItem()])}
            >
              <Plus />
              {t("manager.addInformation")}
            </Button>
          </div>
          <label className="flex min-h-14 items-center justify-between gap-3 rounded-lg bg-muted px-4">
            <span className="font-semibold">
              {visible ? t("manager.showSection") : t("manager.hideSection")}
            </span>
            <input
              type="checkbox"
              className="h-6 w-6 accent-primary"
              checked={visible}
              onChange={(e) => setVisible(e.target.checked)}
            />
          </label>
          <button onClick={() => setMore(!more)} className="min-h-12 font-semibold text-primary">
            {more ? t("manager.lessOptions") : t("manager.moreOptions")}
          </button>
          {more && (
            <div className="space-y-4 rounded-xl bg-muted p-4">
              <div>
                <p className="mb-2 font-semibold">{t("manager.icon")}</p>
                <div className="flex flex-wrap gap-2">
                  {ICONS.map((item) => (
                    <button
                      key={item}
                      onClick={() => setIcon(item)}
                      className={`h-12 w-12 rounded-lg border text-xl ${icon === item ? "border-primary bg-secondary" : "bg-card"}`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="mb-1 block font-semibold">{t("manager.buttonText")}</span>
                <input
                  className="field"
                  value={ctaLabel}
                  onChange={(e) => setCtaLabel(e.target.value)}
                />
              </label>
              <div className="grid gap-2 @sm:grid-cols-3">
                <Button variant="outline" disabled={!canUp} onClick={onMoveUp}>
                  <ChevronUp />
                  {t("manager.moveUp")}
                </Button>
                <Button variant="outline" disabled={!canDown} onClick={onMoveDown}>
                  <ChevronDown />
                  {t("manager.moveDown")}
                </Button>
                <Button variant="ghost" className="text-destructive" onClick={onDelete}>
                  <Trash2 />
                  {t("common.delete")}
                </Button>
              </div>
            </div>
          )}
          {rowError && (
            <p role="alert" className="rounded-xl bg-warning-soft p-3">
              {rowError}
            </p>
          )}
          <Button
            variant="outline"
            disabled={busy || uploading}
            onClick={() => void flush().catch(() => {})}
          >
            {busy ? t("common.saving") : t("common.save")}
          </Button>
          <p
            aria-live="polite"
            className="flex min-h-12 items-center justify-center text-center text-sm font-semibold text-muted-foreground"
          >
            {busy ? t("common.saving") : rowError ? t("manager.retrySave") : t("manager.autoSaved")}
          </p>
        </div>
      )}
    </article>
  );
}
function UploadButton({
  icon,
  label,
  accept,
  busy,
  onFile,
}: {
  icon: React.ReactNode;
  label: string;
  accept: string;
  busy: boolean;
  onFile: (f: File) => void;
}) {
  return (
    <label className="btn btn-secondary cursor-pointer">
      <input
        className="sr-only"
        type="file"
        accept={accept}
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
      {icon}
      {busy ? "…" : label}
    </label>
  );
}
function MediaItem({
  item,
  actions,
  onChange,
  onRemove,
}: {
  item: SectionMedia;
  actions: GuideEditorActions;
  onChange: (m: SectionMedia) => void;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [alt, setAlt] = useState(item.alt_text ?? "");
  const [caption, setCaption] = useState(item.caption ?? "");
  useEffect(() => {
    actions
      .resolveMediaUrl(item)
      .then(setUrl)
      .catch((e) => setError(friendlyMessage(e)));
  }, [actions, item]);
  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      {url &&
        (item.media_type === "image" ? (
          <img src={url} alt={alt} className="aspect-video w-full object-cover" />
        ) : (
          <video
            src={url}
            controls
            preload="metadata"
            className="aspect-video w-full bg-ink object-cover"
          />
        ))}
      <div className="space-y-2 p-3">
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <input
          className="field"
          value={alt}
          placeholder={t("common.optional")}
          onChange={(e) => setAlt(e.target.value)}
          onBlur={() =>
            actions
              .updateMedia(item, { altText: alt })
              .then(onChange)
              .catch((e) => setError(friendlyMessage(e)))
          }
        />
        <input
          className="field"
          value={caption}
          placeholder={t("common.optional")}
          onChange={(e) => setCaption(e.target.value)}
          onBlur={() =>
            actions
              .updateMedia(item, { caption })
              .then(onChange)
              .catch((e) => setError(friendlyMessage(e)))
          }
        />
        <Button
          variant="ghost"
          className="w-full text-destructive"
          onClick={() => Promise.resolve(onRemove()).catch((e) => setError(friendlyMessage(e)))}
        >
          <Trash2 />
          {t("common.delete")}
        </Button>
      </div>
    </div>
  );
}
