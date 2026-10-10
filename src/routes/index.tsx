import { VillaMarePhone } from "@/components/marketing/VillaMarePhone";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  Globe2,
  Link2,
  MessageCircleMore,
  ShieldCheck,
  Sparkles,
  Star,
  WandSparkles,
} from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { PhoneDemo } from "@/components/marketing/PhoneDemo";
import { SocialProof } from "@/components/marketing/SocialProof";
import { LanguageSelect } from "@/components/i18n/LanguageSelect";
import { useI18n } from "@/lib/i18n";
import arrivalAsset from "@/assets/hostbuddy-arrival.jpg.asset.json";
import breakfastAsset from "@/assets/hostbuddy-breakfast.jpg.asset.json";
import spaAsset from "@/assets/hostbuddy-spa.jpg.asset.json";

const TITLE = "HostBuddy — Votre accueil voyageur, prêt en quelques minutes";
const DESC =
  "Importez vos contenus existants. HostBuddy prépare un guide voyageur élégant, sans application à télécharger.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const sourceLabels = ["Airbnb", "Booking", "Sunver"];

function Landing() {
  const { t } = useI18n();
  return (
    <div className="overflow-clip">
      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-5 sm:px-5">
        <Logo />
        <nav className="flex min-w-0 items-center gap-1 sm:gap-2">
          <Link
            to="/integrations"
            className="hidden min-h-12 items-center whitespace-nowrap px-1 text-sm font-semibold text-foreground hover:text-primary sm:inline-flex sm:px-2 sm:text-base"
          >
            {t("marketing.integrations")}
          </Link>
          <LanguageSelect compact />
          <Link
            to="/auth"
            search={{ mode: "login" }}
            className="btn btn-secondary min-h-12 px-3 text-sm sm:px-5"
          >
            {t("common.login")}
          </Link>
        </nav>
      </header>

      <main>
        <section className="relative mx-auto min-h-[calc(100dvh-5rem)] max-w-[1600px] px-3 pb-8 pt-1 sm:px-5 lg:px-8">
          <img
            src={arrivalAsset.url}
            fetchPriority="high"
            alt={t("marketing.arrivalAlt")}
            width={1536}
            height={1024}
            className="absolute inset-x-3 top-1 h-[calc(100%-2rem)] w-[calc(100%-1.5rem)] rounded-xl object-cover object-center sm:inset-x-5 sm:w-[calc(100%-2.5rem)] lg:inset-x-8 lg:w-[calc(100%-4rem)]"
          />
          <div className="absolute inset-x-3 top-1 h-[calc(100%-2rem)] rounded-xl bg-gradient-to-r from-ink/95 via-ink/70 to-ink/20 sm:inset-x-5 lg:inset-x-8" />
          <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-8 px-4 py-8 sm:px-10 sm:py-14 lg:grid-cols-[1.3fr_0.7fr] lg:px-12">
            <div className="max-w-2xl text-ink-foreground">
              <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-card/95 px-4 py-2 text-sm font-bold text-foreground shadow-soft">
                <WandSparkles className="h-4 w-4 text-primary" />
                {t("marketing.badge")}
              </p>
              <h1 className="text-balance text-5xl font-semibold leading-[1.05] sm:text-7xl">
                {t("marketing.title")}
              </h1>
              <p className="mt-6 max-w-xl text-lg font-medium leading-relaxed text-ink-foreground/90 sm:text-xl">
                {t("marketing.subtitle")}
              </p>
              <ul className="mt-6 grid gap-2 text-base font-semibold sm:grid-cols-2">
                {[
                  "marketing.benefit1",
                  "marketing.benefit2",
                  "marketing.benefit3",
                  "marketing.benefit4",
                ].map((k) => (
                  <li key={k} className="flex items-center gap-2">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                      <Check className="h-4 w-4" />
                    </span>
                    {t(k)}
                  </li>
                ))}
              </ul>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link to="/auth" search={{ mode: "signup" }} className="btn btn-primary text-lg">
                  {t("common.try")}
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  to="/demo"
                  className="btn border-2 border-ink-foreground/60 bg-ink/20 text-ink-foreground backdrop-blur hover:bg-ink/35"
                >
                  {t("common.demo")}
                </Link>
              </div>
              <p className="mt-5 text-sm font-semibold text-ink-foreground/80">
                {t("marketing.paidTier")} ·{" "}
                <span className="font-display text-2xl font-semibold text-ink-foreground sm:text-3xl">
                  {t("marketing.price")}
                </span>
              </p>
              <p className="mt-2 text-sm font-semibold text-ink-foreground/80">
                {t("marketing.trial")}
              </p>
            </div>
            <VillaMarePhone />
          </div>
        </section>

        <section className="border-y bg-card py-6">
          <div className="mx-auto max-w-6xl px-5 text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              {t("marketing.for")}
            </p>
            <p className="mt-2 text-balance text-lg font-semibold">{t("marketing.operators")}</p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-24">
          <div className="max-w-3xl">
            <p className="font-bold text-primary">{t("marketing.badge")}</p>
            <h2 className="mt-3 text-balance text-4xl font-semibold sm:text-5xl">
              {t("marketing.importTitle")}
            </h2>
          </div>
          <div className="mt-12 grid gap-0 overflow-hidden rounded-2xl border bg-card shadow-soft md:grid-cols-3">
            {[
              [Link2, "01", "marketing.step1", "marketing.step1d"],
              [Sparkles, "02", "marketing.step2", "marketing.step2d"],
              [Check, "03", "marketing.step3", "marketing.step3d"],
            ].map(([Icon, n, title, desc], i) => {
              const C = Icon as typeof Link2;
              return (
                <div
                  key={n as string}
                  className={`relative p-7 ${i < 2 ? "border-b md:border-b-0 md:border-r" : ""}`}
                >
                  <span className="text-sm font-extrabold text-primary">{n as string}</span>
                  <C className="mt-8 h-8 w-8 text-success" />
                  <h3 className="mt-4 text-2xl font-semibold">{t(title as string)}</h3>
                  <p className="mt-2 text-muted-foreground">{t(desc as string)}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="mr-2 text-sm font-semibold text-muted-foreground">
              {t("marketing.sources")}:
            </span>
            {[...sourceLabels, t("marketing.sourceWebsite"), t("marketing.sourceText")].map((s) => (
              <span
                key={s}
                className="rounded-full border bg-card px-3 py-1.5 text-sm font-semibold"
              >
                {s}
              </span>
            ))}
          </div>
        </section>

        <section className="bg-ink py-20 text-ink-foreground">
          <div className="mx-auto max-w-7xl px-3 sm:px-5">
            <div className="mx-auto max-w-3xl text-center">
              <p className="font-bold text-accent">HostBuddy</p>
              <h2 className="mt-3 text-balance text-4xl font-semibold sm:text-5xl">
                {t("demo.homePreviewTitle")}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-foreground/80">
                {t("demo.homePreviewDesc")}
              </p>
              <div className="mt-5 flex items-center justify-center gap-3 text-sm font-semibold">
                <ShieldCheck className="h-5 w-5 text-accent" />
                {t("marketing.qrLine")}
              </div>
            </div>
            <div id="demo" className="mt-9">
              <div className="mx-auto w-full max-w-6xl">
                <PhoneDemo />
              </div>
              <Link to="/demo" className="btn btn-primary mx-auto mt-6 flex max-w-xs">
                {t("marketing.openDemo")}
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-24">
          <div className="grid gap-12 lg:grid-cols-2">
            <div className="overflow-hidden rounded-2xl">
              <img
                src={breakfastAsset.url}
                alt={t("marketing.breakfastAlt")}
                loading="lazy"
                width={1200}
                height={912}
                className="aspect-[4/3] h-full w-full object-cover object-center"
              />
            </div>
            <div className="self-center">
              <span className="rounded-full bg-accent px-3 py-1.5 text-sm font-bold text-accent-foreground">
                {t("marketing.upcoming")}
              </span>
              <h2 className="mt-5 text-4xl font-semibold">{t("marketing.services")}</h2>
              <p className="mt-4 text-lg text-muted-foreground">{t("marketing.servicesD")}</p>
              <div className="mt-8 grid grid-cols-2 gap-3">
                {[
                  t("guest.breakfast"),
                  t("guest.massage"),
                  t("guest.transfer"),
                  t("guest.late"),
                ].map((x) => (
                  <div key={x} className="rounded-lg border bg-card p-4 font-semibold">
                    {x}
                  </div>
                ))}
              </div>
            </div>
            <div className="self-center lg:order-3">
              <Star className="h-9 w-9 text-primary" />
              <h2 className="mt-5 text-4xl font-semibold">{t("marketing.reviews")}</h2>
              <p className="mt-4 text-lg text-muted-foreground">{t("marketing.reviewsD")}</p>
              <p className="mt-6 border-l-4 border-success pl-4 font-semibold">
                {t("marketing.noGating")}
              </p>
            </div>
            <div className="overflow-hidden rounded-2xl lg:order-4">
              <img
                src={spaAsset.url}
                alt={t("marketing.spaAlt")}
                loading="lazy"
                width={1200}
                height={912}
                className="aspect-[4/3] h-full w-full object-cover object-center"
              />
            </div>
          </div>
        </section>

        <section className="bg-accent py-20">
          <div className="mx-auto max-w-5xl px-5 text-center">
            <Globe2 className="mx-auto h-10 w-10 text-accent-foreground" />
            <h2 className="mt-5 text-4xl font-semibold">{t("marketing.language")}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-accent-foreground">
              {t("marketing.languageD")}
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-2">
              {["Français", "English", "Español", "Deutsch", "Italiano", "Português"].map((x) => (
                <span key={x} className="rounded-full bg-card px-4 py-2 font-semibold shadow-sm">
                  {x}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-24">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="font-bold text-primary">{t("marketing.proof")}</p>
              <h2 className="mt-3 text-4xl font-semibold">{t("marketing.creation")}</h2>
              <p className="mt-4 max-w-xl text-lg text-muted-foreground">
                {t("marketing.creationD")}
              </p>
              <p className="mt-8 flex items-center gap-3 font-semibold">
                <MessageCircleMore className="h-5 w-5 text-success" />
                {t("marketing.proofD")}
              </p>
            </div>
            <div className="surface p-8">
              <h3 className="text-3xl font-semibold">{t("marketing.pricing")}</h3>
              <p className="mt-4 font-semibold">{t("payments.free")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("payments.freeNote")}</p>
              <p className="mt-6 font-display text-5xl font-semibold">{t("marketing.price")}</p>
              <p className="mt-2 text-muted-foreground">{t("marketing.priceNote")}</p>
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="btn btn-primary mt-7 w-full text-lg"
              >
                {t("common.try")}
              </Link>
              <p className="mt-4 text-center text-sm text-muted-foreground">
                {t("marketing.trial")}
              </p>
            </div>
          </div>
        </section>
        <SocialProof />
      </main>
      <footer className="border-t py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 sm:flex-row">
          <Logo />
          <Link to="/integrations" className="font-semibold text-primary hover:underline">
            {t("marketing.integrations")}
          </Link>
          <a href="/legal" className="min-h-12 py-3 text-primary underline">
            {t("legal.title")}
          </a>
          <p className="text-sm text-muted-foreground">
            © 2026 HostBuddy · {t("marketing.footer")}
          </p>
        </div>
      </footer>
    </div>
  );
}
