import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Eye, ImagePlus, Plus, Trash2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { addGuideSection, deleteGuideSection, ensureGuideSections, removeSectionMedia, reorderGuideSections, saveGuideSection, updateSectionMedia, uploadSectionMedia, type GuideSection, type Property, type PropertyField, type SectionMedia } from "@/lib/data/properties";
import { friendlyMessage } from "./Friendly";

type EditorData = { property: Property; fields: PropertyField[]; sections: GuideSection[]; media: SectionMedia[] };
type Content = { items?: { label: string; text: string }[] };
const textOf = (section: GuideSection) => ((section.content as Content)?.items ?? []).map((item) => item.label ? `${item.label}\n${item.text}` : item.text).join("\n\n");
const ICONS = ["🔑","📶","🏡","📍","✨","🧳","💬","🅿️","🏊","📋","🛏️","🍽️","🚲","📌"];
const TEMPLATES = [{key:"arrival",title:"Arrivée",icon:"🔑"},{key:"wifi",title:"Wi-Fi",icon:"📶"},{key:"house",title:"Logement",icon:"🏡"},{key:"parking",title:"Parking",icon:"🅿️"},{key:"pool",title:"Piscine / Spa",icon:"🏊"},{key:"rules",title:"Règlement",icon:"📋"},{key:"amenities",title:"Équipements",icon:"🛏️"},{key:"places",title:"Bonnes adresses",icon:"📍"},{key:"services",title:"Services",icon:"✨"},{key:"departure",title:"Départ",icon:"🧳"},{key:"contact",title:"Contact",icon:"💬"},{key:"custom",title:"Section personnalisée",icon:"📌"}];

export function GuideEditor({ data, onChanged, onPreview }: { data: EditorData; onChanged: () => void; onPreview: () => void }) {
  const [sections, setSections] = useState(data.sections);
  const [media, setMedia] = useState(data.media);
  const [open, setOpen] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setSections(data.sections); setMedia(data.media); }, [data.sections, data.media]);
  useEffect(() => {
    if (sections.length) return;
    ensureGuideSections(data.property.id, data.fields).then((created) => setSections(created)).catch((e) => setError(friendlyMessage(e)));
  }, [data.fields, data.property.id, sections.length]);
  const sorted = useMemo(() => [...sections].sort((a, b) => a.sort_order - b.sort_order), [sections]);
  const flash = () => { setSaving(false); setSaved(true); window.setTimeout(() => setSaved(false), 2200); onChanged(); };
  const move = async (id: string, direction: -1 | 1) => {
    const index = sorted.findIndex((item) => item.id === id); const target = index + direction;
    if (target < 0 || target >= sorted.length) return;
    const next = [...sorted]; const current = next[index]; const replacement = next[target];
    if (!current || !replacement) return;
    next[index] = replacement; next[target] = current;
    setSections(next.map((item, i) => ({ ...item, sort_order: i })));
    try { await reorderGuideSections(next); flash(); } catch (e) { setError(friendlyMessage(e)); }
  };
  const add = async (template: typeof TEMPLATES[number]) => { setSaving(true); try { const created = await addGuideSection(data.property.id, sorted.length, template); setSections([...sorted, created]); setOpen(created.id); setTemplates(false); flash(); } catch (e) { setSaving(false); setError(friendlyMessage(e)); } };
  return <div className="space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-bold text-primary">Guide voyageur</p><h2 className="mt-1 text-3xl font-semibold">Tout se modifie ici</h2><p className="mt-1 text-muted-foreground">Titre, texte, icône, ordre, visibilité, photos et vidéos.</p></div><Button onClick={onPreview} variant="outline" className="min-h-12 rounded-full"><Eye/>Voir côté voyageur</Button></div>
    <Button onClick={()=>setTemplates(!templates)} className="min-h-14 w-full rounded-full text-base"><Plus/>Ajouter une section</Button>
    {templates&&<div className="surface grid gap-2 p-4 sm:grid-cols-2"><p className="col-span-full font-bold">Choisissez un modèle</p>{TEMPLATES.map(template=><button key={template.key} onClick={()=>add(template)} className="flex min-h-14 items-center gap-3 rounded-lg border bg-card px-4 text-left font-semibold hover:border-primary"><span className="text-xl">{template.icon}</span>{template.title}</button>)}</div>}
    {error && <p role="alert" className="rounded-lg bg-warning-soft p-3 text-foreground">{error}</p>}
    <div className="space-y-3">{sorted.map((section, index) => <SectionRow key={section.id} section={section} media={media.filter((item) => item.section_id === section.id)} open={open === section.id} onToggle={() => setOpen(open === section.id ? null : section.id)} onSave={async (values) => { try { const updated = await saveGuideSection(section, values); setSections(sections.map((item) => item.id === updated.id ? updated : item)); flash(); } catch (e) { setError(friendlyMessage(e)); } }} onUpload={async (file) => { try { const created = await uploadSectionMedia(data.property.organization_id, data.property.id, section.id, file); setMedia([...media, created]); flash(); } catch (e) { setError(friendlyMessage(e)); } }} onMediaChange={(updated) => setMedia(media.map((item) => item.id === updated.id ? updated : item))} onMediaRemove={async (item) => { try { await removeSectionMedia(item); setMedia(media.filter((current) => current.id !== item.id)); flash(); } catch (e) { setError(friendlyMessage(e)); } }} onMoveUp={() => move(section.id, -1)} onMoveDown={() => move(section.id, 1)} canUp={index > 0} canDown={index < sorted.length - 1} onDelete={async () => { if (!window.confirm("Supprimer cette section et ses médias ?")) return; try { await deleteGuideSection(section.id); setSections(sections.filter((item) => item.id !== section.id)); flash(); } catch (e) { setError(friendlyMessage(e)); } }} />)}</div>
     <div aria-live="polite" className={`fixed bottom-20 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-5 py-3 font-semibold text-ink-foreground shadow-phone transition ${(saved||saving) ? "opacity-100" : "pointer-events-none opacity-0"}`}>{saving ? "Enregistrement…" : data.property.status === "published" ? "✓ Enregistré · Guide à jour" : "✓ Enregistré"}</div>
  </div>;
}

