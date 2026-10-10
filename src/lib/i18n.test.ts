import { describe, expect, it } from "vitest";
import { LOCALES, missingTranslationKeys, translations } from "./i18n";

describe("i18n dictionaries", () => {
  it.each(LOCALES)("advertises a free property without a time-limited trial in %s", (locale) => {
    const copy = translations[locale];
    expect(copy["marketing.trial"]).not.toMatch(/30/);
    expect(copy["auth.subtitle"]).not.toMatch(/30/);
    expect(copy["marketing.trial"]).toMatch(/1/);
    expect(copy["marketing.priceNote"]).toMatch(/2[.,]99/);
    expect(copy["legal.draft"]).toBeTruthy();
  });
  it.each(LOCALES)("covers every UI key in %s", (locale) => {
    expect(missingTranslationKeys(locale)).toEqual([]);
    expect(Object.values(translations[locale]).every(Boolean)).toBe(true);
  });
});
