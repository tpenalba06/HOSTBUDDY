import { describe, expect, it } from "vitest";
import { createVillaMare, demoGuide, villaMareOperations } from "./villa-mare-fixture";
import { getVillaMare } from "@/components/guest/villaMare";
import { guideCover, sectionEntries } from "@/components/guest/guide-model";
import { resolvePropertyMedia } from "@/components/guest/property-media";

describe("one Villa Mare fixture across every demo surface", () => {
  it("keeps the same cover, full gallery, recommendations and service photos", () => {
    const data = getVillaMare("fr");
    const property = createVillaMare("fr");
    const guide = demoGuide(property);
    expect(guideCover(guide)).toBe(data.coverUrl);
    expect(resolvePropertyMedia(guide.sections).gallery.map((item) => item.url)).toEqual(
      data.gallery,
    );
    const places = guide.sections.find((section) => section.key === "places")!;
    expect(sectionEntries(places).map((entry) => entry.title)).toEqual(
      data.places.map((place) => place.name),
    );
    expect(sectionEntries(places)[2]?.mediaIds).toHaveLength(3);
    expect(guide.services?.map((service) => service.price)).toEqual(
      data.services.map((service) => service.price),
    );
    expect(guide.services?.every((service) => !!service.imagePath)).toBe(true);
    expect(guide.sections.every((section) => !!section.media?.length)).toBe(true);
  });
  it("propagates edits and selected photos instead of rebuilding the original fixture", () => {
    const property = createVillaMare("en");
    property.name = "Edited Villa";
    property.services[0]!.description = "Edited description";
    const welcome = property.sections.find((section) => section.section_key === "welcome")!;
    welcome.content = { propertyMedia: { version: 1, coverId: property.media[1]!.id } };
    const guide = demoGuide(property);
    expect(guide.name).toBe("Edited Villa");
    expect(guideCover(guide)).toBe(property.media[1]!.storage_path);
    expect(guide.services?.[0]?.description).toBe("Edited description");
    expect(createVillaMare("en").name).toBe("Villa Mare");
  });
  it("does not expose service images outside the local property's media", () => {
    const property = createVillaMare("fr");
    property.services[0]!.image_path = "https://foreign.example/private-image";
    expect(demoGuide(property).services?.[0]?.imagePath).toBeNull();
  });
  it("derives operational references and amounts from the same Villa Mare catalogue", () => {
    const property = createVillaMare("en");
    const operations = villaMareOperations(property, new Date("2026-10-04T12:00:00Z"));
    expect(operations.orders[1]?.total_amount).toBe(property.services[2]!.price);
    expect(operations.orders[1]?.services?.name).toBe(property.services[2]!.name);
    expect(operations.conversations[0]?.properties?.name).toBe(property.name);
  });
});
