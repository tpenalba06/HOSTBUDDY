import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
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
  const image = waving && nonaAssets.wave ? nonaAssets.wave : nonaAssets.portrait;
  return (
    <aside className="nona-concierge" data-demo={demo || undefined}>
      <Button
        ref={launcher}
        type="button"
        variant="outline"
        className="nona-launcher"
        aria-label={c.open}
        aria-expanded={open}
        aria-controls={`nona-chat-${guide.id}`}
        onClick={() => {
          setOpen(!open);
          if (!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) setWaving(true);
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
                  <MessageResponse>{c.welcome}</MessageResponse>
                </MessageContent>
              </ChatMessageView>
              {messages.map((item) => (
                <div
                  key={item.id}
                  className={`nona-bubble ${item.role === "user" ? "nona-user" : ""}`}
                >
                  <p>{item.text}</p>
                  {item.facts?.map((fact, index) => (
                    <blockquote key={index}>
                      <strong>{fact.title}</strong>
                      {fact.original && <small>{c.original}</small>}
                      <p>{fact.text}</p>
                    </blockquote>
                  ))}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              className="nona-quick"
              disabled={busy}
              onClick={() => void send(c.services)}
            >
              {c.services}
            </Button>
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
                <span className="sr-only">{t("common.loading")}</span>
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
