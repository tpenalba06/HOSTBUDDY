import { useState } from "react";
import { ArrowLeft, Check, Copy, House, KeyRound, Mail, MapPin, MessageCircle, Phone, Sparkles, Star, Waves, Wifi, BriefcaseBusiness } from "lucide-react";
import type { GuideData } from "./villaMare";
import { LanguageSelect } from "@/components/i18n/LanguageSelect";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import arrivalAsset from "@/assets/hostbuddy-arrival.jpg.asset.json";
import breakfastAsset from "@/assets/hostbuddy-breakfast.jpg.asset.json";
import spaAsset from "@/assets/hostbuddy-spa.jpg.asset.json";
export const SECTIONS = [
  { id: "arrival", key: "section.arrival", icon: "🔑" },
  { id: "wifi", key: "section.wifi", icon: "📶" },
  { id: "house", key: "section.house", icon: "🏡" },
  { id: "places", key: "section.places", icon: "📍" },
  { id: "services", key: "section.services", icon: "✨" },
  { id: "departure", key: "section.departure", icon: "🧳" },
  { id: "pool", key: "section.pool", icon: "🏊" },
  { id: "contact", key: "section.contact", icon: "💬" },
] as const;
export type SectionId = "welcome" | (typeof SECTIONS)[number]["id"];
const contentSections = ["arrival", "wifi", "house", "places", "services", "departure"];
export function GuestGuide({
  data,
  section,
  onSection,
  heroImage = arrivalAsset.url,
  labels,
  visibleSections,
}: {
  data: GuideData;
  section: SectionId;
  onSection: (s: SectionId) => void;
  heroImage?: string;
  labels?: Partial<Record<(typeof SECTIONS)[number]["id"], string>>;
  visibleSections?: SectionId[];
}) {
  const { t } = useI18n();
  const [cart, setCart] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [copied, setCopied] = useState(false);
  const back = () => {
    onSection("welcome");
    setCart(null);
    setPaid(false);
  };
  const title = (s: (typeof SECTIONS)[number]) => labels?.[s.id] ?? t(s.key);
  const available = (s: (typeof SECTIONS)[number]) =>
    (!visibleSections || visibleSections.includes(s.id)) &&
    (s.id !== "pool" || !!data.pool?.trim()) &&
    (s.id !== "places" || data.places.length > 0) &&
    (s.id !== "services" || data.services.length > 0);
  const sectionIcons = { arrival: KeyRound, wifi: Wifi, house: House, places: MapPin, services: Sparkles, departure: BriefcaseBusiness, pool: Waves, contact: MessageCircle };
  const entry = (s: (typeof SECTIONS)[number]) => (
    <Button
      variant="outline"
      key={s.id}
      onClick={() => onSection(s.id)}
      className="flex min-h-16 w-full min-w-0 items-center justify-start gap-4 rounded-lg border bg-card px-4 text-left text-base font-semibold text-foreground shadow-sm hover:border-primary hover:bg-card"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">
        {(() => { const Icon = sectionIcons[s.id]; return <Icon className="h-5 w-5" aria-hidden />; })()}
      </span>
      <span className="min-w-0 flex-1 whitespace-normal leading-snug">{title(s)}</span>
      <span aria-hidden className="text-primary">
        →
      </span>
    </Button>
  );
  if (section === "welcome")
    return (
      <div className="mx-auto max-w-3xl space-y-5 pb-3 text-foreground">
        <div className="relative h-56 overflow-hidden rounded-lg @sm:h-72">
          <img
            src={heroImage}
            alt={data.name}
            className="h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/15 to-ink/35" />
          <div className="absolute inset-x-4 top-4 flex justify-end">
            <LanguageSelect compact />
          </div>
          <div className="absolute inset-x-5 bottom-5 text-ink-foreground">
            <p className="text-sm font-semibold">{t("guest.welcome")}</p>
            <h3 className="text-4xl font-semibold">{data.name}</h3>
            <p className="mt-1 text-sm font-semibold">{data.host}</p>
          </div>
        </div>
        <div className="px-1">
          <p className="mb-3 text-lg font-semibold">{t("guest.stay")}</p>
          <div className="grid gap-2 @md:grid-cols-2">
            {SECTIONS.filter((s) => contentSections.includes(s.id) && available(s)).map(entry)}
          </div>
          {SECTIONS.filter((s) => s.id === "pool" && available(s)).map((s) => (
            <div className="mt-2" key={s.id}>
              {entry(s)}
            </div>
          ))}
        </div>
        {available(SECTIONS[7]) && (
          <Button
            onClick={() => onSection("contact")}
            className="min-h-14 w-full rounded-lg text-base"
          >
            <MessageCircle className="h-5 w-5" />
            {title(SECTIONS[7])}
          </Button>
        )}
        <p className="text-center text-sm text-muted-foreground">{t("guest.noInstall")}</p>
      </div>
    );
  const meta = SECTIONS.find((s) => s.id === section);
  const service = data.services.find((s) => s.id === cart);
  if (!meta) return null;
  return (
    <div className="space-y-5 text-foreground">
      <Button
        variant="ghost"
        onClick={back}
        className="inline-flex min-h-12 items-center gap-2 font-semibold text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("guest.back")}
      </Button>
      <div className="flex items-center gap-3 border-b pb-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-secondary text-2xl">
          {meta.icon}
        </span>
        <h3 className="min-w-0 text-3xl font-semibold">{title(meta)}</h3>
      </div>
      {section === "arrival" && (
        <p className="rounded-xl bg-muted p-4 leading-relaxed">{data.arrival}</p>
      )}
      {section === "house" && (
        <p className="rounded-xl bg-muted p-4 leading-relaxed">{data.house}</p>
      )}
      {section === "pool" && <p className="rounded-xl bg-muted p-4 leading-relaxed">{data.pool}</p>}
      {section === "departure" && (
        <p className="rounded-xl bg-muted p-4 leading-relaxed">{data.departure}</p>
      )}
      {section === "wifi" && (
        <div className="rounded-xl bg-muted p-4">
          <p className="text-sm text-muted-foreground">{t("guest.network")}</p>
          <p className="text-lg font-semibold">{data.wifi.network}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t("guest.wifiPassword")}</p>
          <p className="text-lg font-semibold">{data.wifi.password}</p>
          <button
            className="btn btn-primary mt-4 w-full"
            onClick={() => {
              navigator.clipboard?.writeText(data.wifi.password);
              setCopied(true);
            }}
          >
            <Copy />
            {copied ? t("guest.copied") : t("guest.copy")}
          </button>
        </div>
      )}
      {section === "places" &&
        data.places.map((p) => (
          <div key={p.name} className="rounded-xl border bg-card p-4">
            <p className="font-semibold">{p.name}</p>
            <p className="text-sm text-muted-foreground">{p.note}</p>
          </div>
        ))}
      {section === "services" && !service && (
        <>
          <img src={breakfastAsset.url} alt="" className="h-36 w-full rounded-xl object-cover" />
          {data.services.map((s) => (
            <button
              key={s.id}
              onClick={() => setCart(s.id)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border bg-card p-4 text-left"
            >
              <span className="min-w-0">
                <span className="block font-semibold">{s.name}</span>
                <span className="block text-sm text-muted-foreground">{s.desc}</span>
              </span>
              <span className="shrink-0 font-semibold text-primary">{s.price} €</span>
            </button>
          ))}
        </>
      )}
      {section === "services" && service && !paid && (
        <div className="space-y-3 rounded-xl border p-4">
          <img
            src={service.id === "ms" ? spaAsset.url : breakfastAsset.url}
            alt=""
            className="h-32 w-full rounded-lg object-cover"
          />
          <p className="font-semibold">{service.name}</p>
          <p className="text-sm text-muted-foreground">{service.desc}</p>
          <p className="text-2xl font-semibold">{service.price} €</p>
          <button className="btn btn-primary w-full" onClick={() => setPaid(true)}>
            {t("guest.request")}
          </button>
          <p className="text-center text-xs text-muted-foreground">{t("guest.unpaid")}</p>
        </div>
      )}
      {section === "services" && paid && (
        <div className="rounded-xl bg-success-soft p-5 text-center">
          <Check className="mx-auto h-8 w-8 text-success" />
          <p className="font-semibold">{t("order.sent")}</p>
        </div>
      )}
      {section === "contact" && (
        <div className="grid gap-2">
          <a className="btn btn-primary" href={`tel:${data.phone}`}>
            <Phone />
            {t("guest.call")}
          </a>
          <a className="btn btn-secondary" href={`https://wa.me/${data.phone.replace("+", "")}`}>
            <MessageCircle />
            {t("guest.whatsapp")}
          </a>
          <a className="btn btn-secondary" href={`mailto:${data.email}`}>
            <Mail />
            {t("guest.email")}
          </a>
        </div>
      )}
      {section === "departure" && (
        <button className="btn btn-secondary w-full">
          <Star />
          {t("guest.review")}
        </button>
      )}
    </div>
  );
}
