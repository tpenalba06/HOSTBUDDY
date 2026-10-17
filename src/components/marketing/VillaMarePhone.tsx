import { Link } from "@tanstack/react-router";
import { GuideView } from "@/components/guest/GuideView";
import { createVillaMare, demoGuide } from "@/components/demo/villa-mare-fixture";
import { useI18n } from "@/lib/i18n";

/** A real guest renderer in a scrollable phone frame; a visible button opens the interactive demo. */
export function VillaMarePhone() {
  const { locale, t } = useI18n();
  return (
    <div className="hb-marketing-phone relative mx-auto block w-full max-w-[290px] overflow-hidden rounded-[32px] border-[8px] border-ink bg-background text-foreground shadow-phone">
      <div
        className="h-full overflow-y-auto overscroll-contain pb-20 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ touchAction: "pan-y" }}
      >
        <div inert aria-hidden="true">
          <GuideView guide={demoGuide(createVillaMare(locale))} />
        </div>
      </div>
      <Link
        to="/demo"
        className="btn btn-primary absolute inset-x-4 bottom-4 z-10 min-h-12 justify-center text-sm shadow-soft"
      >
        {t("common.demo")}
      </Link>
    </div>
  );
}
