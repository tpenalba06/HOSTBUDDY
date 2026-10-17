import logoAsset from "@/assets/nona-official-logo.png.asset.json";
import mascotAsset from "@/assets/nona-official-mascot.png.asset.json";

/** Exact supplied artwork, separated by cropping only; no CSS reconstruction. */
export function NonaWordmark() {
  return <img className="nona-wordmark" src={logoAsset.url} width={878} height={217} alt="NONA" />;
}

export function NonaMascot({ className = "" }: { className?: string }) {
  return <img className={`nona-official-mascot ${className}`} src={mascotAsset.url} width={1067} height={577} alt="NONA" />;
}
