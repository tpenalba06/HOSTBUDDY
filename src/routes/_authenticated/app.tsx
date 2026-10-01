import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { Cable, Home, LogOut, MessageCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { Logo } from "@/components/shared/Logo";
import { supabase } from "@/integrations/supabase/client";
import { orgQuery, useOrg } from "@/components/app/useOrg";
import { FriendlyError, Loading } from "@/components/app/Friendly";
import { LanguageSelect } from "@/components/i18n/LanguageSelect";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({ meta: [{ title: "Mon espace — HostBuddy" }, { name: "robots", content: "noindex" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(orgQuery),
  pendingComponent: () => <Loading />,
  errorComponent: () => <main className="mx-auto max-w-2xl px-5"><FriendlyError /></main>,
  component: AppLayout,
});

function AppLayout() {
  const { t } = useI18n();
  const org = useOrg();
  const nav = useNavigate();
  const qc = useQueryClient();
  const signOut = async () => {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", search: { mode: "login" }, replace: true });
  };
  return (
    <div className="min-h-screen pb-20 sm:pb-0">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur"><div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Logo />
        <div className="flex items-center gap-2">
          <span className="hidden text-muted-foreground md:inline">{org.name}</span>
          <LanguageSelect compact />
          <Button variant="ghost" className="min-h-12 px-3" onClick={signOut}><LogOut/><span className="hidden sm:inline">{t("app.signOut")}</span></Button>
        </div>
      </div></header>
      <div className="mx-auto grid max-w-6xl sm:grid-cols-[190px_1fr] sm:gap-8 sm:px-6"><aside className="hidden py-6 sm:block"><nav className="sticky top-24 space-y-1"><Link to="/app" className="flex min-h-12 items-center gap-3 rounded-lg px-3 font-semibold hover:bg-muted"><Home/>Hébergements</Link><Link to="/app/messages" className="flex min-h-12 items-center gap-3 rounded-lg px-3 font-semibold hover:bg-muted"><MessageCircle/>Messages</Link><Link to="/app/connections" className="flex min-h-12 items-center gap-3 rounded-lg px-3 font-semibold hover:bg-muted"><Cable/>Connexions</Link><Link to="/app/new" className="btn btn-primary mt-5 w-full px-3"><Plus/>Ajouter</Link></nav></aside><main className="min-w-0 px-4 pb-12 sm:px-0"><Outlet /></main></div>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t bg-background/95 p-1 pb-[max(.25rem,env(safe-area-inset-bottom))] backdrop-blur sm:hidden"><Link to="/app" className="flex min-h-14 flex-col items-center justify-center text-xs font-semibold"><Home/>Hébergements</Link><Link to="/app/messages" className="flex min-h-14 flex-col items-center justify-center text-xs font-semibold"><MessageCircle/>Messages</Link><Link to="/app/new" className="flex min-h-14 flex-col items-center justify-center text-xs font-semibold text-primary"><Plus/>Ajouter</Link></nav>
    </div>
  );
}
