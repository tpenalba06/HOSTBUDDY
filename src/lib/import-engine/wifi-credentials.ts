/** Parse explicitly labelled values only. Keep the original text as provenance. */
export function wifiCredentials(text: string): { network?: string; password?: string } | null {
  // A slash in legacy prose is ambiguous; retain the complete original value.
  if (/\s\/\s*(?:mot de passe|password|contrase[nñ]a|passwort|senha)\b/i.test(text)) return null;
  const labelled = text.replace(
    /;\s*(?=(?:r[eé]seau(?: wi[ -]?fi)?|ssid|network(?: name)?|red(?: wi[ -]?fi)?|netzwerk(?:name)?|rete(?: wi[ -]?fi)?|mot de passe(?: wi[ -]?fi)?|mdp|password(?: wi[ -]?fi)?|contrase[nñ]a|passwort|senha)(?:\s*[:=]|\s+))/gi,
    "\n",
  );
  const values = (labels: string) =>
    [
      ...labelled.matchAll(
        new RegExp(
          `(?:^|[\\n])\\s*(?:wi[ -]?fi\\s*:\\s*)?(?:${labels})(?:\\s*[:=]\\s*|\\s+)([^\\n]+)`,
          "gi",
        ),
      ),
    ]
      .map((match) => match[1]!.trim())
      .filter(Boolean);
  const networks = [
    ...new Set(
      values(
        "r[eé]seau(?: wi[ -]?fi)?|ssid|network(?: name)?|red(?: wi[ -]?fi)?|netzwerk(?:name)?|rete(?: wi[ -]?fi)?",
      ),
    ),
  ];
  const passwords = [
    ...new Set(
      values(
        "mot de passe(?: wi[ -]?fi)?|mdp|password(?: wi[ -]?fi)?|contrase[nñ]a|passwort|senha",
      ),
    ),
  ];
  // Conflicts remain intact for human review; an unrelated password is never assigned to Wi-Fi.
  if (networks.length > 1 || passwords.length > 1 || (!networks.length && !/wi[ -]?fi/i.test(text)))
    return null;
  if (!networks.length && !passwords.length) return null;
  if (/(?:à confirmer|à vérifier|maybe|to confirm|\?)/i.test(text)) return null;
  return {
    ...(networks[0] ? { network: networks[0] } : {}),
    ...(passwords[0] ? { password: passwords[0] } : {}),
  };
}
