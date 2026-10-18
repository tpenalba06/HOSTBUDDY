import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildIdentity, buildSourceFingerprint } from "./build-identity.mjs";

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

describe("source bytes on builders without Git", () => {
  function source() {
    const cwd = mkdtempSync(join(tmpdir(), "nona-source-"));
    folders.push(cwd);
    mkdirSync(join(cwd, "build"));
    writeFileSync(join(cwd, "source.txt"), "original\n");
    writeFileSync(join(cwd, "build/source-manifest.json"), JSON.stringify(["source.txt"]));
    return cwd;
  }
  it("matches identical inputs and changes when any declared source changes", () => {
    const a = source(),
      b = source();
    expect(buildSourceFingerprint(a)).toMatch(/^[a-f0-9]{64}$/);
    expect(buildSourceFingerprint(a)).toBe(buildSourceFingerprint(b));
    writeFileSync(join(b, "source.txt"), "changed\n");
    expect(buildSourceFingerprint(a)).not.toBe(buildSourceFingerprint(b));
  });
  it("reports unknown rather than attesting missing inputs", () => {
    const cwd = source();
    rmSync(join(cwd, "source.txt"));
    expect(buildSourceFingerprint(cwd)).toBe("unknown");
  });
  it("refuses paths outside the declared checkout", () => {
    const cwd = source();
    writeFileSync(join(cwd, "build/source-manifest.json"), JSON.stringify(["../source.txt"]));
    expect(buildSourceFingerprint(cwd)).toBe("unknown");
  });
});
