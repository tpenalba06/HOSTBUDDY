import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/shared/Logo";
import { getUser, signOut, type User } from "@/lib/store";

// Authenticated concierge app shell (Phase 1: local session skeleton).
export const Route = createFileRoute("/app")({
  ssr: false,
  head: () => ({ meta: [{ title: "Mon espace — HostBuddy" }, { name: "robots", content: "noindex" }] }),
  component: AppLayout,
});

function AppLayout() {
  const nav = useNavigate();
  const [user, setU] = useState<User | null>(null);
  useEffect(() => { const u = getUser(); if (!u) nav({ to: "/signup", replace: true }); else setU(u); }, [nav]);
  if (!user) return null;
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
        <Logo />
        <button className="min-h-12 px-3 font-medium text-muted-foreground" onClick={() => { signOut(); nav({ to: "/", replace: true }); }}>Se déconnecter</button>
      </header>
      <main className="mx-auto max-w-2xl px-5 pb-16"><Outlet /></main>
    </div>
  );
}
