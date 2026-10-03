import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  Home,
  KeyRound,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Search,
  Star,
  Wifi,
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
}: {
  guide: GuideViewData;
  sectionKey?: string | null;
  onSectionChange?: (key: string | null) => void;
  onRequest?: (id: string) => void;
  onMessage?: () => void;
  onFeedback?: () => void;
}) {
  const { locale, t } = useI18n();
  const [localKey, setLocalKey] = useState<string | null>(null);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const sections = localizedSections(guide, locale);
  const open = sections.find(
    (item) => item.key === (sectionKey === undefined ? localKey : sectionKey),
  );
  const cover = guideCover(guide);
  const contact = sections.find((item) => sectionKind(item.key) === "contact");
  const go = (key: string | null) => {
    setLocalKey(key);
    onSectionChange?.(key);
    setEntryId(null);
    setCopied(false);
    setMenu(false);
    topRef.current?.scrollIntoView({ block: "start" });
  };
  const toggleMenu = () => {
    setQuery("");
    setMenu(true);
  };
  const navigation = (
    <>
      <button
        className="hb-icon-button"
        onClick={open ? () => go(null) : toggleMenu}
        aria-label={open ? t("guest.back") : t("guide.menu")}
      >
        {open ? <ArrowLeft size={20} /> : <Menu size={20} />}
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
  return (
    <div className="hb-guide" ref={topRef}>
      {open ? (
        <>
          <header className="hb-guide-header">{navigation}</header>
          {selected ? (
            <EntryDetail section={open} entry={selected} onBack={() => setEntryId(null)} />
          ) : (
            <div className="hb-guide-body">
              <h1 className="hb-page-title">{cleanTitle(open.title)}</h1>
              <div className="hb-section-content">
                {sectionKind(open.key) === "places" || sectionKind(open.key) === "activities" ? (
                  <EntryList entries={entries} section={open} onSelect={setEntryId} />
                ) : (
                  <>
                    <SectionMedia section={open} />
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
                        <ServiceList services={guide.services ?? []} onRequest={onRequest} t={t} />
                      </>
                    ) : (
                      <GenericTemplate items={open.content.items ?? []} />
                    )}
                    {sectionKind(open.key) === "contact" && <ContactButtons section={open} t={t} />}
                  </>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <section className={`hb-cover ${cover ? "hb-cover-photo" : "hb-cover-empty"}`}>
            {cover && (
              <img src={cover} alt={guide.name} className="hb-cover-image" fetchPriority="high" />
            )}
            <header className="hb-cover-nav">{navigation}</header>
            <div className="hb-cover-copy">
              <p>{t("guest.welcome")}</p>
              <h1>{guide.name}</h1>
              {guide.subtitle && <p className="hb-eyebrow">{guide.subtitle}</p>}
            </div>
            <button
              className="hb-discover"
              onClick={() =>
                contentRef.current?.scrollIntoView({ block: "start", behavior: "smooth" })
              }
            >
              <span>{t("guide.discover")}</span>
              <span className="hb-icon-button">
                <ArrowDown size={20} />
              </span>
            </button>
          </section>
          <div className="hb-guide-body" ref={contentRef}>
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
            <nav className="hb-essentials" aria-label={t("guide.essentials")}>
              {["wifi", "arrival", "departure"].map((kind) => {
                const section = sections.find((item) => sectionKind(item.key) === kind);
                const Icon = kind === "wifi" ? Wifi : kind === "arrival" ? KeyRound : Home;
                return section ? (
                  <button key={kind} onClick={() => go(section.key)}>
                    <Icon size={18} />
                    <span>{cleanTitle(section.title)}</span>
                  </button>
                ) : null;
              })}
            </nav>
            <div className="hb-section-grid">
              {sections.map((section) => (
                <SectionCard key={section.key} section={section} onClick={() => go(section.key)} />
              ))}
            </div>
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
            <p className="hb-signature">HostBuddy · {t("guest.noInstall")}</p>
          </div>
        </>
      )}
      <Dialog open={menu} onOpenChange={setMenu}>
        <DialogContent className="hb-guide hb-guide-menu" aria-describedby={undefined}>
          <DialogTitle>{t("guide.search")}</DialogTitle>
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
            {sections
              .filter((section) =>
                `${section.title} ${(section.content.items ?? []).map((item) => `${item.label} ${item.text}`).join(" ")} ${sectionEntries(
                  section,
                )
                  .map((entry) => `${entry.title} ${entry.text}`)
                  .join(" ")}`
                  .toLocaleLowerCase(locale)
                  .includes(query.toLocaleLowerCase(locale)),
              )
              .map((section) => (
                <button key={section.key} onClick={() => go(section.key)}>
                  {cleanTitle(section.title)}
                  <ArrowRight size={18} />
                </button>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SectionCard({ section, onClick }: { section: PublicSection; onClick: () => void }) {
  const photo = section.media?.find((item) => item.type === "image" && item.url);
  return (
    <button
      className={`hb-section-card hb-tone-${sectionTone(section.key)} ${photo ? "" : "hb-section-card-text"}`}
      onClick={onClick}
    >
      {photo?.url && <img src={photo.url} alt="" loading="lazy" />}
      <span className="hb-section-card-label">{cleanTitle(section.title)}</span>
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
}: {
  entries: GuideEntry[];
  section: PublicSection;
  onSelect: (id: string) => void;
}) {
  const { t } = useI18n();
  const [category, setCategory] = useState<string | null>(null);
  const categories = [
    ...new Set(entries.flatMap((entry) => (entry.category ? [entry.category] : []))),
  ];
  return (
    <>
      {categories.length > 0 && (
        <div className="hb-filters">
          <button aria-pressed={category === null} onClick={() => setCategory(null)}>
            {t("guide.all")}
          </button>
          {categories.map((value) => (
            <button
              key={value}
              aria-pressed={category === value}
              onClick={() => setCategory(value)}
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
            const photo = section.media?.find(
              (item) => item.type === "image" && item.url && entry.mediaIds?.includes(item.id),
            );
            return (
              <button className="hb-entry-card" key={entry.id} onClick={() => onSelect(entry.id)}>
                {photo?.url && <img src={photo.url} alt="" loading="lazy" />}
                <span className="hb-entry-title">
                  {entry.title}
                  <ArrowRight size={17} />
                </span>
                {entry.category && <span className="hb-entry-meta">{entry.category}</span>}
                <span className="hb-entry-summary">{entry.text}</span>
              </button>
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
  onBack,
}: {
  section: PublicSection;
  entry: GuideEntry;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const [saved, setSaved] = useState(false);
  const savedKey = `hostbuddy.saved-place.${section.id}.${entry.id}`;
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
  const media = section.media?.filter((item) => entry.mediaIds?.includes(item.id)) ?? [];
  const cover = media.find((item) => item.type === "image" && item.url);
  const mapUrl =
    entry.mapUrl ||
    (entry.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(entry.address)}`
      : undefined);
  return (
    <article className="hb-entry-detail">
      {cover?.url && (
        <img className="hb-detail-cover" src={cover.url} alt={cover.altText || entry.title} />
      )}
      <div className="hb-detail-controls">
        <button className="hb-icon-button" onClick={onBack} aria-label={t("common.back")}>
          <ArrowLeft size={20} />
        </button>
        <button
          className="hb-icon-button"
          aria-label={t("guide.save")}
          aria-pressed={saved}
          onClick={toggleSaved}
        >
          {saved ? <Check size={20} /> : <Bookmark size={20} />}
        </button>
      </div>
      <div className="hb-detail-panel">
        <h1 className="hb-page-title">{entry.title}</h1>
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
        <SectionMedia section={{ ...section, media: media.filter((item) => item !== cover) }} />
        {mapUrl && (
          <a href={mapUrl} target="_blank" rel="noreferrer" className="hb-button">
            <MapPin size={18} />
            {t("guest.route")}
          </a>
        )}
      </div>
    </article>
  );
}
