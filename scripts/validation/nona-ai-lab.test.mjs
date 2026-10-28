import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { saveVault, readVault, readVaultState } from "./nona-lab-vault.mjs";

test(
  "DPAPI encrypts credentials and restores them only through the local vault",
  { skip: process.platform !== "win32" },
  async () => {
    const folder = await mkdtemp(join(tmpdir(), "nona-vault-test-"));
    const path = join(folder, "credentials.dpapi");
    const fixture = { gateway: "SYNTHETIC-NOT-A-KEY", supabase: "SYNTHETIC-ONLY" };
    try {
      await saveVault(path, fixture);
      assert.equal((await readFile(path, "utf8")).includes(fixture.gateway), false);
      assert.deepEqual(await readVault(path), fixture);
      assert.equal(await readVault(join(folder, "absent")), null);
      assert.equal((await readVaultState(join(folder, "absent"))).state, "missing");
      await saveVault(path, { ...fixture, slug: "replacement" });
      assert.equal((await readVault(path)).slug, "replacement");
      await writeFile(path, "synthetic-invalid-ciphertext");
      assert.equal((await readVaultState(path)).state, "unavailable");
      assert.equal(await readFile(path, "utf8"), "synthetic-invalid-ciphertext");
    } finally {
      // Test-owned generated directory, never a user workspace path.
      await rm(path, { force: true });
      await (await import("node:fs/promises")).rmdir(folder);
    }
  },
);

test("loopback lab rejects unauthenticated, foreign-origin and booking requests", async (t) => {
  // Owned ephemeral local-only process: never relies on or stops the user's lab,
  // never opens the vault and never enables a paid inference endpoint.
  const child = spawn(process.execPath, ["scripts/validation/nona-ai-lab.mjs"], {
    cwd: fileURLToPath(new URL("../../", import.meta.url)),
    env: { ...process.env, NONA_LAB_PROVIDER: "ollama-local-v1", NONA_LAB_SECURITY_TEST: "v1" },
    windowsHide: true,
    stdio: ["ignore", "pipe", "ignore"],
  });
  t.after(() => child.kill());
  const origin = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("local_security_test_start_timeout")), 30000);
    child.once("error", () => {
      clearTimeout(timer);
      reject(new Error("local_security_test_start_failed"));
    });
    child.once("exit", () => {
      clearTimeout(timer);
      reject(new Error("local_security_test_early_exit"));
    });
    child.stdout.on("data", (data) => {
      const match = data.toString().match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) {
        clearTimeout(timer);
        resolve(match[0]);
      }
    });
  });
  const page = await fetch(origin);
  assert.equal(page.status, 200);
  const cookie = page.headers.get("set-cookie").split(";")[0];
  assert.equal((await fetch(origin + "/status")).status, 403);
  const expired = await fetch(origin + "/status", { headers: { cookie: "nonaLab=expired" } });
  assert.equal(expired.status, 403);
  assert.equal((await expired.json()).code, "SESSION_EXPIRED");
  const state = await fetch(origin + "/status", { headers: { cookie } });
  assert.equal(state.status, 200);
  const status = await state.json();
  assert.equal(status.backend, "ok");
  assert.equal(status.localOnly, true);
  assert.equal(status.paidApisEnabled, false);
  assert.equal(Array.isArray(status.issues), true);
  assert.equal("gatewayKey" in status, false);
  assert.equal("supabaseKey" in status, false);
  const rejected = await fetch(origin + "/configure", {
    method: "POST",
    headers: { cookie, origin: "https://untrusted.invalid", "content-type": "application/json" },
    body: "{}",
  });
  assert.equal(rejected.status, 403);
  assert.equal((await fetch(origin + "/api/public/orders", { headers: { cookie } })).status, 404);
  assert.equal(
    (
      await fetch(origin + "/chat", {
        method: "POST",
        headers: { cookie, origin, "content-type": "application/json" },
        body: JSON.stringify({ mode: "ai", message: "Coucou" }),
      })
    ).status,
    403,
  );
});
