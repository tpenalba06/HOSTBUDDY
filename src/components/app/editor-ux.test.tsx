// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { PropertyMediaEditor } from "./PropertyMediaEditor";
import { GuideEditor, type GuideEditorActions } from "./GuideEditor";
import { reorderEditorialSections } from "./section-order";
import { toPublicSections } from "@/components/guest/guide-adapters";
import { homeSections } from "@/components/guest/visual-library";
import type { GuideSection, SectionMedia } from "@/lib/data/properties";
vi.mock("@tanstack/react-router", () => ({ useBlocker: () => null }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/i18n", () => ({
  useI18n: () => ({ locale: "fr", t: (key: string) => key }),
  translateStatic: (_locale: string, key: string) => key,
}));
vi.mock("./ManagerGuidePreview", () => ({
  ManagerGuidePreview: ({ data }: { data: { sections: GuideSection[] } }) => (
    <div data-preview>
      {[...data.sections]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((s) => s.id)
        .join(",")}
    </div>
  ),
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
vi.mock("./Friendly", () => ({ friendlyMessage: (e: Error) => e.message }));
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    disabled,
    onSelect,
  }: {
    children: React.ReactNode;
    disabled: boolean;
    onSelect: () => void;
  }) => (
    <button disabled={disabled} onClick={onSelect}>
      {children}
    </button>
  ),
}));
let root: Root | undefined;
let host: HTMLDivElement;
afterEach(async () => {
  await act(async () => root?.unmount());
  host?.remove();
  vi.clearAllMocks();
});
const section = (id: string, order: number): GuideSection => ({
  id,
  section_key: id,
  title: id,
  sort_order: order,
  is_visible: true,
  content: { items: [] },
  property_id: "test",
  icon: "📌",
  cta_label: null,
  created_at: "",
  updated_at: "",
});
const media = (id: string): SectionMedia => ({
  id,
  section_id: "welcome",
  media_type: "video",
  organization_id: "test",
  property_id: "test",
  storage_path: `${id}.mp4`,
  mime_type: "video/mp4",
  file_size: 10,
  sort_order: 0,
  caption: null,
  alt_text: null,
  created_at: "",
  updated_at: "",
});
const property = { id: "test", organization_id: "test", status: "draft", name: "Test" };
const actions = (): GuideEditorActions => ({
  ensure: vi.fn(),
  add: vi.fn(),
  save: vi.fn(async (s, values) => ({
    ...s,
    content: { ...(s.content as object), propertyMedia: values.propertyMedia },
  })),
  reorder: vi.fn(async () => {}),
  remove: vi.fn(),
  upload: vi.fn(async () => media("new")),
  updateMedia: vi.fn(),
  removeMedia: vi.fn(async () => {}),
  resolveMediaUrl: vi.fn(async (m) => `https://media.example/${m.id}.mp4`),
});
async function mount(node: React.ReactNode) {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root!.render(node));
}
async function upload() {
  const input = host.querySelector('input[accept="video/mp4,video/webm"]') as HTMLInputElement;
  Object.defineProperty(input, "files", {
    value: [new File(["video"], "intro.mp4", { type: "video/mp4" })],
    configurable: true,
  });
  await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
}
function mediaEditor(a: GuideEditorActions, onMedia = vi.fn(), onSection = vi.fn()) {
  return (
    <PropertyMediaEditor
      property={property}
      section={{
        ...section("welcome", 0),
        content: { propertyMedia: { version: 1, presentationVideoId: "old" } },
      }}
      media={[media("old")]}
      actions={a}
      onSection={onSection}
      onMedia={onMedia}
      onPreview={vi.fn()}
      onBusyChange={vi.fn()}
    />
  );
}
describe("presentation video replacement", () => {
  it("shows a dedicated optional player above the photo gallery", async () => {
    await mount(mediaEditor(actions()));
    expect(host.querySelector(".presentation-video-editor video")).not.toBeNull();
    expect(host.textContent).toContain("common.optional");
    expect(host.querySelectorAll("video")).toHaveLength(1);
  });
  it("selects the new video before deleting the old one", async () => {
    const a = actions();
    const onMedia = vi.fn();
    await mount(mediaEditor(a, onMedia));
    await upload();
    expect(a.save).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ propertyMedia: { version: 1, presentationVideoId: "new" } }),
    );
    expect(vi.mocked(a.save).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(a.removeMedia).mock.invocationCallOrder[0]!,
    );
    expect(a.removeMedia).toHaveBeenCalledWith(media("old"));
    expect(onMedia).toHaveBeenLastCalledWith([media("new")]);
  });
  it("failed upload preserves the original video without deletion or selection", async () => {
    const a = actions();
    vi.mocked(a.upload).mockRejectedValueOnce(new Error("Upload failed"));
    const onMedia = vi.fn();
    await mount(mediaEditor(a, onMedia));
    await upload();
    expect(a.save).not.toHaveBeenCalled();
    expect(a.removeMedia).not.toHaveBeenCalled();
    expect(onMedia).not.toHaveBeenCalled();
    expect(host.querySelector("video")?.getAttribute("src")).toContain("old.mp4");
    expect(host.querySelector('[role="alert"]')).not.toBeNull();
  });
  it("failed selection cleans only the new upload and retains the old reference", async () => {
    const a = actions();
    vi.mocked(a.save).mockRejectedValueOnce(new Error("Save failed"));
    const onMedia = vi.fn();
    await mount(mediaEditor(a, onMedia));
    await upload();
    expect(a.removeMedia).toHaveBeenCalledExactlyOnceWith(media("new"));
    expect(onMedia).not.toHaveBeenCalled();
    expect(host.querySelector("video")?.getAttribute("src")).toContain("old.mp4");
  });
  it("deletion explicitly clears the selected video", async () => {
    const a = actions();
    const onMedia = vi.fn();
    await mount(mediaEditor(a, onMedia));
    const button = [...host.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("common.delete"),
    )!;
    await act(async () => button.click());
    expect(a.save).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ propertyMedia: { version: 1, presentationVideoId: null } }),
    );
    expect(onMedia).toHaveBeenLastCalledWith([]);
  });
});
describe("section organizer and preview", () => {
  const sections = [
    section("welcome", 0),
    section("services", 1),
    section("wifi", 2),
    section("arrival", 3),
    section("places", 4),
  ];
  it("moves A to C without changing the structural slots or original array", () => {
    const next = reorderEditorialSections(sections, "wifi", "places");
    expect(next.map((s) => s.id)).toEqual(["welcome", "services", "arrival", "places", "wifi"]);
    expect(next.map((s) => s.sort_order)).toEqual([0, 1, 2, 3, 4]);
    expect(homeSections(toPublicSections([...next].reverse(), [])).main.map((s) => s.id)).toEqual([
      "arrival",
      "places",
      "wifi",
    ]);
    expect(sections[2]?.id).toBe("wifi");
    expect(reorderEditorialSections(sections, "services", "wifi")).toBe(sections);
  });
  it("accessible move saves once, updates preview and survives remount from persisted data", async () => {
    const a = actions();
    const data = { property, sections, fields: [], media: [] };
    await mount(<GuideEditor data={data} actions={a} onChanged={vi.fn()} onPreview={vi.fn()} />);
    const row = host.querySelector('[data-section-id="wifi"]')!;
    const down = [...row.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("manager.moveDown"),
    )!;
    await act(async () => down.click());
    expect(a.reorder).toHaveBeenCalledTimes(1);
    const saved = vi.mocked(a.reorder).mock.calls[0]![0];
    expect(saved.map((s) => s.id)).toEqual(["welcome", "services", "arrival", "wifi", "places"]);
    expect(host.querySelector("[data-preview]")?.textContent).toBe(
      "welcome,services,arrival,wifi,places",
    );
    await act(async () =>
      root!.render(
        <GuideEditor
          key="reload"
          data={{ ...data, sections: saved }}
          actions={a}
          onChanged={vi.fn()}
          onPreview={vi.fn()}
        />,
      ),
    );
    expect(
      [...host.querySelectorAll("[data-section-id]")].map((row) =>
        row.getAttribute("data-section-id"),
      ),
    ).toEqual(["arrival", "wifi", "places"]);
  });
  it("failed persistence restores the preview and compensates partial database writes", async () => {
    const a = actions();
    vi.mocked(a.reorder).mockRejectedValueOnce(new Error("Order failed"));
    await mount(
      <GuideEditor
        data={{ property, sections, fields: [], media: [] }}
        actions={a}
        onChanged={vi.fn()}
        onPreview={vi.fn()}
      />,
    );
    const row = host.querySelector('[data-section-id="wifi"]')!;
    const down = [...row.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("manager.moveDown"),
    )!;
    await act(async () => down.click());
    expect(a.reorder).toHaveBeenCalledTimes(2);
    expect(a.reorder).toHaveBeenLastCalledWith(sections);
    expect(host.querySelector("[data-preview]")?.textContent).toBe(
      "welcome,services,wifi,arrival,places",
    );
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("Order failed");
  });
  it("provides keyboard-focusable handles only for editable sections", async () => {
    await mount(
      <GuideEditor
        data={{ property, sections, fields: [], media: [] }}
        actions={actions()}
        onChanged={vi.fn()}
        onPreview={vi.fn()}
      />,
    );
    expect(host.querySelectorAll(".section-drag-handle")).toHaveLength(3);
    expect(host.querySelector('[data-section-id="services"]')).toBeNull();
    const handle = host.querySelector(".section-drag-handle") as HTMLButtonElement;
    handle.focus();
    expect(document.activeElement).toBe(handle);
    expect(handle.getAttribute("aria-label")).toContain("editor.moveSection");
  });
});
