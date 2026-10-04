import { prepareMediaUpload, preparedVideoMetadata } from "@/lib/media/prepare-upload";
import { validateMediaUpload } from "@/lib/data/media-validation";
import { GuideView } from "@/components/guest/GuideView";
import { demoGuide } from "./villa-mare-fixture";
import { useState, type ReactNode } from "react";
import {
  PropertyEditorScreen,
  PropertyInformationScreen,
  type PropertyEditorMode,
} from "@/components/app/PropertyEditorScreen";
import { MessagingEditor, ReviewEditor } from "@/components/app/PropertySettingsEditors";
import { QuestionScreen } from "@/components/app/PropertyQuestionScreen";
import { ServicesScreen } from "@/components/app/ServicesScreen";
import { GuideEditor, type GuideEditorActions } from "@/components/app/GuideEditor";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import type { PropertyField } from "@/lib/data/properties";
import type { Json } from "@/integrations/supabase/types";
import { buildGuideContent, fieldUpdatesForGuideSection } from "@/lib/data/guide-content";
import { answerDemoField, type DemoProperty } from "./demo-property";

export function DemoPropertyEditor({
  property,
  onChange,
  onBack,
  onPreview,
  guide,
  onFieldSave,
  onRename,
  onServicesChange,
  initialPreview = false,
}: {
  property: DemoProperty;
  onChange: (update: (current: DemoProperty) => DemoProperty) => void;
  onBack: () => void;
  onPreview: () => void;
  guide?: ReactNode;
  initialPreview?: boolean;
  onFieldSave?: (field: PropertyField, value: string) => Promise<void>;
  onRename?: (name: string) => void;
  onServicesChange?: (services: DemoProperty["services"]) => void;
}) {
  const { t } = useI18n();
  const [mode, setMode] = useState<PropertyEditorMode>("guide");
  const [editing, setEditing] = useState<PropertyField | null>(null);
  const [preview, setPreview] = useState(initialPreview);
  const [saved, setSaved] = useState(false);
  const flash = () => setSaved(true);
  const actions: GuideEditorActions = {
    ensure: async () => property.sections,
    add: async (_, order, template) => {
      const section = {
        id: `demo-section-${crypto.randomUUID()}`,
        property_id: property.id,
        section_key: `${template.key}-${crypto.randomUUID().slice(0, 4)}`,
        title: template.title,
        icon: template.icon,
        cta_label: null,
        sort_order: order,
        is_visible: true,
        content: { items: [], explicitlyEnabled: true },
        created_at: "",
        updated_at: "",
      };
      onChange((current) => ({ ...current, sections: [...current.sections, section] }));
      return section;
    },
    save: async (section, values) => {
      if (values.propertyMedia) {
        const updated = {
          ...section,
          content: {
            ...(section.content as object),
            propertyMedia: values.propertyMedia,
          } as unknown as Json,
        };
        onChange((current) => ({
          ...current,
          sections: current.sections.map((item) =>
            item.id === section.id
              ? {
                  ...item,
                  content: {
                    ...(item.content as object),
                    propertyMedia: values.propertyMedia,
                  } as unknown as Json,
                }
              : item,
          ),
        }));
        return updated;
      }
      const updated = {
        ...section,
        title: values.title,
        icon: values.icon,
        cta_label: values.ctaLabel || null,
        is_visible: values.isVisible,
        content: buildGuideContent(
          section.section_key,
          values.propertyMedia
            ? { ...(section.content as object), propertyMedia: values.propertyMedia }
            : section.content,
          values.items,
        ) as Json,
      };
      const updates = fieldUpdatesForGuideSection(
        section.section_key,
        section.content,
        values.items,
      );
      onChange((current) => ({
        ...current,
        sections: current.sections.map((item) => (item.id === section.id ? updated : item)),
        fields: current.fields.map((field) => {
          const update = updates.find((item) => item.key === field.key);
          return update
            ? {
                ...field,
                value: update.value,
                status: update.value ? "found" : "missing",
                manually_verified: !!update.value,
                manually_overridden: true,
              }
            : field;
        }),
      }));
      return updated;
    },
    reorder: async (sections) => onChange((current) => ({ ...current, sections })),
    remove: async (id) =>
      onChange((current) => ({
        ...current,
        sections: current.sections.filter((item) => item.id !== id),
      })),
    upload: async (_, __, sectionId, file, options) => {
      file = await prepareMediaUpload(file, options);
      await validateMediaUpload(file);
      const media = {
        id: `demo-media-${crypto.randomUUID()}`,
        organization_id: "demo",
        property_id: property.id,
        section_id: sectionId,
        media_type: file.type.startsWith("image/") ? ("image" as const) : ("video" as const),
        storage_path: URL.createObjectURL(file),
        mime_type: file.type,
        file_size: file.size,
        sort_order: property.media.length,
        caption: null,
        alt_text: null,
        created_at: "",
        updated_at: "",
      };
      const video = preparedVideoMetadata(file);
      onChange((current) => ({
        ...current,
        media: [...current.media, media],
        sections: video
          ? current.sections.map((s) =>
              s.id === sectionId
                ? {
                    ...s,
                    content: {
                      ...(s.content as object),
                      mediaMetadata: { [media.id]: video },
                    } as unknown as Json,
                  }
                : s,
            )
          : current.sections,
      }));
      return media;
    },
    updateMedia: async (item, values) => {
      const updated = {
        ...item,
        sort_order: values.sortOrder ?? item.sort_order,
        caption: values.caption ?? item.caption,
        alt_text: values.altText ?? item.alt_text,
      };
      onChange((current) => ({
        ...current,
        media: current.media.map((media) => (media.id === item.id ? updated : media)),
      }));
      return updated;
    },
    removeMedia: async (item) =>
      onChange((current) => ({
        ...current,
        media: current.media.filter((media) => media.id !== item.id),
      })),
    resolveMediaUrl: async (item) => item.storage_path,
  };
  if (editing)
    return (
      <QuestionScreen
        field={editing}
        onBack={() => setEditing(null)}
        onSave={async (field, value) => {
          await onFieldSave?.(field, value);
          const next = answerDemoField(property, field, value);
          onChange((current) => answerDemoField(current, field, value));
          return next.fields.find((item) => item.id === field.id)!;
        }}
        onSaved={() => {
          setEditing(null);
          flash();
        }}
      />
    );
  if (preview)
    return (
      <div className="py-4">
        <Button variant="outline" onClick={() => setPreview(false)}>
          ← {t("common.back")}
        </Button>
        <GuideView guide={demoGuide(property)} />
      </div>
    );
  return (
    <PropertyEditorScreen
      property={property}
      mode={mode}
      onModeChange={setMode}
      onBack={onBack}
      onPreview={() => (guide ? onPreview() : setPreview(true))}
      onRename={async (name) => {
        onChange((current) => ({ ...current, name }));
        onRename?.(name);
      }}
      onSaved={flash}
    >
      {saved && (
        <p role="status" className="mt-3 text-success">
          ✓ {t("common.saved")}
        </p>
      )}
      {mode === "guide" && (
        <div className="mt-7">
          {guide ?? (
            <GuideEditor
              data={{
                property: { ...property, organization_id: "demo" },
                fields: property.fields,
                sections: property.sections,
                media: property.media,
              }}
              actions={actions}
              onPublish={async () => {
                onChange((current) => ({ ...current, status: "published" }));
                flash();
              }}
              onChanged={flash}
              onPreview={() => setPreview(true)}
            />
          )}
        </div>
      )}
      {mode === "details" && (
        <PropertyInformationScreen
          fields={property.fields}
          onEdit={setEditing}
          onComplete={() => {
            const next = property.fields.find(
              (field) => field.essential && field.status !== "found",
            );
            if (next) setEditing(next);
            else {
              onChange((current) => ({ ...current, status: "published" }));
              flash();
            }
          }}
        />
      )}
      {mode === "services" && (
        <div className="mt-7">
          <ServicesScreen
            services={property.services}
            photos={property.media
              .filter((item) => item.media_type === "image")
              .map((item) => ({
                path: item.storage_path,
                url: item.storage_path,
                label: item.alt_text || property.name,
              }))}
            onSave={async (values) => {
              const service = {
                id: values.id ?? `demo-service-${crypto.randomUUID()}`,
                organization_id: "demo",
                property_id: property.id,
                name: values.name,
                description: values.description,
                price: values.price,
                pricing_type: values.pricingType,
                is_active: values.isActive,
                image_path: values.imagePath ?? null,
                created_at: "",
                updated_at: "",
              };
              const services = property.services.some((item) => item.id === service.id)
                ? property.services.map((item) => (item.id === service.id ? service : item))
                : [...property.services, service];
              onChange((current) => ({
                ...current,
                services,
                sections:
                  values.isActive &&
                  !current.sections.some(
                    (section) => section.section_key.split("-")[0] === "services",
                  )
                    ? [
                        ...current.sections,
                        {
                          id: `demo-services-${crypto.randomUUID()}`,
                          property_id: current.id,
                          section_key: "services",
                          title: t("section.services"),
                          icon: "✨",
                          cta_label: null,
                          sort_order: 6,
                          is_visible: true,
                          content: { items: [], explicitlyEnabled: true },
                          created_at: "",
                          updated_at: "",
                        },
                      ]
                    : current.sections,
              }));
              onServicesChange?.(services);
            }}
          />
        </div>
      )}
      {mode === "reviews" && (
        <>
          <MessagingEditor
            initial={property.messagingEnabled}
            onSave={(messagingEnabled) => onChange((current) => ({ ...current, messagingEnabled }))}
            onSaved={flash}
          />
          <ReviewEditor
            initial={property.review}
            initialDestinations={property.destinations}
            onSave={(settings, destinations) =>
              onChange((current) => ({
                ...current,
                review: {
                  title: settings.title,
                  message: settings.message,
                  is_enabled: settings.isEnabled,
                },
                destinations,
              }))
            }
            onSaved={flash}
          />
        </>
      )}
    </PropertyEditorScreen>
  );
}
