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
}: {
  guide: PublicGuide;
  serviceId: string | null;
  onClose: () => void;
}) {
  const { locale } = useI18n();
  const transport = useMemo(() => demoBookingTransport(guide), [guide]);
  const service = guide.services?.find((item) => item.id === serviceId);
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
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
