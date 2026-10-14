import { expect, it } from "vitest";
import { bookingConfigSchema, serviceBookingRequest, serviceTotalCents } from "./service-booking";
import { serviceCopy } from "./service-copy";
import { LOCALES } from "./i18n";
it("validates the new booking inputs and refuses a quantity or option outside the advertised configuration", () => {
  const config = bookingConfigSchema.parse({
    maxQuantity: 3,
    options: [
      { id: "11111111-1111-4111-8111-111111111111", label: "Synthetic extra", priceCents: 250 },
    ],
  });
  expect(serviceTotalCents(10, 2, config, config.options[0]!.id)).toBe(2500);
  expect(() => serviceTotalCents(10, 4, config, config.options[0]!.id)).toThrow();
  expect(() => serviceTotalCents(10, 2, config)).toThrow();
  expect(serviceBookingRequest.safeParse({}).success).toBe(false);
  expect(bookingConfigSchema.safeParse({ slots: ["invented time"] }).success).toBe(false);
});
it("provides all new service actions in every supported interface language", () => {
  for (const locale of LOCALES)
    for (const key of [
      "newRequest",
      "addOption",
      "addSlot",
      "seller",
      "cancellation",
      "pastOrders",
      "removeItem",
      "cancelNote",
    ] as const)
      expect(serviceCopy(locale, key)).toBeTruthy();
});
