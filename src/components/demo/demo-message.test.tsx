// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
vi.mock("@/components/demo/DemoManager", () => ({ DemoManager: () => null }));
vi.mock("@/components/guest/GuideView", () => ({
  GuideView: ({ onMessage, onRequest }: { onMessage: () => void; onRequest: () => void }) => (
    <>
      <button onClick={onRequest}>request</button>
      <button onClick={onMessage}>message</button>
    </>
  ),
}));
vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({ locale: "fr", t: (key: string) => key }),
  translateStatic: (_locale: string, key: string) => key,
}));
import { DemoExperience } from "./DemoExperience";
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root;
let host: HTMLDivElement;
afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
  sessionStorage.clear();
  vi.restoreAllMocks();
});
it("opens a message form even after a service request and never sends a network request", async () => {
  const fetch = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Demo must stay local"));
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(<DemoExperience />));
  const click = async (text: string) =>
    act(async () =>
      [...host.querySelectorAll("button")].find((b) => b.textContent === text)!.click(),
    );
  await click("request");
  await click("message");
  expect(document.querySelector('[role="dialog"] textarea')).not.toBeNull();
  const textarea = document.querySelector('[role="dialog"] textarea') as HTMLTextAreaElement;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(
      textarea,
      "Bonjour, demande de test",
    );
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () =>
    textarea
      .closest("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
  expect(document.querySelector('[role="dialog"] [role="status"]')?.textContent).toBe(
    "demo.messageSaved",
  );
  expect(fetch).not.toHaveBeenCalled();
  fetch.mockRestore();
});
