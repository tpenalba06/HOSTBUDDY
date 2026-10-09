import { execFileSync } from "node:child_process";

// Read the checkout actually being compiled, never a client-supplied revision.
// A missing Git checkout or pending source changes cannot attest a clean HEAD.
export function buildIdentity(cwd = process.cwd()) {
  try {
    const options = { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] };
    const revision = execFileSync("git", ["rev-parse", "HEAD"], options).trim();
    if (!/^[a-f0-9]{40}$/.test(revision)) return { revision: "unknown", state: "unknown" };
    const changes = execFileSync(
      "git",
      ["status", "--porcelain", "--untracked-files=normal"],
      options,
    );
    return { revision, state: changes.trim() ? "modified" : "clean" };
  } catch {
    return { revision: "unknown", state: "unknown" };
  }
}
