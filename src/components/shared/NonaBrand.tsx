/** Official supplied rasters and composite A, cropped only through CSS.
 * No generated replacement. Vector masters and final waving animation pending. */
export function NonaWordmark() {
  return <span className="nona-wordmark" role="img" aria-label="NONA" />;
}

export function NonaMascot({ className = "" }: { className?: string }) {
  return <span className={`nona-official-mascot ${className}`} role="img" aria-label="NONA" />;
}
