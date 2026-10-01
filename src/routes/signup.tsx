import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Logo } from "@/components/shared/Logo";
import { setUser } from "@/lib/store";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Essayer HostBuddy gratuitement" },
      { name: "description", content: "Créez votre compte en 30 secondes. 30 jours gratuits, sans carte bancaire." },
      { property: "og:title", content: "Essayer HostBuddy gratuitement" },
      { property: "og:description", content: "30 jours gratuits, sans carte bancaire." },
      { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Signup,
});

const schema = z.object({
  firstName: z.string().trim().min(1, "Indiquez votre prénom").max(60),
  email: z.string().trim().email("Cette adresse e-mail ne semble pas correcte").max(255),
  password: z.string().min(8, "Au moins 8 caractères").max(100),
});

function Signup() {
  const nav = useNavigate();
  const [form, setForm] = useState({ firstName: "", email: "", password: "" });
  const [error, setError] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = schema.safeParse(form);
    if (!r.success) return setError(r.error.issues[0].message);
    setUser({ firstName: r.data.firstName, email: r.data.email });
    nav({ to: "/app" });
  };
  return (
    <main className="mx-auto max-w-md px-5 py-8">
      <Logo />
      <h1 className="mt-10 text-3xl font-semibold">Commençons</h1>
      <p className="mt-2 text-muted-foreground">30 jours gratuits. Sans carte bancaire.</p>
      <button type="button" className="btn btn-secondary mt-6 w-full" onClick={() => setError("La connexion Google arrive bientôt. Utilisez votre e-mail pour l'instant.")}>Continuer avec Google</button>
      <p className="my-5 text-center text-muted-foreground">ou</p>
      <form onSubmit={submit} className="space-y-4">
        {([["firstName", "Votre prénom", "text"], ["email", "Votre e-mail", "email"], ["password", "Choisissez un mot de passe", "password"]] as const).map(([k, l, t]) => (
          <label key={k} className="block"><span className="mb-1 block font-medium">{l}</span>
            <input className="field" type={t} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></label>
        ))}
        {error && <p role="alert" className="rounded-xl bg-warning-soft p-3">{error}</p>}
        <button className="btn btn-primary w-full text-lg">Créer mon compte</button>
      </form>
    </main>
  );
}
