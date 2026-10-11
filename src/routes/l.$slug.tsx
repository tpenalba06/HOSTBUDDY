import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  KeyRound,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Send,
  ShoppingBag,
  Star,
  Wifi,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { getPublicGuide, type PublicSection } from "@/lib/data/public-guide.functions";
import { LanguageSelect } from "@/components/i18n/LanguageSelect";
import { useI18n } from "@/lib/i18n";
import arrivalAsset from "@/assets/hostbuddy-arrival.jpg.asset.json";
import breakfastAsset from "@/assets/hostbuddy-breakfast.jpg.asset.json";
import spaAsset from "@/assets/hostbuddy-spa.jpg.asset.json";
export const Route = createFileRoute("/l/$slug")({
  loader: async ({ params }) => {
    const guide = await getPublicGuide({ data: { slug: params.slug } });
    if (!guide) throw notFound();
    return guide;
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.name} — HostBuddy` : "Guide unavailable — HostBuddy";
    const desc = loaderData ? `Guest guide for ${loaderData.name}.` : "This guide is unavailable.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(loaderData ? [] : [{ name: "robots", content: "noindex" }]),
      ],
    };
  },
  notFoundComponent: Unavailable,
  errorComponent: Unavailable,
  component: GuestPage,
});
function Unavailable() {
  const { t } = useI18n();
  return (
    <main className="mx-auto max-w-md px-5 py-16 text-center">
      <span className="text-5xl">🏡</span>
      <h1 className="mt-4 text-3xl font-semibold">{t("guest.unavailable")}</h1>
      <p className="mt-3 text-lg">{t("guest.unavailableD")}</p>
      <Link to="/" className="btn btn-secondary mt-8">
        {t("guest.discover")}
      </Link>
    </main>
  );
}
const baseKey = (key: string) => key.split("-")[0] ?? key;
function localizedSection(section: PublicSection, locale: string) {
  const translated = section.translations?.find((item) => item.locale === locale && !item.isStale);
  return translated
    ? { ...section, title: translated.title, content: translated.content }
    : section;
}
const displayTitle = (title: string) => title.replace(/^[^\p{L}\p{N}]+/u, "");
function GuestPage() {
  const guide = Route.useLoaderData();
  const { slug } = Route.useParams();
  const { locale, t } = useI18n();
  const sections = useMemo(
    () => guide.sections.map((section) => localizedSection(section, locale)),
    [guide.sections, locale],
  );
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [messageOpen, setMessageOpen] = useState(false);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const open = sections.find((section) => section.key === openKey) ?? null;
  const contact = sections.find((section) => baseKey(section.key) === "contact");
  if (open)
    return (
      <GuideInner
        section={open}
        guide={guide}
        onBack={() => setOpenKey(null)}
        onRequest={setServiceId}
        onFeedback={() => setFeedbackOpen(true)}
      />
    );
  const hero =
    sections
      .flatMap((section) => section.media ?? [])
      .find((item) => item.type === "image" && item.url)?.url ?? arrivalAsset.url;
  const primary = sections.filter((section) => baseKey(section.key) !== "contact").slice(0, 6);
  const secondary = sections.filter((section) => baseKey(section.key) !== "contact").slice(6);
  return (
    <main className="mx-auto min-h-screen max-w-4xl bg-background pb-32 shadow-soft">
      <div className="relative h-[min(25rem,46dvh)] min-h-72 overflow-hidden">
        <img src={hero} alt={guide.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/95 via-ink/25 to-ink/55" />
        <div className="absolute right-4 top-4">
          <LanguageSelect compact />
        </div>
        <div className="absolute inset-x-5 bottom-6 text-ink-foreground sm:inset-x-8">
          <p className="text-sm font-bold">{t("guest.welcome")}</p>
          <h1 className="mt-1 text-4xl font-semibold sm:text-5xl">{guide.name}</h1>
          <p className="mt-2 text-sm font-semibold">{t("guest.noInstall")}</p>
        </div>
      </div>
      <div className="px-4 py-6 sm:px-8">
        <h2 className="text-2xl font-semibold">{t("guest.stay")}</h2>
        {!sections.length ? (
          <p className="mt-4 text-lg">{t("guest.empty")}</p>
        ) : (
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {primary.map((section) => (
              <SectionButton
                key={section.key}
                section={section}
                onClick={() => setOpenKey(section.key)}
              />
            ))}
          </div>
        )}
        {secondary.length > 0 && (
          <div className="mt-5 rounded-xl bg-muted p-2">
            <p className="px-3 py-2 text-sm font-bold text-muted-foreground">{t("guest.more")}</p>
            {secondary.map((section) => (
              <button
                key={section.key}
                onClick={() => setOpenKey(section.key)}
                className="flex min-h-14 w-full items-center gap-3 rounded-lg px-3 text-left font-semibold hover:bg-card"
              >
                <span className="shrink-0 text-xl">{section.icon ?? "📌"}</span>
                <span>{displayTitle(section.title)}</span>
              </button>
            ))}
          </div>
        )}
        <Button
          variant="outline"
          className="mt-8 min-h-14 w-full rounded-full"
          onClick={() => setFeedbackOpen(true)}
        >
          <Star />
          {t("guest.privateFeedback")}
        </Button>
        {guide.review && guide.review.destinations.length > 0 && (
          <section className="mt-4 rounded-xl bg-accent p-6">
            <Star className="h-7 w-7 text-accent-foreground" />
            <h2 className="mt-3 text-2xl font-semibold">{guide.review.title}</h2>
            <p className="mt-2 text-accent-foreground">{guide.review.message}</p>
            <div className="mt-4 grid gap-2">
              {guide.review.destinations.map((destination) => (
                <a
                  key={destination.url}
                  href={destination.url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary"
                >
                  {destination.label}
                </a>
              ))}
            </div>
          </section>
        )}
        {guide.messagingEnabled && (
          <Button
            className="mt-8 min-h-14 w-full rounded-full"
            onClick={() => setMessageOpen(true)}
          >
            <MessageCircle />
            {t("guest.sendMessage")}
          </Button>
        )}
      </div>
      {contact && (
        <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-4xl border-t bg-background/95 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] backdrop-blur">
          <ContactButtons section={contact} />
        </div>
      )}
      {messageOpen && <MessageDrawer slug={slug} onClose={() => setMessageOpen(false)} />}{" "}
      {feedbackOpen && <FeedbackDrawer slug={slug} onClose={() => setFeedbackOpen(false)} />}{" "}
      {serviceId && (
        <OrderDrawer
          slug={slug}
          service={(guide.services ?? []).find((item) => item.id === serviceId)}
          onClose={() => setServiceId(null)}
        />
      )}
    </main>
  );
}
function SectionButton({ section, onClick }: { section: PublicSection; onClick: () => void }) {
  const cover = section.media?.find((item) => item.type === "image" && item.url)?.url;
  return (
    <button
      onClick={onClick}
      className="group relative flex min-h-16 min-w-0 items-center gap-3 overflow-hidden rounded-xl border bg-card px-4 text-left font-bold shadow-sm"
    >
      <span
        className={`relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-lg ${cover ? "bg-ink/45" : "bg-secondary"}`}
      >
        {section.icon ?? "📌"}
      </span>
      <span className={`relative z-10 min-w-0 ${cover ? "text-ink-foreground" : ""}`}>
        {displayTitle(section.title)}
      </span>
      {cover && (
        <>
          <img
            src={cover}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <span className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/55 to-ink/10" />
        </>
      )}
    </button>
  );
}
function GuideInner({
  section,
  guide,
  onBack,
  onRequest,
  onFeedback,
}: {
  section: PublicSection;
  guide: ReturnType<typeof Route.useLoaderData>;
  onBack: () => void;
  onRequest: (id: string) => void;
  onFeedback: () => void;
}) {
  const { t } = useI18n();
  const kind = baseKey(section.key);
  const items = section.content.items ?? [];
  const hero = section.media?.find((item) => item.type === "image" && item.url);
  return (
    <main className="mx-auto min-h-screen max-w-4xl bg-background pb-12">
      <div className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/95 px-4 py-2 backdrop-blur sm:px-8">
        <Button onClick={onBack} variant="ghost" className="min-h-12 px-2 text-primary">
          <ArrowLeft />
          {t("guest.back")}
        </Button>
        <LanguageSelect compact />
      </div>
      {hero && (
        <img
          src={hero.url ?? ""}
          alt={hero.altText ?? ""}
          className="h-56 w-full object-cover sm:h-72"
        />
      )}
      <section className="px-4 py-6 sm:px-8">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-xl bg-secondary text-2xl">
            {section.icon ?? "📌"}
          </span>
          <h1 className="min-w-0 text-3xl font-semibold sm:text-5xl">
            {displayTitle(section.title)}
          </h1>
        </div>
        <div className="mt-7">
          {kind === "wifi" ? (
            <WifiTemplate items={items} />
          ) : kind === "arrival" ? (
            <ArrivalTemplate
              items={items}
              contact={guide.sections.find((s: PublicSection) => baseKey(s.key) === "contact")}
            />
          ) : kind === "house" || kind === "rules" || kind === "amenities" ? (
            <HouseTemplate items={items} />
          ) : kind === "places" ? (
            <PlacesTemplate items={items} />
          ) : kind === "services" ? (
            <ServiceList services={guide.services ?? []} onRequest={onRequest} />
          ) : kind === "departure" ? (
            <DepartureTemplate items={items} onFeedback={onFeedback} />
          ) : kind === "contact" ? (
            <ContactButtons section={section} />
          ) : (
            <GenericTemplate items={items} />
          )}
        </div>
        {section.media?.some((item) => item !== hero) && (
          <div className="mt-8">
            <SectionMedia
              section={{ ...section, media: section.media.filter((item) => item !== hero) }}
            />
          </div>
        )}
      </section>
    </main>
  );
}
const GenericTemplate = ({ items }: { items: { label: string; text: string }[] }) => (
  <div className="space-y-4">
    {items.map((item, index) => (
      <div key={index} className="rounded-xl border bg-card p-5">
        {item.label && <p className="font-bold text-primary">{item.label}</p>}
        <p className="mt-1 whitespace-pre-line text-lg leading-relaxed">{item.text}</p>
      </div>
    ))}
  </div>
);
function ArrivalTemplate({
  items,
  contact,
}: {
  items: { label: string; text: string }[];
  contact?: PublicSection;
}) {
  const { t } = useI18n();
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
            <ContactButtons section={contact} />
          </div>
        )}
      </aside>
    </div>
  );
}
function WifiTemplate({ items }: { items: { label: string; text: string }[] }) {
  const { t } = useI18n();
  const network = items[0]?.text ?? "—";
  const password = items[1]?.text ?? items[0]?.text ?? "—";
  const [copied, setCopied] = useState(false);
  return (
    <div className="mx-auto max-w-xl rounded-2xl bg-ink p-6 text-ink-foreground shadow-phone">
      <Wifi className="h-8 w-8 text-accent" />
      <p className="mt-5 text-sm font-bold text-ink-foreground/70">{t("guest.network")}</p>
      <p className="text-2xl font-semibold">{network}</p>
      <p className="mt-5 text-sm font-bold text-ink-foreground/70">{t("guest.wifiPassword")}</p>
      <p className="break-all text-2xl font-semibold">{password}</p>
      <Button
        className="mt-6 w-full"
        onClick={() => {
          navigator.clipboard?.writeText(password);
          setCopied(true);
        }}
      >
        <Copy />
        {copied ? t("guest.copied") : t("guest.copy")}
      </Button>
    </div>
  );
}
function HouseTemplate({ items }: { items: { label: string; text: string }[] }) {
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
function PlacesTemplate({ items }: { items: { label: string; text: string }[] }) {
  const { t } = useI18n();
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
function DepartureTemplate({
  items,
  onFeedback,
}: {
  items: { label: string; text: string }[];
  onFeedback: () => void;
}) {
  const { t } = useI18n();
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
      <Button variant="outline" className="mt-6 w-full" onClick={onFeedback}>
        <Star />
        {t("guest.privateFeedback")}
      </Button>
    </>
  );
}
function SectionMedia({ section }: { section: PublicSection }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {section.media?.map(
        (item) =>
          item.url &&
          (item.type === "image" ? (
            <figure key={item.id}>
              <img
                src={item.url}
                alt={item.altText ?? ""}
                loading="lazy"
                className="aspect-[4/3] w-full rounded-xl object-cover"
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
              preload="metadata"
              className="aspect-video w-full rounded-xl bg-ink"
            />
          )),
      )}
    </div>
  );
}
type PublicService = {
  id: string;
  name: string;
  description: string;
  price: number;
  pricingType: "fixed" | "per_person";
  imagePath?: string | null;
};
function ServiceList({
  services,
  onRequest,
}: {
  services: PublicService[];
  onRequest: (id: string) => void;
}) {
  const { t } = useI18n();
  if (!services.length) return <p className="rounded-xl bg-muted p-4">{t("guest.noServices")}</p>;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {services.map((service, index) => (
        <article key={service.id} className="overflow-hidden rounded-xl border bg-card">
          <img
            src={index % 2 ? spaAsset.url : breakfastAsset.url}
            alt=""
            loading="lazy"
            className="h-36 w-full object-cover"
          />
          <div className="p-4">
            <div className="flex justify-between gap-3">
              <div>
                <p className="font-bold">{service.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{service.description}</p>
              </div>
              <strong className="shrink-0 text-primary">
                {Number(service.price).toFixed(2)} €
              </strong>
            </div>
            <Button className="mt-4 w-full" onClick={() => onRequest(service.id)}>
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
function ContactButtons({ section }: { section: PublicSection }) {
  const { t } = useI18n();
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
function MessageDrawer({ slug, onClose }: { slug: string; onClose: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  return (
    <Drawer title={t("guest.sendMessage")} onClose={onClose}>
      {sent ? (
        <Success text={t("message.sent")} onClose={onClose} />
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const r = await fetch("/api/public/messages", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ slug, name, contact, message, website }),
              });
              if (!r.ok) throw new Error();
              setSent(true);
            } catch {
              setError(t("message.failed"));
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label={t("form.name")} value={name} onChange={setName} />
          <Field
            label={`${t("form.contact")} (${t("common.optional")})`}
            value={contact}
            onChange={setContact}
          />
          <label className="block">
            <span className="mb-1 block font-semibold">{t("form.message")}</span>
            <textarea
              className="field min-h-36"
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
          <label className="sr-only">
            {t("form.website")}
            <input value={website} onChange={(e) => setWebsite(e.target.value)} />
          </label>
          {error && (
            <p role="alert" className="rounded-lg bg-warning-soft p-3">
              {error}
            </p>
          )}
          <Button className="w-full" disabled={busy || !name.trim() || !message.trim()}>
            <Send />
            {busy ? "…" : t("common.send")}
          </Button>
        </form>
      )}
    </Drawer>
  );
}
function OrderDrawer({
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
            setBusy(false);
            if (r.ok) setSent(true);
          }}
        >
          <p className="rounded-xl bg-warning-soft p-3 text-sm">{t("order.notice")}</p>
          <Field label={t("form.name")} value={name} onChange={setName} />
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
          <Button className="w-full" disabled={busy}>
            {busy ? "…" : t("order.send")}
          </Button>
        </form>
      )}
    </Drawer>
  );
}
function FeedbackDrawer({ slug, onClose }: { slug: string; onClose: () => void }) {
  const { t } = useI18n();
  const [rating, setRating] = useState(5);
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
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
            const r = await fetch("/api/public/feedback", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ slug, name, rating, comment, website: "" }),
            });
            setBusy(false);
            if (r.ok) setSent(true);
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-semibold">{label}</span>
      <input className="field" required value={value} onChange={(e) => onChange(e.target.value)} />
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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-background p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:rounded-2xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label={t("common.close")}>
            <X />
          </Button>
        </div>
        {children}
      </div>
    </div>
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
