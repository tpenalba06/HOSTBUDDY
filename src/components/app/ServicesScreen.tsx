import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Service } from "@/lib/data/operations";
import { friendlyMessage } from "./Friendly";
import { readBookingConfig, bookingConfigSchema, type BookingConfig } from "@/lib/service-booking";
import { serviceCopy } from "@/lib/service-copy";
import { useI18n } from "@/lib/i18n";
type Draft = {
  id?: string;
  name: string;
  description: string;
  price: string;
  pricingType: "fixed" | "per_person";
  isActive: boolean;
  imagePath?: string | null;
  propertyIds?: string[];
  bookingConfig?: BookingConfig;
  optionText?: string;
  slotText?: string;
};
const empty: Draft = { name: "", description: "", price: "", pricingType: "fixed", isActive: true };
export type ServiceValues = {
  id?: string;
  name: string;
  description: string;
  price: number;
  pricingType: "fixed" | "per_person";
  isActive: boolean;
  imagePath?: string | null;
  propertyIds?: string[];
  bookingConfig?: BookingConfig;
};
export function ServicesScreen({
  services,
  loading = false,
  onSave,
  photos = [],
  propertyId = "",
  properties = [],
  onDelete,
  onUpload,
}: {
  services: Service[];
  propertyId?: string;
  properties?: { id: string; name: string }[];
  onDelete?: (id: string) => Promise<void>;
  onUpload?: (file: File) => Promise<string>;
  loading?: boolean;
  photos?: { path: string; url: string; label: string }[];
  onSave: (values: ServiceValues) => Promise<void>;
}) {
  const { t, locale } = useI18n();
  const c = (key: Parameters<typeof serviceCopy>[1]) => serviceCopy(locale, key);
  const initial: Draft = {
    ...empty,
    id: crypto.randomUUID(),
    propertyIds: [propertyId],
    bookingConfig: readBookingConfig({}),
  };
  const [draft, setDraft] = useState<Draft>(initial);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [optionLabel, setOptionLabel] = useState("");
  const [optionPrice, setOptionPrice] = useState("");
  const [slotDraft, setSlotDraft] = useState("");
  const save = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const bookingConfig = bookingConfigSchema.parse(draft.bookingConfig ?? {});
      await onSave({ ...draft, price: Number(draft.price), bookingConfig });
      setNotice(t("common.saved"));
      setDraft(initial);
      setOpen(false);
    } catch (reason) {
      setError(friendlyMessage(reason));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
        <div className="min-w-0">
          <p className="font-bold text-primary">{t("services.eyebrow")}</p>
          <h2 className="mt-1 text-3xl font-semibold">{t("services.title")}</h2>
          <p className="mt-1 text-muted-foreground">{t("services.desc")}</p>
        </div>
        <Button
          aria-label={t("services.add")}
          onClick={() => {
            setDraft(initial);
            setError("");
            setOpen(!open);
          }}
          className="shrink-0 px-3"
        >
          <Plus />
          <span className="hidden sm:inline">{t("services.add")}</span>
        </Button>
      </div>
      {open && (
        <form
          className="surface mt-5 space-y-4 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <label className="block">
            <span className="mb-1 block font-semibold">{t("services.name")}</span>
            <input
              className="field"
              required
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1 block font-semibold">{t("services.description")}</span>
            <textarea
              className="field min-h-28"
              maxLength={1000}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </label>
          {!!photos.length && (
            <fieldset>
              <legend className="mb-2 font-semibold">{t("payments.servicePhoto")}</legend>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  aria-pressed={!draft.imagePath}
                  onClick={() => setDraft({ ...draft, imagePath: null })}
                >
                  {t("payments.noPhoto")}
                </button>
                {photos.map((photo, index) => (
                  <button
                    key={photo.path}
                    type="button"
                    className={`h-20 w-24 overflow-hidden rounded-xl border-2 ${draft.imagePath === photo.path ? "border-primary" : "border-transparent"}`}
                    aria-pressed={draft.imagePath === photo.path}
                    onClick={() => setDraft({ ...draft, imagePath: photo.path })}
                    aria-label={`${t("payments.servicePhoto")} ${index + 1}`}
                  >
                    <img src={photo.url} alt={photo.label} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="mb-1 block font-semibold">{t("services.price")}</span>
              <input
                className="field"
                required
                type="number"
                min="0"
                step="0.01"
                value={draft.price}
                onChange={(e) => setDraft({ ...draft, price: e.target.value })}
              />
            </label>
            <label>
              <span className="mb-1 block font-semibold">{t("services.pricing")}</span>
              <select
                className="field"
                value={draft.pricingType}
                onChange={(e) =>
                  setDraft({ ...draft, pricingType: e.target.value as Draft["pricingType"] })
                }
              >
                <option value="fixed">{t("services.fixed")}</option>
                <option value="per_person">{t("services.perPerson")}</option>
              </select>
            </label>
          </div>
          <fieldset className="space-y-2">
            <legend className="font-semibold">{c("properties")}</legend>
            {properties.map((property) => (
              <label key={property.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.propertyIds?.includes(property.id) ?? false}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      propertyIds: e.target.checked
                        ? [...(draft.propertyIds ?? []), property.id]
                        : (draft.propertyIds ?? []).filter((id) => id !== property.id),
                    })
                  }
                />
                {property.name}
              </label>
            ))}
          </fieldset>
          {onUpload && (
            <label className="block">
              {c("photoUpload")}
              <input
                className="field"
                type="file"
                accept="image/*"
                disabled={busy}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setBusy(true);
                  setError("");
                  try {
                    const path = await onUpload(file);
                    setDraft((old) => ({ ...old, imagePath: path }));
                  } catch (reason) {
                    setError(friendlyMessage(reason));
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </label>
          )}
          <label className="block">
            {c("quantityLimit")}
            <input
              className="field"
              type="number"
              min={1}
              max={20}
              required
              value={draft.bookingConfig?.maxQuantity ?? 20}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  bookingConfig: {
                    ...readBookingConfig(draft.bookingConfig),
                    maxQuantity: Number(e.target.value),
                  },
                })
              }
            />
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={draft.bookingConfig?.requestDate ?? false}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  bookingConfig: {
                    ...readBookingConfig(draft.bookingConfig),
                    requestDate: e.target.checked,
                  },
                })
              }
            />
            {c("date")}
          </label>
          <fieldset className="space-y-2">
            <legend className="font-semibold">{c("slots")}</legend>
            <label>
              {c("date")}
              <input
                className="field"
                type="datetime-local"
                value={slotDraft}
                onChange={(e) => setSlotDraft(e.target.value)}
              />
            </label>
            <Button
              type="button"
              variant="outline"
              disabled={!slotDraft || !Number.isFinite(Date.parse(slotDraft))}
              onClick={() => {
                const slot = new Date(slotDraft).toISOString();
                setDraft((old) => ({
                  ...old,
                  bookingConfig: {
                    ...readBookingConfig(old.bookingConfig),
                    slots: [...new Set([...(old.bookingConfig?.slots ?? []), slot])],
                  },
                }));
                setSlotDraft("");
              }}
            >
              {c("addSlot")}
            </Button>
            <p className="text-sm text-muted-foreground">{c("slotHint")}</p>
            {draft.bookingConfig?.slots.map((slot) => (
              <div key={slot} className="flex items-center justify-between gap-2">
                <span>
                  {new Intl.DateTimeFormat(locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(slot))}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      bookingConfig: {
                        ...readBookingConfig(draft.bookingConfig),
                        slots: draft.bookingConfig!.slots.filter((value) => value !== slot),
                      },
                    })
                  }
                >
                  {c("removeItem")}
                </Button>
              </div>
            ))}
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="font-semibold">{c("options")}</legend>
            <label>
              {t("services.name")}
              <input
                className="field"
                maxLength={80}
                value={optionLabel}
                onChange={(e) => setOptionLabel(e.target.value)}
              />
            </label>
            <label>
              {t("services.price")} (€)
              <input
                className="field"
                type="number"
                min={0}
                step="0.01"
                value={optionPrice}
                onChange={(e) => setOptionPrice(e.target.value)}
              />
            </label>
            <Button
              type="button"
              variant="outline"
              disabled={
                !optionLabel.trim() ||
                !optionPrice ||
                !Number.isFinite(Number(optionPrice)) ||
                Number(optionPrice) < 0
              }
              onClick={() => {
                setDraft((old) => ({
                  ...old,
                  bookingConfig: {
                    ...readBookingConfig(old.bookingConfig),
                    options: [
                      ...(old.bookingConfig?.options ?? []),
                      {
                        id: crypto.randomUUID(),
                        label: optionLabel.trim(),
                        priceCents: Math.round(Number(optionPrice) * 100),
                      },
                    ],
                  },
                }));
                setOptionLabel("");
                setOptionPrice("");
              }}
            >
              {c("addOption")}
            </Button>
            {draft.bookingConfig?.options.map((option) => (
              <div key={option.id} className="flex items-center justify-between gap-2">
                <span>
                  {option.label} (+{(option.priceCents / 100).toFixed(2)} €)
                </span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      bookingConfig: {
                        ...readBookingConfig(draft.bookingConfig),
                        options: draft.bookingConfig!.options.filter(
                          (value) => value.id !== option.id,
                        ),
                      },
                    })
                  }
                >
                  {c("removeItem")}
                </Button>
              </div>
            ))}
          </fieldset>
          {(["instructions", "cancellation", "seller"] as const).map((key) => (
            <label key={key} className="block">
              {c(key)}
              <textarea
                className="field"
                maxLength={key === "instructions" ? 1000 : 2000}
                required={
                  (Number(draft.price) > 0 ||
                    draft.bookingConfig?.options.some((option) => option.priceCents > 0)) &&
                  key !== "instructions"
                }
                value={draft.bookingConfig?.[key] ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    bookingConfig: {
                      ...readBookingConfig(draft.bookingConfig),
                      [key]: e.target.value,
                    },
                  })
                }
              />
            </label>
          ))}
          <label className="flex min-h-14 items-center justify-between rounded-lg bg-muted px-4">
            <span className="font-semibold">{t("services.visible")}</span>
            <input
              className="h-6 w-6 accent-primary"
              type="checkbox"
              checked={draft.isActive}
              onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
            />
          </label>
          {error && (
            <p role="alert" className="rounded-lg bg-warning-soft p-3">
              {error}
            </p>
          )}
          <Button className="w-full" disabled={busy}>
            {busy ? t("common.saving") : t("services.save")}
          </Button>
        </form>
      )}
      {!open && error && (
        <p role="alert" className="mt-4">
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-4 flex items-center gap-2 rounded-lg bg-success-soft p-3 text-success">
          <Check />
          {notice}
        </p>
      )}
      <div className="mt-6 space-y-3">
        {services.map((service) => (
          <article
            key={service.id}
            className="surface grid grid-cols-1 items-center gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto]"
          >
            <div className="min-w-0">
              <p className="font-bold">
                {service.name}
                {!service.is_active && (
                  <span className="ml-2 text-sm text-muted-foreground">{c("inactive")}</span>
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                {Number(service.price).toFixed(2)} € ·{" "}
                {service.pricing_type === "per_person"
                  ? t("services.perPerson")
                  : t("services.fixed")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDraft({
                    id: service.id,
                    name: service.name,
                    description: service.description,
                    price: String(service.price),
                    pricingType: service.pricing_type,
                    isActive: service.is_active,
                    imagePath:
                      (service.image_paths as Record<string, string> | undefined)?.[propertyId] ??
                      (service.property_id === propertyId ? service.image_path : null),
                    propertyIds:
                      service.property_ids ??
                      (service.property_id
                        ? [service.property_id]
                        : properties.map((item) => item.id)),
                    bookingConfig: readBookingConfig(service.booking_config),
                    optionText: readBookingConfig(service.booking_config)
                      .options.map(
                        (item) => `${item.label} ; ${(item.priceCents / 100).toFixed(2)}`,
                      )
                      .join("\n"),
                    slotText: readBookingConfig(service.booking_config).slots.join("\n"),
                  });
                  setOpen(true);
                }}
              >
                {t("common.edit")}
              </Button>
              {onDelete && (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={async () => {
                    if (!window.confirm(c("removeConfirm"))) return;
                    setBusy(true);
                    setError("");
                    try {
                      await onDelete(service.id);
                    } catch (reason) {
                      setError(friendlyMessage(reason));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {c("remove")}
                </Button>
              )}
            </div>
          </article>
        ))}
        {!loading && !services.length && (
          <p className="rounded-lg bg-muted p-4 text-muted-foreground">{t("services.empty")}</p>
        )}
      </div>
    </section>
  );
}
