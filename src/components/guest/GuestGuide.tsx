import { useState } from "react";
import type { GuideData } from "./villaMare";

export const SECTIONS = [
  { id: "welcome", label: "Bienvenue", icon: "👋" },
  { id: "arrival", label: "Mon arrivée", icon: "🔑" },
  { id: "wifi", label: "Wi-Fi", icon: "📶" },
  { id: "house", label: "La maison", icon: "🏡" },
  { id: "pool", label: "Piscine", icon: "🏊" },
  { id: "places", label: "Bonnes adresses", icon: "📍" },
  { id: "services", label: "Services", icon: "✨" },
  { id: "departure", label: "Mon départ", icon: "🧳" },
  { id: "contact", label: "Contact", icon: "💬" },
] as const;
export type SectionId = (typeof SECTIONS)[number]["id"];

export function GuestGuide({ data, section, onSection }: { data: GuideData; section: SectionId; onSection: (s: SectionId) => void }) {
  const [cart, setCart] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const back = () => { onSection("welcome"); setCart(null); setPaid(false); };

  if (section === "welcome") {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-warm p-5">
          <p className="text-sm text-muted-foreground">{data.host} vous souhaite</p>
          <h3 className="text-2xl font-semibold">Bienvenue à {data.name}</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {SECTIONS.slice(1).map((s) => (
            <button key={s.id} onClick={() => onSection(s.id)}
              className="flex min-h-14 items-center gap-2 rounded-xl border bg-card px-3 text-left text-[15px] font-medium hover:border-primary">
              <span aria-hidden>{s.icon}</span>{s.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const meta = SECTIONS.find((s) => s.id === section)!;
  const service = data.services.find((s) => s.id === cart);
  return (
    <div className="space-y-4">
      <button onClick={back} className="min-h-12 text-[15px] font-semibold text-primary">← Retour à l'accueil</button>
      <h3 className="text-2xl font-semibold"><span aria-hidden>{meta.icon}</span> {meta.label}</h3>
      {section === "arrival" && <p>{data.arrival}</p>}
      {section === "house" && <p>{data.house}</p>}
      {section === "pool" && <p>{data.pool}</p>}
      {section === "departure" && <p>{data.departure}</p>}
      {section === "wifi" && (
        <div className="rounded-xl bg-muted p-4">
          <p className="text-sm text-muted-foreground">Réseau</p><p className="text-lg font-semibold">{data.wifi.network}</p>
          <p className="mt-2 text-sm text-muted-foreground">Mot de passe</p><p className="text-lg font-semibold">{data.wifi.password}</p>
          <button className="btn btn-primary mt-4 w-full" onClick={() => navigator.clipboard?.writeText(data.wifi.password)}>Copier le mot de passe</button>
        </div>
      )}
      {section === "places" && data.places.map((p) => (
        <div key={p.name} className="rounded-xl border p-3"><p className="font-semibold">{p.name}</p><p className="text-sm text-muted-foreground">{p.note}</p></div>
      ))}
      {section === "services" && !service && data.services.map((s) => (
        <button key={s.id} onClick={() => setCart(s.id)} className="flex w-full items-center justify-between rounded-xl border p-3 text-left hover:border-primary">
          <span><span className="block font-semibold">{s.name}</span><span className="text-sm text-muted-foreground">{s.desc}</span></span>
          <span className="font-semibold text-primary">{s.price} €</span>
        </button>
      ))}
      {section === "services" && service && !paid && (
        <div className="space-y-3 rounded-xl border p-4">
          <p className="font-semibold">{service.name}</p><p className="text-sm text-muted-foreground">{service.desc}</p>
          <p className="text-2xl font-semibold">{service.price} €</p>
          <button className="btn btn-primary w-full" onClick={() => setPaid(true)}>Payer {service.price} €</button>
          <p className="text-center text-xs text-muted-foreground">Démo — aucun paiement réel. Pas de compte nécessaire.</p>
        </div>
      )}
      {section === "services" && paid && (
        <div className="rounded-xl bg-success-soft p-4 text-center"><p className="text-3xl">✅</p><p className="font-semibold">Commande confirmée</p><p className="text-sm">La conciergerie a été prévenue.</p></div>
      )}
      {section === "contact" && (
        <div className="grid gap-2">
          <a className="btn btn-primary" href={`tel:${data.phone}`}>📞 Appeler</a>
          <a className="btn btn-secondary" href={`https://wa.me/${data.phone.replace("+", "")}`} target="_blank" rel="noreferrer">💬 WhatsApp</a>
          <a className="btn btn-secondary" href={`mailto:${data.email}`}>✉️ E-mail</a>
        </div>
      )}
    </div>
  );
}
