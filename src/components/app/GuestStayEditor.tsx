import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function GuestStayEditor({ id, slug }: { id: string; slug: string }) {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const stays = useQuery({
    queryKey: ["guest-stay-access", id],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_guest_stay_access", { _property: id });
      if (error) throw new Error("Liste indisponible");
      return data;
    },
  });

  async function issue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const field = (name: string) => String(values.get(name) ?? "");
    const opens = new Date(field("opens"));
    const expires = new Date(field("expires"));
    const ssid = field("ssid");
    const password = field("password");
    const instructions = field("instructions").trim();
    if (
      !(expires > opens) ||
      expires <= new Date() ||
      Boolean(ssid) !== Boolean(password) ||
      (!instructions && !ssid)
    ) {
      setNotice(
        "Vérifie les dates et ajoute les consignes d’arrivée ou les deux identifiants Wi-Fi.",
      );
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      const { data, error } = await supabase.rpc("issue_guest_stay_access", {
        _property: id,
        _opens_at: opens.toISOString(),
        _expires_at: expires.toISOString(),
        _entry_instructions: instructions || null,
        _wifi_ssid: ssid || null,
        _wifi_password: password || null,
      });
      const token = data?.[0]?.token;
      if (error || !token || !/^[0-9a-f]{64}$/.test(token)) throw new Error("unavailable");
      setLink(`${location.origin}/l/${encodeURIComponent(slug)}#stay=${token}`);
      form.reset();
      await stays.refetch();
    } catch {
      setNotice("Impossible de créer cet accès. Vérifie les dates ou réessaie.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(stayId: string) {
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("revoke_guest_stay_access", {
        _property: id,
        _id: stayId,
      });
      if (error || !data) throw new Error("unavailable");
      setLink("");
      setNotice("Accès révoqué.");
      await stays.refetch();
    } catch {
      setNotice("La révocation a échoué. Réessaie.");
    } finally {
      setBusy(false);
    }
  }

  const input = "mt-1 block w-full rounded-lg border bg-background px-3 py-2";
  return (
    <details
      className="surface mt-6 p-4"
      onToggle={(event) => {
        setOpen(event.currentTarget.open);
        if (!event.currentTarget.open) setLink("");
      }}
    >
      <summary className="cursor-pointer font-semibold">Accès privés de séjour</summary>
      {open && (
        <div className="mt-4 space-y-4">
          <p>
            Ajoute ici les consignes et identifiants réservés au voyageur. Partage le lien
            uniquement avec lui.
          </p>
          <form className="grid gap-3" onSubmit={issue}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                Ouverture (heure locale)
                <input className={input} name="opens" type="datetime-local" required />
              </label>
              <label>
                Expiration (heure locale)
                <input className={input} name="expires" type="datetime-local" required />
              </label>
            </div>
            <label>
              Consignes privées d’arrivée
              <textarea className={input} name="instructions" maxLength={4000} rows={3} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                Réseau Wi-Fi
                <input className={input} name="ssid" maxLength={32} />
              </label>
              <label>
                Mot de passe Wi-Fi
                <input
                  className={input}
                  name="password"
                  type="password"
                  maxLength={128}
                  autoComplete="new-password"
                />
              </label>
            </div>
            <button className="btn btn-primary min-h-12" disabled={busy}>
              Créer un lien de séjour
            </button>
          </form>
          {link && (
            <label className="block">
              Lien à copier maintenant
              <input
                className={input}
                value={link}
                readOnly
                onFocus={(event) => event.currentTarget.select()}
              />
            </label>
          )}
          {notice && <p role="status">{notice}</p>}
          {stays.isError && <p role="status">Liste des accès indisponible.</p>}
          {!!stays.data?.length && (
            <ul className="space-y-2">
              {stays.data.map((stay) => (
                <li
                  key={stay.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <span>
                    {new Date(stay.opens_at).toLocaleString()} –{" "}
                    {new Date(stay.expires_at).toLocaleString()}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary min-h-11"
                    disabled={busy}
                    onClick={() => void revoke(stay.id)}
                  >
                    Révoquer
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </details>
  );
}
