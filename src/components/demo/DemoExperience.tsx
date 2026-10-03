import { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GuestGuide, SECTIONS, type SectionId } from "@/components/guest/GuestGuide";
import { getVillaMare } from "@/components/guest/villaMare";
import { GuideEditor, type GuideEditorActions } from "@/components/app/GuideEditor";
import { DemoManager } from "@/components/demo/DemoManager";
import type { GuideSection, SectionMedia } from "@/lib/data/properties";
import {
  buildGuideContent,
  mergeFieldIntoGuideContent,
  type GuideContentItem,
} from "@/lib/data/guide-content";
import { FIELD_BY_KEY } from "@/lib/import-engine/fields";
import type { Json } from "@/integrations/supabase/types";
import { useI18n } from "@/lib/i18n";
import arrivalAsset from "@/assets/hostbuddy-arrival.jpg.asset.json";

type Mode = "guest" | "manager";
const asSection = (value: Record<string, unknown>) => value as unknown as GuideSection;
const asMedia = (value: Record<string, unknown>) => value as unknown as SectionMedia;
const validStored = (
  value: unknown,
): value is {
  data: ReturnType<typeof getVillaMare>;
  sections: GuideSection[];
  media: SectionMedia[];
} => {
  if (!value || typeof value !== "object") return false;
  const state = value as Record<string, unknown>;
  const data = state["data"] as Record<string, unknown> | undefined;
  return (
    !!data &&
    typeof data["name"] === "string" &&
    typeof data["arrival"] === "string" &&
    typeof data["house"] === "string" &&
    typeof data["pool"] === "string" &&
    typeof data["departure"] === "string" &&
    typeof data["host"] === "string" &&
    typeof data["phone"] === "string" &&
    typeof data["email"] === "string" &&
    Array.isArray(data["places"]) &&
    data["places"].every(
      (place: unknown) =>
        !!place &&
        typeof place === "object" &&
        typeof (place as { name?: unknown }).name === "string",
    ) &&
    Array.isArray(data["services"]) &&
    data["services"].every(
      (service: unknown) =>
        !!service &&
        typeof service === "object" &&
        typeof (service as { id?: unknown }).id === "string",
    ) &&
    !!data["wifi"] &&
    typeof data["wifi"] === "object" &&
    typeof (data["wifi"] as Record<string, unknown>)["network"] === "string" &&
    typeof (data["wifi"] as Record<string, unknown>)["password"] === "string" &&
    Array.isArray(state["sections"]) &&
    state["sections"].every(
      (s: unknown) =>
        !!s &&
        typeof s === "object" &&
        typeof (s as GuideSection).section_key === "string" &&
        typeof (s as GuideSection).title === "string" &&
        typeof (s as GuideSection).is_visible === "boolean" &&
        !!(s as GuideSection).content &&
        typeof (s as GuideSection).content === "object",
    ) &&
    Array.isArray(state["media"]) &&
    state["media"].every(
      (item: unknown) =>
        !!item &&
        typeof item === "object" &&
        typeof (item as SectionMedia).storage_path === "string",
    )
  );
};

