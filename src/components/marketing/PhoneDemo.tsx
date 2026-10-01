import { useEffect, useRef, useState } from "react";
import { GuestGuide, type SectionId } from "../guest/GuestGuide";
import { villaMare } from "../guest/villaMare";
import { useI18n } from "@/lib/i18n";

export function PhoneDemo() {
  const { t } = useI18n();
  const [mode, setMode] = useState<"guest" | "concierge">("guest");
  const [section, setSection] = useState<SectionId>("welcome");
  const [data, setData] = useState(villaMare);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const editWifi = (key: "network" | "password", value: string) => { setData((current) => ({ ...current, wifi: { ...current.wifi, [key]: value } })); setSaved("saving"); clearTimeout(timer.current); timer.current = setTimeout(() => setSaved("saved"), 700); };
  return <div className="mx-auto w-full max-w-[380px]">
    <div className="mb-4 grid grid-cols-2 rounded-full border border-ink-foreground/25 bg-ink-foreground/10 p-1 backdrop-blur" role="tablist">{(["guest", "concierge"] as const).map((item) => <button key={item} role="tab" aria-selected={mode === item} onClick={() => setMode(item)} className={`min-h-12 rounded-full font-bold transition ${mode === item ? "bg-card text-foreground shadow-soft" : "text-ink-foreground"}`}>{item === "guest" ? "Voyageur" : "Gestionnaire"}</button>)}</div>
    <div className="rounded-[2.5rem] bg-card/15 p-2 shadow-phone ring-1 ring-ink-foreground/20"><div className="h-[640px] overflow-y-auto rounded-[2rem] bg-background p-4"><div className="mx-auto mb-3 h-1.5 w-20 rounded-full bg-border"/>{mode === "guest" ? <GuestGuide data={data} section={section} onSection={setSection}/> : <div className="space-y-5"><p className="text-sm text-muted-foreground">Villa Mare · {t("common.edit")}</p><h3 className="text-3xl font-semibold">Wi-Fi</h3><label className="block"><span className="mb-1 block font-medium">Nom du réseau</span><input className="field" value={data.wifi.network} onChange={(e) => editWifi("network", e.target.value)}/></label><label className="block"><span className="mb-1 block font-medium">Mot de passe</span><input className="field" value={data.wifi.password} onChange={(e) => editWifi("password", e.target.value)}/></label><div aria-live="polite" className={`rounded-lg p-3 text-center font-semibold ${saved === "saved" ? "bg-success-soft text-success" : "bg-muted text-muted-foreground"}`}>{saved === "idle" ? "Modifiez un champ : tout s'enregistre automatiquement" : saved === "saving" ? "Enregistrement…" : `✓ ${t("common.saved")}`}</div><button className="btn btn-primary w-full" onClick={() => { setMode("guest"); setSection("wifi"); }}>Voir côté voyageur</button></div>}</div></div>
  </div>;
}
