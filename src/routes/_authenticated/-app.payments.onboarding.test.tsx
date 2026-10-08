// @vitest-environment jsdom
import { act, createElement, StrictMode, type ComponentType } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  org: { id: "00000000-0000-4000-8000-000000000001", role: "owner" },
  search: {} as { connect?: string; connectOrg?: string },
  status: null as unknown,
  statusError: false,
  statusFetching: false,
  manage: vi.fn(),
  navigate: vi.fn(),
  refetch: vi.fn(),
  invalidate: vi.fn(),
}));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  createFileRoute: () => (options: unknown) => ({
    options,
    useSearch: () => state.search,
    useNavigate: () => state.navigate,
  }),
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: state.invalidate }),
  useQuery: ({ queryKey }: { queryKey: string[] }) =>
    queryKey[0] === "stripe-connect"
      ? {
          data: { connect: state.status },
          isError: state.statusError,
          isPending: false,
          isFetching: state.statusFetching,
          refetch: state.refetch,
        }
      : {
          data: {
            overview: {
              config: { mode: "test", billing: true },
              quote: { monthlyCents: 0, propertyCount: 1 },
              account: { charges_enabled: true },
              confirmedOrders: [{ id: "order-test", total_amount: 15, services: { name: "Test" } }],
              payments: [],
              syncPending: false,
            },
          },
          isError: false,
          isLoading: false,
        },
}));
vi.mock("@/components/app/useOrg", () => ({ useOrg: () => state.org }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ locale: "fr", t: (key: string) => key }) }));
vi.mock("@/lib/integrations/payments.functions", () => ({ managePayments: state.manage }));
import { Route } from "./app.payments";
const Page = Route.options.component as ComponentType;
let root: Root;
let container: HTMLDivElement;
const connected = (chargesEnabled = false) => ({
  config: { connect: true },
  account: {
    stripe_account_id: "acct_test",
    service_fee_terms_version: "services-2pct-v1",
    service_fee_terms_accepted_at: "2026-01-01T00:00:00Z",
  },
  onboarding: {
    status: chargesEnabled ? "ready" : "incomplete",
    chargesEnabled,
    payoutsEnabled: chargesEnabled,
    requirements: chargesEnabled ? [] : ["identity", "bank"],
    pendingVerification: false,
  },
});
const button = (label: string) =>
  [...container.querySelectorAll("button")].find((item) => item.textContent === label)!;
async function render() {
  await (Page as ComponentType & { preload?: () => Promise<unknown> }).preload?.();
  await act(async () => root.render(createElement(StrictMode, null, createElement(Page))));
}

describe("Connect onboarding manager page", () => {
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.clearAllMocks();
    window.sessionStorage.clear();
    state.org.role = "owner";
    state.search = {};
    state.status = connected();
    state.statusError = false;
    state.statusFetching = false;
    state.manage.mockResolvedValue({});
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("a new manager must choose a country and explicitly consent before connecting", async () => {
    state.status = { config: { connect: true }, account: null, onboarding: null };
    await render();
    expect(button("payments.connect.start").disabled).toBe(true);
    expect(container.querySelector('input[type="checkbox"]')).not.toBeNull();
    expect(container.textContent).toContain("payments.connect.notConnected");
    expect(state.manage).not.toHaveBeenCalled();
  });
  it("resumes an existing account with one click without country entry or new consent", async () => {
    await render();
    expect(container.querySelector("input")).toBeNull();
    expect(button("payments.connect.resume").disabled).toBe(false);
    await act(async () => button("payments.connect.resume").click());
    expect(state.manage).toHaveBeenCalledWith({
      data: { organizationId: state.org.id, action: "connect_resume" },
    });
    expect(state.manage).toHaveBeenCalledTimes(1);
  });
  it("a return displays outstanding actions and cannot unlock collection from a stale local flag", async () => {
    state.search = { connect: "return", connectOrg: state.org.id };
    await render();
    expect(container.textContent).toContain("payments.connect.returned");
    expect(container.textContent).toContain("payments.connect.required.identity");
    expect(container.textContent).toContain("payments.connect.required.bank");
    expect(container.textContent).not.toContain("payments.paymentLink");
    expect(state.manage).not.toHaveBeenCalled();
  });
  it("renews an expired link once, including under React StrictMode", async () => {
    state.search = { connect: "refresh", connectOrg: state.org.id };
    await render();
    expect(state.navigate).toHaveBeenCalledWith({ search: {}, replace: true });
    expect(state.manage).toHaveBeenCalledTimes(1);
    expect(state.manage.mock.calls[0]![0].data.action).toBe("connect_resume");
  });
  it("stops automatic redirect loops and refuses a different organization's refresh", async () => {
    window.sessionStorage.setItem(`hostbuddy.connect.refresh.${state.org.id}`, String(Date.now()));
    state.search = { connect: "refresh", connectOrg: state.org.id };
    await render();
    expect(state.manage).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    await act(async () => root.unmount());
    root = createRoot(container);
    state.search = { connect: "refresh", connectOrg: "other-org" };
    await render();
    expect(state.manage).not.toHaveBeenCalled();
  });
  it("collection controls require a successful current Stripe status", async () => {
    state.status = connected(true);
    await render();
    expect(container.textContent).toContain("payments.paymentLink");
    state.statusError = true;
    await render();
    expect(container.textContent).not.toContain("payments.paymentLink");
  });
  it("refreshing Connect uses only its status endpoint", async () => {
    await render();
    await act(async () => button("payments.refresh").click());
    expect(state.refetch).toHaveBeenCalledTimes(1);
    expect(state.manage).not.toHaveBeenCalled();
  });
});
