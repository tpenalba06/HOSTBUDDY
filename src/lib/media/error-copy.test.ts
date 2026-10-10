import { describe, expect, it } from "vitest";
import { LOCALES } from "../i18n";
import { mediaErrorMessage } from "./error-copy";

describe("safe media error localization", () => {
  it.each(LOCALES)("localizes cancellation and validation in %s", (locale) => {
    const cancelled = mediaErrorMessage(
      new Error("Envoi annulé. Votre média précédent est conservé."),
      locale,
    );
    const duration = mediaErrorMessage(
      new Error("La vidéo de présentation doit durer au maximum 90 secondes."),
      locale,
    );
    expect(cancelled.length).toBeGreaterThan(10);
    expect(duration).toContain("90");
    if (locale !== "fr") expect(cancelled).not.toContain("annulée");
  });
  it("never exposes unexpected database/server details", () => {
    expect(mediaErrorMessage(new Error("synthetic_private_sql_detail"), "en")).not.toContain(
      "synthetic_private_sql_detail",
    );
  });
});
