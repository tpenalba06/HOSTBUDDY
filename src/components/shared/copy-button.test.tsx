// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ locale: "en" }) }));
import { CopyButton } from "./CopyButton";
let root: Root;
let host: HTMLDivElement;
const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  if (clipboardDescriptor) Object.defineProperty(navigator, "clipboard", clipboardDescriptor);
  else Reflect.deleteProperty(navigator, "clipboard");
  vi.unstubAllGlobals();
});
it("announces success only after the clipboard has accepted the value", async () => {
  let finish!: () => void;
  const writeText = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  await act(async () => root.render(<CopyButton value="Villa-secret" label="Copy password" />));
  const button = host.querySelector("button")!;
  await act(async () => button.click());
  expect(writeText).toHaveBeenCalledExactlyOnceWith("Villa-secret");
  expect(button.disabled).toBe(true);
  expect(host.querySelector('[role="status"]')?.textContent).toBe("");
  await act(async () => finish());
  expect(button.disabled).toBe(false);
  expect(host.querySelector('[role="status"]')?.textContent).toBe("Copied!");
});
it("keeps copy available and explains a denied clipboard without claiming success", async () => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
  });
  await act(async () => root.render(<CopyButton value="Villa-secret" label="Copy password" />));
  await act(async () => host.querySelector("button")!.click());
  expect(host.querySelector("button")!.disabled).toBe(false);
  expect(host.querySelector('[role="status"]')?.textContent).toContain("Could not copy");
  expect(host.textContent).not.toContain("Copied!");
});
