// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ locale: "fr", t: (key: string) => key }) }));
vi.mock("@/components/i18n/LanguageSelect", () => ({ LanguageSelect: () => null }));
import { GuideView } from "./GuideView";
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
HTMLElement.prototype.scrollIntoView = vi.fn();
let root: Root;
let host: HTMLDivElement;
afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
});
it.each([
  { extra: {}, param: "query", destination: "Le Cabanon Antibes", label: "guest.findPlace" },
  {
    extra: { address: "12 rue du Port, Antibes" },
    param: "destination",
    destination: "12 rue du Port, Antibes",
    label: "guest.route",
  },
  {
    extra: { mapUrl: "https://www.google.com/maps/search/?api=1&query=Explicit+place" },
    param: "query",
    destination: "Explicit place",
    label: "guest.route",
  },
])("opens a usable map link with $extra", async ({ extra, param, destination, label }) => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () =>
    root.render(
      <GuideView
        guide={{
          id: "test",
          name: "Test",
          originalLocale: "fr",
          subtitle: "Antibes",
          sections: [
            {
              id: "places",
              key: "places",
              title: "Places",
              content: { entries: [{ title: "Le Cabanon", text: "Restaurant", ...extra }] },
            },
          ],
        }}
        sectionKey="places"
      />,
    ),
  );
  await act(async () => (host.querySelector(".hb-entry-open") as HTMLButtonElement).click());
  const link = host.querySelector(
    '.hb-entry-detail a[href*="google.com/maps"]',
  ) as HTMLAnchorElement;
  expect(link).not.toBeNull();
  expect(new URL(link.href).searchParams.get(param)).toBe(destination);
  expect(link.textContent).toBe(label);
});
