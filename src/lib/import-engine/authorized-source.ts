// Exact, owned evaluation pages only. A platform URL is never permission.
const root =
  "https://raw.githubusercontent.com/tpenalba06/HOSTBUDDY/work/nona-commercial-beta/docs/fixtures/";
export const authorizedEvaluationSources = [
  `${root}nona-villa-test.html`,
  `${root}nona-chalet-test.html`,
] as const;
export function authorizedEvaluationSource(url: string) {
  return authorizedEvaluationSources.some((source) => source === url);
}
