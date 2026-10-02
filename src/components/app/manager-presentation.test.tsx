import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ locale: "fr", t: (key: string) => key }) }));
// Any accidental backend access from a shared presentation component fails this test.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: new Proxy(
    {},
    {
      get() {
        throw new Error("Presentation must not access Supabase");
      },
    },
  ),
}));

import { ManagerPropertiesScreen } from "./ManagerScreens";
import { ManagerConversationScreen } from "./ManagerConversationScreen";
import { PropertyEditorScreen } from "./PropertyEditorScreen";
import { ServicesScreen } from "./ServicesScreen";

const property = { id: "a", name: "Studio A", slug: "studio-a", status: "published" as const };
const noop = () => {};

describe("shared manager presentation", () => {
  it("preserves edit, public link and QR controls through production adapters", () => {
    const html = renderToStaticMarkup(
      <ManagerPropertiesScreen
        properties={[property]}
        onAdd={noop}
        onEdit={noop}
        onView={noop}
        renderQr={() => null}
        renderEdit={(p, className, label) => (
          <a href={`/app/p/${p.id}`} className={className}>
            {label}
          </a>
        )}
        renderView={(p, className, label) => (
          <a href={`/l/${p.slug}`} className={className}>
            {label}
          </a>
        )}
      />,
    );
    expect(html).toContain('href="/app/p/a"');
    expect(html).toContain('href="/l/studio-a"');
    expect(html).toContain("QR");
    expect(html).toContain("app.add");
  });

  it("hides adding and editing for a read-only member and hides public actions on drafts", () => {
    const html = renderToStaticMarkup(
      <ManagerPropertiesScreen
        properties={[{ ...property, status: "draft" }]}
        role="member"
        onAdd={noop}
        onEdit={noop}
        onView={noop}
        renderQr={() => null}
      />,
    );
    expect(html).not.toContain("app.add");
    expect(html).not.toContain("common.edit");
    expect(html).not.toContain(">QR<");
    expect(html).toContain("common.view");
  });

  it("renders manager replies, contact and resolution using the same conversation screen", () => {
    const html = renderToStaticMarkup(
      <ManagerConversationScreen
        conversation={{
          id: "thread",
          guest_display_name: "Sophie",
          guest_contact: "sophie@example.test",
          last_message_at: "2026-10-02T12:00:00Z",
          status: "open",
          messages: [
            {
              id: "m",
              body: "Bonjour",
              sender_type: "manager",
              created_at: "2026-10-02T12:00:00Z",
              read_at: null,
            },
          ],
        }}
        onBack={noop}
        onSend={noop}
        onStatusChange={noop}
      />,
    );
    expect(html).toContain("sophie@example.test");
    expect(html).toContain("messages.resolve");
    expect(html).toContain("ml-auto");
    expect(html).toContain('maxLength="2000"');
  });

  it("renders all four editor tabs without accessing production data", () => {
    const html = renderToStaticMarkup(
      <PropertyEditorScreen
        property={property}
        mode="guide"
        onModeChange={noop}
        onBack={noop}
        onPreview={noop}
        onRename={async () => {}}
        onSaved={noop}
      >
        <ServicesScreen services={[]} onSave={async () => {}} />
      </PropertyEditorScreen>,
    );
    for (const key of ["app.guide", "app.information", "app.services", "app.reviews"])
      expect(html).toContain(key);
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("services.empty");
  });
});
