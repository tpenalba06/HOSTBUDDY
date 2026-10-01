import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Logo } from "@/components/shared/Logo";
import { supabase } from "@/integrations/supabase/client";
import { orgQuery, useOrg } from "@/components/app/useOrg";
import { FriendlyError, Loading } from "@/components/app/Friendly";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({ meta: [{ title: "Mon espace — HostBuddy" }, { name: "robots", content: "noindex" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(orgQuery),
  pendingComponent: () => <Loading />,
  errorComponent: () => <main className="mx-auto max-w-2xl px-5"><FriendlyError /></main>,
  component: AppLayout,
});

function AppLayout() {
  const org = useOrg();
  const nav = useNavigate();
  const qc = useQueryClient();
  const signOut = async () => {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", search: { mode: "login" }, replace: true });
  };
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-4">
        <Logo />
        <div className="flex items-center gap-2">
          <span className="hidden text-muted-foreground sm:inline">{org.name}</span>
          <button className="min-h-12 px-3 font-medium text-muted-foreground underline-offset-4 hover:underline" onClick={signOut}>Se déconnecter</button>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-5 pb-16"><Outlet /></main>
    </div>
  );
}
