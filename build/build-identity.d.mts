export function buildIdentity(cwd?: string): {
  revision: string;
  state: "clean" | "modified" | "unknown";
};