export function DemoExperience({ compact = false }: { compact?: boolean }) {
  const { locale, t } = useI18n();
  const storageKey = `hostbuddy.demo.${locale}`;
  const base = getVillaMare(locale);
  const initialSections = () =>
    SECTIONS.filter((section) => section.id !== "pool" || base.pool).map((section, index) => {
      const items: GuideContentItem[] =
        section.id === "arrival"
          ? [{ fieldKey: "arrival", label: t("demo.arrivalTime"), text: base.arrival }]
          : section.id === "wifi"
            ? [
                { fieldKey: "wifi", label: t("demo.wifiNetwork"), text: base.wifi.network },
                { label: t("demo.wifiPassword"), text: base.wifi.password },
              ]
            : section.id === "house"
              ? [{ fieldKey: "equipment", label: t("section.house"), text: base.house }]
              : section.id === "departure"
                ? [{ fieldKey: "departure", label: t("section.departure"), text: base.departure }]
                : section.id === "pool"
                  ? [{ fieldKey: "pool", label: t("section.pool"), text: base.pool }]
                  : section.id === "contact"
                    ? [
                        {
                          fieldKey: "contact",
                          label: t("section.contact"),
                          text: [base.host, base.phone, base.email].join("\n"),
                        },
                      ]
                    : [];
      return asSection({
        id: `demo-${section.id}`,
        property_id: "demo",
        section_key: section.id,
        title: t(section.key),
        icon: section.icon,
        cta_label: null,
        sort_order: index,
        is_visible: true,
        content: buildGuideContent(section.id, {}, items),
        created_at: "",
        updated_at: "",
      });
    });
  const [data, setData] = useState(base);
  const [sections, setSections] = useState<GuideSection[]>(initialSections);
  const [media, setMedia] = useState<SectionMedia[]>([]);
  const [mode, setMode] = useState<Mode>("guest");
  const [section, setSection] = useState<SectionId>("welcome");
  const [saved, setSaved] = useState(false);
  const [hero, setHero] = useState(arrivalAsset.url);
  const [restoredLocale, setRestoredLocale] = useState<string | null>(null);
  useEffect(() => {
    let restored = false;
    try {
      const next = window.sessionStorage.getItem(storageKey);
      if (next) {
        const parsed: unknown = JSON.parse(next);
        if (validStored(parsed)) {
          setData(parsed.data);
          setSections(parsed.sections);
          setMedia(parsed.media);
          restored = true;
        }
      }
    } catch {
      /* Corrupt or old demo data must not crash the page. */
    }
    if (!restored) {
      setData(base);
      setSections(initialSections());
      setMedia([]);
    }
    setRestoredLocale(locale);
  }, [locale]);
  useEffect(() => {
    if (restoredLocale !== locale) return;
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify({ data, sections, media }));
    } catch {
      /* local demo may exceed quota */
    }
  }, [data, media, sections, storageKey, restoredLocale, locale]);
  const flash = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  };
  const actions = useMemo<GuideEditorActions>(
    () => ({
      ensure: async () => sections,
      add: async (_propertyId, order, template) => {
        const created = asSection({
          id: `demo-${crypto.randomUUID()}`,
          property_id: "demo",
          section_key: template.key,
          title: template.title,
          icon: template.icon,
          cta_label: null,
          sort_order: order,
          is_visible: true,
          content: { items: [] },
          created_at: "",
          updated_at: "",
        });
        setSections((current) => [...current, created]);
        return created;
      },
      save: async (current, values) => {
        const content = buildGuideContent(current.section_key, current.content, values.items);
        const updated = {
          ...current,
          title: values.title,
          icon: values.icon,
          cta_label: values.ctaLabel || null,
          is_visible: values.isVisible,
          content,
        } as GuideSection;
        setSections((currentItems) =>
          currentItems.map((item) => (item.id === updated.id ? updated : item)),
        );
        const key = current.section_key as SectionId;
        const text = values.items
          .map((item) => item.text)
          .filter(Boolean)
          .join("\n");
        if (key === "arrival" || key === "house" || key === "departure" || key === "pool")
          setData((value) => ({ ...value, [key]: text }));
        if (key === "wifi")
          setData((value) => ({
            ...value,
            wifi: {
              network: values.items[0]?.text ?? value.wifi.network,
              password: values.items[1]?.text ?? value.wifi.password,
            },
          }));
        return updated;
      },
      reorder: async (next) => setSections(next),
      remove: async (id) => setSections((items) => items.filter((item) => item.id !== id)),
      upload: async (_org, _property, sectionId, file) => {
        const url = URL.createObjectURL(file);
        const created = asMedia({
          id: `demo-media-${crypto.randomUUID()}`,
          organization_id: "demo",
          property_id: "demo",
          section_id: sectionId,
          media_type: file.type.startsWith("image/") ? "image" : "video",
          storage_path: url,
          mime_type: file.type,
          file_size: file.size,
          sort_order: media.length,
          caption: null,
          alt_text: null,
          created_at: "",
        });
        setMedia((items) => [...items, created]);
        if (file.type.startsWith("image/")) setHero(url);
        return created;
      },
      updateMedia: async (item, values) => {
        const updated = {
          ...item,
          alt_text: values.altText ?? item.alt_text,
          caption: values.caption ?? item.caption,
        };
        setMedia((items) => items.map((current) => (current.id === item.id ? updated : current)));
        return updated;
      },
      removeMedia: async (item) =>
        setMedia((items) => items.filter((current) => current.id !== item.id)),
      resolveMediaUrl: async (item) => item.storage_path,
    }),
    [media.length, sections],
  );
  const labels = Object.fromEntries(
    sections.filter((item) => item?.is_visible).map((item) => [item.section_key, item.title]),
  ) as Partial<Record<SectionId, string>>;
  const visibleSections = sections
    .filter((item) => item?.is_visible)
    .map((item) => item.section_key as SectionId);
  const showGuest = (next: SectionId = "welcome") => {
    setSection(next);
    setMode("guest");
  };
  const editor = (
    <GuideEditor
      data={{
        property: { id: "demo", organization_id: "demo", status: "published" },
        fields: [],
        sections,
        media,
      }}
      actions={actions}
      onChanged={flash}
      onPreview={() => showGuest()}
    />
  );
  return (
    <div className="demo-container w-full">
      <div
        className="mx-auto mb-4 grid max-w-md grid-cols-2 rounded-full border bg-card/95 p-1.5 py-2.5 shadow-soft"
        role="tablist"
      >
        <Button
          className="min-h-12 whitespace-nowrap text-sm text-foreground hover:text-foreground"
          role="tab"
          aria-selected={mode === "guest"}
          variant={mode === "guest" ? "default" : "ghost"}
          onClick={() => showGuest()}
        >
          {t("demo.guest")}
        </Button>
        <Button
          className="min-h-12 whitespace-nowrap text-sm text-foreground hover:text-foreground"
          role="tab"
          aria-selected={mode === "manager"}
          variant={mode === "manager" ? "default" : "ghost"}
          onClick={() => setMode("manager")}
        >
          {t("demo.manager")}
        </Button>
      </div>
      <div
        className={`demo-frame mx-auto w-full overflow-hidden border bg-background shadow-soft ${compact ? "rounded-xl" : "max-w-6xl rounded-xl"}`}
      >
        <div className="demo-viewport overflow-y-auto overflow-x-hidden bg-background text-foreground">
          <div hidden={mode !== "guest"}>
            <div className="mx-auto max-w-4xl p-3 @sm:p-6">
              <GuestGuide
                data={data}
                section={section}
                onSection={setSection}
                heroImage={hero}
                labels={labels}
                visibleSections={visibleSections}
                sections={sections}
                media={media}
              />
            </div>
          </div>
          <div hidden={mode !== "manager"} className="h-full">
            <DemoManager
              key={locale}
              editor={editor}
              onPreview={() => showGuest()}
              villaName={data.name}
              villaSections={sections}
              onVillaRename={(name) => setData((value) => ({ ...value, name }))}
              onVillaServicesChange={(services) =>
                setData((value) => ({
                  ...value,
                  services: services
                    .filter((service) => service.is_active)
                    .map((service) => ({
                      id: service.id,
                      name: service.name,
                      desc: service.description,
                      price: service.price,
                    })),
                }))
              }
              onVillaFieldSave={async (field, value) => {
                const sectionKey = FIELD_BY_KEY[field.key]?.section.key;
                const current = sections.find((section) => section.section_key === sectionKey);
                if (!current) return;
                const content = mergeFieldIntoGuideContent(current.section_key, current.content, {
                  ...field,
                  value,
                }) as Json;
                const items = (content as { items: GuideContentItem[] }).items;
                await actions.save(current, {
                  title: current.title,
                  items,
                  isVisible: current.is_visible,
                  icon: current.icon ?? "📌",
                  ctaLabel: current.cta_label ?? "",
                });
              }}
            />
          </div>
        </div>
      </div>
      <div
        aria-live="polite"
        className={`fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-5 py-3 font-semibold text-ink-foreground transition ${saved ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <Save className="mr-2 inline h-4 w-4" />
        {t("demo.saved")}
      </div>
    </div>
  );
}
