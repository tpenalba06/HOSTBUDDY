import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { Check, Send, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import type { PublicService } from "./GuideContent";
export function MessageDrawer({ slug, onClose }: { slug: string; onClose: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  return (
    <Drawer title={t("guest.sendMessage")} onClose={onClose}>
      {sent ? (
        <Success text={t("message.sent")} onClose={onClose} />
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const r = await fetch("/api/public/messages", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ slug, name, contact, message, website }),
              });
              if (!r.ok) throw new Error();
              setSent(true);
            } catch {
              setError(t("message.failed"));
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label={t("form.name")} value={name} onChange={setName} required />
          <Field
            label={`${t("form.contact")} (${t("common.optional")})`}
            value={contact}
            onChange={setContact}
          />
          <label className="block">
            <span className="mb-1 block font-semibold">{t("form.message")}</span>
            <textarea
              className="field min-h-36"
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
          <label className="sr-only">
            {t("form.website")}
            <input value={website} onChange={(e) => setWebsite(e.target.value)} />
          </label>
          {error && (
            <p role="alert" className="rounded-lg bg-warning-soft p-3">
              {error}
            </p>
          )}
          <Button className="w-full" disabled={busy || !name.trim() || !message.trim()}>
            <Send />
            {busy ? "…" : t("common.send")}
          </Button>
        </form>
      )}
    </Drawer>
  );
}
export function OrderDrawer({
  slug,
  service,
  onClose,
}: {
  slug: string;
  service: PublicService | undefined;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  if (!service) return null;
  return (
    <Drawer title={service.name} onClose={onClose}>
      {sent ? (
        <Success text={t("order.sent")} onClose={onClose} />
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const r = await fetch("/api/public/orders", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  slug,
                  serviceId: service.id,
                  name,
                  contact,
                  quantity,
                  requestedFor: null,
                  website: "",
                }),
              });
              if (!r.ok) throw new Error("unavailable");
              setSent(true);
            } catch {
              setError(t("message.failed"));
            } finally {
              setBusy(false);
            }
          }}
        >
          <p className="rounded-xl bg-warning-soft p-3 text-sm">{t("order.notice")}</p>
          <Field label={t("form.name")} value={name} onChange={setName} required />
          <Field
            label={`${t("form.contact")} (${t("common.optional")})`}
            value={contact}
            onChange={setContact}
          />
          <label className="block">
            <span className="mb-1 block font-semibold">{t("form.quantity")}</span>
            <input
              className="field"
              type="number"
              min={1}
              max={20}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </label>
          <p className="text-xl font-bold">
            {t("order.total")} : {(service.price * quantity).toFixed(2)} €
          </p>
          {error && (
            <p role="alert" className="rounded-lg bg-warning-soft p-3">
              {error}
            </p>
          )}
          <Button className="w-full" disabled={busy}>
            {busy ? "…" : t("order.send")}
          </Button>
        </form>
      )}
    </Drawer>
  );
}
export function FeedbackDrawer({ slug, onClose }: { slug: string; onClose: () => void }) {
  const { t } = useI18n();
  const [rating, setRating] = useState(5);
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  return (
    <Drawer title={t("feedback.title")} onClose={onClose}>
      {sent ? (
        <Success text={t("feedback.sent")} onClose={onClose} />
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const r = await fetch("/api/public/feedback", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ slug, name, rating, comment, website: "" }),
              });
              if (!r.ok) throw new Error("unavailable");
              setSent(true);
            } catch {
              setError(t("message.failed"));
            } finally {
              setBusy(false);
            }
          }}
        >
          <p className="text-muted-foreground">{t("feedback.private")}</p>
          <fieldset>
            <legend className="font-semibold">{t("feedback.rating")}</legend>
            <div className="mt-2 flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  aria-label={`${n}/5`}
                  onClick={() => setRating(n)}
                  className="h-12 w-12"
                >
                  <Star
                    className={`mx-auto ${n <= rating ? "fill-primary text-primary" : "text-border"}`}
                  />
                </button>
              ))}
            </div>
          </fieldset>
          <Field
            label={`${t("form.name")} (${t("common.optional")})`}
            value={name}
            onChange={setName}
          />
          <label className="block">
            <span className="mb-1 block font-semibold">{t("form.message")}</span>
            <textarea
              className="field min-h-32"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="rounded-lg bg-warning-soft p-3">
              {error}
            </p>
          )}
          <Button className="w-full" disabled={busy}>
            {busy ? "…" : t("feedback.send")}
          </Button>
        </form>
      )}
    </Drawer>
  );
}
function Field({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-semibold">{label}</span>
      <input
        className="field"
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
function Drawer({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        aria-describedby={undefined}
        className="hb-guide hb-public-action [&>button]:hidden"
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <DialogTitle className="text-2xl">{title}</DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label={t("common.close")}>
            <X />
          </Button>
        </div>
        {children}
      </DialogContent>
    </Dialog>
  );
}
function Success({ text, onClose }: { text: string; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <div className="py-8 text-center">
      <Check className="mx-auto h-10 w-10 text-success" />
      <p className="mt-3 text-lg font-semibold">{text}</p>
      <Button className="mt-6" onClick={onClose}>
        {t("common.close")}
      </Button>
    </div>
  );
}
