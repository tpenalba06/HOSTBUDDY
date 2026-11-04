import { describe, expect, it } from "vitest";
import { fieldUpdatesForGuideSection } from "./guide-content";

describe("catalogue synchronization from newly added sections", () => {
  it("saves all Wi-Fi rows together even with a generated section key", () => {
    expect(
      fieldUpdatesForGuideSection("wifi-ab12", { items: [] }, [
        { label: "Réseau", text: "AuditWifi" },
        { label: "Mot de passe", text: "synthetic-password" },
      ]),
    ).toEqual([{ key: "wifi", value: "Réseau : AuditWifi\nMot de passe : synthetic-password" }]);
  });
  it("clears the catalogue when all Wi-Fi rows are removed", () => {
    expect(
      fieldUpdatesForGuideSection(
        "wifi-ab12",
        { items: [{ label: "Réseau", text: "AuditWifi" }] },
        [],
      ),
    ).toEqual([{ key: "wifi", value: null }]);
  });
  it("does not infer catalogue fields from custom sections", () => {
    expect(
      fieldUpdatesForGuideSection("custom-ab12", {}, [{ label: "Réseau", text: "custom text" }]),
    ).toEqual([]);
  });
});
