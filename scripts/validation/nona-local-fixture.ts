import { createVillaMare, demoGuide } from "../../src/components/demo/villa-mare-fixture";
import { readBookingConfig } from "../../src/lib/service-booking";
import type { Locale } from "../../src/lib/i18n";

// Same Villa Mare source as the app, plus an explicitly synthetic massage for
// local QA only. No read/write to any Supabase project and no booking submission.
export function localGuide(locale: Locale = "fr") {
  const guide = demoGuide(createVillaMare(locale));
  guide.id = "nona-local-fixture";
  guide.name += " — recette locale, données de démonstration";
  guide.services = (guide.services ?? []).map((service) =>
    /massage/i.test(service.name)
      ? {
          ...service,
          bookingConfig: readBookingConfig({
            ...service.bookingConfig,
            requestDate: true,
            seller: "Prestataire fictif du laboratoire NONA",
            cancellation: "Recette locale uniquement, aucune commande réelle.",
          }),
        }
      : service,
  );
  if (!guide.services?.some((service) => /massage/i.test(service.name))) {
    guide.services = [
      ...(guide.services ?? []),
      {
        id: "nona-local-massage",
        name: "Massage détente — prestation fictive de recette",
        description:
          "Service fictif pour tester la préparation d’une demande de massage. Aucune disponibilité ni réservation réelle.",
        price: 60,
        pricingType: "per_person" as const,
        bookingConfig: readBookingConfig({
          maxQuantity: 4,
          requestDate: true,
          seller: "Prestataire fictif du laboratoire NONA",
          cancellation: "Recette locale uniquement, aucune commande réelle.",
        }),
      },
    ];
  }
  return guide;
}
