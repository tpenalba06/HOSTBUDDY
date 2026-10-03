import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Cable,
  ClipboardList,
  Home,
  LogOut,
  Menu,
  MessageCircle,
  Plus,
  Star,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/Logo";
import { LanguageSelect } from "@/components/i18n/LanguageSelect";
import { useI18n } from "@/lib/i18n";

export type ManagerArea =
  "properties" | "messages" | "orders" | "feedback" | "connections" | "dashboard" | "team" | "new";
type Role = "owner" | "admin" | "member";
type ManagerPath =
  | "/app"
  | "/app/messages"
  | "/app/orders"
  | "/app/feedback"
  | "/app/connections"
  | "/app/dashboard"
  | "/app/team"
  | "/app/new";
type NavItem = { id: ManagerArea; to: ManagerPath; label: string; icon: LucideIcon };

export function ManagerShell({
  children,
  orgName,
  role = "owner",
  active = "properties",
  onNavigate,
  onSignOut,
  embedded = false,
  viewKey,
}: {
  children: ReactNode;
  orgName: string;
  role?: Role;
  active?: ManagerArea;
  onNavigate?: (area: ManagerArea) => void;
  onSignOut?: () => void;
  embedded?: boolean;
  viewKey?: string;
}) {
  const { t } = useI18n();
  const [more, setMore] = useState(false);
  const contentRef = useRef<HTMLElement>(null);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const operational: NavItem[] = [
    { id: "messages", to: "/app/messages", label: t("nav.messages"), icon: MessageCircle },
    { id: "orders", to: "/app/orders", label: t("nav.orders"), icon: ClipboardList },
    { id: "feedback", to: "/app/feedback", label: t("nav.feedback"), icon: Star },
  ];
  const management: NavItem[] = [
    ...(role !== "member"
      ? [
          {
            id: "connections" as const,
            to: "/app/connections" as const,
            label: t("nav.connections"),
            icon: Cable,
          },
        ]
      : []),
    ...(role === "owner"
      ? [
          {
            id: "dashboard" as const,
            to: "/app/dashboard" as const,
            label: t("nav.dashboard"),
            icon: BarChart3,
          },
          { id: "team" as const, to: "/app/team" as const, label: t("nav.team"), icon: Users },
        ]
      : []),
  ];
  const properties: NavItem = {
    id: "properties",
    to: "/app",
    label: t("nav.properties"),
    icon: Home,
  };
  const routeArea: ManagerArea = pathname.startsWith("/app/messages")
    ? "messages"
    : pathname.startsWith("/app/orders")
      ? "orders"
      : pathname.startsWith("/app/feedback")
        ? "feedback"
        : pathname.startsWith("/app/connections")
          ? "connections"
          : pathname.startsWith("/app/dashboard")
            ? "dashboard"
            : pathname.startsWith("/app/team")
              ? "team"
              : pathname.startsWith("/app/new")
                ? "new"
                : "properties";
  const current = onNavigate ? active : routeArea;
  useEffect(() => {
    if (embedded) contentRef.current?.scrollTo({ top: 0 });
  }, [current, embedded, viewKey, pathname]);
  const navigate = (area: ManagerArea) => {
    setMore(false);
    onNavigate?.(area);
  };
  return (
    <div
      className={`manager-shell relative min-h-0 bg-background text-foreground ${embedded ? "manager-shell-embedded h-full overflow-hidden" : "min-h-screen"}`}
    >
      <header
        className={`${embedded ? "absolute" : "sticky"} inset-x-0 top-0 z-30 border-b bg-background/95 backdrop-blur`}
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5 @sm:px-5">
          {onNavigate ? (
            <Button
              variant="ghost"
              className="h-auto min-w-0 justify-start gap-2 px-1 font-display text-lg font-semibold text-foreground"
              onClick={() => navigate("properties")}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                H
              </span>
              <span className="truncate">HostBuddy</span>
            </Button>
          ) : (
            <Logo to="/app" />
          )}
          <div className="flex min-w-0 items-center justify-end gap-1">
            <span className="manager-shell-org max-w-44 truncate text-sm text-muted-foreground">
              {orgName}
            </span>
            <LanguageSelect compact />
            {onSignOut && (
              <Button variant="ghost" className="min-h-12 px-2" onClick={onSignOut}>
                <LogOut />
                <span className="manager-shell-signout">{t("app.signOut")}</span>
              </Button>
            )}
          </div>
        </div>
      </header>
      <div
        className={`manager-shell-grid ${embedded ? "h-full pt-[69px]" : "mx-auto w-full max-w-7xl"}`}
      >
        <aside className="manager-shell-sidebar min-h-0 overflow-y-auto border-r bg-card/60 p-4">
          <nav className="space-y-1" aria-label={t("demo.manager")}>
            <ShellItem
              item={properties}
              active={current === properties.id}
              onNavigate={onNavigate ? navigate : undefined}
            />
            {operational.map((item) => (
              <ShellItem
                key={item.id}
                item={item}
                active={current === item.id}
                onNavigate={onNavigate ? navigate : undefined}
              />
            ))}
            {management.map((item) => (
              <ShellItem
                key={item.id}
                item={item}
                active={current === item.id}
                onNavigate={onNavigate ? navigate : undefined}
              />
            ))}
            {role !== "member" && (
              <ShellItem
                item={{ id: "new", to: "/app/new", label: t("app.add"), icon: Plus }}
                active={current === "new"}
                primary
                onNavigate={onNavigate ? navigate : undefined}
              />
            )}
          </nav>
        </aside>
        <main
          ref={contentRef}
          className={`manager-shell-content min-h-0 min-w-0 overflow-x-hidden px-4 pb-24 pt-5 @sm:px-6 ${embedded ? "overflow-y-auto" : ""}`}
        >
          {children}
        </main>
      </div>
      <nav
        className={`manager-shell-mobile ${embedded ? "absolute" : "fixed"} inset-x-0 bottom-0 z-40 grid-cols-5 border-t bg-background/95 px-1 pb-1 shadow-[0_-8px_28px_-18px_rgba(0,0,0,.35)] backdrop-blur`}
        aria-label={t("demo.manager")}
      >
        <MobileItem
          item={properties}
          active={current === "properties"}
          onNavigate={onNavigate ? navigate : undefined}
        />
        {operational.map((item) => (
          <MobileItem
            key={item.id}
            item={item}
            active={current === item.id}
            onNavigate={onNavigate ? navigate : undefined}
          />
        ))}
        <Button
          variant="ghost"
          onClick={() => setMore(true)}
          className="h-16 min-w-0 flex-col gap-1 rounded-none px-1 text-[11px] font-semibold"
        >
          <Menu className="h-5 w-5" />
          <span className="truncate">{t("nav.more")}</span>
        </Button>
      </nav>
      <Dialog open={more} onOpenChange={setMore}>
        <DialogContent
          className="top-auto bottom-0 translate-y-0 rounded-t-2xl p-5"
          aria-describedby={undefined}
        >
          <DialogTitle className="font-display text-2xl">{t("nav.more")}</DialogTitle>
          <div className="mt-4 grid gap-2" onClick={() => setMore(false)}>
            {role !== "member" && (
              <DrawerItem
                item={{ id: "new", to: "/app/new", label: t("app.add"), icon: Plus }}
                onNavigate={onNavigate ? navigate : undefined}
              />
            )}{" "}
            {management.map((item) => (
              <DrawerItem
                key={item.id}
                item={item}
                onNavigate={onNavigate ? navigate : undefined}
              />
            ))}
            {onSignOut && (
              <Button
                variant="ghost"
                className="min-h-14 justify-start gap-3 px-4"
                onClick={onSignOut}
              >
                <LogOut />
                {t("app.signOut")}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ShellItem({
  item,
  active,
  primary,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  primary?: boolean;
  onNavigate?: ((area: ManagerArea) => void) | undefined;
}) {
  const classes = `flex min-h-12 w-full items-center gap-3 rounded-lg px-3 font-semibold transition ${primary ? "mt-5 bg-primary text-primary-foreground" : active ? "bg-secondary text-primary" : "hover:bg-muted"}`;
  if (onNavigate)
    return (
      <Button variant="ghost" className={classes} onClick={() => onNavigate(item.id)}>
        <item.icon className="h-5 w-5" />
        <span className="min-w-0 truncate">{item.label}</span>
      </Button>
    );
  return (
    <Link to={item.to} preload="intent" className={classes}>
      <item.icon className="h-5 w-5" />
      <span className="min-w-0 truncate">{item.label}</span>
    </Link>
  );
}
function MobileItem({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: ((area: ManagerArea) => void) | undefined;
}) {
  const classes = `flex h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-none px-1 text-[11px] font-semibold ${active ? "text-primary" : "text-foreground"}`;
  if (onNavigate)
    return (
      <Button variant="ghost" className={classes} onClick={() => onNavigate(item.id)}>
        <item.icon className="h-5 w-5" />
        <span className="max-w-full truncate">{item.label}</span>
      </Button>
    );
  return (
    <Link to={item.to} preload="intent" className={classes}>
      <item.icon className="h-5 w-5" />
      <span className="max-w-full truncate">{item.label}</span>
    </Link>
  );
}
function DrawerItem({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate?: ((area: ManagerArea) => void) | undefined;
}) {
  if (onNavigate)
    return (
      <Button
        variant="outline"
        className="min-h-14 justify-start gap-3 px-4"
        onClick={() => onNavigate(item.id)}
      >
        <item.icon />
        {item.label}
      </Button>
    );
  return (
    <Link
      to={item.to}
      className="flex min-h-14 items-center gap-3 rounded-lg border bg-card px-4 font-semibold"
    >
      <item.icon />
      {item.label}
    </Link>
  );
}
