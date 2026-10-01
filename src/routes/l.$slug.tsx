import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { ArrowLeft, Mail, MessageCircle, Phone, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { getPublicGuide, type PublicSection } from "@/lib/data/public-guide.functions";
import { LanguageSelect } from "@/components/i18n/LanguageSelect";
import { useI18n } from "@/lib/i18n";
import arrivalAsset from "@/assets/hostbuddy-arrival.jpg.asset.json";
import breakfastAsset from "@/assets/hostbuddy-breakfast.jpg.asset.json";
import spaAsset from "@/assets/hostbuddy-spa.jpg.asset.json";

export const Route = createFileRoute("/l/$slug")({
  loader: async ({ params }) => { const guide = await getPublicGuide({ data: { slug: params.slug } }); if (!guide) throw notFound(); return guide; },
  head: ({ loaderData }) => { const title = loaderData ? `${loaderData.name} — Guide voyageur HostBuddy` : "Guide indisponible — HostBuddy"; const desc = loaderData ? `Toutes les informations utiles pour votre séjour à ${loaderData.name}.` : "Ce guide n'est pas disponible."; return { meta: [{ title }, { name: "description", content: desc }, { property: "og:title", content: title }, { property: "og:description", content: desc }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, ...(loaderData ? [] : [{ name: "robots", content: "noindex" }])] }; },
  notFoundComponent: Unavailable, errorComponent: Unavailable, component: GuestPage,
});

function Unavailable() { const { t } = useI18n(); return <main className="mx-auto max-w-md px-5 py-16 text-center"><span className="text-5xl" aria-hidden>🏡</span><h1 className="mt-4 text-3xl font-semibold">{t("guest.unavailable")}</h1><p className="mt-3 text-lg">{t("guest.unavailableD")}</p><Link to="/" className="btn btn-secondary mt-8">{t("guest.discover")}</Link></main>; }

function localizedSection(section: PublicSection, locale: string) {
  const translated = section.translations?.find((item) => item.locale === locale && !item.isStale);
  return translated ? { ...section, title: translated.title, content: translated.content } : section;
}
const displayTitle = (title: string) => title.replace(/^[^\p{L}\p{N}]+/u, "");

function GuestPage() {
  const guide = Route.useLoaderData();
  const { locale, t } = useI18n();
  const sections = useMemo(() => guide.sections.map((section) => localizedSection(section, locale)), [guide.sections, locale]);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const open = sections.find((section) => section.key === openKey) ?? null;
  const contact = sections.find((section) => section.key === "contact");
  if (open) return <main className="mx-auto min-h-screen max-w-lg bg-background px-4 py-5"><div className="flex items-center justify-between"><button onClick={() => setOpenKey(null)} className="inline-flex min-h-12 items-center gap-2 font-semibold text-primary"><ArrowLeft className="h-4 w-4"/>{t("guest.back")}</button><LanguageSelect compact /></div><h1 className="mt-5 text-4xl font-semibold">{displayTitle(open.title)}</h1><div className="mt-6 space-y-4">{open.content.items?.map((item, index) => <div key={`${item.label}-${index}`} className="surface p-5"><p className="text-sm font-bold text-muted-foreground">{item.label}</p><p className="mt-2 whitespace-pre-line text-lg leading-relaxed">{item.text}</p></div>)}{open.key === "services" && <ServicePreview />}{open.key === "contact" && <ContactButtons section={open}/>}</div></main>;
  return <main className="mx-auto min-h-screen max-w-lg bg-background pb-28">
    <div className="relative h-80 overflow-hidden"><img src={arrivalAsset.url} alt={guide.name} width={1536} height={1024} className="h-full w-full object-cover"/><div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/10 to-ink/30"/><div className="absolute right-4 top-4"><LanguageSelect compact /></div><div className="absolute inset-x-5 bottom-6 text-ink-foreground"><p className="text-sm font-bold text-ink-foreground/80">{t("guest.welcome")}</p><h1 className="mt-1 text-4xl font-semibold">{guide.name}</h1><p className="mt-2 text-sm font-semibold">{t("guest.noInstall")}</p></div></div>
    <div className="px-4 py-6"><h2 className="text-2xl font-semibold">{t("guest.stay")}</h2>{sections.length === 0 ? <p className="mt-4 text-lg">{t("guest.empty")}</p> : <div className="mt-5 grid grid-cols-2 gap-3">{sections.slice(0, 6).map((section, index) => <button key={section.key} onClick={() => setOpenKey(section.key)} className={`relative min-h-32 overflow-hidden rounded-lg border bg-card p-4 text-left text-lg font-bold shadow-sm transition hover:border-primary ${index === 0 ? "col-span-2" : ""}`}><span className="relative z-10">{displayTitle(section.title)}</span>{section.key === "services" && <img src={breakfastAsset.url} alt="" loading="lazy" width={1200} height={912} className="absolute inset-0 h-full w-full object-cover opacity-20"/>}</button>)}</div>}
      {sections.length > 6 && <div className="mt-3 grid gap-3">{sections.slice(6).map((section) => <button key={section.key} onClick={() => setOpenKey(section.key)} className="min-h-14 rounded-lg border bg-card px-4 text-left font-semibold">{displayTitle(section.title)}</button>)}</div>}
      {guide.review && guide.review.destinations.length > 0 && <section className="mt-8 rounded-lg bg-accent p-6"><Star className="h-7 w-7 text-accent-foreground"/><h2 className="mt-3 text-2xl font-semibold">{guide.review.title}</h2><p className="mt-2 text-accent-foreground">{guide.review.message}</p><div className="mt-4 grid gap-2">{guide.review.destinations.map((destination) => <a key={`${destination.label}-${destination.url}`} href={destination.url} target="_blank" rel="noreferrer" className="btn btn-primary">{destination.label}</a>)}</div></section>}
    </div>
    {contact && <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg border-t bg-background/95 p-3 backdrop-blur"><ContactButtons section={contact}/></div>}
  </main>;
}

function ServicePreview() { const { t } = useI18n(); return <div className="space-y-3"><div className="grid grid-cols-2 gap-3"><img src={breakfastAsset.url} alt="Petit-déjeuner" loading="lazy" width={1200} height={912} className="h-32 w-full rounded-lg object-cover"/><img src={spaAsset.url} alt="Massage" loading="lazy" width={1200} height={912} className="h-32 w-full rounded-lg object-cover"/></div><p className="text-center text-sm text-muted-foreground">{t("guest.serviceDemo")}</p></div>; }
function ContactButtons({ section }: { section: PublicSection }) { const { t } = useI18n(); const phone = section.content.phones?.[0]; const email = section.content.emails?.[0]; if (!phone && !email) return null; return <div className="grid grid-cols-3 gap-2">{phone && <a className="btn btn-primary px-2" href={`tel:${phone}`}><Phone className="h-4 w-4"/>{t("guest.call")}</a>}{phone && <a className="btn btn-secondary px-2" href={`https://wa.me/${phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4"/>WhatsApp</a>}{email && <a className="btn btn-secondary px-2" href={`mailto:${email}`}><Mail className="h-4 w-4"/>{t("guest.email")}</a>}</div>; }
