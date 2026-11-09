import {
  Check,
  CheckCircle2,
  Copy,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  ShoppingBag,
  Star,
  Wifi,
} from "lucide-react";
import { useState } from "react";
import { wifiCredentials } from "@/lib/import-engine/wifi-credentials";
import { Button } from "@/components/ui/button";
import type { PublicSection } from "@/lib/data/public-guide.functions";
import { useI18n } from "@/lib/i18n";
import { uxCopy } from "@/lib/ux-copy";
import { generateWifiQr, publishedWifiCredentials, wifiQrPayload } from "@/lib/wifi-qr";
export const GenericTemplate = ({ items }: { items: { label: string; text: string }[] }) => (
  <div className="space-y-4">
    {items.map((item, index) => (
      <div key={index} className="rounded-xl border bg-card p-5">
        {item.label && <p className="font-bold text-primary">{item.label}</p>}
        <p className="mt-1 whitespace-pre-line text-lg leading-relaxed">{item.text}</p>
      </div>
    ))}
  </div>
);
export function ArrivalTemplate({
  items,
  t,
}: {
  items: { label: string; text: string }[];
  t: (key: string) => string;
}) {
  const steps = items.filter((item) => item.text.trim());
  if (!steps.length) return <p className="rounded-xl bg-muted p-4">{t("guest.arrivalEmpty")}</p>;
  return (
    <ol className="grid list-none gap-3">
      {steps.map((item, index) => (
        <li key={index}>
          <details open={index === 0} className="rounded-xl border bg-card">
            <summary className="min-h-12 cursor-pointer break-words px-4 py-3 font-semibold text-primary">
              {index + 1}. {item.label || t("guest.arrivalInstructions")}
            </summary>
            <p className="whitespace-pre-line break-words px-4 pb-4 leading-relaxed">{item.text}</p>
          </details>
        </li>
      ))}
    </ol>
  );
}
export function WifiTemplate({
  items,
  t,
  copied,
  onCopy,
  qrItems,
}: {
  items: { label: string; text: string }[];
  t: (key: string) => string;
  copied: boolean;
  onCopy: () => void;
  qrItems?: { label: string; text: string }[] | undefined;
}) {
  const [copyError, setCopyError] = useState(false);
  const [copyPending, setCopyPending] = useState(false);
  const { locale } = useI18n();
  const ux = uxCopy(locale);
  const [qr, setQr] = useState<{ payload: string; src: string | null } | null>(null);
  const configured = qrItems && publishedWifiCredentials(qrItems);
  const payload = wifiQrPayload(configured?.network, configured?.password);
  const explicit =
    (payload && configured) || wifiCredentials(items.map((item) => item.text).join("\n"));
  // A recognized password does not mean the remaining source can be discarded.
  // Keep the original information visible when no explicit network label parsed.
  const network = explicit?.network ?? items[0]?.text ?? "—";
  const password = explicit ? explicit.password : items[1]?.text;
  const copyText = password || (explicit ? explicit.network : items[0]?.text);

  return (
    <div className="mx-auto max-w-xl rounded-2xl bg-ink p-6 text-ink-foreground shadow-phone">
      <Wifi className="h-8 w-8 text-accent" />
      <p className="mt-5 text-sm font-bold text-ink-foreground/70">{t("guest.network")}</p>
      <p className="break-words text-2xl font-semibold">{network}</p>
      {password && (
        <>
          <p className="mt-5 text-sm font-bold text-ink-foreground/70">{t("guest.wifiPassword")}</p>
          <p className="break-all text-2xl font-semibold">{password}</p>
        </>
      )}
      <Button
        className="mt-6 w-full"
        disabled={!copyText || copyPending}
        aria-busy={copyPending}
        onClick={async () => {
          setCopyPending(true);
          setCopyError(false);
          try {
            if (!navigator.clipboard || !copyText) throw new Error("clipboard unavailable");
            await navigator.clipboard.writeText(copyText);
            setCopyError(false);
            onCopy();
          } catch {
            setCopyError(true);
          } finally {
            setCopyPending(false);
          }
        }}
      >
        <Copy />
        {copied && !copyError
          ? t("guest.copied")
          : t(password ? "guest.copyWifiPassword" : "guest.copy")}
      </Button>
      <p role="status" aria-live="polite" className={copyError ? "mt-3" : "sr-only"}>
        {copyError ? ux.copyFailed : copied ? ux.copied : ""}
      </p>
      {payload && (
        <div className="mt-3">
          <Button
            variant="outline"
            className="w-full bg-card text-foreground"
            aria-expanded={qr?.payload === payload && !!qr.src}
            onClick={async () => {
              if (qr?.payload === payload && qr.src) {
                setQr(null);
                return;
              }
              try {
                setQr({ payload, src: await generateWifiQr(payload) });
              } catch {
                setQr({ payload, src: null });
              }
            }}
          >
            {t(qr?.payload === payload && qr.src ? "guest.hideWifiQr" : "guest.showWifiQr")}
          </Button>
          {qr?.payload === payload &&
            (qr.src ? (
              <figure className="mt-4 text-center">
                <img
                  src={qr.src}
                  alt={t("guest.wifiQr")}
                  width={240}
                  height={240}
                  className="mx-auto h-auto max-w-full rounded-lg"
                />
                <figcaption className="mt-2 text-sm">{t("guest.scanWifiQr")}</figcaption>
              </figure>
            ) : (
              <p role="status" className="mt-2 text-sm">
                {t("guest.wifiQrError")}
              </p>
            ))}
        </div>
      )}
    </div>
  );
}
export function HouseTemplate({ items }: { items: { label: string; text: string }[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item, index) => (
        <div key={index} className="rounded-xl border bg-card p-5">
          <CheckCircle2 className="h-5 w-5 text-success" />
          {item.label && <h2 className="mt-3 text-lg font-semibold">{item.label}</h2>}
          <p className="mt-1 whitespace-pre-line leading-relaxed">{item.text}</p>
        </div>
      ))}
    </div>
  );
}
export function PlacesTemplate({
  items,
  t,
}: {
  items: { label: string; text: string }[];
  t: (key: string) => string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((item, index) => (
        <article key={index} className="rounded-xl border bg-card p-5">
          <MapPin className="text-primary" />
          <h2 className="mt-3 text-xl font-semibold">{item.label || item.text.split("\n")[0]}</h2>
          <p className="mt-2 text-muted-foreground">
            {item.label ? item.text : item.text.split("\n").slice(1).join("\n")}
          </p>
          <span className="mt-4 inline-flex items-center gap-2 font-semibold text-primary">
            <Navigation className="h-4 w-4" />
            {t("guest.route")}
          </span>
        </article>
      ))}
    </div>
  );
}
export function DepartureTemplate({
  items,
  onFeedback,
  t,
}: {
  items: { label: string; text: string }[];
  onFeedback: (() => void) | undefined;
  t: (key: string) => string;
}) {
  return (
    <>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="flex gap-3 rounded-xl bg-muted p-4">
            <Check className="mt-1 h-5 w-5 shrink-0 text-success" />
            <div>
              {item.label && <p className="font-bold">{item.label}</p>}
              <p className="whitespace-pre-line">{item.text}</p>
            </div>
          </div>
        ))}
      </div>
      <Button variant="outline" className="mt-6 w-full" disabled={!onFeedback} onClick={onFeedback}>
        <Star />
        {t("guest.privateFeedback")}
      </Button>
    </>
  );
}
export function SectionMedia({
  section,
  wide = false,
}: {
  section: PublicSection;
  wide?: boolean;
}) {
  const count = section.media?.filter((item) => item.url).length ?? 0;
  if (!count) return null;
  // A lone photo spans the row (no orphan half-empty grid cell); `wide` lowers
  // its height when it heads a full-width page such as Services.
  const single = count === 1;
  return (
    <div className={`mb-5 grid gap-4 ${single ? "" : "sm:grid-cols-2"}`}>
      {section.media?.map(
        (item) =>
          item.url &&
          (item.type === "image" ? (
            <figure key={item.id}>
              <img
                src={item.url}
                alt={item.altText ?? ""}
                loading="lazy"
                className={`aspect-[4/3] w-full rounded-xl object-cover ${single && wide ? "sm:aspect-[21/9]" : ""}`}
              />
              {item.caption && (
                <figcaption className="mt-1 text-sm text-muted-foreground">
                  {item.caption}
                </figcaption>
              )}
            </figure>
          ) : (
            <video
              key={item.id}
              src={item.url}
              controls
              playsInline
              preload="metadata"
              className="aspect-video w-full rounded-xl bg-ink"
            />
          )),
      )}
    </div>
  );
}
export type PublicService = {
  revision?: string;
  bookingConfig?: import("@/lib/service-booking").BookingConfig;
  id: string;
  name: string;
  description: string;
  price: number;
  pricingType: "fixed" | "per_person";
  imagePath?: string | null;
};
export function ServiceList({
  services,
  onRequest,
  t,
  rail = false,
  actionLabel,
  discovery = false,
  onDiscover,
}: {
  services: PublicService[];
  onRequest: ((id: string) => void) | undefined;
  t: (key: string) => string;
  rail?: boolean;
  actionLabel?: string;
  discovery?: boolean;
  onDiscover?: (id: string) => void;
}) {
  const { locale } = useI18n();
  const ux = uxCopy(locale);
  if (!services.length) return <p className="rounded-xl bg-muted p-4">{t("guest.noServices")}</p>;
  return (
    <div
      className={`hb-service-list grid gap-4 sm:grid-cols-2 ${rail ? "hb-service-rail" : ""} ${discovery ? "nona-service-discovery" : ""}`}
    >
      {services.map((service) => (
        <article
          key={service.id}
          className="hb-service-card overflow-hidden rounded-xl border bg-card"
        >
          {service.imagePath && (
            <img
              src={service.imagePath}
              alt={service.name}
              loading="lazy"
              className="aspect-[4/3] w-full object-cover"
            />
          )}
          <div className="hb-service-info p-4">
            <div className="hb-service-description flex justify-between gap-3">
              <div>
                <p className="hb-service-name font-bold">{service.name}</p>
                <p className="hb-service-summary mt-1 text-sm text-muted-foreground">
                  {service.description}
                </p>
              </div>
              {!discovery && (
                <strong className="shrink-0 text-primary">
                  {Number(service.price).toFixed(2)} €
                  {service.pricingType === "per_person" && (
                    <span className="block text-xs font-normal">{t("services.perPerson")}</span>
                  )}
                </strong>
              )}
            </div>
            <Button
              className="mt-4 w-full"
              disabled={discovery ? !onDiscover : !onRequest}
              onClick={() => (discovery ? onDiscover?.(service.id) : onRequest?.(service.id))}
            >
              <ShoppingBag />
              {actionLabel ?? t("guest.request")}
            </Button>
            {!discovery && (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                {onRequest ? t("guest.unpaid") : ux.previewBookings}
              </p>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
export function ContactButtons({
  section,
  t,
}: {
  section: PublicSection;
  t: (key: string) => string;
}) {
  const phone = section.content.phones?.[0];
  const email = section.content.emails?.[0];
  if (!phone && !email) return null;
  return (
    <div className="grid grid-cols-3 gap-2">
      {phone && (
        <a className="btn btn-primary px-1 text-sm" href={`tel:${phone}`}>
          <Phone className="h-4 w-4" />
          {t("guest.call")}
        </a>
      )}
      {phone && (
        <a
          className="btn btn-secondary px-1 text-sm"
          href={`https://wa.me/${phone.replace(/\D/g, "")}`}
          aria-label={t("guest.whatsapp")}
        >
          <MessageCircle className="h-4 w-4" />
          <span className="hidden min-[390px]:inline">{t("guest.whatsapp")}</span>
        </a>
      )}
      {email && (
        <a className="btn btn-secondary px-1 text-sm" href={`mailto:${email}`}>
          <Mail className="h-4 w-4" />
          {t("guest.email")}
        </a>
      )}
    </div>
  );
}
