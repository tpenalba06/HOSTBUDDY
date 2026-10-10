// RFC 9309 groups, wildcards, and longest-rule precedence. Network errors
// remain fail-closed in the caller; this function only evaluates fetched text.
type Rule = { allow: boolean; path: string };
type Group = { agents: string[]; rules: Rule[]; hasDirectives: boolean };

function normalizedPath(value: string): string {
  return value.replace(/%[0-9a-f]{2}/gi, (encoded) => {
    const decoded = String.fromCharCode(parseInt(encoded.slice(1), 16));
    return /[A-Za-z0-9._~-]/.test(decoded) ? decoded : encoded.toUpperCase();
  });
}

export function robotsTextAllows(text: string, url: URL, agent = "HostBuddyBot"): boolean {
  const groups: Group[] = [];
  let current: Group | undefined;
  for (const raw of text.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const line = raw.split("#")[0]!.trim();
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (key === "user-agent") {
      if (!current || current.hasDirectives) {
        current = { agents: [], rules: [], hasDirectives: false };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if (current && (key === "allow" || key === "disallow")) {
      current.hasDirectives = true;
      if (value) current.rules.push({ allow: key === "allow", path: normalizedPath(value) });
    }
  }
  const token = agent.toLowerCase();
  const explicit = groups.filter((group) => group.agents.some((name) => name === token));
  const applicable = explicit.length
    ? explicit
    : groups.filter((group) => group.agents.includes("*"));
  const path = normalizedPath(url.pathname + url.search);
  let winner: Rule | undefined;
  let specificity = -1;
  for (const rule of applicable.flatMap((group) => group.rules)) {
    const end = rule.path.endsWith("$");
    const pattern = (end ? rule.path.slice(0, -1) : rule.path)
      .split("*")
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join(".*");
    if (!new RegExp(`^${pattern}${end ? "$" : ""}`).test(path)) continue;
    const length = new TextEncoder().encode(rule.path.replace(/[*$]/g, "")).length;
    if (length > specificity || (length === specificity && rule.allow)) {
      winner = rule;
      specificity = length;
    }
  }
  return winner?.allow ?? true;
}
