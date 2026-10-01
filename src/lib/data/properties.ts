// Concierge data layer (browser client, protected by RLS).
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { FIELD_DEFS, FIELD_BY_KEY } from "@/lib/import-engine/fields";
import type { ExtractionResult, ImportSource } from "@/lib/import-engine/types";
import {
  buildGuideContent,
  fieldUpdatesForGuideSection,
  mergeFieldIntoGuideContent,
  type GuideContentItem,
} from "@/lib/data/guide-content";

export type Property = Tables<"properties">;
export type PropertyField = Tables<"property_fields">;
export type ReviewSettings = Tables<"property_review_settings">;
export type ReviewDestination = Tables<"property_review_destinations">;
export type GuideSection = Tables<"guide_sections">;
export type SectionMedia = Tables<"section_media">;

export class FriendlyError extends Error {}
const fail = (e: unknown, msg = "Votre connexion a été interrompue. Vos informations déjà enregistrées sont conservées."): never => {
  console.error(e);
  throw new FriendlyError(msg);
};

export async function ensureOrganization() {
  const { data: u } = await supabase.auth.getUser();
  const first = (u.user?.user_metadata?.['first_name'] as string | undefined) ?? "";
  const { data: orgId, error } = await supabase.rpc("ensure_my_organization", { _first_name: first });
  if (error || !orgId) return fail(error);
  const [{ data: org, error: e2 }, { data: membership, error: e3 }] = await Promise.all([
    supabase.from("organizations").select("id,name,trial_ends_at,preferred_locale,operator_type").eq("id", orgId).single(),
    supabase.from("organization_members").select("role").eq("organization_id", orgId).eq("user_id", u.user!.id).single(),
  ]);
  if (e2 || e3) return fail(e2 ?? e3);
  return { ...org, role: membership.role, firstName: first };
}

export async function listProperties(orgId: string) {
  const { data, error } = await supabase.from("properties").select("*").eq("organization_id", orgId).neq("status", "archived").order("created_at", { ascending: false });
  if (error) return fail(error);
  return data;
}

export async function getProperty(id: string) {
  const [{ data: property, error }, { data: fields, error: e2 }, { data: review }, { data: destinations }, { data: sections }, { data: media }, { data: messaging }] = await Promise.all([
    supabase.from("properties").select("*").eq("id", id).maybeSingle(),
    supabase.from("property_fields").select("*").eq("property_id", id),
    supabase.from("property_review_settings").select("*").eq("property_id", id).maybeSingle(),
    supabase.from("property_review_destinations").select("*").eq("property_id", id).order("sort_order"),
    supabase.from("guide_sections").select("*").eq("property_id", id).order("sort_order"),
    supabase.from("section_media").select("*").eq("property_id", id).order("sort_order"),
    supabase.from("property_messaging_settings").select("is_enabled").eq("property_id", id).maybeSingle(),
  ]);
  if (error || e2) return fail(error ?? e2);
  if (!property) return null;
  const order = FIELD_DEFS.map((f) => f.key);
  return { property, fields: (fields ?? []).sort((a: PropertyField, b: PropertyField) => order.indexOf(a.key) - order.indexOf(b.key)), review: review ?? null, destinations: destinations ?? [], sections: sections ?? [], media: media ?? [], messagingEnabled: messaging?.is_enabled ?? false };
}

const DEFAULT_SECTIONS = [
  ["welcome", "Bienvenue", "👋"],
  ["arrival", "Mon arrivée", "🔑"],
  ["wifi", "Wi-Fi", "📶"],
  ["house", "La maison", "🏡"],
  ["pool", "Piscine", "🏊"],
  ["places", "Bonnes adresses", "📍"],
  ["services", "Services", "✨"],
  ["departure", "Mon départ", "🧳"],
  ["contact", "Contact", "💬"],
] as const;

function sectionsFromFields(propertyId: string, fields: PropertyField[]) {
  return DEFAULT_SECTIONS.map(([key, title, icon], index) => {
    const items: GuideContentItem[] = fields
      .filter((field) => FIELD_BY_KEY[field.key]?.section.key === key && field.value && field.status === "found")
      .map((field) => ({ fieldKey: field.key, label: field.label, text: field.value as string }));
    return {
      property_id: propertyId,
      section_key: key,
      title,
      icon,
      sort_order: index,
      is_visible: true,
      content: buildGuideContent(key, {}, items),
    };
  });
}

export async function ensureGuideSections(propertyId: string, fields: PropertyField[]) {
  const { data: current, error } = await supabase.from("guide_sections").select("*").eq("property_id", propertyId).order("sort_order");
  if (error) return fail(error);
  if (current.length) return current;
  const { data, error: insertError } = await supabase.from("guide_sections").insert(sectionsFromFields(propertyId, fields)).select("*");
  if (insertError) return fail(insertError);
  return data.sort((a, b) => a.sort_order - b.sort_order);
}

