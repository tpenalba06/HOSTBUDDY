import { useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { LocalConciergeTransport } from "@/lib/concierge-transport";
import { isNonaPrivatePreviewHost } from "@/lib/concierge-preview";
import { MessageCircle, Send, X, Wifi, KeyRound, MapPin, Coffee, LoaderCircle } from "lucide-react";
import type { PublicGuide } from "@/lib/data/public-guide.functions";
import { useI18n } from "@/lib/i18n";
import { conciergeCopy, conciergeWelcome } from "@/lib/concierge-copy";
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
import { NonaWordmark } from "@/components/shared/NonaBrand";
import { demoBookingTransport } from "@/components/demo/demo-bookings";
import { ServiceBookingForm } from "./GuestActions";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/shared/CopyButton";
import { uxCopy } from "@/lib/ux-copy";
import { LanguageSelect } from "@/components/i18n/LanguageSelect";
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
  places?: ConciergeTurn["places"];
  services?: ConciergeService[];
  choices?: ConciergeTurn["choices"];
};
export function NonaConcierge({
  guide,
  slug,
  demo: demoProp = false,
  onContact,
}: {
  guide: PublicGuide;
  slug?: string;
  demo?: boolean;
  onContact?: () => void;
}) {
  const localTransport = useContext(LocalConciergeTransport);
  const demo = demoProp || Boolean(localTransport);
  const { locale, t } = useI18n();
  const c = conciergeCopy(locale);
  const ux = uxCopy(locale);
  const panelId = useId();
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
  const hasMassage = available.some((service) =>
    /massage|masaje|massaggio|massagem/.test(normalize(`${service.name} ${service.description}`)),
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
  const [showHelp, setShowHelp] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const showShortcuts = showHelp;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const offeredServices = useRef("");
  const [bookingMessageId, setBookingMessageId] = useState<number | null>(null);
  const content = useRef<HTMLDivElement>(null);
  const [lastMode, setLastMode] = useState<ConciergeTurn["mode"]>("guided");
  const savedDrafts = useRef<ConciergeDraft[]>([]);
  const conversationId = useRef(crypto.randomUUID());
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
  const latestMessageId = messages.at(-1)?.id;
  useEffect(() => {
    if (!open || !content.current) return;
    const latest = content.current.querySelector<HTMLElement>("[data-message-id]:last-child");
    if (!latest) return;
    const box = content.current.getBoundingClientRect();
    const bubble = latest.getBoundingClientRect();
    // Short replies start at the top; tall ones end just above the composer so their
    // own quick-choice buttons stay readable without extra scrolling.
    content.current.scrollTop +=
      bubble.height >= box.height ? bubble.bottom - box.bottom + 16 : bubble.top - box.top - 16;
  }, [latestMessageId, open]);
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
        dialogueHistory: messagesRef.current
          .slice(-10)
          .map(({ role, text }) => ({ role, text: text.slice(0, 700) })),
        savedDrafts: savedDrafts.current,
        conversationId: conversationId.current,
        requestId: crypto.randomUUID(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        website: "",
      });
      if (localTransport) return localTransport(body);
      if (demo) {
        if (isNonaPrivatePreviewHost(window.location.hostname)) {
          try {
            const response = await fetch("/api/public/concierge-preview", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(body),
              cache: "no-store",
              signal: AbortSignal.timeout(16000),
            });
            if (response.ok) return (await response.json()) as ConciergeTurn;
          } catch {
            // No retry: a timed-out generation may already have been reserved.
          }
        }
        return validateConciergeTurn(body, guide, guidedProposal(body, guide));
      }
      const result = await fetch("/api/public/concierge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });
      if (!result.ok) throw new Error("unavailable");
      return (await result.json()) as ConciergeTurn;
    },
    [demo, guide, slug, locale, localTransport],
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
      ...(switching && next.serviceId !== service.id ? { optionId: null, requestedFor: null } : {}),
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
    if (value.serviceId)
      savedDrafts.current = [
        ...savedDrafts.current.filter((d) => d.serviceId !== value.serviceId),
        value,
      ].slice(-4);
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
    setShowHelp(
      /\b(?:aide|aider|help|ayuda|ayudar|hilfe|helfen|aiuto|aiutare|ajuda|ajudar)\b|(?:que|qu.est.ce que) (?:peux|sais).?tu faire|what can you (?:do|help)/.test(
        normalize(text),
      ),
    );
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      const pending = requestTurn(
        text,
        draft.current,
        messages
          .filter((m) => m.role === "user")
          .slice(-6)
          .map((m) => m.text),
      );
      const userId = ++messageId.current;
      setMessages((current) =>
        [...current, { id: userId, role: "user" as const, text }].slice(-24),
      );
      setMessage("");
      const turn = await pending;
      const assistantId = ++messageId.current;
      const signature = turn.services.map((service) => service.id).join(",");
      const freshServices = signature !== offeredServices.current ? turn.services : [];
      offeredServices.current = signature;
      setMessages((current) =>
        [
          ...current,
          {
            id: assistantId,
            role: "assistant" as const,
            text: turn.tracking && !selected ? c.emptyTracking : turn.text,
            facts: turn.facts,
            places: turn.places,
            services: freshServices,
            choices: turn.choices,
          },
        ].slice(-24),
      );
      if (draft.current.serviceId)
        savedDrafts.current = [
          ...savedDrafts.current.filter((d) => d.serviceId !== draft.current.serviceId),
          draft.current,
        ].slice(-4);
      persistSelection(turn.draft);
      setLastMode(turn.mode);
      if (turn.tracking) setRefreshKey((key) => key + 1);
      const onlyService = turn.services.length === 1 ? turn.services[0] : undefined;
      if (onlyService && (turn.nextStep === "ready" || selected?.id === onlyService.id)) {
        if (selected?.id !== onlyService.id || bookingMessageId === null)
          setBookingMessageId(assistantId);
        select(onlyService, turn.draft);
      } else if (onlyService && selected?.id !== onlyService.id) setSelected(null);
    } catch {
      setError(c.error);
    } finally {
      sending.current = false;
      setBusy(false);
    }
  };
  const bookingCard = selected && (
    <details
      className="nona-booking-card"
      aria-label={selected.name}
      open={bookingMessageId !== null && bookingMessageId === latestMessageId}
    >
      <summary>{selected.name}</summary>
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
        compact
      />
    </details>
  );
  const image = waving && !reducedMotion && nonaAssets.wave ? nonaAssets.wave : nonaAssets.portrait;
  return (
    <aside
      className="nona-concierge"
      data-demo={demo || undefined}
      data-local={Boolean(localTransport) || undefined}
    >
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
        aria-controls={`nona-chat-${panelId}`}
        onClick={() => {
          dismissInvitation();
          setOpen(!open);
        }}
      >
        {!open && !invited && (
          <span className="nona-launcher-caption" aria-hidden="true">
            {ux.askNona}
          </span>
        )}
        {image ? (
          <img src={image} alt="Nona" />
        ) : (
          <>
            <MessageCircle aria-hidden="true" />
            <span>Nona</span>
          </>
        )}
      </Button>
      <section
        id={`nona-chat-${panelId}`}
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
            <h2>
              <NonaWordmark />
            </h2>
            <p>
              {localTransport
                ? "Nona · IA locale"
                : demo
                  ? c.demo
                  : lastMode === "ai"
                    ? "Nona · IA"
                    : c.mode}
            </p>
          </div>
          <fieldset className="nona-language" disabled={busy}>
            <LanguageSelect compact />
          </fieldset>
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
        <div
          ref={content}
          className="nona-content"
          aria-live="polite"
          aria-relevant="additions text"
        >
          <div className="nona-content-inner">
            <div
              role="log"
              aria-live="polite"
              aria-relevant="additions text"
              className="nona-messages"
            >
              <ChatMessageView from="assistant" className="nona-bubble">
                <MessageContent>
                  <p className="nona-property">{guide.name}</p>
                  <p>
                    {conciergeWelcome(locale, guide.name, {
                      breakfast: hasBreakfast,
                      massage: hasMassage,
                    })}
                  </p>
                </MessageContent>
              </ChatMessageView>
              {bookingCard && !messages.some((item) => item.id === bookingMessageId) && bookingCard}
              {messages.map((item) => (
                <ChatMessageView
                  data-message-id={item.id}
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
                        {fact.copyValue && (
                          <CopyButton
                            value={fact.copyValue}
                            label={
                              {
                                fr: "Copier le mot de passe",
                                en: "Copy password",
                                es: "Copiar contraseña",
                                de: "Passwort kopieren",
                                it: "Copia password",
                                pt: "Copiar palavra-passe",
                              }[locale]
                            }
                          />
                        )}
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
                    {item.places?.map((place, index) => (
                      <article className="nona-service-card" key={index}>
                        {place.image && <img src={place.image} alt={place.title} loading="lazy" />}
                        <h3>{place.title}</h3>
                        <p>{place.text}</p>
                        <p>{place.address}</p>
                        {place.mapUrl && (
                          <a href={place.mapUrl} target="_blank" rel="noreferrer">
                            {
                              {
                                fr: "Itinéraire",
                                en: "Directions",
                                es: "Cómo llegar",
                                de: "Route",
                                it: "Indicazioni",
                                pt: "Como chegar",
                              }[locale]
                            }
                          </a>
                        )}
                      </article>
                    ))}
                    <div className="nona-services">
                      {item.services?.map((service) => (
                        <details key={service.id} className="nona-service-card">
                          <summary>
                            <span>{service.name}</span>
                            <span className="nona-service-price">
                              {new Intl.NumberFormat(locale, {
                                style: "currency",
                                currency: "EUR",
                              }).format(service.price)}
                              {" · "}
                              {service.pricingType === "per_person" ? c.person : c.unit}
                            </span>
                          </summary>
                          {service.imagePath && (
                            <img src={service.imagePath} alt={service.name} loading="lazy" />
                          )}
                          <p>{service.description}</p>
                          <p>
                            {new Intl.NumberFormat(locale, {
                              style: "currency",
                              currency: "EUR",
                            }).format(service.price)}{" "}
                            · {service.pricingType === "per_person" ? c.person : c.unit}
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            className="nona-select"
                            onClick={() => void send(service.name)}
                          >
                            {c.selected}
                          </Button>
                        </details>
                      ))}
                    </div>
                    {item.id === latestMessageId && Boolean(item.choices?.length) && (
                      <div className="nona-suggestions" aria-label={c.choose}>
                        {item.choices?.map((choice, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            disabled={busy}
                            onClick={() => void send(choice.message)}
                          >
                            {choice.label}
                          </Button>
                        ))}
                      </div>
                    )}
                    {item.id === bookingMessageId && bookingCard}
                  </MessageContent>
                </ChatMessageView>
              ))}
            </div>
            {busy && (
              <p className="nona-thinking" role="status">
                <LoaderCircle className="animate-spin" size={16} aria-hidden="true" />
                {t("common.loading")}
              </p>
            )}
            {!showShortcuts && messages.length === 0 && (
              <Button
                type="button"
                variant="outline"
                className="nona-help-discover"
                onClick={() => setShowHelp(true)}
              >
                {ux.helpIdeas}
              </Button>
            )}
            {showShortcuts && (
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
            )}
            {showShortcuts && available.length > 0 && (
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
            {error && <p role="alert">{error}</p>}
            {showShortcuts && onContact && (
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
          </div>
        </div>
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
