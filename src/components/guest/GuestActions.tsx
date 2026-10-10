import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { parseThreadSession, type GuestThread, type GuestThreadSession } from "@/lib/guest-thread";
import { useEffect, useState } from "react";
import { Check, Send, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import type { PublicService } from "./GuideContent";
export function MessageDrawer({ slug, onClose }: { slug: string; onClose: () => void }) {
  const { t, locale } = useI18n();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [session, setSession] = useState<GuestThreadSession | null>(null);
  const [thread, setThread] = useState<GuestThread | null>(null);
  const [refresh, setRefresh] = useState(0);
  const storageKey = `hostbuddy.guest-thread.${slug}`;
  useEffect(() => {
    try {
      setSession(parseThreadSession(JSON.parse(localStorage.getItem(storageKey) ?? "null")));
    } catch {
      /* A blocked local store never prevents sending a message. */
    }
  }, [storageKey]);
  useEffect(() => {
    if (!session) return;
    let live = true;
    const controller = new AbortController();
    const read = async () => {
      if (document.hidden) return;
      try {
        const response = await fetch("/api/public/messages", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "read",
            slug,
            conversationId: session.id,
            token: session.token,
          }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("unavailable");
        const result = (await response.json()) as { thread: GuestThread };
        if (live) {
          setThread(result.thread);
          setError("");
        }
      } catch {
        if (live) setError(t("message.failed"));
      }
    };
    void read();
    const timer = setInterval(() => void read(), 20_000);
    return () => {
      live = false;
      controller.abort();
      clearInterval(timer);
    };
  }, [session, slug, refresh, t]);
  return (
    <Drawer title={t("guest.sendMessage")} onClose={onClose}>
      {session && (
        <div className="mb-4 space-y-3" aria-live="polite">
          {(thread?.messages ?? []).map((item) => (
            <article
              key={item.id}
              className={`rounded-xl p-3 ${item.sender_type === "manager" ? "bg-secondary" : "border bg-background"}`}
            >
              <p className="text-xs font-semibold text-muted-foreground">
                {item.sender_type === "manager" ? t("message.host") : t("message.you")} ·{" "}
                {new Date(item.created_at).toLocaleString(locale, {
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "numeric",
                  month: "short",
                })}
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words">{item.body}</p>
            </article>
          ))}
          <Button variant="ghost" onClick={() => setRefresh((value) => value + 1)}>
            {t("message.refresh")}
          </Button>
        </div>
      )}
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy) return;
          setBusy(true);
          setError("");
          try {
            const response = await fetch("/api/public/messages", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                slug,
                name,
                contact,
                message,
                website,
                ...(session ? { conversationId: session.id, token: session.token } : {}),
              }),
            });
            if (!response.ok) throw new Error("unavailable");
            const result = (await response.json()) as { session?: GuestThreadSession };
            if (!session) {
              const next = parseThreadSession(result.session);
              if (!next) throw new Error("unavailable");
              setSession(next);
              try {
                localStorage.setItem(storageKey, JSON.stringify(next));
              } catch {
                /* The open conversation still works in memory. */
              }
            }
            setMessage("");
            setRefresh((value) => value + 1);
          } catch {
            setError(t("message.failed"));
          } finally {
            setBusy(false);
          }
        }}
      >
        {!session && (
          <>
            <Field label={t("form.name")} value={name} onChange={setName} required />
            <Field
              label={`${t("form.contact")} (${t("common.optional")})`}
              value={contact}
              onChange={setContact}
            />
          </>
        )}
        <label className="block">
          <span className="mb-1 block font-semibold">{t("form.message")}</span>
          <textarea
            className="field min-h-28"
            required
            maxLength={2000}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </label>
        <label className="sr-only">
          {t("form.website")}
          <input
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="rounded-lg bg-warning-soft p-3">
            {error}
          </p>
        )}
        <Button className="w-full" disabled={busy || (!session && !name.trim()) || !message.trim()}>
          <Send />
          {busy ? t("common.saving") : t("common.send")}
        </Button>
      </form>
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
