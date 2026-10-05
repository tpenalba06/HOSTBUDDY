import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// Only numeric evidence is retained: no node snippets, URLs or request headers.
function numericDetails(value, depth = 0) {
  if (depth > 8 || value == null) return undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (Array.isArray(value)) {
    const items = value
      .map((item) => numericDetails(item, depth + 1))
      .filter((item) => item !== undefined);
    return items.length ? items : undefined;
  }
  if (typeof value !== "object") return undefined;
  const entries = Object.entries(value)
    .filter(
      ([key]) =>
        /^[a-zA-Z][a-zA-Z0-9]*$/.test(key) && !["node", "headers", "cookies"].includes(key),
    )
    .map(([key, item]) => [
      key,
      key === "subpart" &&
      [
        "timeToFirstByte",
        "resourceLoadDelay",
        "resourceLoadDuration",
        "elementRenderDelay",
      ].includes(item)
        ? item
        : numericDetails(item, depth + 1),
    ])
    .filter(([, item]) => item !== undefined);
  return entries.length ? Object.fromEntries(entries) : undefined;
}

/** Publish metrics only, never raw reports containing signed media URLs. */
export function lighthouseSummary(report) {
  if (
    report.runtimeError ||
    !report.categories ||
    Object.values(report.categories).some((c) => typeof c.score !== "number")
  )
    throw new Error("lighthouse_measurement_unavailable");
  return {
    version: report.lighthouseVersion,
    fetchTime: report.fetchTime,
    throttlingMethod: report.configSettings.throttlingMethod,
    scores: Object.fromEntries(
      Object.entries(report.categories).map(([name, category]) => [
        name,
        Math.round(category.score * 100),
      ]),
    ),
    metrics: Object.fromEntries(
      [
        "first-contentful-paint",
        "largest-contentful-paint",
        "total-blocking-time",
        "cumulative-layout-shift",
        "speed-index",
      ].map((name) => [name, report.audits[name]?.numericValue ?? null]),
    ),
    diagnostics: Object.fromEntries(
      [
        "lcp-breakdown-insight",
        "lcp-discovery-insight",
        "document-latency-insight",
        "image-delivery-insight",
        "render-blocking-insight",
      ].map((id) => [id, numericDetails(report.audits[id]?.details) ?? null]),
    ),
    failedAuditIds: Object.values(report.audits)
      .filter((audit) => audit.score !== null && audit.score < 0.9)
      .map((audit) => audit.id),
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = lighthouseSummary(JSON.parse(readFileSync(process.argv[2], "utf8")));
  writeFileSync(process.argv[3], JSON.stringify(result, null, 2) + "\n");
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `Lighthouse (${process.argv[4] === "guide" ? "guide" : "home"}, ${result.throttlingMethod}): ${JSON.stringify(result.scores)}\n\n`,
    );
}
