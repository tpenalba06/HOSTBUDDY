// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ locale: "en", t: (key: string) => key }) }));
vi.mock("@/components/ai-elements/conversation", () => ({
  Conversation: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ConversationContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/ai-elements/message", () => ({
  Message: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  MessageContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  MessageResponse: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));
import { NonaConcierge } from "./NonaConcierge";
let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  sessionStorage.clear();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});
async function renderNona() {
  await act(async () => root.render(<NonaConcierge demo guide={{ id: "ui", name: "Demo", originalLocale: "en", sections: [], services: [] }} />));
}
it("starts closed with no invented mascot and keeps the English demo disclosure", async () => {
  await renderNona();
  expect(host.querySelector(".nona-launcher img")).toBeNull();
  expect(host.querySelector('[role="dialog"]')).toHaveProperty("hidden", true);
  const launcher = host.querySelector<HTMLButtonElement>(".nona-launcher");
  if (!launcher) throw new Error("Missing Nona launcher");
  await act(async () => launcher.click());
  expect(host.textContent).toContain("Demo · no real order or payment");
  expect(host.querySelector("textarea")).toHaveAttribute("aria-label", "Your question or request…");
  expect(host.querySelector('button[type="submit"]')).toHaveProperty("disabled", true);
});
it("closes on Escape and returns focus to the visible launcher", async () => {
  await renderNona();
  const launcher = host.querySelector<HTMLButtonElement>(".nona-launcher");
  const panel = host.querySelector<HTMLElement>('[role="dialog"]');
  if (!launcher || !panel) throw new Error("Missing Nona controls");
  await act(async () => launcher.click());
  await act(async () => panel.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  expect(panel.hidden).toBe(true);
  expect(document.activeElement).toBe(launcher);
});