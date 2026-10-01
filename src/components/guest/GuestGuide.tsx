import { useState } from "react";
import { ArrowLeft, Check, Copy, Mail, MessageCircle, Phone, Star } from "lucide-react";
import type { GuideData } from "./villaMare";
import { LanguageSelect } from "@/components/i18n/LanguageSelect";
import { useI18n } from "@/lib/i18n";
import arrivalAsset from "@/assets/hostbuddy-arrival.jpg.asset.json";
import breakfastAsset from "@/assets/hostbuddy-breakfast.jpg.asset.json";
import spaAsset from "@/assets/hostbuddy-spa.jpg.asset.json";

export const SECTIONS = [
  { id: "arrival", label: "Mon arrivée", icon: "🔑" }, { id: "wifi", label: "Wi-Fi", icon: "📶" },
  { id: "house", label: "La maison", icon: "🏡" }, { id: "places", label: "Bonnes adresses", icon: "📍" },
  { id: "services", label: "Services", icon: "✨" }, { id: "departure", label: "Mon départ", icon: "🧳" },
  { id: "pool", label: "Piscine", icon: "🏊" }, { id: "contact", label: "Contact", icon: "💬" },
] as const;
export type SectionId = "welcome" | (typeof SECTIONS)[number]["id"];
const primary = ["arrival", "wifi", "house", "places", "services", "departure"];

export function GuestGuide({ data, section, onSection }: { data: GuideData; section: SectionId; onSection: (s: SectionId) => void }) {
  const { t } = useI18n();
  const [cart, setCart] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const back = () => { onSection("welcome"); setCart(null); setPaid(false); };
  if (section === "welcome") return <div className="space-y-4">
    <div className="relative -mx-4 -mt-4 h-60 overflow-hidden rounded-t-[1.9rem]"><img src={arrivalAsset.url} alt="Villa Mare" width={1536} height={1024} className="h-full w-full object-cover"/><div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-transparent to-ink/20"/><div className="absolute inset-x-4 top-4 flex justify-end"><LanguageSelect compact /></div><div className="absolute inset-x-5 bottom-5 text-ink-foreground"><p className="text-sm font-semibold text-ink-foreground/80">{t("guest.welcome")}</p><h3 className="text-3xl font-semibold">{data.name}</h3><p className="mt-1 text-sm">{data.host}</p></div></div>
    <p className="font-semibold">{t("guest.stay")}</p>
    <div className="grid grid-cols-2 gap-2">{SECTIONS.filter((s) => primary.includes(s.id)).map((s) => <button key={s.id} onClick={() => onSection(s.id)} className="flex min-h-20 flex-col justify-between rounded-lg border bg-card p-3 text-left font-semibold transition hover:border-primary"><span className="text-xl" aria-hidden>{s.icon}</span>{s.label}</button>)}</div>
    <div className="grid grid-cols-2 gap-2"><button onClick={() => onSection("contact")} className="btn btn-primary px-3"><MessageCircle className="h-4 w-4"/>Contact</button><button onClick={() => onSection("pool")} className="btn btn-secondary px-3">🏊 Piscine</button></div>
    <p className="text-center text-xs text-muted-foreground">{t("guest.noInstall")}</p>
  </div>;
  const meta = SECTIONS.find((s) => s.id === section);
  const service = data.services.find((s) => s.id === cart);
  if (!meta) return null;
  return <div className="space-y-4"><button onClick={back} className="inline-flex min-h-12 items-center gap-2 font-semibold text-primary"><ArrowLeft className="h-4 w-4"/>{t("guest.back")}</button><h3 className="text-3xl font-semibold"><span aria-hidden>{meta.icon}</span> {meta.label}</h3>
    {section === "arrival" && <p>{data.arrival}</p>}{section === "house" && <p>{data.house}</p>}{section === "pool" && <p>{data.pool}</p>}{section === "departure" && <p>{data.departure}</p>}
    {section === "wifi" && <div className="rounded-lg bg-muted p-4"><p className="text-sm text-muted-foreground">Réseau</p><p className="text-lg font-semibold">{data.wifi.network}</p><p className="mt-2 text-sm text-muted-foreground">Mot de passe</p><p className="text-lg font-semibold">{data.wifi.password}</p><button className="btn btn-primary mt-4 w-full" onClick={() => navigator.clipboard?.writeText(data.wifi.password)}><Copy className="h-4 w-4"/>Copier</button></div>}
    {section === "places" && data.places.map((p) => <div key={p.name} className="rounded-lg border p-3"><p className="font-semibold">{p.name}</p><p className="text-sm text-muted-foreground">{p.note}</p></div>)}
    {section === "services" && !service && <><img src={breakfastAsset.url} alt="Petit-déjeuner" loading="lazy" width={1200} height={912} className="h-36 w-full rounded-lg object-cover"/>{data.services.map((s) => <button key={s.id} onClick={() => setCart(s.id)} className="flex w-full items-center justify-between rounded-lg border bg-card p-3 text-left hover:border-primary"><span><span className="block font-semibold">{s.name}</span><span className="text-sm text-muted-foreground">{s.desc}</span></span><span className="font-semibold text-primary">{s.price} €</span></button>)}</>}
    {section === "services" && service && !paid && <div className="space-y-3 rounded-lg border p-4"><img src={service.id === "ms" ? spaAsset.url : breakfastAsset.url} alt="" loading="lazy" width={1200} height={912} className="h-32 w-full rounded-md object-cover"/><p className="font-semibold">{service.name}</p><p className="text-sm text-muted-foreground">{service.desc}</p><p className="text-2xl font-semibold">{service.price} €</p><button className="btn btn-primary w-full" onClick={() => setPaid(true)}>Simuler la commande</button><p className="text-center text-xs text-muted-foreground">Démo · aucun paiement réel</p></div>}
    {section === "services" && paid && <div className="rounded-lg bg-success-soft p-4 text-center"><Check className="mx-auto h-8 w-8 text-success"/><p className="font-semibold">Commande de démonstration confirmée</p></div>}
    {section === "contact" && <div className="grid gap-2"><a className="btn btn-primary" href={`tel:${data.phone}`}><Phone className="h-4 w-4"/>{t("guest.call")}</a><a className="btn btn-secondary" href={`https://wa.me/${data.phone.replace("+", "")}`} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4"/>WhatsApp</a><a className="btn btn-secondary" href={`mailto:${data.email}`}><Mail className="h-4 w-4"/>E-mail</a></div>}
    {section === "departure" && <button className="btn btn-secondary w-full"><Star className="h-4 w-4"/>Exemple de demande d'avis</button>}
  </div>;
}
