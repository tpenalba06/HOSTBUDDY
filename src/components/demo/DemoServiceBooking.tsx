import { useMemo } from "react";
import type { PublicGuide } from "@/lib/data/public-guide.functions";
import { useI18n } from "@/lib/i18n";
import { nonaVisualCopy } from "@/lib/nona-visual-copy";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ServiceBookingForm } from "@/components/guest/GuestActions";
import { demoBookingTransport } from "./demo-bookings";

/** Presentation adapter only: same acquired form/engine, explicit demo transport. */
export function DemoServiceBooking({
  guide,
  serviceId,
  onClose,
  immediate = false,
}: {
  guide: PublicGuide;
  serviceId: string | null;
  onClose: () => void;
  immediate?: boolean;
}) {
  const { locale } = useI18n();
  const transport = useMemo(() => demoBookingTransport(guide, immediate), [guide, immediate]);
  const service = guide.services?.find((item) => item.id === serviceId);
  if (immediate && service) {
    return (
      <section className="space-y-3 p-4">
        <button className="btn btn-secondary min-h-11" onClick={onClose}>
          {locale === "fr" ? "Retour aux services" : "Back to services"}
        </button>
        <h2 className="font-display text-2xl">{service.name}</h2>
        <p>{nonaVisualCopy(locale).local}</p>
        <ServiceBookingForm
          key={service.id}
          slug="nona-visual-demo"
          service={service}
          transport={transport}
          submitLabel={locale === "fr" ? "Réserver" : "Book"}
        />
      </section>
    );
  }
  return (
    <Dialog open={!!service} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="nona-demo-booking-dialog">
        <DialogTitle>{service?.name}</DialogTitle>
        <DialogDescription>{nonaVisualCopy(locale).local}</DialogDescription>
        {service && (
          <ServiceBookingForm
            key={service.id}
            slug="nona-visual-demo"
            service={service}
            transport={transport}
            {...(immediate ? { submitLabel: locale === "fr" ? "Réserver" : "Book" } : {})}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
