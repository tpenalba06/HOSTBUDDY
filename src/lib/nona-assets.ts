/** Original supplied PNGs, copied byte-for-byte from the Lovable assets. */
export const nonaBrandAssets = {
  wordmark: "/nona/official-logo.png",
  mascot: "/nona/official-mascot.png",
} as const;

/** Supplied official portrait. No waving artwork was supplied. */
export const nonaAssets: { portrait: string | null; wave: string | null } = {
  portrait: nonaBrandAssets.mascot,
  wave: null,
};
