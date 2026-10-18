import { nonaBrandAssets } from "@/lib/nona-assets";

/** Exact supplied artwork, separated by cropping only; no CSS reconstruction. */
export function NonaWordmark() {
  return (
    <img
      className="nona-wordmark"
      src={nonaBrandAssets.wordmark}
      width={878}
      height={217}
      alt="NONA"
    />
  );
}

export function NonaMascot({ className = "" }: { className?: string }) {
  return (
    <img
      className={`nona-official-mascot ${className}`}
      src={nonaBrandAssets.mascot}
      width={1067}
      height={577}
      alt="NONA"
    />
  );
}
