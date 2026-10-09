import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildIdentity } from "./build-identity.mjs";

const folders: string[] = [];
function checkout() {
  const cwd = mkdtempSync(join(tmpdir(), "nona-build-identity-"));
  folders.push(cwd);
  const git = (...args: string[]) =>
    execFileSync("git", args, { cwd, stdio: "pipe" }).toString().trim();
  git("init");
  writeFileSync(join(cwd, "source.txt"), "original\n");
  git("add", "source.txt");
  git(
    "-c",
    "user.name=Nona test",
    "-c",
    "user.email=test@example.invalid",
    "commit",
    "-m",
    "fixture",
  );
  return { cwd, git };
}
afterEach(() =>
  folders.splice(0).forEach((path) => rmSync(path, { recursive: true, force: true })),
);
describe("compiled checkout identity", () => {
  it("attests the exact clean commit", () => {
    const { cwd, git } = checkout();
    expect(buildIdentity(cwd)).toEqual({ revision: git("rev-parse", "HEAD"), state: "clean" });
  });
  it("does not attest unstaged source changes as a clean HEAD", () => {
    const { cwd } = checkout();
    writeFileSync(join(cwd, "source.txt"), "changed\n");
    expect(buildIdentity(cwd).state).toBe("modified");
  });
  it("does not attest staged source changes as a clean HEAD", () => {
    const { cwd, git } = checkout();
    writeFileSync(join(cwd, "source.txt"), "changed\n");
    git("add", "source.txt");
    expect(buildIdentity(cwd).state).toBe("modified");
  });
  it("reports unknown when the builder has no Git checkout", () => {
    const cwd = mkdtempSync(join(tmpdir(), "nona-no-git-"));
    folders.push(cwd);
    expect(buildIdentity(cwd)).toEqual({ revision: "unknown", state: "unknown" });
  });
  it("does not attest uncommitted new source files", () => {
    const { cwd } = checkout();
    writeFileSync(join(cwd, "new-source.txt"), "new\n");
    expect(buildIdentity(cwd).state).toBe("modified");
  });
});
