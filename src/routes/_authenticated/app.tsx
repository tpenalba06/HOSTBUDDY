import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { orgQuery, useOrg } from "@/components/app/useOrg";
import { FriendlyError, Loading, friendlyMessage } from "@/components/app/Friendly";
import { ManagerShell } from "@/components/app/ManagerShell";
import { Logo } from "@/components/shared/Logo";
import { saveOrganizationContact } from "@/lib/data/properties";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [{ title: "Mon espace — HostBuddy" }, { name: "robots", content: "noindex" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(orgQuery),
  pendingComponent: () => <Loading />,
  errorComponent: () => (
    <main className="mx-auto max-w-2xl px-5">
      <FriendlyError />
    </main>
  ),
  component: AppLayout,
});

function AppLayout() {
  const org = useOrg();
  const nav = useNavigate();
  const qc = useQueryClient();
  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", search: { mode: "login" }, replace: true });
  };
  if (org.role === "owner" && !org.contact_setup_completed_at) {
    return (
      <ContactSetup
        orgId={org.id}
        initialEmail={org.contact_email || org.accountEmail || ""}
        initialPhone={org.contact_phone || ""}
        defaultName={org.firstName || ""}
        onSaved={async () => {
          await qc.invalidateQueries({ queryKey: ["org"] });
        }}
      />
    );
  }

  return (
    <ManagerShell orgName={org.name} role={org.role} onSignOut={signOut}>
      <Outlet />
    </ManagerShell>
  );
}


function ContactSetup({
  orgId,
  initialEmail,
  initialPhone,
  defaultName,
  onSaved,
}: {
  orgId: string;
  initialEmail: string;
  initialPhone: string;
  defaultName: string;
  onSaved: () => Promise<void>;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await saveOrganizationContact(orgId, {
        name: defaultName,
        email,
        phone,
      });
      await onSaved();
    } catch (e) {
      setError(friendlyMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-warm px-5 py-10">
      <div className="mx-auto max-w-lg rounded-2xl border bg-background p-6 shadow-soft sm:p-8">
        <Logo />
        <p className="mt-8 font-bold text-primary">Une dernière étape</p>
        <h1 className="mt-2 text-3xl font-semibold">Comment vos voyageurs peuvent-ils vous joindre ?</h1>
        <p className="mt-3 text-muted-foreground">
          Ces coordonnées seront ajoutées automatiquement à la section Contact de vos nouveaux livrets.
        </p>

        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="block">
            <span className="mb-1 block font-semibold">E-mail de contact</span>
            <input
              className="field"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="contact@conciergerie.fr"
            />
          </label>

          <label className="block">
            <span className="mb-1 block font-semibold">Téléphone / WhatsApp</span>
            <input
              className="field"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+33 6 12 34 56 78"
            />
          </label>

          <div className="rounded-xl bg-muted p-4 text-sm">
            <p className="font-semibold">Dans le livret voyageur :</p>
            <p className="mt-1 text-muted-foreground">Appeler · WhatsApp · E-mail, chacun en un clic.</p>
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-warning-soft p-3">
              {error}
            </p>
          )}

          <button
            className="btn btn-primary w-full text-lg"
            disabled={busy || !email.trim() || !phone.trim()}
          >
            {busy ? "Enregistrement…" : "Continuer"}
          </button>
        </form>
      </div>
    </main>
  );
}