export async function saveGuideSection(section: GuideSection, values: { title: string; items: GuideContentItem[]; isVisible: boolean; icon?: string; ctaLabel?: string }) {
  const content = buildGuideContent(section.section_key, section.content, values.items);
  const fieldUpdates = fieldUpdatesForGuideSection(section.section_key, section.content, values.items);
  const { data, error } = await supabase.from("guide_sections").update({
    title: values.title.trim().slice(0, 120) || "Sans titre",
    content,
    is_visible: values.isVisible,
    icon: values.icon?.slice(0, 8) ?? section.icon,
    cta_label: values.ctaLabel?.trim().slice(0, 80) || null,
  }).eq("id", section.id).select("*").single();
  if (error) return fail(error);

  for (const update of fieldUpdates) {
    const value = update.value;
    const { error: fieldError } = await supabase.from("property_fields").update({
      value,
      status: value ? "found" : "missing",
      manually_verified: !!value,
      manually_overridden: true,
    }).eq("property_id", section.property_id).eq("key", update.key);
    if (fieldError) return fail(fieldError);
  }
  return data;
}

export async function addGuideSection(propertyId: string, order: number, template?: { key: string; title: string; icon: string }) {
  const key = template?.key && !template.key.startsWith("custom") ? `${template.key}-${crypto.randomUUID().slice(0, 4)}` : `custom-${crypto.randomUUID().slice(0, 8)}`;
  const { data, error } = await supabase.from("guide_sections").insert({ property_id: propertyId, section_key: key, title: template?.title ?? "Nouvelle section", icon: template?.icon ?? "📌", content: { items: [] }, sort_order: order }).select("*").single();
  if (error) return fail(error);
  return data;
}

export async function reorderGuideSections(sections: GuideSection[]) {
  const results = await Promise.all(sections.map((section, index) => supabase.from("guide_sections").update({ sort_order: index }).eq("id", section.id)));
  const error = results.find((result) => result.error)?.error;
  if (error) fail(error);
}

export async function deleteGuideSection(sectionId: string) {
  const { data: media, error: mediaError } = await supabase.from("section_media").select("storage_path").eq("section_id", sectionId);
  if (mediaError) return fail(mediaError);
  if (media.length) {
    const { error: storageError } = await supabase.storage.from("guide-media").remove(media.map((item) => item.storage_path));
    if (storageError) return fail(storageError);
  }
  const { error } = await supabase.from("guide_sections").delete().eq("id", sectionId);
  if (error) fail(error);
}

