import { describe, expect, it, vi } from "vitest";
import { createElement, type ComponentType } from "react";
import { renderToString } from "react-dom/server";
const state = vi.hoisted(() => ({ search: {} as { slug?: string } }));
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  createFileRoute: () => (options: unknown) => ({ options, useSearch: () => state.search }),
}));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ t: (key: string) => key, locale: "fr" }) }));
vi.mock("@/components/guest/GuideView", () => ({ GuideView: () => null }));
vi.mock("@/lib/offline/store", () => ({
  deleteSnapshot: vi.fn(),
  listSnapshots: vi.fn(),
  readSnapshot: vi.fn(),
  restoreGuide: vi.fn(),
  verifySnapshot: vi.fn(),
}));
import { Route } from "./offline";
const Page = Route.options.component as ComponentType;
describe("offline cached SSR shell", () => {
  it("keeps the cached base URL and saved slug identical during hydration", async () => {
    await (Page as ComponentType & { preload?: () => Promise<unknown> }).preload?.();
    state.search = {};
    const base = renderToString(createElement(Page));
    state.search = { slug: "synthetic-test" };
    expect(renderToString(createElement(Page))).toBe(base);
  });
});
