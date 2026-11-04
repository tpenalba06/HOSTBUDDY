// Only this project's editor preview may request the isolated synthetic recipe.
// Published domains and arbitrary embeds keep the offline guided demonstration.
export const NONA_PRIVATE_PREVIEW_HOST =
  "id-preview--ad0b09fe-b134-491b-8601-9d64d6d27b86.lovable.app";

export function isNonaPrivatePreviewHost(hostname: string) {
  return hostname === NONA_PRIVATE_PREVIEW_HOST;
}