export async function uploadSectionMedia(orgId: string, propertyId: string, sectionId: string, file: File) {
  const isImage = file.type.startsWith("image/");
  const allowed = isImage ? ["image/jpeg", "image/png", "image/webp", "image/avif"] : ["video/mp4", "video/webm"];
  const max = isImage ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
  if (!allowed.includes(file.type) || file.size > max) throw new FriendlyError(isImage ? "Choisissez une image JPG, PNG, WebP ou AVIF de moins de 10 Mo." : "Choisissez une vidéo MP4 ou WebM de moins de 50 Mo.");
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || (isImage ? "jpg" : "mp4");
  const path = `${orgId}/${propertyId}/${sectionId}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("guide-media").upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return fail(uploadError, "L’envoi du fichier a échoué. Réessayez.");
  const { data, error } = await supabase.from("section_media").insert({ organization_id: orgId, property_id: propertyId, section_id: sectionId, media_type: isImage ? "image" : "video", storage_path: path, mime_type: file.type, file_size: file.size }).select("*").single();
  if (error) { await supabase.storage.from("guide-media").remove([path]); return fail(error); }
  return data;
}

export async function updateSectionMedia(media: SectionMedia, values: { caption?: string; altText?: string; sortOrder?: number }) {
  const { data, error } = await supabase.from("section_media").update({ caption: values.caption?.slice(0, 240) ?? media.caption, alt_text: values.altText?.slice(0, 240) ?? media.alt_text, sort_order: values.sortOrder ?? media.sort_order }).eq("id", media.id).select("*").single();
  if (error) return fail(error);
  return data;
}

export async function removeSectionMedia(media: SectionMedia) {
  const { error: storageError } = await supabase.storage.from("guide-media").remove([media.storage_path]);
  if (storageError) return fail(storageError);
  const { error } = await supabase.from("section_media").delete().eq("id", media.id);
  if (error) fail(error);
}

export async function saveOrganizationPreferences(orgId: string, values: { preferredLocale?: string; operatorType?: string }) {
  const { error } = await supabase.from("organizations").update({
    ...(values.preferredLocale ? { preferred_locale: values.preferredLocale } : {}),
    ...(values.operatorType ? { operator_type: values.operatorType } : {}),
  }).eq("id", orgId);
  if (error) fail(error);
}

export async function saveMessagingSetting(propertyId: string, isEnabled: boolean) {
  const { error } = await supabase.from("property_messaging_settings").upsert({ property_id: propertyId, is_enabled: isEnabled });
  if (error) fail(error);
}

export async function reorderSectionMedia(items: SectionMedia[]) {
  const results = await Promise.all(items.map((item, index) => supabase.from("section_media").update({ sort_order: index }).eq("id", item.id)));
  const error = results.find((result) => result.error)?.error;
  if (error) fail(error);
}

export async function saveReviewConfiguration(propertyId: string, settings: { title: string; message: string; isEnabled: boolean }, destinations: { label: string; url: string }[]) {
  const safeDestinations = destinations.filter((d) => d.label.trim() && /^https:\/\//i.test(d.url.trim())).slice(0, 5);
  const { error } = await supabase.from("property_review_settings").upsert({
    property_id: propertyId,
    title: settings.title.trim().slice(0, 120),
    message: settings.message.trim().slice(0, 500),
    is_enabled: settings.isEnabled && safeDestinations.length > 0,
  });
  if (error) return fail(error);
  const { error: deleteError } = await supabase.from("property_review_destinations").delete().eq("property_id", propertyId);
  if (deleteError) return fail(deleteError);
  if (safeDestinations.length) {
    const { error: insertError } = await supabase.from("property_review_destinations").insert(safeDestinations.map((d, index) => ({ property_id: propertyId, label: d.label.trim().slice(0, 80), url: d.url.trim().slice(0, 1000), sort_order: index })));
    if (insertError) return fail(insertError);
  }
}

const slugify = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "logement";

export async function startImportRun(orgId: string, source: ImportSource, opts: { url?: string; rawText?: string }) {
  const { data, error } = await supabase.from("import_runs")
    .insert({ organization_id: orgId, source_type: source, source_url: opts.url ?? null, raw_text: opts.rawText ?? null, status: "running" })
    .select("id").single();
  if (error) return fail(error);
  return data.id;
}

export async function finishImportRun(runId: string, status: "succeeded" | "insufficient" | "failed", extra: { propertyId?: string; error?: string } = {}) {
  await supabase.from("import_runs").update({ status, completed_at: new Date().toISOString(), property_id: extra.propertyId ?? null, error_message: extra.error ?? null }).eq("id", runId);
}

/** Creates a draft property with every catalogue field (missing ones included). */
export async function createPropertyFromExtraction(orgId: string, source: ImportSource, result: ExtractionResult | null, sourceUrl: string | null) {
  const name = result?.propertyName?.trim() || "Mon logement";
  const slug = `${slugify(name)}-${crypto.randomUUID().slice(0, 6)}`;
  const { data: property, error } = await supabase.from("properties")
    .insert({ organization_id: orgId, name, slug, source_type: source, source_url: sourceUrl }).select("*").single();
  if (error) return fail(error);
  const byKey = new Map(result?.fields.map((f) => [f.key, f]) ?? []);
  const now = new Date().toISOString();
  const rows = FIELD_DEFS.map((def) => {
    const f = byKey.get(def.key);
    return {
      property_id: property.id, key: def.key, category: def.category, label: def.label, essential: def.essential, question: def.question,
      value: f?.value ?? null, status: f?.status ?? "missing", raw_value: f?.rawValue ?? null, confidence: f?.confidence ?? 0,
      source_type: f?.value ? source : null, source_url: f?.value ? sourceUrl : null, imported_at: f?.value ? now : null,
    };
  });
  const { error: e2 } = await supabase.from("property_fields").insert(rows);
  if (e2) return fail(e2);
  return property;
}

async function syncFieldToGuide(field: PropertyField) {
  const definition = FIELD_BY_KEY[field.key];
  if (!definition) return;
  const { data: section, error } = await supabase.from("guide_sections")
    .select("*")
    .eq("property_id", field.property_id)
    .eq("section_key", definition.section.key)
    .maybeSingle();
  if (error) return fail(error);
  if (!section) return;
  const content = mergeFieldIntoGuideContent(definition.section.key, section.content, {
    key: field.key,
    label: field.label,
    value: field.value,
  });
  const { error: updateError } = await supabase.from("guide_sections").update({ content }).eq("id", section.id);
  if (updateError) return fail(updateError);
}

/** Human answer: always wins over imported values and keeps an existing guide in sync. */
export async function saveFieldAnswer(field: PropertyField, value: string) {
  const v = value.trim();
  const overridden = field.raw_value != null ? v !== (field.value ?? "").trim() || field.manually_overridden : true;
  const { data, error } = await supabase.from("property_fields")
    .update({ value: v || null, status: v ? "found" : "missing", manually_verified: !!v, manually_overridden: overridden })
    .eq("id", field.id).select("*").single();
  if (error) return fail(error);
  await syncFieldToGuide(data);
  return data;
}

export async function renameProperty(id: string, name: string) {
  const { error } = await supabase.from("properties").update({ name: name.trim().slice(0, 120) || "Mon logement" }).eq("id", id);
  if (error) fail(error);
}

/** Publishing rebuilds visible guide sections from confirmed fields only. */
export async function publishProperty(property: Property, fields: PropertyField[]) {
  await ensureGuideSections(property.id, fields);
  const { error: e3 } = await supabase.from("properties").update({ status: "published", published_at: new Date().toISOString() }).eq("id", property.id);
  if (e3) return fail(e3);
}

export async function unpublishProperty(propertyId: string) {
  const { error } = await supabase.from("properties").update({ status: "draft" }).eq("id", propertyId);
  if (error) fail(error);
}
