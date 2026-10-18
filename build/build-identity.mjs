import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// A committed manifest lets builders without .git attest the same source bytes.
// It contains paths only: never hash .env, credentials or generated outputs.
export function buildSourceFingerprint(cwd = process.cwd()) {
  try {
    const manifestPath = join(cwd, "build/source-manifest.json");
    const paths = JSON.parse(readFileSync(manifestPath, "utf8"));
    const digest = createHash("sha256");
    for (const path of paths) {
      if (typeof path !== "string" || path.startsWith("/") || path.split("/").includes(".."))
        return "unknown";
      const absolute = join(cwd, path);
      if (!existsSync(absolute)) return "unknown";
      const bytes = readFileSync(absolute);
      digest.update(path + "\0" + bytes.length + "\0");
      digest.update(bytes);
    }
    return digest.digest("hex");
  } catch {
    return "unknown";
  }
}

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
