import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";

/** Delayed feedback avoids a flash on instant navigation and announces slower loads. */
export function NavigationFeedback() {
  const pending = useRouterState({ select: (state) => state.status === "pending" });
  const [visible, setVisible] = useState(false);
  const { t } = useI18n();
  useEffect(() => {
    if (!pending) {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => setVisible(true), 180);
    return () => clearTimeout(timer);
  }, [pending]);
  return visible ? (
    <div className="nona-navigation-progress" role="status">
      <span className="sr-only">{t("common.loading")}</span>
    </div>
  ) : null;
}
