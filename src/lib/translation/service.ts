import type { Locale } from "@/lib/i18n";

export interface TranslationInput {
  title: string;
  content: Record<string, unknown>;
  sourceLocale: Locale;
  targetLocale: Locale;
}
export interface TranslationOutput {
  title: string;
  content: Record<string, unknown>;
  sourceType: "machine" | "human";
}
export interface TranslationService {
  id: string;
  translate(input: TranslationInput): Promise<TranslationOutput>;
}

export interface TranslationProviderFactory {
  id: "deepl" | "llm";
  create(): TranslationService;
}

/** The provider boundary is ready; automatic generation remains disabled until a provider is connected. */
export const translationAvailability = {
  enabled: false,
  reason: "provider_not_connected",
} as const;
