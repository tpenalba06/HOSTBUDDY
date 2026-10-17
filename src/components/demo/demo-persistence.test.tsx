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
  ManagerPropertiesScreen: ({
    properties,
    onEdit,
  }: {
    properties: { id: string; name: string }[];
    onEdit: (id: string) => void;
  }) => (
    <>
      <output>{properties.find((p) => p.id === "demo-maison-oliviers")?.name}</output>
      <button onClick={() => onEdit("demo-maison-oliviers")}>edit</button>
    </>
  ),
  ManagerTeamScreen: () => null,
}));
vi.mock("@/components/demo/DemoPropertyEditor", () => ({
  DemoPropertyEditor: ({
    onChange,
  }: {
    onChange: (
      update: (p: import("./demo-property").DemoProperty) => import("./demo-property").DemoProperty,
    ) => void;
  }) => (
    <button onClick={() => onChange((p) => ({ ...p, name: "Modification audit" }))}>save</button>
  ),
}));
vi.mock("@/lib/import-engine/url-import.functions", () => ({ demoImportFromAirbnbUrl: vi.fn() }));
import { DemoManager } from "./DemoManager";
import { createVillaMare } from "./villa-mare-fixture";
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root;
let host: HTMLDivElement;
afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
  sessionStorage.clear();
});
it("retains another property's changes when leaving and reopening the demo", async () => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  const render = async () =>
    act(async () =>
      root.render(
        <DemoManager villa={createVillaMare("fr")} onVillaChange={() => {}} onPreview={() => {}} />,
      ),
    );
  await render();
  const click = async (label: string) =>
    act(async () =>
      [...host.querySelectorAll("button")].find((b) => b.textContent === label)!.click(),
    );
  await click("edit");
  await click("save");
  await act(async () => root.unmount());
  root = createRoot(host);
  await render();
  expect(host.querySelector("output")?.textContent).toBe("Modification audit");
});
