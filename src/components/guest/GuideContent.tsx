import {
  Check,
  CheckCircle2,
  Copy,
  KeyRound,
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
  contact,
  t,
}: {
  items: { label: string; text: string }[];
  contact?: PublicSection | undefined;
  t: (key: string) => string;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_280px]">
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="grid grid-cols-[2.5rem_1fr] gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary font-bold text-primary-foreground">
              {index + 1}
            </span>
            <div className="rounded-xl bg-muted p-4">
              {item.label && <p className="font-bold">{item.label}</p>}
              <p className="whitespace-pre-line leading-relaxed">{item.text}</p>
            </div>
          </div>
        ))}
      </div>
      <aside className="h-fit rounded-xl border bg-card p-5">
        <KeyRound className="text-primary" />
        <h2 className="mt-3 text-xl font-semibold">{t("guest.needHelp")}</h2>
        {contact && (
          <div className="mt-4">
            <ContactButtons section={contact} t={t} />
          </div>
        )}
      </aside>
    </div>
  );
}
export function WifiTemplate({
  items,
  t,
  copied,
  onCopy,
}: {
  items: { label: string; text: string }[];
  t: (key: string) => string;
  copied: boolean;
  onCopy: () => void;
}) {
  const [copyError, setCopyError] = useState(false);
  const explicit = wifiCredentials(items.map((item) => item.text).join("\n"));
  const network = explicit ? (explicit.network ?? "—") : (items[0]?.text ?? "—");
  const password = explicit ? explicit.password : items[1]?.text;
  const copyText = password || (explicit ? explicit.network : items[0]?.text);

  return (
    <div className="mx-auto max-w-xl rounded-2xl bg-ink p-6 text-ink-foreground shadow-phone">
      <Wifi className="h-8 w-8 text-accent" />
      <p className="mt-5 text-sm font-bold text-ink-foreground/70">{t("guest.network")}</p>
      <p className="text-2xl font-semibold">{network}</p>
      {password && (
        <>
          <p className="mt-5 text-sm font-bold text-ink-foreground/70">{t("guest.wifiPassword")}</p>
          <p className="break-all text-2xl font-semibold">{password}</p>
        </>
      )}
      <Button
        className="mt-6 w-full"
        disabled={!copyText}
        onClick={async () => {
          try {
            if (!navigator.clipboard || !copyText) throw new Error("clipboard unavailable");
            await navigator.clipboard.writeText(copyText);
            setCopyError(false);
            onCopy();
          } catch {
            setCopyError(true);
          }
        }}
      >
        <Copy />
        {copied ? t("guest.copied") : t("guest.copy")}
      </Button>
      {copyError && (
        <p role="status" className="mt-3">
          {t("guide.copyFailed")}
        </p>
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
}: {
  services: PublicService[];
  onRequest: ((id: string) => void) | undefined;
  t: (key: string) => string;
}) {
  if (!services.length) return <p className="rounded-xl bg-muted p-4">{t("guest.noServices")}</p>;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {services.map((service) => (
        <article key={service.id} className="overflow-hidden rounded-xl border bg-card">
          {service.imagePath && (
            <img
              src={service.imagePath}
              alt={service.name}
              loading="lazy"
              className="aspect-[4/3] w-full object-cover"
            />
          )}
          <div className="p-4">
            <div className="flex justify-between gap-3">
              <div>
                <p className="font-bold">{service.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{service.description}</p>
              </div>
              <strong className="shrink-0 text-primary">
                {Number(service.price).toFixed(2)} €
                {service.pricingType === "per_person" && (
                  <span className="block text-xs font-normal">{t("services.perPerson")}</span>
                )}
              </strong>
            </div>
            <Button
              className="mt-4 w-full"
              disabled={!onRequest}
              onClick={() => onRequest?.(service.id)}
            >
              <ShoppingBag />
              {t("guest.request")}
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">{t("guest.unpaid")}</p>
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
