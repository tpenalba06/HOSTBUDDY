import { useEffect, useRef, useState } from "react";
import { GuestGuide, type SectionId } from "../guest/GuestGuide";
import { villaMare } from "../guest/villaMare";

export function PhoneDemo() {
  const [mode, setMode] = useState<"guest" | "concierge">("guest");
  const [section, setSection] = useState<SectionId>("welcome");
  const [data, setData] = useState(villaMare);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved">("idle");
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(t.current), []);
  const editWifi = (k: "network" | "password", v: string) => {
    setData((d) => ({ ...d, wifi: { ...d.wifi, [k]: v } }));
    setSaved("saving");
    clearTimeout(t.current);
    t.current = setTimeout(() => setSaved("saved"), 700);
  };

  return (
    <div className="mx-auto w-full max-w-[360px]">
      <div className="mb-4 grid grid-cols-2 rounded-full border-2 bg-card p-1" role="tablist">
        {(["guest", "concierge"] as const).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
            className={`min-h-11 rounded-full font-semibold transition ${mode === m ? "bg-ink text-ink-foreground" : "text-muted-foreground"}`}>
            {m === "guest" ? "Voyageur" : "Conciergerie"}
          </button>
        ))}
      </div>
      <div className="rounded-[2.75rem] bg-ink p-3 shadow-phone">
        <div className="h-[600px] overflow-y-auto rounded-[2.2rem] bg-background p-4">
          <div className="mx-auto mb-3 h-1.5 w-20 rounded-full bg-border" />
          {mode === "guest" ? (
            <GuestGuide data={data} section={section} onSection={setSection} />
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Villa Mare · Modifier</p>
              <h3 className="text-2xl font-semibold">📶 Wi-Fi</h3>
              <label className="block"><span className="mb-1 block font-medium">Nom du réseau</span>
                <input className="field" value={data.wifi.network} onChange={(e) => editWifi("network", e.target.value)} /></label>
              <label className="block"><span className="mb-1 block font-medium">Mot de passe</span>
                <input className="field" value={data.wifi.password} onChange={(e) => editWifi("password", e.target.value)} /></label>
              <div aria-live="polite" className={`rounded-xl p-3 text-center font-semibold ${saved === "saved" ? "bg-success-soft text-success" : "bg-muted text-muted-foreground"}`}>
                {saved === "idle" && "Modifiez un champ, c'est enregistré tout seul"}
                {saved === "saving" && "Enregistrement…"}
                {saved === "saved" && "✓ Enregistré — vos voyageurs le voient déjà"}
              </div>
              <button className="btn btn-secondary w-full" onClick={() => { setMode("guest"); setSection("wifi"); }}>Voir côté voyageur</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
