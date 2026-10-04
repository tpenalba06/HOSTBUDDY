import { Link } from "@tanstack/react-router";
import { GuideView } from "@/components/guest/GuideView";
import { createVillaMare, demoGuide } from "@/components/demo/villa-mare-fixture";
import { useI18n } from "@/lib/i18n";

/** A real guest renderer in a phone frame; one accessible link opens the interactive demo. */
export function VillaMarePhone() {
  const { locale, t } = useI18n();
  return (
    <Link
      to="/demo"
      aria-label={t("common.demo")}
      className="hb-marketing-phone mx-auto block w-full max-w-[290px] overflow-hidden rounded-[32px] border-[8px] border-ink bg-background text-foreground shadow-phone"
    >
      <div inert aria-hidden="true">
        <GuideView guide={demoGuide(createVillaMare(locale))} />
      </div>
    </Link>
  );
}
