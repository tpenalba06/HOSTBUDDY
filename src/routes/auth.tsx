import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Logo } from "@/components/shared/Logo";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { LanguageSelect } from "@/components/i18n/LanguageSelect";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { mode?: "login" | "signup" } => (s['mode'] === "login" || s['mode'] === "signup" ? { mode: s['mode'] } : {}),
  head: () => ({
    meta: [
      { title: "Essayer HostBuddy gratuitement" },
      { name: "description", content: "Créez votre compte en 30 secondes. 30 jours gratuits, sans carte bancaire." },
      { property: "og:title", content: "Essayer HostBuddy gratuitement" },
      { property: "og:description", content: "30 jours gratuits, sans carte bancaire." },
      { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const signupSchema = z.object({
  firstName: z.string().trim().min(1, "Indiquez votre prénom").max(60),
  email: z.string().trim().email("Cette adresse e-mail ne semble pas correcte").max(255),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères").max(100),
});

function AuthPage() {
  const { t } = useI18n();
  const { mode } = Route.useSearch();
  const nav = useNavigate();
  const [form, setForm] = useState({ firstName: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const isSignup = mode !== "login";
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) nav({ to: "/app", replace: true }); });
  }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const parsed = isSignup ? signupSchema.safeParse(form) : signupSchema.omit({ firstName: true }).safeParse(form);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Vérifiez vos informations");
    setBusy(true);
    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email: form.email.trim(), password: form.password,
          options: { emailRedirectTo: window.location.origin + "/app", data: { first_name: form.firstName.trim() } },
        });
        if (error) throw error;
        if (!data.session) return setCheckEmail(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
        if (error) throw error;
      }
      nav({ to: "/app" });
    } catch (err) {
      const msg = (err as { message?: string }).message ?? "";
      setError(
        /already registered/i.test(msg) ? "Un compte existe déjà avec cet e-mail. Connectez-vous."
        : /invalid login/i.test(msg) ? "E-mail ou mot de passe incorrect."
        : /not confirmed/i.test(msg) ? "Confirmez d'abord votre adresse en cliquant sur le lien reçu par e-mail."
        : /weak|pwned/i.test(msg) ? "Ce mot de passe est trop simple. Choisissez-en un autre."
        : "La connexion a échoué. Réessayez dans un instant.",
      );
    } finally { setBusy(false); }
  };

  const google = async () => {
    setError("");
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) setError("La connexion Google n'a pas abouti. Réessayez ou utilisez votre e-mail.");
    else if (!r.redirected) nav({ to: "/app" });
  };

  if (checkEmail) {
    return (
      <main className="mx-auto max-w-md px-5 py-8 text-center">
       <div className="flex items-center justify-between"><Link to="/" className="inline-flex min-h-12 items-center gap-1 font-semibold text-primary">← Retour</Link><LanguageSelect compact /></div><div className="mt-4"><Logo /></div>
        <p className="mt-12 text-5xl">📬</p>
        <h1 className="mt-4 text-3xl font-semibold">{t("auth.checkTitle")}</h1>
        <p className="mt-3 text-lg">{t("auth.checkBody")} <strong>{form.email}</strong></p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-5 py-8">
       <div className="flex items-center justify-between"><Link to="/" className="inline-flex min-h-12 items-center gap-1 font-semibold text-primary">← Retour au site</Link><LanguageSelect compact /></div><div className="mt-4"><Logo /></div>
      <h1 className="mt-10 text-3xl font-semibold">{isSignup ? t("auth.signupTitle") : `${t("auth.loginTitle")} 👋`}</h1>
      {isSignup && <p className="mt-2 text-muted-foreground">{t("auth.subtitle")}</p>}
      <button type="button" className="btn btn-secondary mt-6 w-full" onClick={google}>{t("auth.google")}</button>
      <p className="my-5 text-center text-muted-foreground">{t("auth.or")}</p>
      <form onSubmit={submit} className="space-y-4">
        {isSignup && (
          <label className="block"><span className="mb-1 block font-medium">{t("auth.firstName")}</span>
            <input className="field" autoComplete="given-name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></label>
        )}
        <label className="block"><span className="mb-1 block font-medium">{t("common.email")}</span>
          <input className="field" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label className="block"><span className="mb-1 block font-medium">{isSignup ? t("auth.choosePassword") : t("common.password")}</span>
          <input className="field" type="password" autoComplete={isSignup ? "new-password" : "current-password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
        {error && <p role="alert" className="rounded-xl bg-warning-soft p-3">{error}</p>}
        <button className="btn btn-primary w-full text-lg" disabled={busy}>{busy ? "…" : isSignup ? t("auth.create") : t("auth.signIn")}</button>
      </form>
      <p className="mt-6 text-center">
        {isSignup ? `${t("auth.existing")} ` : `${t("auth.new")} `}
        <Link to="/auth" search={{ mode: isSignup ? "login" : "signup" }} className="inline-block min-h-12 py-3 font-semibold text-primary underline">
          {isSignup ? t("auth.signIn") : t("auth.create")}
        </Link>
      </p>
    </main>
  );
}
