import { useRouter } from "@tanstack/react-router";
import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { translateStatic, type Locale, LOCALES, useI18n } from "@/lib/i18n";

export function FriendlyError({ message }: { message?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const { reset } = useQueryErrorResetBoundary();
  return (
    <div className="surface mt-10 p-6 text-center">
      <p className="text-4xl">🌥️</p>
      <h2 className="mt-2 text-2xl font-semibold">{t("errors.title")}</h2>
      <p className="mt-2">{message ?? t("errors.body")}</p>
      <button
        className="btn btn-primary mt-6 w-full"
        onClick={() => {
          reset();
          router.invalidate();
        }}
      >
        {t("common.retry")}
      </button>
    </div>
  );
}

export function Loading({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <p className="mt-16 animate-pulse text-center text-lg text-muted-foreground">
      {label ?? t("common.loading")}
    </p>
  );
}

export const friendlyMessage = (e: unknown) => {
  if (
    e instanceof Error &&
    ["payments.subscriptionRequired", "payments.syncRequired"].includes(e.message)
  ) {
    const stored =
      typeof document === "undefined"
        ? "fr"
        : document.documentElement.lang || window.navigator.language;
    const short = stored.split("-")[0] as Locale;
    return translateStatic(LOCALES.includes(short) ? short : "fr", e.message);
  }
  return e instanceof Error && e.constructor.name === "FriendlyError"
    ? e.message
    : "Votre connexion a été interrompue. Vos informations déjà enregistrées sont conservées.";
};