function SectionRow({ section, media, open, onToggle, onSave, onUpload, onMediaChange, onMediaRemove, onMoveUp, onMoveDown, canUp, canDown, onDelete }: { section: GuideSection; media: SectionMedia[]; open: boolean; onToggle: () => void; onSave: (values: { title: string; text: string; isVisible: boolean; icon:string; ctaLabel:string }) => Promise<void>; onUpload: (file: File) => Promise<void>; onMediaChange: (media: SectionMedia) => void; onMediaRemove: (media: SectionMedia) => Promise<void>; onMoveUp: () => void; onMoveDown: () => void; canUp: boolean; canDown: boolean; onDelete: () => void }) {
  const [title, setTitle] = useState(section.title);
  const [text, setText] = useState(textOf(section));
  const [visible, setVisible] = useState(section.is_visible);
  const [icon, setIcon] = useState(section.icon ?? "📌");
  const [ctaLabel, setCtaLabel] = useState(section.cta_label ?? "");
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const hydrated = useRef(false);
  const saveRef = useRef(onSave);
  useEffect(() => { saveRef.current = onSave; }, [onSave]);
  useEffect(() => {
    if (!hydrated.current) { hydrated.current = true; return; }
    const timer = window.setTimeout(async () => {
      if (!title.trim()) return;
      setBusy(true);
      try { await saveRef.current({ title, text, isVisible: visible, icon, ctaLabel }); } finally { setBusy(false); }
    }, 800);
    return () => window.clearTimeout(timer);
  }, [title, text, visible, icon, ctaLabel]);
  return <article className="rounded-lg border bg-card">
    <button onClick={onToggle} className="flex min-h-16 w-full items-center gap-3 px-4 text-left"><span className="text-xl" aria-hidden>{section.icon}</span><span className="min-w-0 flex-1"><span className="block truncate text-lg font-bold">{section.title}</span><span className={`text-sm ${section.is_visible?"text-muted-foreground":"font-semibold text-foreground"}`}>{section.is_visible ? "Visible dans le guide" : "Masquée"}{media.length ? ` · ${media.length} média${media.length > 1 ? "s" : ""}` : ""}</span></span>{open ? <ChevronUp/> : <ChevronDown/>}</button>
    {open && <div className="space-y-5 border-t p-4 sm:p-5">
       <div><p className="mb-2 font-semibold">Icône</p><div className="flex flex-wrap gap-2">{ICONS.map(item=><button key={item} aria-label={`Choisir ${item}`} onClick={()=>setIcon(item)} className={`h-12 w-12 rounded-lg border text-xl ${icon===item?"border-primary bg-secondary":"bg-card"}`}>{item}</button>)}</div></div>
       <label className="block"><span className="mb-1 block font-semibold">Titre de la section</span><input className="field" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)}/></label>
      <label className="block"><span className="mb-1 block font-semibold">Informations affichées</span><textarea className="field min-h-40" value={text} maxLength={8000} onChange={(e) => setText(e.target.value)} placeholder="Écrivez les informations utiles au voyageur…"/></label>
      <label className="flex min-h-14 items-center justify-between gap-3 rounded-lg bg-muted px-4"><span className="font-semibold">{visible ? "Section visible" : "Masquer cette section"}</span><input type="checkbox" className="h-6 w-6 accent-primary" checked={visible} onChange={(e) => setVisible(e.target.checked)}/></label>
      <div><p className="font-semibold">Photos et vidéos</p><p className="text-sm text-muted-foreground">Images jusqu’à 10 Mo. Vidéos MP4/WebM jusqu’à 50 Mo.</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{media.sort((a,b) => a.sort_order-b.sort_order).map((item) => <MediaItem key={item.id} item={item} onChange={onMediaChange} onRemove={() => onMediaRemove(item)}/>)}</div><div className="mt-3 grid gap-2 sm:grid-cols-2"><UploadButton icon={<ImagePlus/>} label="Ajouter une photo" accept="image/jpeg,image/png,image/webp,image/avif" busy={uploading} onFile={async (file) => { setUploading(true); await onUpload(file); setUploading(false); }}/><UploadButton icon={<Video/>} label="Ajouter une vidéo" accept="video/mp4,video/webm" busy={uploading} onFile={async (file) => { setUploading(true); await onUpload(file); setUploading(false); }}/></div></div>
       <button onClick={()=>setMore(!more)} className="min-h-12 font-semibold text-primary">{more?"Moins d’options":"Plus d’options"}</button>
       {more&&<div className="space-y-4 rounded-xl bg-muted p-4"><label className="block"><span className="mb-1 block font-semibold">Texte du bouton <span className="font-normal text-muted-foreground">(facultatif)</span></span><input className="field" value={ctaLabel} maxLength={80} onChange={e=>setCtaLabel(e.target.value)} placeholder="En savoir plus"/></label><div className="flex flex-wrap gap-2"><Button variant="outline" className="min-h-12" disabled={!canUp} onClick={onMoveUp}><ChevronUp/>Monter</Button><Button variant="outline" className="min-h-12" disabled={!canDown} onClick={onMoveDown}><ChevronDown/>Descendre</Button><Button variant="ghost" className="min-h-12 text-destructive" onClick={onDelete}><Trash2/>Supprimer</Button></div></div>}
       <p aria-live="polite" className="flex min-h-12 items-center justify-center text-sm font-semibold text-muted-foreground">{busy ? "Enregistrement…" : "Les modifications sont enregistrées automatiquement"}</p>
    </div>}
  </article>;
}

