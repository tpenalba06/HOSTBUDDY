// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ locale: "fr", t: (key: string) => key }) }));
import { ServiceBookingForm } from "./GuestActions";
import type { BookingTransport } from "@/lib/service-booking-client";
import { readBookingConfig } from "@/lib/service-booking";
const service = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Breakfast",
  description: "Synthetic TEST",
  price: 10,
  pricingType: "per_person" as const,
  revision: "2026-10-01T00:00:00Z",
  bookingConfig: readBookingConfig({ seller: "TEST", cancellation: "TEST" }),
};
let root: Root, host: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  localStorage.clear();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});
it("keeps the shared booking engine behind the current server quote and rejects double clicks", async () => {
  const submit = vi.fn().mockResolvedValue({ id: "order", amount: 30, status: "pending" });
  const read = vi.fn().mockResolvedValue(null);
  const transport: BookingTransport = { mode: "public", submit, read };
  let resolveQuote: (value: { totalCents: number; revision: string }) => void = () => {};
  const quote = vi.fn(
    () =>
      new Promise<{ totalCents: number; revision: string }>((resolve) => {
        resolveQuote = resolve;
      }),
  );
  await act(async () =>
    root.render(
      <ServiceBookingForm
        slug="test"
        service={service}
        prefill={{ quantity: 3 }}
        transport={transport}
        quoteLoader={quote}
      />,
    ),
  );
  const form = host.querySelector("form")!;
  expect(host.querySelector('input[type="number"]')).toHaveProperty("value", "3");
  expect(
    host.querySelector('button[type="submit"]') ?? host.querySelector("form button"),
  ).toHaveProperty("disabled", true);
  await act(async () =>
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
  expect(submit).not.toHaveBeenCalled();
  await act(async () => resolveQuote({ totalCents: 3000, revision: service.revision }));
  const fields = [...host.querySelectorAll("input:not([type])")];
  for (const [index, value] of ["Test", "test@example.invalid"].entries())
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
        fields[index],
        value,
      );
      fields[index]!.dispatchEvent(new Event("input", { bubbles: true }));
    });
  await act(async () => (host.querySelector('input[type="checkbox"]') as HTMLInputElement).click());
  await act(async () => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  expect(submit).toHaveBeenCalledOnce();
  expect(submit.mock.calls[0]![0]).toMatchObject({ quantity: 3, revision: service.revision });
  expect(submit.mock.calls[0]![0]).not.toHaveProperty("price");
  expect(host.querySelector('a[href^="/pay/"]')).toBeNull();
});
it("does not trust a cached receipt as a paid or confirmed server order", async () => {
  const id = crypto.randomUUID();
  localStorage.setItem(
    `nona.booking.test.${service.id}`,
    JSON.stringify({
      id,
      requestId: crypto.randomUUID(),
      receiptToken: "a".repeat(64),
      amount: 1,
      status: "confirmed",
      paymentStatus: "paid",
    }),
  );
  const transport: BookingTransport = {
    mode: "public",
    submit: vi.fn(),
    read: vi.fn().mockResolvedValue(null),
  };
  await act(async () =>
    root.render(<ServiceBookingForm slug="test" service={service} transport={transport} />),
  );
  expect(host.textContent).not.toContain("payments.success");
  expect(host.querySelector('a[href^="/pay/"]')).toBeNull();
});
