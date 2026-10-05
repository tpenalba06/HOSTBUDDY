import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

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
