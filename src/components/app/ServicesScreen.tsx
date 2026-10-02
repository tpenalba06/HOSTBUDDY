import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Service } from "@/lib/data/operations";
import { friendlyMessage } from "./Friendly";
import { useI18n } from "@/lib/i18n";
type Draft = {
  id?: string;
  name: string;
  description: string;
  price: string;
  pricingType: "fixed" | "per_person";
  isActive: boolean;
};
const empty: Draft = { name: "", description: "", price: "", pricingType: "fixed", isActive: true };
export type ServiceValues = {
  id?: string;
  name: string;
  description: string;
  price: number;
  pricingType: "fixed" | "per_person";
  isActive: boolean;
};
export function ServicesScreen({
  services,
  loading = false,
  onSave,
}: {
  services: Service[];
  loading?: boolean;
  onSave: (values: ServiceValues) => Promise<void>;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<Draft>(empty);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await onSave({ ...draft, price: Number(draft.price) });
      setNotice(t("common.saved"));
      setDraft(empty);
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
        <Button onClick={() => setOpen(!open)} className="shrink-0 px-3">
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
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </label>
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
            className="surface grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4"
          >
            <div className="min-w-0">
              <p className="font-bold">{service.name}</p>
              <p className="text-sm text-muted-foreground">
                {Number(service.price).toFixed(2)} € ·{" "}
                {service.pricing_type === "per_person"
                  ? t("services.perPerson")
                  : t("services.fixed")}
              </p>
            </div>
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
                });
                setOpen(true);
              }}
            >
              {t("common.edit")}
            </Button>
          </article>
        ))}
        {!loading && !services.length && (
          <p className="rounded-lg bg-muted p-4 text-muted-foreground">{t("services.empty")}</p>
        )}
      </div>
    </section>
  );
}
