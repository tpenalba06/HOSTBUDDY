// @vitest-environment jsdom
import { act, createElement, type ComponentType } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  query: { data: undefined as unknown, isPending: false, isError: true, refetch: vi.fn() },
  navigate: vi.fn(),
  invalidate: vi.fn(),
}));
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  createFileRoute: () => (options: unknown) => ({ options }),
  useNavigate: () => state.navigate,
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => state.query,
  useQueryClient: () => ({ invalidateQueries: state.invalidate }),
}));
vi.mock("@/components/app/useOrg", () => ({
  orgQuery: {},
  useOrg: () => ({ id: "11111111-1111-4111-8111-111111111111", role: "owner" }),
}));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock("@/lib/team.functions", () => ({
  getTeam: vi.fn(),
  inviteTeamMember: vi.fn(),
  changeTeamRole: vi.fn(),
  removeTeamMember: vi.fn(),
}));
import { Route } from "./app.team";
const Page = Route.options.component as ComponentType;
let root: Root;
let container: HTMLDivElement;
const render = async () => {
  await (Page as ComponentType & { preload?: () => Promise<unknown> }).preload?.();
  await act(async () => root.render(createElement(Page)));
};

describe("team loading failures", () => {
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.clearAllMocks();
    state.query.data = undefined;
    state.query.isPending = false;
    state.query.isError = true;
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });
  it("reports a failed read instead of displaying an empty editable team, and retries", async () => {
    await render();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("team.loadFailed");
    expect(container.querySelector("form")).toBeNull();
    const retry = [...container.querySelectorAll("button")].find(
      (b) => b.textContent === "common.retry",
    );
    expect(retry).toBeDefined();
    await act(async () => retry!.click());
    expect(state.query.refetch).toHaveBeenCalledOnce();
  });
  it("does not expose team mutations while the first read is pending", async () => {
    state.query.isPending = true;
    state.query.isError = false;
    await render();
    expect(container.querySelector('[role="status"]')?.textContent).toContain("common.loading");
    expect(container.querySelector("form")).toBeNull();
  });
  it("does not present stale permissions as current after a failed refresh", async () => {
    state.query.data = [{ user_id: "test-owner", email: "owner@example.invalid", role: "owner" }];
    await render();
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(container.querySelector("form")).toBeNull();
  });
  it("shows the loaded team when the read succeeds", async () => {
    state.query.isError = false;
    state.query.data = [{ user_id: "test-owner", email: "owner@example.invalid", role: "owner" }];
    await render();
    expect(container.textContent).toContain("owner@example.invalid");
    expect(container.querySelector("form")).not.toBeNull();
  });
});
