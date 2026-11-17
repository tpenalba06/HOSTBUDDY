import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

const supabase = "https://mhhtnqfdkyudwyqlmnce.supabase.co";
const preview = "https://nona-concierge-test-20261020-86ilf1sjk.vercel.app";
const key = process.env.NONA_TEST_KEY;
const properties = [
  ["ce245d47-7c6e-40bd-ad79-b0ac8b50b679", "recette-isolation-pilote-a-2f24ac"],
  ["a219b8fd-7f34-4c04-9929-f27a173d5a03", "recette-isolation-pilote-b-99ecfc"],
];
const failures = [];
async function check(label, run) {
  try {
    console.log(JSON.stringify({ label, ...(await run()) }));
  } catch {
    failures.push(label);
    console.error(JSON.stringify({ label, passed: false }));
  }
}
async function request(url, { body, headers, method = "GET" }) {
  const response = await fetch(url, {
    method,
    headers: { ...headers, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
    signal: AbortSignal.timeout(10000),
  });
  return {
    status: response.status,
    headers: response.headers,
    data: await response.json().catch(() => null),
  };
}
async function login(label) {
  const email = process.env[`NONA_TEST_${label}_EMAIL`];
  const password = process.env[`NONA_TEST_${label}_PASSWORD`];
  assert.ok(email?.endsWith("@example.invalid") && password);
  const result = await request(supabase + "/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { apikey: key },
    body: { email, password },
  });
  assert.equal(result.status, 200);
  assert.ok(result.data?.access_token);
  return { apikey: key, Authorization: `Bearer ${result.data.access_token}` };
}
function rest(headers, path, options = {}) {
  return request(supabase + "/rest/v1/" + path, {
    ...options,
    headers: { ...headers, ...options.headers },
  });
}
async function get(headers, path) {
  const response = await rest(headers, path);
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.data));
  return response.data;
}
async function isolation(sessions) {
  const homes = await Promise.all(
    sessions.map(async (headers, i) => {
      const rows = await get(
        headers,
        `properties?id=eq.${properties[i][0]}&select=id,name,organization_id`,
      );
      assert.equal(rows.length, 1);
      return rows[0];
    }),
  );
  assert.notEqual(homes[0].organization_id, homes[1].organization_id);
  await check("private Storage", async () => {
    const media = await Promise.all(
      sessions.map(async (headers, i) => {
        const rows = await get(
          headers,
          `section_media?property_id=eq.${homes[i].id}&select=storage_path`,
        );
        assert.ok(rows[0]?.storage_path);
        return rows[0].storage_path;
      }),
    );
    const statuses = [];
    for (const i of [0, 1]) {
      const read = async (path) => {
        const result = await fetch(
          supabase +
            "/storage/v1/object/authenticated/guide-media/" +
            path.split("/").map(encodeURIComponent).join("/"),
          { headers: sessions[i], redirect: "manual", signal: AbortSignal.timeout(10000) },
        );
        await result.body?.cancel();
        return result.status;
      };
      const own = await read(media[i]);
      const foreign = await read(media[1 - i]);
      assert.equal(own, 200);
      assert.ok([400, 403, 404].includes(foreign));
      statuses.push({ own, foreign });
    }
    return { passed: true, statuses };
  });
  for (const [table, scope, mutable] of [
    ["properties", "id", "name"],
    ["guide_sections", "property_id", "title"],
    ["conversations", "property_id", "guest_display_name"],
    ["orders", "property_id", null],
    ["section_media", "property_id", null],
    ["services", "organization_id", "name"],
    ["organization_payment_accounts", "organization_id", null],
  ]) {
    await check(table, async () => {
      const pk = table === "organization_payment_accounts" ? "organization_id" : "id";
      const rows = await Promise.all(
        sessions.map((headers, i) =>
          get(
            headers,
            `${table}?${scope}=eq.${homes[i][scope === "organization_id" ? scope : "id"]}&select=${pk}${mutable ? "," + mutable : ""}`,
          ),
        ),
      );
      assert.ok(rows.every((list) => list.length > 0));
      const results = [];
      for (const i of [0, 1]) {
        const row = rows[1 - i][0];
        const path = `${table}?${pk}=eq.${row[pk]}`;
        assert.deepEqual(await get(sessions[i], path + `&select=${pk}`), []);
        const rollbackHeaders = { Prefer: "tx=rollback, return=representation" };
        const probe = await rest(sessions[i], path + `&select=${pk}`, { headers: rollbackHeaders });
        const rollbackSupported =
          probe.status === 200 &&
          /(?:^|,\s*)tx=rollback(?:,|$)/.test(probe.headers.get("preference-applied") ?? "");
        let patchStatus;
        if (mutable) {
          assert.ok(rollbackSupported, "rollback preference unavailable");
          const patch = await rest(sessions[i], path + `&select=${pk}`, {
            method: "PATCH",
            headers: rollbackHeaders,
            body: { [mutable]: row[mutable] },
          });
          assert.ok(patch.status === 403 || (patch.status === 200 && patch.data?.length === 0));
          patchStatus = patch.status;
          assert.deepEqual(await get(sessions[1 - i], path + `&select=${pk},${mutable}`), [row]);
        }
        assert.ok(rollbackSupported, "rollback preference unavailable");
        const deletion = await rest(sessions[i], path, {
          method: "DELETE",
          headers: rollbackHeaders,
        });
        assert.ok(
          deletion.status === 403 || (deletion.status === 200 && deletion.data?.length === 0),
        );
        assert.equal((await get(sessions[1 - i], path + `&select=${pk}`)).length, 1);
        results.push({
          direction: i === 0 ? "A→B" : "B→A",
          foreignRead: 0,
          patchStatus,
          deleteStatus: deletion.status,
        });
      }
      return { passed: true, ownRows: rows.map((list) => list.length), results };
    });
  }
}
async function stay(headers) {
  const marker = "NONA synthetic HTTP stay fixture";
  async function issue(expires) {
    const result = await rest(headers, "rpc/issue_guest_stay_access", {
      method: "POST",
      body: {
        _property: properties[0][0],
        _opens_at: new Date(Date.now() - 60000).toISOString(),
        _expires_at: new Date(expires).toISOString(),
        _entry_instructions: marker,
        _wifi_ssid: null,
        _wifi_password: null,
      },
    });
    assert.equal(result.status, 200);
    assert.ok(result.data?.[0]?.token);
    return result.data[0];
  }
  async function revoke(grant) {
    const result = await rest(headers, "rpc/revoke_guest_stay_access", {
      method: "POST",
      body: { _property: properties[0][0], _id: grant.id },
    });
    assert.equal(result.status, 200);
    assert.equal(result.data, true);
  }
  async function scenario(label, slug, token, expected) {
    await check(label, async () => {
      const response = await request(preview + "/api/public/stay-access", {
        method: "POST",
        headers: {
          Origin: preview,
          ...(process.env.NONA_TEST_VERCEL_OIDC
            ? { "x-vercel-trusted-oidc-idp-token": process.env.NONA_TEST_VERCEL_OIDC }
            : {}),
        },
        body: { slug, token },
      });
      console.log(JSON.stringify({ label, status: response.status }));
      assert.equal(response.status, expected);
      assert.match(response.headers.get("cache-control") ?? "", /no-store/);
      if (expected === 200) assert.equal(response.data?.entryInstructions, marker);
      else assert.deepEqual(response.data, { error: "unavailable" });
      return { passed: true };
    });
  }
  const slug = properties[0][1];
  const valid = await issue(Date.now() + 120000);
  try {
    await scenario("valid", slug, valid.token, 200);
    await scenario("wrong-property", properties[1][1], valid.token, 404);
    await scenario("unknown", slug, randomBytes(32).toString("hex"), 404);
  } finally {
    await revoke(valid);
  }
  await scenario("revoked", slug, valid.token, 404);
  const expiry = Date.now() + 7000;
  const expiring = await issue(expiry);
  try {
    await new Promise((resolve) => setTimeout(resolve, Math.max(0, expiry + 1000 - Date.now())));
    await scenario("expired", slug, expiring.token, 404);
  } finally {
    await revoke(expiring);
  }
}

try {
  assert.ok(key?.startsWith("sb_publishable_"));
  const sessions = await Promise.all([login("A"), login("B")]);
  await check("isolation", () => isolation(sessions));
  await check("stay", () => stay(sessions[0]));
} catch {
  console.error(JSON.stringify({ label: "recipe authentication or configuration", passed: false }));
  failures.push("setup");
}
process.exitCode = Number(failures.length > 0);
