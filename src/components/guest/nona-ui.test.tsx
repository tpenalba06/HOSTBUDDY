// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { PublicGuide } from "@/lib/data/public-guide.functions";
import { conciergeCopy } from "@/lib/concierge-copy";
vi.mock("@/lib/i18n", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/i18n")>()),
  useI18n: () => ({ locale: "en", setLocale: vi.fn(), t: (key: string) => key }),
}));
vi.mock("@/components/ai-elements/conversation", () => ({
  Conversation: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ConversationContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/ai-elements/message", () => ({
  Message: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  MessageContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  MessageResponse: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}));
import { NonaConcierge } from "./NonaConcierge";
import { nonaAssets } from "@/lib/nona-assets";
import { LocalConciergeTransport } from "@/lib/concierge-transport";
import { guidedProposal, validateConciergeTurn, type ConciergeRequest } from "@/lib/concierge";
let root: Root;
let host: HTMLDivElement;
let reduced = false;
const guide: PublicGuide = {
  id: "ui",
  name: "Villa Mare Exact",
  originalLocale: "en",
  sections: ["wifi", "arrival", "places"].map((key) => ({
    id: key,
    key,
    title: key,
    content: { items: [{ label: key, text: "Published fact" }] },
  })),
  services: [
    {
      id: "bf",
      name: "Breakfast",
      description: "Published breakfast",
      price: 15,
      pricingType: "per_person",
    },
  ],
};
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("matchMedia", () => ({
    matches: reduced,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  reduced = false;
  nonaAssets.portrait = null;
  nonaAssets.wave = null;
  sessionStorage.clear();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  nonaAssets.portrait = null;
  nonaAssets.wave = null;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
async function renderNona(value = guide) {
  await act(async () => root.render(<NonaConcierge demo guide={value} />));
}
it("uses the isolated model transport while forcing simulated booking permissions", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const transport = vi.fn(async (request: ConciergeRequest) => ({
    ...validateConciergeTurn(request, guide, guidedProposal(request, guide)),
    text: "A freshly generated local response.",
    mode: "ai" as const,
  }));
  await act(async () =>
    root.render(
      <LocalConciergeTransport.Provider value={transport}>
        <NonaConcierge guide={guide} slug="nona-local" />
      </LocalConciergeTransport.Provider>,
    ),
  );
  await click(".nona-launcher");
  await sendMessage("Wi-Fi");
  expect(transport).toHaveBeenCalledOnce();
  expect(host.textContent).toContain("A freshly generated local response.");
  expect(host.querySelector(".nona-header")?.textContent).toContain("IA locale");
  expect(host.querySelector(".nona-concierge")?.getAttribute("data-demo")).toBe("true");
  expect(fetch).not.toHaveBeenCalled();
});
async function advance(ms: number) {
  await act(async () => vi.advanceTimersByTime(ms));
}
async function click(selector: string) {
  const button = host.querySelector<HTMLButtonElement>(selector);
  if (!button) throw new Error(`Missing control ${selector}`);
  await act(async () => button.click());
  return button;
}
async function sendMessage(value: string) {
  const input = host.querySelector<HTMLTextAreaElement>(".nona-composer textarea")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(
      input,
      value,
    );
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await click(".nona-composer button[type=submit]");
}
it("shows a text invitation at 3 seconds before a click without inventing a mascot or opening chat", async () => {
  await renderNona();
  await advance(2999);
  expect(host.querySelector(".nona-invitation")).toBeNull();
  await advance(1);
  expect(host.querySelector(".nona-invitation")?.textContent).toContain("Hello! Any questions? 👋");
  expect(host.querySelector(".nona-launcher img")).toBeNull();
  expect(host.querySelector('[role="dialog"]')).toHaveProperty("hidden", true);
  await advance(7000);
  expect(host.querySelector(".nona-invitation")).toBeNull();
});
it("waves before click for two seconds using unit-test-only injected assets and renders portrait in header", async () => {
  nonaAssets.portrait = "/unit-test-only-portrait.png";
  nonaAssets.wave = "/unit-test-only-wave.gif";
  await renderNona();
  await advance(3000);
  expect(host.querySelector(".nona-launcher img")?.getAttribute("src")).toBe(nonaAssets.wave);
  await advance(2000);
  expect(host.querySelector(".nona-launcher img")?.getAttribute("src")).toBe(nonaAssets.portrait);
  await click(".nona-launcher");
  expect(host.querySelector(".nona-launcher img")?.getAttribute("src")).toBe(nonaAssets.portrait);
  expect(host.querySelector(".nona-header-portrait")?.getAttribute("src")).toBe(
    nonaAssets.portrait,
  );
  expect(host.querySelector('[role="dialog"]')).toHaveProperty("hidden", false);
});
it("keeps text invitation but never plays wave under reduced motion", async () => {
  reduced = true;
  nonaAssets.portrait = "/unit-test-only-portrait.png";
  nonaAssets.wave = "/unit-test-only-wave.gif";
  await renderNona();
  await advance(3000);
  expect(host.querySelector(".nona-invitation")).not.toBeNull();
  expect(host.querySelector(".nona-launcher img")?.getAttribute("src")).toBe(nonaAssets.portrait);
});
it("never repeats after explicit dismissal, rerender or remount in the same session", async () => {
  await renderNona();
  await advance(3000);
  await click('[aria-label="Dismiss invitation"]');
  await renderNona({ ...guide, sections: [...guide.sections] });
  await advance(12000);
  expect(host.querySelector(".nona-invitation")).toBeNull();
  await act(async () => root.unmount());
  root = createRoot(host);
  await renderNona();
  await advance(12000);
  expect(host.querySelector(".nona-invitation")).toBeNull();
});
it("does not repeat for a short visit and early launcher click cancels the invitation", async () => {
  await renderNona();
  await advance(1000);
  await act(async () => root.unmount());
  root = createRoot(host);
  await renderNona();
  await advance(5000);
  expect(host.querySelector(".nona-invitation")).toBeNull();
  await click(".nona-launcher");
  await advance(5000);
  expect(host.querySelector(".nona-invitation")).toBeNull();
});
it("opens from invitation without unsolicited shortcuts and keeps demo disclosure", async () => {
  await renderNona();
  await advance(3000);
  await click(".nona-invitation-open");
  expect(host.querySelector(".nona-property")?.textContent).toBe(guide.name);
  expect(host.textContent).toContain("Welcome to Villa Mare Exact");
  expect(host.querySelectorAll(".nona-suggestions button")).toHaveLength(0);
  expect(host.querySelector(".nona-quick")).toBeNull();
  expect(host.textContent).toContain("Demo · no real order or payment");
  expect(host.querySelector("textarea")?.getAttribute("aria-label")).toBe(
    "Your question or request…",
  );
  expect(host.querySelector('button[type="submit"]')).toHaveProperty("disabled", true);
});
it("does not offer breakfast or services without available catalogue entries", async () => {
  await renderNona({ ...guide, services: [] });
  await click(".nona-launcher");
  await sendMessage("Help me");
  expect(host.querySelectorAll(".nona-suggestions button")).toHaveLength(3);
  expect(host.querySelector(".nona-quick")).toBeNull();
  await renderNona({
    ...guide,
    services: [
      {
        ...guide.services?.[0],
        id: "expired",
        name: "Breakfast",
        description: "Expired",
        price: 15,
        pricingType: "per_person",
        bookingConfig: {
          slots: ["2000-01-01T08:00:00Z"],
          options: [],
          requestDate: false,
          seller: "",
          cancellation: "",
          instructions: "",
          maxQuantity: 20,
        },
      },
    ],
  });
  expect(host.querySelectorAll(".nona-suggestions button")).toHaveLength(3);
  expect(host.querySelector(".nona-quick")).toBeNull();
});
it("shortcut returns published facts and long facts remain fully accessible", async () => {
  const text = "Published verified line. ".repeat(50);
  await renderNona({
    ...guide,
    sections: [
      { id: "wifi", key: "wifi", title: "Wi-Fi", content: { items: [{ label: "Network", text }] } },
    ],
  });
  await click(".nona-launcher");
  await sendMessage("Help me");
  await click(".nona-suggestions button");
  expect(host.querySelector("details p")?.textContent).toContain(text);
  expect(host.querySelector("summary")?.textContent).toBe("View full information");
});
it("offers navigation and contact only after help, then hides them when the topic changes", async () => {
  await act(async () => root.render(<NonaConcierge demo guide={guide} onContact={() => {}} />));
  await click(".nona-launcher");
  expect(host.querySelector(".nona-quick")).toBeNull();
  await sendMessage("Bonjour Nona");
  expect(host.querySelectorAll(".nona-suggestions button")).toHaveLength(0);
  await sendMessage("Tu peux m'aider ?");
  expect(host.querySelectorAll(".nona-suggestions button")).toHaveLength(4);
  expect(host.querySelectorAll(".nona-quick")).toHaveLength(2);
  await click(".nona-suggestions button");
  expect(host.querySelectorAll(".nona-suggestions button")).toHaveLength(0);
  expect(host.querySelector(".nona-quick")).toBeNull();
});
it("keeps offered cards before later typed messages instead of repeating them at the bottom", async () => {
  const transport = vi.fn(async (request: ConciergeRequest) => ({
    ...validateConciergeTurn(request, guide, guidedProposal(request, guide)),
    mode: "ai" as const,
    text:
      request.message === "Breakfast" ? "Let's prepare breakfast." : "You can keep talking to me.",
  }));
  await act(async () =>
    root.render(
      <LocalConciergeTransport.Provider value={transport}>
        <NonaConcierge guide={guide} slug="nona-local" />
      </LocalConciergeTransport.Provider>,
    ),
  );
  await click(".nona-launcher");
  await sendMessage("Breakfast");
  const offered = host.querySelector(".nona-service-card")!;
  expect(offered).not.toBeNull();
  await sendMessage("Can I also ask another question?");
  const latestUser = [...host.querySelectorAll(".nona-user")].at(-1)!;
  const latestReply = [...host.querySelectorAll(".nona-bubble")].at(-1)!;
  expect(host.querySelectorAll(".nona-service-card")).toHaveLength(1);
  expect(
    offered.compareDocumentPosition(latestUser) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(
    offered.compareDocumentPosition(latestReply) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(latestReply.textContent).toContain("You can keep talking to me.");
});
it("closes on Escape and returns focus to launcher", async () => {
  await renderNona();
  const launcher = await click(".nona-launcher");
  const panel = host.querySelector<HTMLElement>('[role="dialog"]');
  if (!panel) throw new Error("Missing panel");
  await act(async () =>
    panel.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })),
  );
  expect(panel.hidden).toBe(true);
  expect(document.activeElement).toBe(launcher);
});
it.each(["fr", "en", "es", "de", "it", "pt"] as const)(
  "has complete invitation and shortcut labels in %s",
  (locale) => {
    const copy = conciergeCopy(locale);
    for (const key of [
      "invite",
      "dismissInvite",
      "greeting",
      "wifi",
      "arrival",
      "places",
      "breakfast",
      "more",
    ] as const)
      expect(copy[key].length).toBeGreaterThan(3);
    expect(copy.greeting).toContain("{property}");
  },
);
