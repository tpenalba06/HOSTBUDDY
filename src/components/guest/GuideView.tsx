import { useEffect, useRef, useState, lazy, Suspense, type ReactNode } from "react";
const NonaConcierge = lazy(() =>
  import("./NonaConcierge").then((module) => ({ default: module.NonaConcierge })),
);
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Mail,
  Luggage,
  Wifi,
  Bookmark,
  Check,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Search,
  Star,
} from "lucide-react";
import { LanguageSelect } from "@/components/i18n/LanguageSelect";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import type { PublicSection } from "@/lib/data/public-guide.functions";
import {
  ArrivalTemplate,
  ContactButtons,
  DepartureTemplate,
  GenericTemplate,
  HouseTemplate,
  SectionMedia,
  ServiceList,
  WifiTemplate,
} from "./GuideContent";
import {
  cleanTitle,
  guideCover,
  localizedSections,
  safeWebUrl,
  sectionEntries,
  sectionKind,
  type GuideEntry,
  type GuideViewData,
} from "./guide-model";

import { homeSections } from "./visual-library";
import { PresentationVideo } from "./PresentationVideo";
import { resolvePropertyMedia } from "./property-media";
import { PropertyMediaGallery } from "./PropertyMediaGallery";
import { NonaWordmark } from "@/components/shared/NonaBrand";
import { nonaVisualCopy } from "@/lib/nona-visual-copy";
import { uxCopy } from "@/lib/ux-copy";

type GuideScrollPosition = {
  container: HTMLElement | null;
  top: number;
  left: number;
  trigger: HTMLElement | null;
  triggerKey: string | null;
};

// Embedded guides own their scroll area: navigating them must not move the host page.
function guideScrollContainer(element: HTMLElement | null): HTMLElement | null {
  for (let parent = element?.parentElement; parent; parent = parent.parentElement) {
    if (parent === document.body || parent === document.documentElement) continue;
    // Explicit embedded areas stay authoritative even when a short section fits.
    if (parent.matches("[data-nona-scroll-area], .guide-editor-phone")) return parent;
    if (
      /(auto|scroll)/.test(getComputedStyle(parent).overflowY) &&
      parent.scrollHeight > parent.clientHeight + 1
    )
      return parent;
  }
  return null;
}

function rememberGuidePosition(element: HTMLElement | null): GuideScrollPosition {
  const container = guideScrollContainer(element);
  return {
    container,
    top: container ? container.scrollTop : window.scrollY,
    left: container ? container.scrollLeft : window.scrollX,
    trigger: document.activeElement instanceof HTMLElement ? document.activeElement : null,
    triggerKey: document.activeElement?.getAttribute("data-guide-target") ?? null,
  };
}

function restoreGuidePosition(position: GuideScrollPosition | null, root: HTMLElement | null) {
  if (!position) return;
  (position.container ?? window).scrollTo({
    top: position.top,
    left: position.left,
    behavior: "instant",
  });
  const trigger = position.trigger?.isConnected
    ? position.trigger
    : Array.from(root?.querySelectorAll<HTMLElement>("[data-guide-target]") ?? []).find(
        (element) => element.getAttribute("data-guide-target") === position.triggerKey,
      );
  (trigger ?? root?.querySelector<HTMLElement>("h1"))?.focus({ preventScroll: true });
}

function focusGuideStart(element: HTMLElement | null) {
  if (!element) return;
  const container = guideScrollContainer(element);
  const top =
    element.getBoundingClientRect().top +
    (container
      ? container.scrollTop - container.getBoundingClientRect().top - container.clientTop
      : window.scrollY);
  (container ?? window).scrollTo({ top, behavior: "instant" });
  element.querySelector<HTMLElement>("h1")?.focus({ preventScroll: true });
}

const sectionTone = (key: string) => {
  const kind = sectionKind(key);
  return kind === "wifi"
    ? "sea"
    : kind === "places"
      ? "taupe"
      : kind === "activities"
        ? "sea"
        : "sage";
};

