export interface OfficialEmbedProvider {
  id: string;
  supports(url: URL): boolean;
  toSafeEmbed(url: URL): { src: string; title: string } | null;
}

/** Official embeds and simple links stay distinct from authenticated API connections. */
export const embedAvailability = { enabled: false, reason: "editor_not_enabled" } as const;
