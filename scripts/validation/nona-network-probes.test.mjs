import { test } from "node:test";
import assert from "node:assert/strict";
import { networkFailure } from "./nona-network-probes.mjs";

test("distinguishes DNS, permissions, TLS and timeouts", () => {
  for (const [code, stage] of [
    ["ENOTFOUND", "dns"],
    ["EACCES", "permission"],
    ["CERT_HAS_EXPIRED", "tls"],
    ["ECONNREFUSED", "tcp"],
    ["UND_ERR_CONNECT_TIMEOUT", "timeout"],
  ])
    assert.equal(networkFailure({ cause: { code } }).stage, stage);
});
test("does not expose upstream messages, keys, URLs or unknown error codes", () => {
  const result = networkFailure({
    message: "secret",
    code: "secret",
    cause: { message: "secret" },
  });
  assert.deepEqual(result, { stage: "unknown", code: "unclassified" });
  assert.equal(JSON.stringify(result).includes("secret"), false);
  assert.deepEqual(networkFailure({ code: "CERT_secret" }), {
    stage: "unknown",
    code: "unclassified",
  });
});
