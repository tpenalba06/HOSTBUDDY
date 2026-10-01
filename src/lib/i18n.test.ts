import { describe, expect, it } from "vitest";
import { LOCALES, missingTranslationKeys, translations } from "./i18n";

describe("i18n dictionaries", () => {
  it.each(LOCALES)("covers every UI key in %s", (locale) => {
    expect(missingTranslationKeys(locale)).toEqual([]);
    expect(Object.values(translations[locale]).every(Boolean)).toBe(true);
  });
});
