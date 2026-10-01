import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { BarChart3, Cable, ClipboardList, Home, LogOut, Menu, MessageCircle, Plus, Settings, Star, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { Logo } from "@/components/shared/Logo";
import { supabase } from "@/integrations/supabase/client";
import { orgQuery, useOrg } from "@/components/app/useOrg";
import { FriendlyError, Loading } from "@/components/app/Friendly";
import { LanguageSelect } from "@/components/i18n/LanguageSelect";
import { useI18n } from "@/lib/i18n";
import { useState } from "react";

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
  const [more, setMore] = useState(false);
  const signOut = async () => {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", search: { mode: "login" }, replace: true });
  };
  const operational = [{ to: "/app/messages", label: t("nav.messages"), icon: MessageCircle }, { to: "/app/orders", label: t("nav.orders"), icon: ClipboardList }, { to: "/app/feedback", label: t("nav.feedback"), icon: Star }];
  const management = [...(org.role !== "member" ? [{ to: "/app/connections", label: t("nav.connections"), icon: Cable }] : []), ...(org.role === "owner" ? [{ to: "/app/dashboard", label: t("nav.dashboard"), icon: BarChart3 }, { to: "/app/team", label: t("nav.team"), icon: Users }] : [])];
  return (
    <div className="min-h-screen pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
      <header className="sticky top-0 z-30 border-b bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <Logo to="/app" />
        <div className="flex items-center gap-2">
          <span className="hidden text-muted-foreground md:inline">{org.name}</span>
          <LanguageSelect compact />
          <Button variant="ghost" className="min-h-12 px-3" onClick={signOut}><LogOut/><span className="hidden sm:inline">{t("app.signOut")}</span></Button>
        </div>
      </div></header>
      <div className="mx-auto grid max-w-7xl md:grid-cols-[220px_1fr] md:gap-7 md:px-6 lg:grid-cols-[240px_1fr]"><aside className="hidden py-6 md:block"><nav className="sticky top-24 space-y-1"><NavItem to="/app" label={t("nav.properties")} icon={Home}/>{operational.map((item)=><NavItem key={item.to} {...item}/>)}{management.map((item)=><NavItem key={item.to} {...item}/>)}{org.role !== "member" && <Link to="/app/new" className="btn btn-primary mt-5 w-full px-3"><Plus/>{t("app.add")}</Link>}</nav></aside><main className="min-w-0 px-4 pb-12 sm:px-6 md:px-0"><Outlet /></main></div>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-background/95 px-1 pb-[max(.3rem,env(safe-area-inset-bottom))] shadow-[0_-8px_28px_-18px_rgba(0,0,0,.35)] backdrop-blur md:hidden"><MobileItem to="/app" label={t("nav.properties")} icon={Home}/>{operational.slice(0,3).map((item)=><MobileItem key={item.to} {...item}/>)}<button onClick={()=>setMore(true)} className="flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold"><Menu className="h-5 w-5"/>{t("nav.more")}</button></nav>
      {more && <div className="fixed inset-0 z-50 flex items-end bg-ink/55 md:hidden" role="dialog" aria-modal="true"><div className="w-full rounded-t-2xl bg-background p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"><div className="flex items-center justify-between"><h2 className="text-2xl font-semibold">{t("nav.more")}</h2><Button variant="ghost" size="icon" className="h-12 w-12" onClick={()=>setMore(false)}><X/></Button></div><div className="mt-4 grid gap-2">{org.role !== "member" && <Link to="/app/new" onClick={()=>setMore(false)} className="btn btn-primary"><Plus/>{t("app.add")}</Link>}{management.map((item)=><Link key={item.to} to={item.to} onClick={()=>setMore(false)} className="flex min-h-14 items-center gap-3 rounded-lg border bg-card px-4 font-semibold"><item.icon/>{item.label}</Link>)}<button onClick={signOut} className="flex min-h-14 items-center gap-3 rounded-lg px-4 font-semibold"><LogOut/>{t("app.signOut")}</button></div></div></div>}
    </div>
  );
}

function NavItem({to,label,icon:Icon}:{to:string;label:string;icon:typeof Home}) { return <Link to={to} preload="intent" activeProps={{className:"bg-secondary text-primary"}} className="flex min-h-12 items-center gap-3 rounded-lg px-3 font-semibold transition hover:bg-muted"><Icon className="h-5 w-5"/>{label}</Link>; }
function MobileItem({to,label,icon:Icon}:{to:string;label:string;icon:typeof Home}) { return <Link to={to} preload="intent" activeProps={{className:"text-primary"}} className="flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold"><Icon className="h-5 w-5"/>{label}</Link>; }
