// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { translations } from "@/lib/i18n";
vi.mock("@/lib/i18n", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/i18n")>();
  return {
    ...actual,
    useI18n: () => ({ locale: "fr", t: (key: string) => actual.translations.fr[key] ?? key }),
  };
});
import { ManagerPropertiesScreen } from "./ManagerScreens";
let root: ReturnType<typeof createRoot>;
let container: HTMLElement;
const property = {
  id: "a",
  name: "Maison Test",
  slug: "maison-test",
  status: "published" as const,
};
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});
const button = (text: string) =>
  Array.from(document.querySelectorAll("button")).find((b) => b.textContent === text)!;
it.each(["owner", "admin", "member"] as const)(
  "shows permanent deletion only for owner/admin (%s)",
  async (role) => {
    await act(async () =>
      root.render(
        <ManagerPropertiesScreen
          properties={[property]}
          role={role}
          onEdit={() => {}}
          onView={() => {}}
          renderQr={() => null}
          onDelete={async () => ({ cleanupPending: false, billingPending: false })}
        />,
      ),
    );
    expect(container.textContent?.includes("Supprimer définitivement")).toBe(role !== "member");
  },
);
it("requires the exact name, warns of irreversibility and submits only the selected property", async () => {
  const onDelete = vi.fn().mockResolvedValue({ cleanupPending: false, billingPending: false });
  await act(async () =>
    root.render(
      <ManagerPropertiesScreen
        properties={[property]}
        role="admin"
        onEdit={() => {}}
        onView={() => {}}
        renderQr={() => null}
        onDelete={onDelete}
      />,
    ),
  );
  await act(async () => button("Supprimer définitivement").click());
  const dialog = document.querySelector('[role="dialog"]')!;
  expect(dialog.textContent).toContain("irréversible");
  const confirm = dialog.querySelector("button.bg-destructive") as HTMLButtonElement;
  expect(confirm.disabled).toBe(true);
  const input = dialog.querySelector("input")!;
  for (const value of ["Maison Test ", "Maison Test"]) {
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(confirm.disabled).toBe(value !== property.name);
  }
  await act(async () => confirm.click());
  expect(onDelete).toHaveBeenCalledWith(property.id, property.name);
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  expect(translations.fr["property.delete"]).toBe("Supprimer définitivement");
});
