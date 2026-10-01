import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { DemoExperience } from "@/components/demo/DemoExperience";
import { Logo } from "@/components/shared/Logo";

const title = "Démo interactive HostBuddy — Voyageur et gestionnaire";
const description = "Essayez un guide voyageur HostBuddy et son éditeur simple, sur mobile comme sur ordinateur.";
export const Route = createFileRoute("/demo")({ head: () => ({ meta: [{ title }, { name: "description", content: description }, { property: "og:title", content: title }, { property: "og:description", content: description }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: DemoPage });
function DemoPage(){return <div className="min-h-screen bg-ink px-3 py-4 text-ink-foreground sm:px-6 sm:py-6"><header className="mx-auto flex max-w-6xl items-center justify-between gap-4"><Link to="/" className="inline-flex min-h-12 items-center gap-2 font-semibold"><ArrowLeft/>Retour au site</Link><div className="rounded-full bg-background px-4 py-2 text-foreground"><Logo/></div></header><main className="mx-auto max-w-6xl py-6 sm:py-10"><div className="mb-7 max-w-2xl"><h1 className="text-4xl font-semibold sm:text-5xl">Essayez HostBuddy, des deux côtés.</h1><p className="mt-3 text-lg text-ink-foreground/80">Modifiez l’arrivée, le Wi-Fi, une photo ou un service, puis regardez le résultat côté voyageur.</p></div><DemoExperience/></main></div>}