/** One presentation for public guides, authenticated previews and isolated demo adapters. */
export function GuideView({
  guide,
  sectionKey,
  onSectionChange,
  onRequest,
  onMessage,
  onFeedback,
  offlineAction,
  conciergeSlug,
  displayName,
}: {
  guide: GuideViewData;
  sectionKey?: string | null;
  onSectionChange?: (key: string | null) => void;
  onRequest?: (id: string) => void;
  onMessage?: () => void;
  onFeedback?: () => void;
  offlineAction?: ReactNode;
  conciergeSlug?: string;
  displayName?: string;
}) {
  const { locale, t } = useI18n();
  const visual = nonaVisualCopy(locale);
  const ux = uxCopy(locale);
  const [heroIndex, setHeroIndex] = useState(0);
  const [localKey, setLocalKey] = useState<string | null>(null);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [entryCategory, setEntryCategory] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const listScroll = useRef<GuideScrollPosition | null>(null);
  const indexScroll = useRef<GuideScrollPosition | null>(null);
  const navigationIntent = useRef<"start" | "index" | "list" | null>(null);
  const sections = localizedSections(guide, locale, t);
  const hasPropertyPhotos =
    guide.sections.some(
      (section) =>
        sectionKind(section.key) === "welcome" &&
        section.media?.some((item) => item.type === "image" && item.url),
    ) || !!guide.coverUrl;
  const hasPropertyGallery = sections.some(
    (section) =>
      sectionKind(section.key) === "welcome" &&
      (section.media?.filter((item) => item.type === "image" && item.url).length ?? 0) > 1,
  );
  const open = sections.find(
    (item) => item.key === (sectionKey === undefined ? localKey : sectionKey),
  );
  const cover = guideCover(guide);
  if (guide.services?.length && !sections.some((item) => sectionKind(item.key) === "services"))
    sections.push({
      id: "service-catalog",
      key: "services",
      title: t("section.services"),
      icon: "✨",
      content: { items: [] },
    });
  // The manager's order is authoritative; quick shortcuts provide access to essentials
  // without silently rearranging the guide or hiding reordered cards in another group.
  const { services: serviceSection, main, extra } = homeSections(sections);
  const photos = [
    ...new Set(
      [cover, ...resolvePropertyMedia(sections).gallery.map((photo) => photo.url)].filter(
        (url): url is string => !!url,
      ),
    ),
  ];
  const activePhoto = photos[heroIndex % photos.length] ?? cover;
  const address = guide.sections
    .flatMap((section) => section.content.items ?? [])
    .find((item) =>
      /^(adresse|address|dirección|anschrift|indirizzo|morada)$/i.test(item.label.trim()),
    )?.text;
  const contact = sections.find((item) => sectionKind(item.key) === "contact");
  const go = (key: string | null) => {
    if (key && !open) indexScroll.current = rememberGuidePosition(topRef.current);
    navigationIntent.current = key === null && open ? "index" : "start";
    setLocalKey(key);
    onSectionChange?.(key);
    setEntryId(null);
    setEntryCategory(null);
    setCopied(false);
    setMenu(false);
  };
  useEffect(() => {
    const intent = navigationIntent.current;
    if (!intent) return;
    const frame = requestAnimationFrame(() => {
      if (intent === "index" && indexScroll.current)
        restoreGuidePosition(indexScroll.current, topRef.current);
      else if (intent === "list") restoreGuidePosition(listScroll.current, topRef.current);
      else focusGuideStart(topRef.current);
      navigationIntent.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [open?.key, entryId]);
  const selectEntry = (id: string | null) => {
    if (id) {
      listScroll.current = rememberGuidePosition(topRef.current);
      navigationIntent.current = "start";
      setEntryId(id);
    } else {
      navigationIntent.current = "list";
      setEntryId(null);
    }
  };
  const toggleMenu = () => {
    setQuery("");
    setMenu(true);
  };
  const navigation = (
    <>
      <button
        className={open ? "hb-icon-button nona-guest-back" : "hb-icon-button"}
        onClick={open ? () => go(null) : toggleMenu}
        aria-label={open ? t("guest.back") : t("guide.menu")}
      >
        {open ? <ArrowLeft size={20} /> : <Menu size={20} />}
        {open && <span>{t("common.back")}</span>}
      </button>
      <div className="hb-top-actions">
        <button className="hb-icon-button" onClick={toggleMenu} aria-label={t("guide.search")}>
          <Search size={19} />
        </button>
        <LanguageSelect compact />
      </div>
    </>
  );
  const entries = open ? sectionEntries(open) : [];
  const selected = entries.find((item) => item.id === entryId);
  const matchingSections = sections.filter((section) =>
    `${section.title} ${(section.content.items ?? []).map((item) => `${item.label} ${item.text}`).join(" ")} ${sectionEntries(
      section,
    )
      .map((entry) => `${entry.title} ${entry.text}`)
      .join(" ")}`
      .toLocaleLowerCase(locale)
      .includes(query.trim().toLocaleLowerCase(locale)),
  );
  return (
    <div className="hb-guide" ref={topRef}>
      {open ? (
        <>
          {!selected && <header className="hb-guide-header">{navigation}</header>}
          {selected ? (
            <EntryDetail
              section={open}
              entry={selected}
              location={guide.subtitle}
              onBack={() => selectEntry(null)}
            />
          ) : (
            <div className="hb-guide-body hb-section-page">
              <div className="hb-list-heading">
                <h1 className="hb-page-title" tabIndex={-1}>
                  {cleanTitle(open.title)}
                </h1>
                <button
                  className="hb-icon-button"
                  onClick={toggleMenu}
                  aria-label={t("guide.search")}
                >
                  <Search size={20} />
                </button>
              </div>
              <div className="hb-section-content">
                {sectionKind(open.key) === "places" || sectionKind(open.key) === "activities" ? (
                  <EntryList
                    key={open.key}
                    entries={entries}
                    section={open}
                    onSelect={selectEntry}
                    category={entryCategory}
                    onCategoryChange={setEntryCategory}
                  />
                ) : (
                  <div
                    className={
                      open.media?.length &&
                      ["wifi", "arrival", "departure", "house", "rules", "amenities"].includes(
                        sectionKind(open.key),
                      )
                        ? "hb-section-detail-layout"
                        : undefined
                    }
                  >
                    <SectionMedia
                      section={open}
                      wide={
                        !["wifi", "arrival", "departure", "house", "rules", "amenities"].includes(
                          sectionKind(open.key),
                        )
                      }
                    />
                    <div className="hb-section-information">
                      {sectionKind(open.key) === "wifi" ? (
                        <WifiTemplate
                          items={open.content.items ?? []}
                          t={t}
                          copied={copied}
                          onCopy={() => setCopied(true)}
                        />
                      ) : sectionKind(open.key) === "arrival" ? (
                        <ArrivalTemplate items={open.content.items ?? []} contact={contact} t={t} />
                      ) : ["house", "rules", "amenities"].includes(sectionKind(open.key)) ? (
                        <HouseTemplate items={open.content.items ?? []} />
                      ) : sectionKind(open.key) === "departure" ? (
                        <DepartureTemplate
                          items={open.content.items ?? []}
                          onFeedback={onFeedback}
                          t={t}
                        />
                      ) : sectionKind(open.key) === "services" ? (
                        <>
                          <GenericTemplate items={open.content.items ?? []} />
                          <ServiceList
                            services={guide.services ?? []}
                            onRequest={onRequest}
                            t={t}
                          />
                        </>
                      ) : (
                        <GenericTemplate items={open.content.items ?? []} />
                      )}
                      {sectionKind(open.key) === "contact" && (
                        <ContactButtons section={open} t={t} />
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="hb-quick-contact">
                {contact?.content.phones?.[0] && (
                  <a
                    className="hb-button hb-button-light"
                    href={`tel:${contact.content.phones[0]}`}
                  >
                    <Phone size={16} />
                    {t("guest.call")}
                  </a>
                )}
                {guide.messagingEnabled && onMessage && (
                  <button className="hb-button hb-button-light" onClick={onMessage}>
                    <MessageCircle size={16} />
                    {t("guest.sendMessage")}
                  </button>
                )}
                {address && (
                  <a
                    className="hb-button hb-button-light"
                    target="_blank"
                    rel="noreferrer"
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`}
                  >
                    <MapPin size={16} />
                    {t("guest.route")}
                  </a>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <header className="nona-guide-topbar">
            <button className="nona-brand-home" onClick={() => go(null)} aria-label="NONA">
              <NonaWordmark />
            </button>
            <nav className="nona-guide-navigation" aria-label={guide.name}>
              <button aria-current="page" onClick={() => go(null)}>
                {visual.home}
              </button>
              {serviceSection && (
                <button onClick={() => go(serviceSection.key)}>{visual.services}</button>
              )}
              {sections.some((section) => sectionKind(section.key) === "places") && (
                <button
                  onClick={() =>
                    go(sections.find((section) => sectionKind(section.key) === "places")!.key)
                  }
                >
                  {visual.nearby}
                </button>
              )}
            </nav>
            <div className="nona-guide-top-actions">
              {(contact || (guide.messagingEnabled && onMessage)) && (
                <button
                  className="nona-contact-button"
                  onClick={() => (contact ? go(contact.key) : onMessage?.())}
                >
                  <Mail size={18} />
                  {visual.contact}
                </button>
              )}
              <button
                className="hb-icon-button nona-mobile-menu"
                onClick={toggleMenu}
                aria-label={t("guide.menu")}
              >
                <Menu size={25} />
              </button>
            </div>
          </header>
          <div className="nona-property-layout">
            <section className="nona-property-intro">
              <div className="nona-property-heading">
                <h1 tabIndex={-1}>{displayName ?? guide.name}</h1>
                {(guide.subtitle || address) && (
                  <p>
                    <MapPin size={17} />
                    {guide.subtitle || address}
                  </p>
                )}
              </div>
              {sections.some((section) =>
                ["arrival", "wifi", "places"].includes(sectionKind(section.key)),
              ) && (
                <nav className="nona-guest-shortcuts" aria-label={ux.quickAccess}>
                  {["arrival", "wifi", "places"].flatMap((kind) => {
                    const section = sections.find(
                      (candidate) => sectionKind(candidate.key) === kind,
                    );
                    if (!section) return [];
                    const Icon =
                      kind === "arrival" ? CalendarDays : kind === "wifi" ? Wifi : MapPin;
                    return [
                      <button
                        key={section.key}
                        data-guide-target={`shortcut:${section.key}`}
                        onClick={() => go(section.key)}
                      >
                        <Icon size={17} aria-hidden="true" />
                        {cleanTitle(section.title)}
                      </button>,
                    ];
                  })}
                </nav>
              )}
              <div className="nona-property-visual">
                <section
                  className={`hb-cover nona-property-cover ${cover ? "hb-cover-photo" : "hb-cover-empty"}`}
                >
                  {activePhoto && (
                    <img
                      src={activePhoto}
                      alt={hasPropertyPhotos ? guide.name : t("media.ambience")}
                      className="hb-cover-image"
                      fetchPriority="high"
                    />
                  )}
                  {!hasPropertyPhotos && <p className="hb-ambience-label">{t("media.ambience")}</p>}
                  {photos.length > 1 && (
                    <button
                      className="nona-photo-button"
                      onClick={() => setHeroIndex((index) => (index + 1) % photos.length)}
                      aria-label={visual.next}
                    >
                      <ImageIcon size={16} />
                      {visual.photos}
                      <span className="sr-only">
                        {" "}
                        {(heroIndex % photos.length) + 1}/{photos.length}
                      </span>
                    </button>
                  )}
                </section>
                {photos.length > 1 && (
                  <div className="nona-photo-navigation" aria-label={visual.photos}>
                    <button
                      className="nona-gallery-arrow"
                      onClick={() =>
                        setHeroIndex((index) => (index + photos.length - 1) % photos.length)
                      }
                      aria-label={visual.previous}
                    >
                      <ChevronLeft />
                    </button>
                    <div className="nona-photo-thumbnails">
                      {photos.map((photo, index) => (
                        <button
                          key={photo}
                          aria-label={`${visual.photos} ${index + 1}`}
                          aria-pressed={heroIndex % photos.length === index}
                          onClick={() => setHeroIndex(index)}
                        >
                          <img src={photo} alt="" loading="lazy" />
                        </button>
                      ))}
                    </div>
                    <button
                      className="nona-gallery-arrow"
                      onClick={() => setHeroIndex((index) => (index + 1) % photos.length)}
                      aria-label={visual.next}
                    >
                      <ChevronRight />
                    </button>
                  </div>
                )}
              </div>
            </section>
            <div className="hb-guide-body hb-index">
              <div className="hb-index-content">
                <PresentationVideo video={resolvePropertyMedia(sections).video} />
                <div className="hb-index-heading">
                  <h2>{guide.name}</h2>
                  <button
                    className="hb-icon-button"
                    onClick={toggleMenu}
                    aria-label={t("guide.search")}
                  >
                    <Search size={20} />
                  </button>
                </div>
                <div className="hb-section-grid">
                  {main.map((section) => (
                    <SectionCard
                      key={section.key}
                      section={section}
                      onClick={() => go(section.key)}
                    />
                  ))}
                </div>
                {serviceSection && (
                  <section className="nona-home-services" aria-label={t("section.services")}>
                    <div className="nona-services-heading">
                      <h2>{visual.additionalServices}</h2>
                      <button onClick={() => go(serviceSection.key)}>
                        {visual.all}
                        <ChevronRight size={16} />
                      </button>
                    </div>
                    {(guide.services?.length ?? 0) > 0 ? (
                      <ServiceList
                        services={guide.services ?? []}
                        onRequest={onRequest}
                        t={t}
                        rail
                        discovery
                        onDiscover={() => go(serviceSection.key)}
                        actionLabel={visual.discover}
                      />
                    ) : (
                      <button className="hb-button" onClick={() => go(serviceSection.key)}>
                        {t("guide.servicesExplore")}
                        <ArrowRight size={17} />
                      </button>
                    )}
                  </section>
                )}
                {extra.length > 0 && (
                  <details className="hb-all-info">
                    <summary>
                      {t("guide.allInfo")} <span>{extra.length}</span>
                    </summary>
                    <div className="hb-section-grid">
                      {extra.map((section) => (
                        <SectionCard
                          key={section.key}
                          section={section}
                          onClick={() => go(section.key)}
                        />
                      ))}
                    </div>
                  </details>
                )}
                {sections
                  .find((section) => sectionKind(section.key) === "welcome")
                  ?.content.items?.some((item) => item.text) && (
                  <details className="hb-welcome-info">
                    <summary>{t("section.welcome")}</summary>
                    <GenericTemplate
                      items={
                        sections.find((section) => sectionKind(section.key) === "welcome")?.content
                          .items ?? []
                      }
                    />
                  </details>
                )}
                {hasPropertyGallery && (
                  <details className="hb-home-media">
                    <summary>{t("media.heading")}</summary>
                    <PropertyMediaGallery sections={sections} includeVideo={false} />
                  </details>
                )}
                {!sections.length && <p className="hb-empty">{t("guest.empty")}</p>}
                {guide.review && guide.review.destinations.length > 0 && (
                  <section className="hb-review">
                    <Star size={24} />
                    <h2>{guide.review.title}</h2>
                    <p>{guide.review.message}</p>
                    {guide.review.destinations.map((destination) => {
                      const href = safeWebUrl(destination.url);
                      return href ? (
                        <a
                          key={destination.url}
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="hb-button"
                        >
                          {destination.label}
                        </a>
                      ) : null;
                    })}
                  </section>
                )}
                <div className="hb-help-actions">
                  {guide.messagingEnabled && onMessage && (
                    <button className="hb-button" onClick={onMessage}>
                      <MessageCircle size={18} />
                      {t("guest.sendMessage")}
                    </button>
                  )}
                  {onFeedback && (
                    <button className="hb-button hb-button-light" onClick={onFeedback}>
                      <Star size={18} />
                      {t("guest.privateFeedback")}
                    </button>
                  )}
                </div>
                {contact && (
                  <div className="hb-contact">
                    <ContactButtons section={contact} t={t} />
                  </div>
                )}
                {offlineAction}
                <p className="hb-signature">NONA · {t("guest.noInstall")}</p>
              </div>
            </div>
          </div>
        </>
      )}
      {conciergeSlug && (
        <Suspense fallback={null}>
          <NonaConcierge
            key={conciergeSlug}
            guide={guide}
            slug={conciergeSlug}
            onContact={
              guide.messagingEnabled && onMessage
                ? onMessage
                : () => {
                    const target = sections.find((s) => sectionKind(s.key) === "contact");
                    if (target) go(target.key);
                  }
            }
          />
        </Suspense>
      )}
      <Dialog open={menu} onOpenChange={setMenu}>
        <DialogContent className="hb-guide hb-guide-menu" aria-describedby={undefined}>
          <DialogTitle>{t("guide.search")}</DialogTitle>
          <LanguageSelect compact />
          <label className="hb-search">
            <Search size={20} />
            <input
              autoComplete="off"
              aria-label={t("guide.search")}
              placeholder={t("guide.search")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="hb-menu-results">
            {matchingSections.map((section) => (
              <button key={section.key} onClick={() => go(section.key)}>
                {cleanTitle(section.title)}
                <ArrowRight size={18} />
              </button>
            ))}
            {matchingSections.length === 0 && (
              <div className="hb-menu-empty">
                <p role="status">{ux.emptyGuideSearch}</p>
                {query && (
                  <button className="hb-button hb-button-light" onClick={() => setQuery("")}>
                    {ux.resetSearch}
                  </button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SectionCard({ section, onClick }: { section: PublicSection; onClick: () => void }) {
  const kind = sectionKind(section.key);
  const Icon =
    kind === "wifi"
      ? Wifi
      : kind === "arrival"
        ? CalendarDays
        : kind === "contact"
          ? Phone
          : Luggage;
  const title = cleanTitle(section.title);
  return (
    <button
      className={`hb-section-card hb-tone-${sectionTone(section.key)} `}
      data-guide-target={`section:${section.key}`}
      onClick={onClick}
    >
      <Icon className="nona-section-icon" strokeWidth={1.8} aria-hidden="true" />
      <span className="hb-section-card-label">{title}</span>
      <span className="hb-card-arrow">
        <ArrowRight size={16} />
      </span>
    </button>
  );
}

function EntryList({
  entries,
  section,
  onSelect,
  category,
  onCategoryChange,
}: {
  entries: GuideEntry[];
  section: PublicSection;
  onSelect: (id: string) => void;
  category: string | null;
  onCategoryChange: (category: string | null) => void;
}) {
  const { t } = useI18n();
  const categories = [
    ...new Set(entries.flatMap((entry) => (entry.category ? [entry.category] : []))),
  ];
  return (
    <>
      {categories.length > 0 && (
        <div className="hb-filters">
          <button aria-pressed={category === null} onClick={() => onCategoryChange(null)}>
            {t("guide.all")}
          </button>
          {categories.map((value) => (
            <button
              key={value}
              aria-pressed={category === value}
              onClick={() => onCategoryChange(value)}
            >
              {value}
            </button>
          ))}
        </div>
      )}
      <div className="hb-entry-grid">
        {entries
          .filter((entry) => !category || entry.category === category)
          .map((entry) => {
            const photo = entry.mediaIds?.flatMap(
              (id) =>
                section.media?.filter(
                  (item) => item.id === id && item.type === "image" && item.url,
                ) ?? [],
            )[0];
            return (
              <article
                className={`hb-entry-card ${photo ? "hb-entry-illustrated" : ""}`}
                key={entry.id}
              >
                <button
                  className="hb-entry-open"
                  data-guide-target={`entry:${entry.id}`}
                  onClick={() => onSelect(entry.id)}
                >
                  {photo?.url && <img src={photo.url} alt="" loading="lazy" />}
                  <span className="hb-entry-title">{entry.title}</span>
                  {entry.category && <span className="hb-entry-meta">{entry.category}</span>}
                  {!photo && <span className="hb-entry-summary">{entry.text}</span>}
                </button>
                <SaveEntry sectionId={section.id} entryId={entry.id} />
              </article>
            );
          })}
      </div>
      <SectionMedia
        section={{
          ...section,
          media: (section.media ?? []).filter(
            (item) => !entries.some((entry) => entry.mediaIds?.includes(item.id)),
          ),
        }}
      />
    </>
  );
}

function EntryDetail({
  section,
  entry,
  location,
  onBack,
}: {
  section: PublicSection;
  entry: GuideEntry;
  location: string | undefined;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const media = [...new Set(entry.mediaIds ?? [])].flatMap(
    (id) => section.media?.filter((item) => item.id === id) ?? [],
  );
  const cover = media.find((item) => item.type === "image" && item.url);
  const mapUrl =
    entry.mapUrl ||
    (entry.address
      ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(entry.address)}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([entry.title, location].filter(Boolean).join(" "))}`);
  return (
    <article className="hb-entry-detail">
      {cover?.url && (
        <img className="hb-detail-cover" src={cover.url} alt={cover.altText || entry.title} />
      )}
      <div className="hb-detail-controls">
        <button
          className="hb-icon-button nona-guest-back"
          onClick={onBack}
          aria-label={t("common.back")}
        >
          <ArrowLeft size={20} />
          <span>{t("common.back")}</span>
        </button>
        <SaveEntry sectionId={section.id} entryId={entry.id} />
      </div>
      <div className="hb-detail-panel">
        <h1 className="hb-page-title" tabIndex={-1}>
          {entry.title}
        </h1>
        {entry.category && <p className="hb-entry-meta">{entry.category}</p>}
        {entry.address && (
          <p className="hb-entry-meta">
            <MapPin size={16} />
            {entry.address}
          </p>
        )}
        {entry.phone && (
          <a
            className="hb-button hb-button-light"
            href={`tel:${entry.phone.replace(/[^+\d]/g, "")}`}
          >
            <Phone size={18} />
            {t("guest.call")}
          </a>
        )}
        <p className="hb-detail-description">{entry.text}</p>
        <div className="hb-detail-gallery">
          <SectionMedia section={{ ...section, media }} />
        </div>
        {mapUrl && (
          <a href={mapUrl} target="_blank" rel="noreferrer" className="hb-button">
            <MapPin size={18} />
            {t(entry.mapUrl || entry.address ? "guest.route" : "guest.findPlace")}
          </a>
        )}
      </div>
    </article>
  );
}

function SaveEntry({ sectionId, entryId }: { sectionId: string; entryId: string }) {
  const { t } = useI18n();
  const [saved, setSaved] = useState(false);
  const savedKey = `hostbuddy.saved-place.${sectionId}.${entryId}`;
  useEffect(() => {
    try {
      setSaved(window.localStorage.getItem(savedKey) === "true");
    } catch {
      /* Private browsing keeps the choice in memory. */
    }
  }, [savedKey]);
  const toggleSaved = () => {
    const next = !saved;
    setSaved(next);
    try {
      window.localStorage.setItem(savedKey, String(next));
    } catch {
      /* The guide still works without browser storage. */
    }
  };
  return (
    <button
      className="hb-save-entry hb-icon-button"
      aria-label={t("guide.save")}
      aria-pressed={saved}
      onClick={toggleSaved}
    >
      {saved ? <Check size={20} /> : <Bookmark size={20} />}
    </button>
  );
}
