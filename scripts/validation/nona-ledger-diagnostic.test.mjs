import { test } from "node:test";
import assert from "node:assert/strict";
import { keyKind, ledgerFailure, inspectLedger } from "./nona-ledger-diagnostic.mjs";

test("classify public and server credentials without returning credential material", () => {
  assert.equal(keyKind("sb_secret_SYNTHETIC"), "server-secret");
  assert.equal(keyKind("sb_publishable_SYNTHETIC"), "public");
  for (const role of ["anon", "authenticated", "service_role"]) {
    const value = "x." + Buffer.from(JSON.stringify({ role })).toString("base64url") + ".x";
    assert.equal(keyKind(value), role === "service_role" ? "legacy-server" : "public-or-user");
  }
});
test("diagnostics separate permission, schema, invisible row and authentication errors", () => {
  assert.equal(ledgerFailure({ code: "42501" }, 403).reason, "permission-denied");
  assert.equal(ledgerFailure({ code: "PGRST205" }, 404).reason, "table-or-schema-cache-missing");
  assert.equal(
    ledgerFailure({ code: "PGRST116" }, 406).reason,
    "authorization-row-missing-or-invisible",
  );
  assert.equal(ledgerFailure({}, 401).reason, "key-refused");
  assert.equal(
    JSON.stringify(ledgerFailure({ code: "SECRET", message: "SECRET" }, 400)).includes("SECRET"),
    false,
  );
});
test("a public key never triggers a remote request", async () => {
  assert.equal(
    (await inspectLedger({ supabase: "sb_publishable_SYNTHETIC" })).reason,
    "server-key-required",
  );
});
