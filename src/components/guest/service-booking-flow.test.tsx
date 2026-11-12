// @vitest-environment jsdom
import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ locale: "fr", t: (key: string) => key }) }));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) => children,
  DialogContent: ({ children }: { children: ReactNode }) => <div role="dialog">{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));
import { OrderDrawer } from "./GuestActions";
import { ServicesScreen } from "../app/ServicesScreen";
import type { Service } from "@/lib/data/operations";
const option = "11111111-1111-4111-8111-111111111111",
  serviceId = "22222222-2222-4222-8222-222222222222",
  orderId = "33333333-3333-4333-8333-333333333333",
  property = "44444444-4444-4444-8444-444444444444";
const config = {
  maxQuantity: 3,
  requestDate: false,
  slots: [],
  options: [{ id: option, label: "Synthetic option", priceCents: 250 }],
  seller: "Synthetic TEST seller",
  cancellation: "Synthetic TEST cancellation",
  instructions: "Synthetic instructions",
};
const service = {
  id: serviceId,
  name: "Synthetic service",
  description: "Fixture description",
  price: 10,
  pricingType: "per_person" as const,
  bookingConfig: config,
  revision: "2026-10-14T00:00:00Z",
};
let root: Root, container: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  window.localStorage.clear();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});
async function change(input: HTMLInputElement | HTMLSelectElement, value: string) {
  const prototype =
    input.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(
      new Event(input.tagName === "SELECT" ? "change" : "input", { bubbles: true }),
    );
  });
}
const button = (text: string) =>
  [...container.querySelectorAll("button")].find((item) => item.textContent === text)!;
it("manager editing preserves assignments/options and soft deletion uses the existing callback", async () => {
  const save = vi.fn().mockResolvedValue(undefined),
    remove = vi.fn().mockResolvedValue(undefined);
  vi.spyOn(window, "confirm").mockReturnValue(true);
  const current = {
    id: serviceId,
    organization_id: "org",
    created_at: "2026-10-14T00:00:00Z",
    updated_at: "2026-10-14T00:00:00Z",
    property_id: property,
    name: service.name,
    description: service.description,
    price: 10,
    pricing_type: "per_person",
    is_active: true,
    image_path: null,
    booking_config: config,
    property_ids: [property],
  } as Service;
  await act(async () =>
    root.render(
      createElement(ServicesScreen, {
        services: [current],
        propertyId: property,
        properties: [{ id: property, name: "Fixture property" }],
        onSave: save,
        onDelete: remove,
      }),
    ),
  );
  await act(async () => button("common.edit").click());
  expect(container.textContent).toContain("Synthetic option");
  await act(async () => button("services.save").click());
  expect(save).toHaveBeenCalledOnce();
  expect(save.mock.calls[0]![0]).toMatchObject({
    id: serviceId,
    propertyIds: [property],
    bookingConfig: config,
  });
  await act(async () => button("Supprimer le service").click());
  expect(remove).toHaveBeenCalledExactlyOnceWith(serviceId);
});
it("traveller booking retries the same identity, displays the server quote and resumes an issued payment link without claiming payment", async () => {
  const send = vi
    .fn()
    .mockRejectedValueOnce(new Error("Synthetic network interruption"))
    .mockResolvedValueOnce(
      Response.json({ ok: true, booking: { id: orderId, amount: 25, status: "pending" } }),
    )
    .mockResolvedValueOnce(
      Response.json({ id: orderId, amount: 25, status: "confirmed", paymentStatus: "pending" }),
    );
  vi.stubGlobal("fetch", send);
  await act(async () =>
    root.render(createElement(OrderDrawer, { slug: "fixture", service, onClose: () => {} })),
  );
  const textInputs = [...container.querySelectorAll("input:not([type])")] as HTMLInputElement[];
  await change(textInputs[0]!, "Synthetic guest");
  await change(textInputs[1]!, "fixture@example.invalid");
  await change(container.querySelector("select")!, option);
  await change(container.querySelector('input[type="number"]')!, "2");
  await act(async () =>
    (container.querySelector('input[type="checkbox"]') as HTMLInputElement).click(),
  );
  const submit = async () =>
    act(async () => {
      container
        .querySelector("form")!
        .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
  await submit();
  expect(container.querySelector('[role="alert"]')).not.toBeNull();
  await submit();
  const first = JSON.parse(send.mock.calls[0]![1].body),
    second = JSON.parse(send.mock.calls[1]![1].body);
  expect(first.requestId).toBe(second.requestId);
  expect(first.receiptToken).toBe(second.receiptToken);
  expect(first.optionId).toBe(option);
  expect(first.quantity).toBe(2);
  expect(first).not.toHaveProperty("price");
  expect(container.textContent).toContain("25.00");
  expect(container.textContent).toContain("Cette demande n’est pas encore payée");
  await act(async () => button("Actualiser le suivi").click());
  expect(container.querySelector('a[href^="/pay/"]')).not.toBeNull();
  expect(container.textContent).not.toContain("payments.success");
});
