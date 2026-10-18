import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

const chatHint = {
  fr: ["Une question ?", "Clique sur NONA 💬"],
  en: ["A little question?", "Click NONA to chat 💬"],
  es: ["¿Una pregunta?", "Habla con NONA 💬"],
  de: ["Eine kleine Frage?", "Sprich mit NONA 💬"],
  it: ["Una domanda?", "Parla con NONA 💬"],
  pt: ["Uma pergunta?", "Fala com a NONA 💬"],
};

/** A real 390 × 844 CSS-pixel mobile viewport, scaled as a whole to fit the frame. */
export function VillaMarePhone() {
  const { locale, t } = useI18n();
  const screen = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const element = screen.current;
    if (!element) return;
    const measure = () => setScale(element.getBoundingClientRect().width / 390);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <div className="mx-auto w-full max-w-[350px] text-foreground">
      <div className="hb-marketing-phone shadow-phone">
        <div ref={screen} className="hb-marketing-phone-screen">
          <iframe
            src={`/phone-preview?lang=${locale}`}
            title={`${t("demo.guest")} — Villa Mare`}
            width={390}
            height={844}
            loading="lazy"
            allow="clipboard-write"
            style={{ transform: `scale(${scale})`, visibility: scale ? "visible" : "hidden" }}
          />
        </div>
      </div>
      <div className="nona-phone-chat-hint">
        <p>
          <span>{chatHint[locale][0]}</span>
          <br />
          {chatHint[locale][1]}
        </p>
        <svg viewBox="0 0 112 64" fill="none" aria-hidden="true">
          <path d="M8 48C37 63 92 42 89 6M77 18L89 6L100 20" />
        </svg>
      </div>
      <Link
        to="/demo"
        className="btn btn-primary mt-4 flex min-h-12 w-full justify-center text-sm shadow-soft"
      >
        {t("common.demo")}
      </Link>
    </div>
  );
}
