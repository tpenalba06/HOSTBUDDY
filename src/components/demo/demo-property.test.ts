import { describe, expect, it } from "vitest";
import { answerDemoField, createDemoProperty } from "./demo-property";
import { getGuideItems } from "@/lib/data/guide-content";

describe("local demo property adapter", () => {
  it("retains imported evidence without adding missing facts to the guide", () => {
    const property = createDemoProperty(
      "demo-a",
      {
        propertyName: "Studio test",
        fields: [
          {
            key: "wifi",
            value: "Wi-Fi : test",
            rawValue: "Wi-Fi : test",
            status: "found",
            confidence: 0.9,
          },
          {
            key: "arrival",
            value: "16 h ?",
            rawValue: "16 h ?",
            status: "to_verify",
            confidence: 0.5,
          },
        ],
      },
      "text",
    );
    expect(property.status).toBe("draft");
    expect(property.fields.find((field) => field.key === "wifi")).toMatchObject({
      raw_value: "Wi-Fi : test",
      source_type: "text",
      confidence: 0.9,
    });
    expect(property.fields.find((field) => field.key === "parking")).toMatchObject({
      value: null,
      status: "missing",
    });
    expect(
      property.sections
        .flatMap((section) => getGuideItems(section.section_key, section.content))
        .map((item) => item.text),
    ).toEqual(["Wi-Fi : test"]);
  });

  it("keeps each draft isolated and synchronizes a human correction into its guide", () => {
    const first = createDemoProperty("demo-a", { propertyName: "A", fields: [] });
    const second = createDemoProperty("demo-b", { propertyName: "B", fields: [] });
    const field = first.fields.find((field) => field.key === "wifi")!;
    const next = answerDemoField(first, field, " Réseau privé ");
    expect(next.fields.find((field) => field.key === "wifi")).toMatchObject({
      value: "Réseau privé",
      status: "found",
      manually_verified: true,
      manually_overridden: true,
    });
    expect(
      getGuideItems(
        "wifi",
        next.sections.find((section) => section.section_key === "wifi")?.content,
      ),
    ).toEqual([{ fieldKey: "wifi", label: "Wi-Fi", text: "Réseau privé" }]);
    expect(first.fields.find((field) => field.key === "wifi")?.value).toBeNull();
    expect(second.fields.find((field) => field.key === "wifi")?.value).toBeNull();
    expect(next.sections.every((section) => section.property_id === "demo-a")).toBe(true);
  });

  it("removes a cleared human value from both information and guide while retaining provenance", () => {
    const property = createDemoProperty(
      "demo-a",
      {
        propertyName: "A",
        fields: [
          {
            key: "wifi",
            value: "Secret",
            rawValue: "Wi-Fi Secret",
            status: "found",
            confidence: 0.9,
          },
        ],
      },
      "text",
    );
    const next = answerDemoField(
      property,
      property.fields.find((field) => field.key === "wifi")!,
      " ",
    );
    expect(next.fields.find((field) => field.key === "wifi")).toMatchObject({
      value: null,
      status: "missing",
      raw_value: "Wi-Fi Secret",
      manually_overridden: true,
    });
    expect(
      getGuideItems(
        "wifi",
        next.sections.find((section) => section.section_key === "wifi")?.content,
      ),
    ).toEqual([]);
  });
});
