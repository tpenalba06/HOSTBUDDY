// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({ locale: "fr", t: (key: string) => key }),
  translateStatic: (_locale: string, key: string) => key,
}));
vi.mock("@/components/app/ManagerShell", () => ({
  ManagerShell: ({
    children,
    onNavigate,
  }: {
    children: ReactNode;
    onNavigate: (area: string) => void;
  }) => (
    <>
      <button onClick={() => onNavigate("dashboard")}>dashboard</button>
      {children}
    </>
  ),
}));
vi.mock("@/components/app/ManagerScreens", () => ({
  ManagerDashboardScreen: ({ data }: { data: { todayOrders: number } }) => (
    <output>{data.todayOrders}</output>
  ),
  ManagerConnectionsScreen: () => null,
  ManagerFeedbackScreen: () => null,
  ManagerMessagesScreen: () => null,
  ManagerNewPropertyScreen: () => null,
  ManagerOrdersScreen: () => null,
  ManagerPropertiesScreen: () => null,
  ManagerTeamScreen: () => null,
}));
vi.mock("@/components/demo/DemoPropertyEditor", () => ({ DemoPropertyEditor: () => null }));
vi.mock("@/lib/import-engine/url-import.functions", () => ({ demoImportFromAirbnbUrl: vi.fn() }));
import { DemoManager } from "./DemoManager";
import { createVillaMare } from "./villa-mare-fixture";
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root;
let host: HTMLDivElement;
afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
});
it("counts both existing upcoming requests in the dashboard", async () => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () =>
    root.render(
      <DemoManager villa={createVillaMare("fr")} onVillaChange={() => {}} onPreview={() => {}} />,
    ),
  );
  await act(async () => (host.querySelector("button") as HTMLButtonElement).click());
  expect(host.querySelector("output")?.textContent).toBe("2");
});
