import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
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
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-4">
        <Logo />
        <div className="flex items-center gap-2">
          <span className="hidden text-muted-foreground md:inline">{org.name}</span>
          <LanguageSelect compact />
          <button className="min-h-12 whitespace-nowrap px-1 text-sm font-medium text-muted-foreground underline-offset-4 hover:underline" onClick={signOut}>{t("app.signOut")}</button>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-5 pb-16"><Outlet /><footer className="mt-12 border-t pt-6 text-center"><Link to="/app/connections" className="inline-flex min-h-12 items-center font-semibold text-muted-foreground hover:text-primary">Connexions</Link></footer></main>
    </div>
  );
}
