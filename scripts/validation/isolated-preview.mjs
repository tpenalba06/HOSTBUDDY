import { lstatSync, readFileSync, mkdtempSync, symlinkSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const TEST_REF = "mhhtnqfdkyudwyqlmnce";
export const TEST_URL = `https://${TEST_REF}.supabase.co`;
const REPO = resolve(fileURLToPath(new URL("../..", import.meta.url)));

export function loadCredentials(directory) {
  const root = lstatSync(directory);
  if (!root.isDirectory() || root.isSymbolicLink() || root.mode & 0o077)
    throw new Error("private_test_directory_required");
  const read = (name, prefix) => {
    const path = join(directory, name);
    const stat = lstatSync(path);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.mode & 0o077)
      throw new Error("private_test_key_file_required");
    const value = readFileSync(path, "utf8").trim();
    if (!value.startsWith(prefix) || /\s/.test(value) || value.length > 1000)
      throw new Error("invalid_test_key_format");
    return value;
  };
  return {
    publicKey: read("api-publishable", "sb_publishable_"),
    serverKey: read("api-secret", "sb_secret_"),
  };
}

export function isolatedEnvironment(parent, credentials, ref = TEST_REF) {
  if (ref !== TEST_REF) throw new Error("isolated_test_identity_required");
  const allowed = [
    "PATH",
    "HOME",
    "TMPDIR",
    "LANG",
    "LC_ALL",
    "HTTP_PROXY",
    "HTTPS_PROXY",
    "NO_PROXY",
    "http_proxy",
    "https_proxy",
    "no_proxy",
    "NODE_EXTRA_CA_CERTS",
  ];
  const env = Object.fromEntries(
    allowed.filter((k) => parent[k] !== undefined).map((k) => [k, parent[k]]),
  );
  return {
    ...env,
    NODE_ENV: "development",
    VITE_SUPABASE_URL: TEST_URL,
    VITE_SUPABASE_PROJECT_ID: TEST_REF,
    VITE_SUPABASE_PUBLISHABLE_KEY: credentials.publicKey,
    SUPABASE_URL: TEST_URL,
    SUPABASE_PUBLISHABLE_KEY: credentials.publicKey,
    SUPABASE_SERVICE_ROLE_KEY: credentials.serverKey,
  };
}

export async function verifyTarget(credentials, request = fetch) {
  const response = await request(`${TEST_URL}/auth/v1/settings`, {
    headers: { apikey: credentials.publicKey },
    redirect: "error",
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error("isolated_test_preflight_failed");
  const settings = await response.json();
  if (settings.disable_signup !== true) throw new Error("test_signup_must_be_disabled");
  const storage = await request(`${TEST_URL}/storage/v1/bucket`, {
    headers: { apikey: credentials.serverKey },
    redirect: "error",
    signal: AbortSignal.timeout(30000),
  });
  if (!storage.ok) throw new Error("isolated_test_server_key_failed");
  const buckets = await storage.json();
  if (!Array.isArray(buckets) || !buckets.some((b) => b.id === "guide-media" && b.public === false))
    throw new Error("test_private_media_bucket_required");
  return { target: TEST_REF, signupDisabled: true, privateMediaBucket: true };
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || "--serve";
  if (!["--check", "--probe", "--serve"].includes(mode) || args.length > 2)
    throw new Error("usage_isolated_preview_mode_optional_private_directory");
  const credentials = loadCredentials(resolve(args[1] || join(REPO, "../nona-target-private")));
  const preflight = await verifyTarget(credentials);
  const git = (...a) =>
    execFileSync("git", a, {
      cwd: REPO,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  if (git("status", "--porcelain", "--untracked-files=no"))
    throw new Error("committed_checkout_required");
  const head = git("rev-parse", "HEAD");
  const files = git("ls-tree", "-r", "--name-only", head).split("\n");
  if (files.some((p) => /^\.env(?:$|\.)/.test(p) && !/\.(example|sample)$/.test(p)))
    throw new Error("tracked_environment_file_refused");
  if (mode === "--check") {
    console.log(JSON.stringify({ ...preflight, head, sourceFilesUnchanged: true }));
    return;
  }
  const workspace = mkdtempSync(join(tmpdir(), "nona-isolated-preview-"));
  const checkout = join(workspace, "checkout");
  let added = false;
  let server;
  const cleanup = async () => {
    if (server) {
      await server.close();
      server = undefined;
    }
    process.chdir(REPO);
    if (added) {
      git("worktree", "remove", "--force", checkout);
      added = false;
    }
    rmSync(workspace, { recursive: true, force: true });
  };
  try {
    git("worktree", "add", "--detach", checkout, head);
    added = true;
    symlinkSync(join(REPO, "node_modules"), join(checkout, "node_modules"), "dir");
    const environment = isolatedEnvironment(process.env, credentials);
    for (const key of Object.keys(process.env)) delete process.env[key];
    Object.assign(process.env, environment);
    process.chdir(checkout);
    const { createServer } = await import("vite");
    server = await createServer({
      root: checkout,
      configFile: join(checkout, "vite.config.ts"),
      mode: "nona-isolated-test",
      server: { host: "127.0.0.1", port: 8787, strictPort: true },
    });
    await server.listen();
    console.log(
      JSON.stringify({
        ...preflight,
        head,
        url: "http://127.0.0.1:8787",
        runtime: "isolated-test",
      }),
    );
    if (mode === "--probe") {
      const response = await fetch("http://127.0.0.1:8787/demo?device=mobile", {
        signal: AbortSignal.timeout(60000),
      });
      const html = await response.text();
      if (!response.ok || !html.includes("Villa Mare") || !html.includes(head))
        throw new Error("isolated_preview_ssr_failed");
      const clientResponse = await fetch(
        "http://127.0.0.1:8787/src/integrations/supabase/client.ts",
        { signal: AbortSignal.timeout(30000) },
      );
      const client = await clientResponse.text();
      if (
        !clientResponse.ok ||
        !client.includes(TEST_URL) ||
        client.includes("jzbjpaucgckggumhowns")
      )
        throw new Error("isolated_preview_client_target_failed");
      if (client.includes(credentials.serverKey) || html.includes(credentials.serverKey))
        throw new Error("isolated_preview_server_key_exposure");
      console.log(
        JSON.stringify({
          probe: "PASS",
          http: response.status,
          head,
          clientTarget: TEST_REF,
          serverKeyAbsentFromResponses: true,
        }),
      );
      await cleanup();
    } else {
      for (const signal of ["SIGINT", "SIGTERM"])
        process.once(signal, () => {
          cleanup().then(
            () => process.exit(0),
            () => process.exit(1),
          );
        });
    }
  } catch (error) {
    await cleanup();
    throw error;
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url)
  main().catch(() => {
    console.error(
      "isolated_preview_failed; check TEST access, private files and committed checkout",
    );
    process.exitCode = 1;
  });
