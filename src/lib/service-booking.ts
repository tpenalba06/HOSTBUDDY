import { z } from "zod";

export const bookingConfigSchema = z.object({
  maxQuantity: z.number().int().min(1).max(20).default(20),
  requestDate: z.boolean().default(false),
  instructions: z.string().trim().max(1000).default(""),
  cancellation: z.string().trim().max(2000).default(""),
  seller: z.string().trim().max(2000).default(""),
  options: z
    .array(
      z.object({
        id: z.string().uuid(),
        label: z.string().trim().min(1).max(80),
        priceCents: z.number().int().min(0).max(99999900),
      }),
    )
    .max(20)
    .default([]),
  slots: z
    .array(z.string().datetime({ offset: true }))
    .max(100)
    .default([]),
});
export type BookingConfig = z.infer<typeof bookingConfigSchema>;
export const defaultBookingConfig: BookingConfig = bookingConfigSchema.parse({});
export function readBookingConfig(value: unknown): BookingConfig {
  const result = bookingConfigSchema.safeParse(value);
  return result.success ? result.data : defaultBookingConfig;
}
export function serviceTotalCents(
  price: number,
  quantity: number,
  config: BookingConfig,
  optionId?: string,
) {
  if (
    !Number.isFinite(price) ||
    price < 0 ||
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    quantity > config.maxQuantity
  )
    throw new Error("invalid_service_quote");
  const option = config.options.find((item) => item.id === optionId);
  if ((config.options.length && !option) || (optionId && !option))
    throw new Error("service_option_required");
  const total = (Math.round(price * 100) + (option?.priceCents ?? 0)) * quantity;
  if (!Number.isSafeInteger(total) || total > 99999900) throw new Error("invalid_service_quote");
  return total;
}
export const serviceBookingRequest = z.object({
  slug: z.string().min(1).max(80),
  serviceId: z.string().uuid(),
  revision: z.string().datetime({ offset: true }).optional(),
  requestId: z.string().uuid(),
  receiptToken: z.string().regex(/^[a-f0-9]{64}$/),
  name: z.string().trim().min(1).max(80),
  contact: z.string().trim().min(1).max(160),
  quantity: z.number().int().min(1).max(20),
  requestedFor: z.string().datetime({ offset: true }).nullable().optional(),
  optionId: z.string().uuid().nullable().optional(),
  details: z.string().trim().max(1000).default(""),
  termsAccepted: z.literal(true),
  website: z.string().max(0).default(""),
});
