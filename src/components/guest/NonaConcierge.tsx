import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Send, X, Wifi, KeyRound, MapPin, Coffee, LoaderCircle } from "lucide-react";
import type { PublicGuide } from "@/lib/data/public-guide.functions";
import { useI18n } from "@/lib/i18n";
import { conciergeCopy } from "@/lib/concierge-copy";
import {
  conciergeRequestSchema,
  conciergeDraftSchema,
  guidedProposal,
  validateConciergeTurn,
  type ConciergeDraft,
  type ConciergeTurn,
  type ConciergeService,
} from "@/lib/concierge";
import { readBookingConfig } from "@/lib/service-booking";
import { nonaAssets } from "@/lib/nona-assets";
import { demoBookingTransport } from "@/components/demo/demo-bookings";
import { ServiceBookingForm } from "./GuestActions";
import { Button } from "@/components/ui/button";
import { Conversation, ConversationContent } from "@/components/ai-elements/conversation";
import {
  Message as ChatMessageView,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import "./nona-concierge.css";
type Message = {
  id: number;
  role: "user" | "assistant";
  text: string;
  facts?: ConciergeTurn["facts"];
};
export function NonaConcierge({
  guide,
  slug,
  demo = false,
  onContact,
}: {
  guide: PublicGuide;
  slug?: string;
  demo?: boolean;
  onContact?: () => void;
}) {
  const { locale, t } = useI18n();
  const c = conciergeCopy(locale);
  const [open, setOpen] = useState(false);
  const [waving, setWaving] = useState(false);
  const [invited, setInvited] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const invitationUsed = useRef(false);
  const invitationStartedAt = useRef<number | null>(null);
  const invitationKey = `nona.invitation.${demo ? "demo" : "guest"}.${guide.id}`;
  const dismissInvitation = () => {
    invitationUsed.current = true;
    setInvited(false);
    setWaving(false);
    try {
      sessionStorage.setItem(invitationKey, "seen");
    } catch {
      /* Optional session marker, no personal data. */
    }
  };
  useEffect(() => {
    const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReducedMotion(motion?.matches ?? false);
      if (motion?.matches) setWaving(false);
    };
    update();
    motion?.addEventListener?.("change", update);
    return () => motion?.removeEventListener?.("change", update);
  }, []);
  useEffect(() => {
    try {
      if (sessionStorage.getItem(invitationKey) && invitationStartedAt.current === null) return;
    } catch {
      /* In-memory fallback. */
    }
    if (invitationUsed.current || open) return;
    // Reserve this guide's only invitation even when a short visit ends before the timer.
    invitationStartedAt.current ??= Date.now();
    try {
      sessionStorage.setItem(invitationKey, "seen");
    } catch {
      /* Optional. */
    }
    const show = setTimeout(
      () => {
        if (document.visibilityState === "hidden") return;
        setInvited(true);
        setWaving(
          Boolean(nonaAssets.wave) &&
            !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
        );
      },
      Math.max(0, 3000 - (Date.now() - invitationStartedAt.current)),
    );
    const hide = setTimeout(
      () => {
        setInvited(false);
        setWaving(false);
        invitationUsed.current = true;
      },
      Math.max(0, 10000 - (Date.now() - invitationStartedAt.current)),
    );
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [invitationKey, open]);
  const available = (guide.services ?? []).filter((service) => {
    const slots = readBookingConfig(service.bookingConfig).slots;
    return !slots.length || slots.some((slot) => Date.parse(slot) > Date.now());
  });
  const normalize = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const hasBreakfast = available.some((service) =>
    /petit.?dejeuner|breakfast|desayuno|fruhstuck|colazione|pequeno.?almoco/.test(
      normalize(`${service.name} ${service.description}`),
    ),
  );
  const hasSection = (key: string) =>
    guide.sections.some((section) => section.key.split("-")[0] === key);
  const suggestions = [
    ...(hasSection("wifi") ? [{ label: c.wifi, query: "Wi-Fi", icon: Wifi }] : []),
    ...(hasSection("arrival") ? [{ label: c.arrival, query: c.arrival, icon: KeyRound }] : []),
    ...(hasSection("places") ? [{ label: c.places, query: "restaurant", icon: MapPin }] : []),
    ...(hasBreakfast ? [{ label: c.breakfast, query: c.breakfast, icon: Coffee }] : []),
  ];
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [services, setServices] = useState<ConciergeService[]>([]);
  const [selected, setSelected] = useState<ConciergeService | null>(null);
  const [prefill, setPrefill] = useState<ConciergeDraft>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [restored, setRestored] = useState(false);
  const draft = useRef<ConciergeDraft>({});
  const sending = useRef(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const messageId = useRef(0);
  const conversationKey = `nona.concierge.selection.${demo ? "demo" : slug}.${guide.id}`;
  const demoTransport = useMemo(
    () => (demo ? demoBookingTransport(guide) : undefined),
    [demo, guide],
  );
  const requestTurn = useCallback(
    async (text: string, current: ConciergeDraft, history: string[] = []) => {
      const body = conciergeRequestSchema.parse({
        slug: slug ?? "villa-mare-demo",
        locale,
        message: text,
        draft: current,
        history,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        website: "",
      });
      if (demo) return validateConciergeTurn(body, guide, guidedProposal(body, guide));
      const result = await fetch("/api/public/concierge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });
      if (!result.ok) throw new Error("unavailable");
      return (await result.json()) as ConciergeTurn;
    },
    [demo, guide, slug, locale],
  );
  const quoteLoader = useCallback(
    async (current: ConciergeDraft) => (await requestTurn("", current)).quote,
    [requestTurn],
  );
  const close = () => {
    setOpen(false);
    launcher.current?.focus();
  };
  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);
  useEffect(() => {
    if (!waving) return;
    const timer = setTimeout(() => setWaving(false), 2000);
    return () => clearTimeout(timer);
  }, [waving]);
  const select = (service: ConciergeService, next: ConciergeDraft = draft.current) => {
    const switching = draft.current.serviceId !== service.id;
    const values = {
      ...next,
      serviceId: service.id,
      ...(switching ? { optionId: null, requestedFor: null } : {}),
    };
    draft.current = values;
    setPrefill(values);
    setSelected(service);
  };
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(conversationKey) ?? "null");
      const parsed = conciergeDraftSchema.safeParse(saved?.draft);
      const service = parsed.success
        ? guide.services?.find((item) => item.id === parsed.data.serviceId)
        : undefined;
      if (parsed.success && service) {
        draft.current = parsed.data;
        setPrefill(parsed.data);
        setSelected(service);
        setOpen(saved.open === true);
      }
    } catch {
      /* In-memory conversation remains usable without storage. */
    }
    setRestored(true);
  }, [conversationKey, guide.services]);
  const persistSelection = (value: ConciergeDraft) => {
    draft.current = value;
    try {
      sessionStorage.setItem(conversationKey, JSON.stringify({ draft: value, open }));
    } catch {
      /* No transcripts, names or receipt tokens are persisted here. */
    }
  };
  useEffect(() => {
    if (!restored) return;
    try {
      sessionStorage.setItem(conversationKey, JSON.stringify({ draft: draft.current, open }));
    } catch {
      /* Optional persistence only. */
    }
  }, [conversationKey, open, restored]);
  const send = async (text: string) => {
    if (sending.current || !text.trim() || (!demo && !slug)) return;
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      const turn = await requestTurn(
        text,
        draft.current,
        messages
          .filter((m) => m.role === "user")
          .slice(-6)
          .map((m) => m.text),
      );
      setMessages((current) =>
        [
          ...current,
          { id: ++messageId.current, role: "user" as const, text },
          {
            id: ++messageId.current,
            role: "assistant" as const,
            text: turn.tracking && !selected ? c.emptyTracking : turn.text,
            facts: turn.facts,
          },
        ].slice(-12),
      );
      draft.current = turn.draft;
      setServices(turn.services);
      if (turn.tracking) setRefreshKey((key) => key + 1);
      const onlyService = turn.services.length === 1 ? turn.services[0] : undefined;
      if (onlyService) select(onlyService, turn.draft);
      setMessage("");
    } catch {
      setError(c.error);
    } finally {
      sending.current = false;
      setBusy(false);
    }
  };
  const image = waving && !reducedMotion && nonaAssets.wave ? nonaAssets.wave : nonaAssets.portrait;
  return (
    <aside className="nona-concierge" data-demo={demo || undefined}>
      {invited && !open && (
        <div className="nona-invitation" role="status">
          <Button
            variant="ghost"
            className="nona-invitation-open"
            onClick={() => {
              dismissInvitation();
              setOpen(true);
            }}
          >
            {c.invite}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={c.dismissInvite}
            title={c.dismissInvite}
            onClick={dismissInvitation}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      )}
      <Button
        ref={launcher}
        type="button"
        variant="outline"
        className="nona-launcher"
        aria-label={c.open}
        aria-expanded={open}
        aria-controls={`nona-chat-${guide.id}`}
        onClick={() => {
          dismissInvitation();
          setOpen(!open);
        }}
      >
        {image ? (
          <img src={image} alt="Nona" />
        ) : (
          <>
            <MessageCircle size={21} aria-hidden="true" />
            <span>Nona</span>
          </>
        )}
      </Button>
      <section
        id={`nona-chat-${guide.id}`}
        role="dialog"
        aria-modal="false"
        aria-label={c.title}
        className="nona-panel"
        hidden={!open}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            close();
          }
        }}
      >
        <header className="nona-header">
          {nonaAssets.portrait && (
            <img className="nona-header-portrait" src={nonaAssets.portrait} alt="Nona" />
          )}
          <div>
            <h2>{c.title}</h2>
            <p>{demo ? c.demo : c.mode}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            type="button"
            aria-label={c.close}
            title={c.close}
            onClick={close}
          >
            <X size={22} />
          </Button>
        </header>
        <Conversation
          className="nona-content"
          aria-live="polite"
          aria-relevant="additions text"
          initial="instant"
          resize="instant"
        >
          <ConversationContent className="nona-content-inner">
            <div
              role="log"
              aria-live="polite"
              aria-relevant="additions text"
              className="nona-messages"
            >
              <ChatMessageView from="assistant" className="nona-bubble">
                <MessageContent>
                  <p className="nona-property">{guide.name}</p>
                  <p>{c.greeting.replace("{property}", guide.name)}</p>
                  <MessageResponse>{c.welcome}</MessageResponse>
                </MessageContent>
              </ChatMessageView>
              {messages.map((item) => (
                <ChatMessageView
                  from={item.role}
                  key={item.id}
                  className={`nona-bubble ${item.role === "user" ? "nona-user" : ""}`}
                >
                  <MessageContent>
                    {item.role === "assistant" ? (
                      <MessageResponse>{item.text}</MessageResponse>
                    ) : (
                      <p>{item.text}</p>
                    )}
                    {item.facts?.map((fact, index) => (
                      <blockquote key={index}>
                        <strong>{fact.title}</strong>
                        {fact.original && <small>{c.original}</small>}
                        {fact.text.length > 500 ? (
                          <>
                            <p>
                              {fact.text.slice(0, Math.max(fact.text.lastIndexOf("\n", 500), 300))}…
                            </p>
                            <details>
                              <summary>{c.more}</summary>
                              <p>{fact.text}</p>
                            </details>
                          </>
                        ) : (
                          <p>{fact.text}</p>
                        )}
                      </blockquote>
                    ))}
                  </MessageContent>
                </ChatMessageView>
              ))}
            </div>
            <div className="nona-suggestions">
              {suggestions.map(({ label, query, icon: Icon }) => (
                <Button
                  key={label}
                  variant="outline"
                  disabled={busy}
                  onClick={() => void send(query)}
                >
                  <Icon aria-hidden="true" />
                  {label}
                </Button>
              ))}
            </div>
            {available.length > 0 && (
              <Button
                type="button"
                variant="outline"
                className="nona-quick"
                disabled={busy}
                onClick={() => void send(c.services)}
              >
                {c.services}
              </Button>
            )}
            <div className="nona-services">
              {services.map((service) => (
                <article key={service.id} className="nona-service-card">
                  {service.imagePath && (
                    <img src={service.imagePath} alt={service.name} loading="lazy" />
                  )}
                  <h3>{service.name}</h3>
                  <p>{service.description}</p>
                  <p>
                    {new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(
                      service.price,
                    )}{" "}
                    · {service.pricingType === "per_person" ? c.person : c.unit}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="nona-select"
                    onClick={() => select(service)}
                  >
                    {c.selected}
                  </Button>
                </article>
              ))}
            </div>
            {selected && (
              <article className="nona-booking-card" aria-label={selected.name}>
                <h3>{selected.name}</h3>
                <ServiceBookingForm
                  key={selected.id}
                  slug={slug ?? "villa-mare-demo"}
                  service={selected}
                  prefill={prefill}
                  onDraftChange={persistSelection}
                  {...(demoTransport ? { transport: demoTransport } : {})}
                  quoteLoader={quoteLoader}
                  submitLabel={c.confirm}
                  refreshKey={refreshKey}
                />
              </article>
            )}
            {error && <p role="alert">{error}</p>}
            {onContact && (
              <Button
                type="button"
                variant="outline"
                className="nona-quick"
                onClick={() => {
                  close();
                  onContact();
                }}
              >
                {c.contact}
              </Button>
            )}
          </ConversationContent>
        </Conversation>
        <PromptInput className="nona-composer" onSubmit={() => send(message)} maxFiles={0}>
          <PromptInputTextarea
            ref={input}
            aria-label={c.placeholder}
            placeholder={c.placeholder}
            maxLength={1200}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
          <PromptInputFooter className="nona-composer-footer">
            <PromptInputSubmit
              aria-label={c.send}
              title={c.send}
              status={busy ? "submitted" : "ready"}
              disabled={busy || !message.trim()}
            >
              {busy ? (
                <>
                  <LoaderCircle className="animate-spin" aria-hidden="true" />
                  <span className="sr-only">{t("common.loading")}</span>
                </>
              ) : (
                <Send size={20} aria-hidden="true" />
              )}
            </PromptInputSubmit>
          </PromptInputFooter>
        </PromptInput>
      </section>
    </aside>
  );
}
