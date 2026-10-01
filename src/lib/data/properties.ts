// Concierge data layer (browser client, protected by RLS).
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { FIELD_DEFS, FIELD_BY_KEY } from "@/lib/import-engine/fields";
import type { ExtractionResult, ImportSource } from "@/lib/import-engine/types";

export type Property = Tables<"properties">;
export type PropertyField = Tables<"property_fields">;

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
  const { data: org, error: e2 } = await supabase.from("organizations").select("id,name,trial_ends_at").eq("id", orgId).single();
  if (e2) return fail(e2);
  return { ...org, firstName: first };
}

export async function listProperties(orgId: string) {
  const { data, error } = await supabase.from("properties").select("*").eq("organization_id", orgId).neq("status", "archived").order("created_at", { ascending: false });
  if (error) return fail(error);
  return data;
}

export async function getProperty(id: string) {
  const [{ data: property, error }, { data: fields, error: e2 }] = await Promise.all([
    supabase.from("properties").select("*").eq("id", id).maybeSingle(),
    supabase.from("property_fields").select("*").eq("property_id", id),
  ]);
  if (error || e2) return fail(error ?? e2);
  if (!property) return null;
  const order = FIELD_DEFS.map((f) => f.key);
  return { property, fields: (fields ?? []).sort((a: PropertyField, b: PropertyField) => order.indexOf(a.key) - order.indexOf(b.key)) };
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

/** Human answer: always wins over imported values. */
export async function saveFieldAnswer(field: PropertyField, value: string) {
  const v = value.trim();
  const overridden = field.raw_value != null ? v !== (field.value ?? "").trim() || field.manually_overridden : true;
  const { data, error } = await supabase.from("property_fields")
    .update({ value: v || null, status: v ? "found" : "missing", manually_verified: !!v, manually_overridden: overridden })
    .eq("id", field.id).select("*").single();
  if (error) return fail(error);
  return data;
}

export async function renameProperty(id: string, name: string) {
  const { error } = await supabase.from("properties").update({ name: name.trim().slice(0, 120) || "Mon logement" }).eq("id", id);
  if (error) fail(error);
}

function contactContent(text: string) {
  const phones = [...text.matchAll(/(\+33|0)\s?[1-9](?:[\s.-]?\d{2}){4}/g)].map((m) => m[0].replace(/[\s.-]/g, "").replace(/^0/, "+33"));
  const emails = [...text.matchAll(/[\w.+-]+@[\w-]+\.[\w.]+/g)].map((m) => m[0]);
  return { phones: [...new Set(phones)].slice(0, 3), emails: [...new Set(emails)].slice(0, 2) };
}

/** Publishing rebuilds visible guide sections from confirmed fields only. */
export async function publishProperty(property: Property, fields: PropertyField[]) {
  const sections = new Map<string, { title: string; order: number; items: { label: string; text: string }[] }>();
  for (const f of fields) {
    if (!f.value || f.status !== "found") continue;
    const def = FIELD_BY_KEY[f.key];
    if (!def) continue;
    const s = sections.get(def.section.key) ?? { title: `${def.section.icon} ${def.section.title}`, order: def.section.order, items: [] };
    s.items.push({ label: def.label, text: f.value });
    sections.set(def.section.key, s);
  }
  const rows = [...sections.entries()].map(([key, s]) => ({
    property_id: property.id, section_key: key, title: s.title, sort_order: s.order, is_visible: true,
    content: { items: s.items, ...(key === "contact" ? contactContent(s.items.map((i) => i.text).join("\n")) : {}) },
  }));
  const { error: d } = await supabase.from("guide_sections").delete().eq("property_id", property.id);
  if (d) return fail(d);
  if (rows.length) {
    const { error } = await supabase.from("guide_sections").insert(rows);
    if (error) return fail(error);
  }
  const { error: e3 } = await supabase.from("properties").update({ status: "published", published_at: new Date().toISOString() }).eq("id", property.id);
  if (e3) return fail(e3);
}
