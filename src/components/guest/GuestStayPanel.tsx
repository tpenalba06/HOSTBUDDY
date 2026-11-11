import { useEffect, useState } from "react";
import { z } from "zod";
import { ArrivalTemplate, WifiTemplate } from "./GuideContent";
import { useI18n } from "@/lib/i18n";

const responseSchema = z.object({
  entryInstructions: z.string().nullable(),
  wifiSsid: z.string().nullable(),
  wifiPassword: z.string().nullable(),
  expiresAt: z.string(),
});
type Stay = z.infer<typeof responseSchema>;

export function GuestStayPanel({ slug }: { slug: string }) {
  const [token, setToken] = useState<string>();
  useEffect(() => {
    const receive = () => {
      const match = /^#stay=([0-9a-f]{64})$/.exec(window.location.hash);
      if (!match) return;
      setToken(match[1]);
      // The fragment never reaches the server and is removed after reading.
      window.history.replaceState(window.history.state, "", location.pathname + location.search);
    };
    receive();
    window.addEventListener("hashchange", receive);
    return () => window.removeEventListener("hashchange", receive);
  }, []);

  return token ? <AuthorizedStay key={token} slug={slug} token={token} /> : null;
}

function AuthorizedStay({ slug, token }: { slug: string; token: string }) {
  const { locale, t } = useI18n();
  const [stay, setStay] = useState<Stay>();
  const [unavailable, setUnavailable] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    let request: AbortController | undefined;
    let expiry: ReturnType<typeof setTimeout> | undefined;
    const clear = () => {
      if (expiry) clearTimeout(expiry);
      setStay(undefined);
      setCopied(false);
      setUnavailable(true);
    };
    const refresh = async () => {
      request?.abort();
      const current = new AbortController();
      request = current;
      try {
        const response = await fetch("/api/public/stay-access", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ slug, token }),
          cache: "no-store",
          signal: AbortSignal.any([current.signal, AbortSignal.timeout(8000)]),
        });
        const parsed = response.ok ? responseSchema.safeParse(await response.json()) : null;
        if (!active || current.signal.aborted) return;
        const remaining = parsed?.success ? Date.parse(parsed.data.expiresAt) - Date.now() : NaN;
        if (!parsed?.success || !Number.isFinite(remaining) || remaining <= 0) {
          clear();
          return;
        }
        if (expiry) clearTimeout(expiry);
        setStay(parsed.data);
        setUnavailable(false);
        expiry = setTimeout(clear, Math.min(remaining, 2_147_483_647));
      } catch {
        if (active && !current.signal.aborted) clear();
      }
    };
    const offline = () => {
      request?.abort();
      clear();
    };
    void refresh();
    const interval = setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    window.addEventListener("offline", offline);
    window.addEventListener("online", refresh);
    return () => {
      active = false;
      request?.abort();
      clearInterval(interval);
      if (expiry) clearTimeout(expiry);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", refresh);
    };
  }, [slug, token]);

  const fr = locale === "fr";
  const wifi =
    stay?.wifiSsid && stay.wifiPassword
      ? [
          { label: t("guest.network"), text: stay.wifiSsid },
          { label: t("guest.wifiPassword"), text: stay.wifiPassword },
        ]
      : null;
  return (
    <section aria-labelledby="guest-stay-title" className="mx-auto max-w-3xl space-y-4 px-4 py-5">
      <h2 id="guest-stay-title" className="font-display text-2xl">
        {fr ? "Consignes de ton séjour" : "Your stay instructions"}
      </h2>
      {!stay && (
        <p role="status">
          {unavailable
            ? fr
              ? "Accès indisponible. Vérifie ta connexion ou contacte ton gestionnaire."
              : "Access unavailable. Check your connection or contact your host."
            : fr
              ? "Vérification de ton accès…"
              : "Checking your access…"}
        </p>
      )}
      {stay?.entryInstructions && (
        <ArrivalTemplate
          items={[{ label: t("guest.arrivalInstructions"), text: stay.entryInstructions }]}
          t={t}
        />
      )}
      {wifi && (
        <WifiTemplate
          items={wifi}
          qrItems={wifi}
          t={t}
          copied={copied}
          onCopy={() => setCopied(true)}
        />
      )}
    </section>
  );
}
