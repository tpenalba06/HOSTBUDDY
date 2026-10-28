import { readBookingConfig, serviceTotalCents } from "@/lib/service-booking";
import { serviceCopy } from "@/lib/service-copy";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { parseThreadSession, type GuestThread, type GuestThreadSession } from "@/lib/guest-thread";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  publicBookingTransport,
  type BookingTransport,
  type BookingPrefill,
  type BookingReceipt,
} from "@/lib/service-booking-client";
import { conciergeCopy } from "@/lib/concierge-copy";
import { zonedDate, type ConciergeDraft } from "@/lib/concierge";
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
  return service ? (
    <Drawer title={service.name} onClose={onClose}>
      <ServiceBookingForm slug={slug} service={service} />
    </Drawer>
  ) : null;
}
export function ServiceBookingForm({
  slug,
  service,
  transport = publicBookingTransport,
  prefill,
  onDraftChange,
  quoteLoader,
  submitLabel,
  refreshKey = 0,
  compact = false,
}: {
  slug: string;
  service: PublicService | undefined;
  transport?: BookingTransport;
  prefill?: BookingPrefill;
  onDraftChange?: (draft: ConciergeDraft) => void;
  quoteLoader?: (
    draft: ConciergeDraft,
  ) => Promise<{ totalCents: number; revision?: string } | null>;
  submitLabel?: string;
  refreshKey?: number;
  compact?: boolean;
}) {
  const { t, locale } = useI18n();
  const c = (key: Parameters<typeof serviceCopy>[1]) => serviceCopy(locale, key);
  const config = useMemo(() => readBookingConfig(service?.bookingConfig), [service?.bookingConfig]);
  const hasPrefill = prefill !== undefined;
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [quantity, setQuantity] = useState(prefill?.quantity ?? 1);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<BookingReceipt | null>(null);
  const [identity, setIdentity] = useState(() => ({
    requestId: crypto.randomUUID(),
    receiptToken: Array.from(crypto.getRandomValues(new Uint8Array(32)), (x) =>
      x.toString(16).padStart(2, "0"),
    ).join(""),
  }));
  const [optionId, setOptionId] = useState(prefill?.optionId ?? "");
  const [requestedFor, setRequestedFor] = useState("");
  const [details, setDetails] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(!service?.revision);
  const [day, setDay] = useState(prefill?.date ?? "");
  const [time, setTime] = useState(prefill?.time ?? "");
  const [serverQuote, setServerQuote] = useState<{
    key: string;
    totalCents: number;
    revision?: string;
  } | null>(null);
  const submitLock = useRef(false);
  const storageKey = `nona.${transport.mode === "demo" ? "demo." : ""}booking.${slug}.${service?.id}`;
  const quoteDraft: ConciergeDraft = {
    serviceId: service?.id,
    quantity,
    optionId: optionId || null,
    requestedFor: requestedFor
      ? config.slots.length
        ? requestedFor
        : new Date(requestedFor).toISOString()
      : null,
  };
  const changeRef = useRef(onDraftChange);
  changeRef.current = onDraftChange;
  const quoteKey = JSON.stringify(quoteDraft);
  useEffect(() => {
    changeRef.current?.({
      ...JSON.parse(quoteKey),
      ...(day ? { date: day } : {}),
      ...(time ? { time } : {}),
    });
  }, [quoteKey, day, time]);
  useEffect(() => {
    if (prefill?.quantity !== undefined) setQuantity(prefill.quantity);
    if (prefill?.optionId !== undefined) setOptionId(prefill.optionId ?? "");
    if (prefill?.date) setDay(prefill.date);
    if (prefill?.time) setTime(prefill.time);
    if (prefill?.requestedFor)
      setRequestedFor(
        config.slots.length ? prefill.requestedFor : prefill.requestedFor.slice(0, 16),
      );
  }, [
    prefill?.quantity,
    prefill?.optionId,
    prefill?.date,
    prefill?.time,
    prefill?.requestedFor,
    config.slots.length,
  ]);
  useEffect(() => {
    if (!hasPrefill || config.slots.length) return;
    setRequestedFor(day && time ? `${day}T${time}` : "");
  }, [day, time, hasPrefill, config.slots]);
  useEffect(() => {
    if (!hasPrefill || !config.slots.length || !day || !time) return;
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const slot = config.slots.find(
      (value) =>
        zonedDate(new Date(value), zone) === day &&
        new Intl.DateTimeFormat("en-GB", {
          timeZone: zone,
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(value)) === time,
    );
    setRequestedFor(slot ?? "");
  }, [day, time, hasPrefill, config.slots]);
  useEffect(() => {
    let active = true;
    setServerQuote(null);
    if (quoteLoader && !receipt)
      void quoteLoader(JSON.parse(quoteKey))
        .then((quote) => {
          if (active) setServerQuote(quote ? { ...quote, key: quoteKey } : null);
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [quoteKey, quoteLoader, receipt]);
  useEffect(() => {
    let active = true;
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null");
      if (
        saved &&
        /^[a-f0-9]{64}$/.test(saved.receiptToken) &&
        /^[a-f0-9-]{36}$/.test(saved.requestId)
      ) {
        setIdentity({ requestId: saved.requestId, receiptToken: saved.receiptToken });
        void transport
          .read({ requestId: saved.requestId, token: saved.receiptToken })
          .then((value) => {
            if (value && active) setReceipt(value);
          })
          .catch(() => {});
      }
    } catch {
      /* Persistence is optional, never an excuse to retry a payment. */
    }
    return () => {
      active = false;
    };
  }, [storageKey, transport]);
  useEffect(() => {
    if (!receipt?.id) return;
    const orderId = receipt.id;
    let active = true;
    const read = () => {
      if (document.visibilityState === "hidden") return;
      void transport
        .read({ orderId, token: identity.receiptToken })
        .then((next) => {
          if (active && next) setReceipt(next);
        })
        .catch(() => {});
    };
    read();
    const timer = setInterval(read, 15000);
    window.addEventListener("focus", read);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", read);
    };
  }, [receipt?.id, identity.receiptToken, transport, refreshKey]);
  const refresh = async () => {
    if (!receipt) return;
    try {
      const next = await transport.read({ orderId: receipt.id, token: identity.receiptToken });
      if (!next) throw new Error("unavailable");
      setReceipt(next);
      setError("");
    } catch {
      setError(t("message.failed"));
    }
  };

  const [error, setError] = useState("");
  if (!service) return null;
  const slots = config.slots.filter(
    (slot) =>
      Date.parse(slot) > Date.now() &&
      (!prefill ||
        !day ||
        zonedDate(new Date(slot), Intl.DateTimeFormat().resolvedOptions().timeZone) === day),
  );
  let totalCents: number | undefined;
  try {
    totalCents = serviceTotalCents(service.price, quantity, config, optionId || undefined);
  } catch {
    /* Incomplete selection cannot be sent. */
  }
  const validSlot = !config.slots.length || slots.includes(requestedFor);
  const quoteReady =
    !quoteLoader ||
    (!!serverQuote && serverQuote.key === quoteKey && serverQuote.revision === service.revision);
  if (quoteLoader) totalCents = quoteReady ? serverQuote!.totalCents : undefined;

  return (
    <div data-booking-form className="space-y-4">
      {receipt ? (
        <div className="space-y-4" role="status">
          <h3 className="font-semibold">{c("requestReceived")}</h3>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setReceipt(null);
              setIdentity({
                requestId: crypto.randomUUID(),
                receiptToken: Array.from(crypto.getRandomValues(new Uint8Array(32)), (x) =>
                  x.toString(16).padStart(2, "0"),
                ).join(""),
              });
              setError("");
              setName("");
              setContact("");
              setTermsAccepted(false);
              try {
                localStorage.removeItem(storageKey);
              } catch {
                /* Local storage can be disabled. */
              }
            }}
          >
            {c("newRequest")}
          </Button>
          <p>
            {c("reference")} : {receipt.id.slice(0, 8)}
          </p>
          <p>
            {c(
              (
                {
                  pending: "pending",
                  confirmed: "confirmed",
                  completed: "completed",
                  cancelled: "cancelled",
                } as const
              )[receipt.status as "pending"] ?? "pending",
            )}
          </p>
          <p>{Number(receipt.amount).toFixed(2)} €</p>
          <p>
            {receipt.paymentStatus === "paid"
              ? t("payments.success")
              : receipt.paymentStatus === "refunded"
                ? t("payments.refunded")
                : receipt.paymentStatus === "partially_refunded"
                  ? t("payments.partialRefund")
                  : receipt.paymentStatus === "failed"
                    ? t("payments.failed")
                    : receipt.paymentStatus === "expired"
                      ? c("expired")
                      : c("notPaid")}
          </p>
          {receipt.status === "cancelled" && receipt.paymentStatus === "paid" && (
            <p>{c("cancelNote")}</p>
          )}
          {receipt.status === "confirmed" &&
            receipt.paymentStatus &&
            ["pending", "expired"].includes(receipt.paymentStatus) &&
            (transport.mode === "demo" ? (
              <Button
                type="button"
                onClick={() => {
                  if (transport.simulatePayment)
                    void transport.simulatePayment(receipt.id).then(setReceipt);
                }}
              >
                {conciergeCopy(locale).demoPay}
              </Button>
            ) : (
              <a
                className="btn btn-primary w-full"
                href={`/pay/${identity.receiptToken}`}
                target={prefill ? "_blank" : undefined}
                rel={prefill ? "noreferrer" : undefined}
              >
                {t("payments.pay")}
              </a>
            ))}
          {error && <p role="alert">{error}</p>}
          <Button type="button" onClick={() => void refresh()}>
            {c("refresh")}
          </Button>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              submitLock.current ||
              busy ||
              totalCents === undefined ||
              !termsAccepted ||
              !validSlot ||
              !quoteReady
            )
              return;
            submitLock.current = true;
            setBusy(true);
            setError("");
            try {
              try {
                localStorage.setItem(
                  storageKey,
                  JSON.stringify({ ...identity, schema: "nona.booking-receipt.v1" }),
                );
              } catch {
                /* Keep the same in-memory request identity on retry. */
              }
              const result = {
                booking: await transport.submit({
                  slug,
                  serviceId: service.id,
                  revision: service.revision,
                  name,
                  contact,
                  quantity,
                  requestedFor: requestedFor
                    ? config.slots.length
                      ? requestedFor
                      : new Date(requestedFor).toISOString()
                    : null,
                  optionId: optionId || null,
                  details,
                  termsAccepted,
                  ...identity,
                  website: "",
                }),
              };
              setReceipt(result.booking);
              try {
                localStorage.setItem(
                  storageKey,
                  JSON.stringify({
                    ...result.booking,
                    ...identity,
                    schema: "nona.booking-receipt.v1",
                  }),
                );
              } catch {
                /* Sending still succeeds without local storage. */
              }
            } catch {
              setError(t("message.failed"));
            } finally {
              submitLock.current = false;
              setBusy(false);
            }
          }}
        >
          {service.imagePath && (
            <img src={service.imagePath} alt={service.name} className="w-full rounded-xl" />
          )}
          {compact && (
            <p>
              {quantity} · {day} {time} · {config.options.find((o) => o.id === optionId)?.label}
            </p>
          )}
          <p>{service.description}</p>
          <p className="rounded-xl bg-warning-soft p-3 text-sm">{c("notPaid")}</p>
          <details open={!compact}>
            <summary hidden={!compact}>
              {
                {
                  fr: "Détails, conditions et modifications",
                  en: "Details, terms and changes",
                  es: "Detalles, condiciones y cambios",
                  de: "Details, Bedingungen und Änderungen",
                  it: "Dettagli, condizioni e modifiche",
                  pt: "Detalhes, condições e alterações",
                }[locale]
              }
            </summary>
            {config.seller && <p className="whitespace-pre-line">{config.seller}</p>}
            {config.cancellation && <p className="whitespace-pre-line">{config.cancellation}</p>}
            {config.instructions && <p className="whitespace-pre-line">{config.instructions}</p>}
            {!!config.options.length && (
              <label className="block">
                {c("options")}
                <select
                  className="field"
                  required
                  value={optionId}
                  onChange={(e) => setOptionId(e.target.value)}
                >
                  <option value="">{c("choose")}</option>
                  {config.options.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label} (+{(option.priceCents / 100).toFixed(2)} €)
                    </option>
                  ))}
                </select>
              </label>
            )}
            {!!config.slots.length && prefill && (
              <label className="block">
                {conciergeCopy(locale).dateHint}
                <input
                  className="field"
                  type="date"
                  value={day}
                  onChange={(e) => {
                    setDay(e.target.value);
                    setRequestedFor("");
                  }}
                />
              </label>
            )}
            {!!config.slots.length && (
              <label className="block">
                {c("slots")}
                <select
                  className="field"
                  required
                  value={requestedFor}
                  onChange={(e) => setRequestedFor(e.target.value)}
                >
                  <option value="">{c("choose")}</option>
                  {slots.map((slot) => (
                    <option key={slot} value={slot}>
                      {new Intl.DateTimeFormat(locale, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(slot))}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {!config.slots.length && config.requestDate && prefill && (
              <div className="grid grid-cols-2 gap-3">
                <label>
                  {conciergeCopy(locale).dateHint}
                  <input
                    className="field"
                    type="date"
                    required
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                  />
                </label>
                <label>
                  {conciergeCopy(locale).timeHint}
                  <input
                    className="field"
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </label>
              </div>
            )}
            {!config.slots.length && config.requestDate && !prefill && (
              <label className="block">
                {c("date")}
                <input
                  className="field"
                  type="datetime-local"
                  required
                  value={requestedFor}
                  onChange={(e) => setRequestedFor(e.target.value)}
                />
              </label>
            )}
            <label className="block">
              {c("details")}
              <textarea
                className="field"
                maxLength={1000}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
            </label>
          </details>
          <Field
            label={compact && locale === "fr" ? "Ton nom" : t("form.name")}
            value={name}
            onChange={setName}
            required
          />
          <Field label={c("contactRequired")} required value={contact} onChange={setContact} />
          <label className="block" hidden={compact}>
            <span className="mb-1 block font-semibold">{t("form.quantity")}</span>
            <input
              className="field"
              type="number"
              min={1}
              max={config.maxQuantity}
              required
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </label>
          {quoteLoader && (
            <p>
              {transport.mode === "demo"
                ? conciergeCopy(locale).demoQuote
                : conciergeCopy(locale).quote}
            </p>
          )}
          <p className="text-xl font-bold">
            {t("order.total")} : {totalCents === undefined ? "—" : (totalCents / 100).toFixed(2)} €
          </p>
          {error && (
            <p role="alert" className="rounded-lg bg-warning-soft p-3">
              {error}
            </p>
          )}
          {service.revision && (
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                required
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />
              {config.seller || config.cancellation ? c("terms") : c("notPaid")}
            </label>
          )}
          <Button
            className="w-full"
            disabled={busy || totalCents === undefined || !termsAccepted || !validSlot}
          >
            {busy ? "…" : (submitLabel ?? t("order.send"))}
          </Button>
        </form>
      )}
    </div>
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