function UploadButton({ icon, label, accept, busy, onFile }: { icon: React.ReactNode; label: string; accept: string; busy: boolean; onFile: (file: File) => void }) {
  return <label className="btn btn-secondary cursor-pointer"><input className="sr-only" type="file" accept={accept} disabled={busy} onChange={(e) => { const file = e.target.files?.[0]; if (file) onFile(file); e.target.value = ""; }}/>{icon}{busy ? "Envoi…" : label}</label>;
}

function MediaItem({ item, onChange, onRemove }: { item: SectionMedia; onChange: (item: SectionMedia) => void; onRemove: () => void }) {
  const [url, setUrl] = useState(""); const [alt, setAlt] = useState(item.alt_text ?? ""); const [caption, setCaption] = useState(item.caption ?? "");
  useEffect(() => { supabase.storage.from("guide-media").createSignedUrl(item.storage_path, 900).then(({ data }) => setUrl(data?.signedUrl ?? "")); }, [item.storage_path]);
  return <div className="overflow-hidden rounded-lg border bg-background">{url && (item.media_type === "image" ? <img src={url} alt={alt} className="aspect-video w-full object-cover"/> : <video src={url} controls preload="metadata" className="aspect-video w-full bg-ink object-cover"/>)}<div className="space-y-2 p-3"><input className="field min-h-12" value={alt} maxLength={240} placeholder="Description (facultatif)" onChange={(e) => setAlt(e.target.value)} onBlur={() => updateSectionMedia(item, { altText: alt }).then(onChange)}/><input className="field min-h-12" value={caption} maxLength={240} placeholder="Légende (facultatif)" onChange={(e) => setCaption(e.target.value)} onBlur={() => updateSectionMedia(item, { caption }).then(onChange)}/><Button variant="ghost" className="min-h-12 w-full text-destructive" onClick={onRemove}><Trash2/>Supprimer</Button></div></div>;
}