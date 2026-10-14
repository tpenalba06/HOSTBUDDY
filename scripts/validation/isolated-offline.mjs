// Read-only published synthetic guide, compiled build, actual offline navigation.
import { loadCredentials, verifyTarget, TEST_URL, TEST_REF } from "./isolated-preview.mjs";
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawn, execFileSync } from "node:child_process";
const directory = resolve(process.argv[2]),
  output = resolve(process.argv[3]);
mkdirSync(output, { recursive: true, mode: 0o700 });
const result = { target: TEST_REF, status: "INCOMPLETE", checks: [] };
let stage = "preflight",
  server,
  browser,
  profile,
  context;
const check = (name, details = {}) => {
  result.checks.push({ name, pass: true, ...details });
  console.log(JSON.stringify({ check: name, pass: true }));
};
const assert = (v) => {
  if (!v) throw new Error("assertion");
};
const navigateOffline = async (page, url) => {
  await page.goto(url);
  await page.locator(".hb-offline-banner").waitFor({ timeout: 30000 });
  assert(new URL(page.url()).pathname === "/offline");
};
try {
  const keys = loadCredentials(directory);
  await verifyTarget(keys);
  result.head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const pw = await import(pathToFileURL(process.env.NONA_PLAYWRIGHT_MODULE).href);
  browser = await pw.chromium.launch({ headless: true });
  const response = await fetch(
    TEST_URL +
      "/rest/v1/properties?select=name,slug&name=like.Nona%20navigateur%20TEST%20*&status=eq.published&order=created_at.desc&limit=1",
    { headers: { apikey: keys.serverKey }, redirect: "error", signal: AbortSignal.timeout(30000) },
  );
  assert(response.ok);
  const [fixture] = await response.json();
  assert(
    fixture?.name.startsWith("Nona navigateur TEST ") && /^[a-zA-Z0-9_-]{1,80}$/.test(fixture.slug),
  );
  stage = "compiled_server";
  server = spawn(process.execPath, ["scripts/validation/isolated-built.mjs", directory], {
    stdio: "ignore",
  });
  const path = "/l/" + fixture.slug;
  let html;
  for (let n = 0; n < 150; n++) {
    if (server.exitCode !== null) throw new Error("server");
    try {
      const r = await fetch("http://127.0.0.1:8787" + path, { signal: AbortSignal.timeout(2000) });
      if (r.ok) {
        html = await r.text();
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  assert(html?.includes(result.head) && !html.includes(keys.serverKey));
  check("compiled_head");
  const shellResponse = await fetch("http://127.0.0.1:8787/offline", {
    signal: AbortSignal.timeout(10000),
  });
  assert(shellResponse.ok);
  const shellHTML = await shellResponse.text();
  assert(!shellHTML.includes("fonts.googleapis.com") && !shellHTML.includes("fonts.gstatic.com"));
  check("offline_shell_no_external_fonts");
  for (const engine of process.argv[4] === "webkit" ? ["webkit"] : ["chromium", "webkit"]) {
    stage = engine + "_online";
    if (browser) {
      await browser.close();
      browser = undefined;
    }
    profile = mkdtempSync(join(tmpdir(), "nona-guest-profile-"));
    context = await pw[engine].launchPersistentContext(profile, {
      headless: true,
      viewport: { width: 390, height: 844 },
      locale: "fr-FR",
    });
    await context.addInitScript(() => {
      localStorage.setItem("hostbuddy.locale", "fr");
    });
    let networkDisconnected = false,
      uncontrolledResponses = 0,
      runtimeStopped = false;
    const requestBeforeCut = new WeakMap(),
      responseGroups = new Map();
    const networkDiagnostic = {
      nonServiceWorkerResponses: 0,
      groups: [],
      pageErrors: 0,
      deniedUpstreamRequests: 0,
    };
    result[engine + "NetworkDiagnostic"] = networkDiagnostic;
    context.on("request", (request) => requestBeforeCut.set(request, !networkDisconnected));
    context.on("response", (response) => {
      if (!networkDisconnected || !/^https?:/.test(response.url())) return;
      const fromServiceWorker = response.fromServiceWorker();
      if (!fromServiceWorker) uncontrolledResponses++;
      const origin = new URL(response.url()).origin;
      const resourceType = response.request().resourceType();
      const group = {
        originClass:
          origin === "http://127.0.0.1:8787"
            ? "loopback"
            : origin === TEST_URL
              ? "test"
              : origin === "https://fonts.googleapis.com"
                ? "public_font_css"
                : origin === "https://fonts.gstatic.com"
                  ? "public_font_file"
                  : "other",
        resourceType: [
          "document",
          "stylesheet",
          "image",
          "font",
          "script",
          "fetch",
          "xhr",
        ].includes(resourceType)
          ? resourceType
          : "other",
        responseOriginMatchesRequest: origin === new URL(response.request().url()).origin,
        status: response.status(),
        fromServiceWorker,
        startedBeforeCut: requestBeforeCut.get(response.request()) ?? null,
        runtimeStopped,
      };
      const key = JSON.stringify(group),
        previous = responseGroups.get(key);
      if (previous) previous.count++;
      else responseGroups.set(key, { ...group, count: 1 });
      networkDiagnostic.nonServiceWorkerResponses = uncontrolledResponses;
      networkDiagnostic.groups = [...responseGroups.values()];
    });
    await context.route("**/*", (route) => {
      const u = new URL(route.request().url());
      if (["blob:", "data:"].includes(u.protocol)) return route.continue();
      // The stopped loopback server cannot serve anything. Let WebKit consult its
      // SW instead of aborting navigation in Playwright before cache interception.
      if (
        networkDisconnected &&
        engine === "webkit" &&
        u.origin === "http://127.0.0.1:8787" &&
        server.exitCode !== null
      )
        return route.continue();
      if (networkDisconnected) {
        networkDiagnostic.deniedUpstreamRequests++;
        return route.abort();
      }
      if (u.origin === "http://127.0.0.1:8787" || u.origin === TEST_URL) return route.continue();
      return route.abort();
    });
    const page = await context.newPage();
    let errors = 0;
    const pageError = (e) => {
      errors++;
      result.pageErrors = (result.pageErrors || 0) + 1;
      const m = e.message || "";
      const reactCode = m.match(/Minified React error #(\d{3})/)?.[1];
      if (reactCode) result.reactErrorCode = reactCode;
      result.errorCategory = /hydrati/i.test(m)
        ? "hydration"
        : /dynamically imported module|module script|Failed to fetch/i.test(m)
          ? "module_load"
          : "uncategorized";
    };
    page.on("pageerror", pageError);
    await page.goto("http://127.0.0.1:8787" + path);
    await page.waitForLoadState("networkidle");
    await page.getByText(fixture.name, { exact: true }).first().waitFor();
    result[engine + "Capabilities"] = await page.evaluate(() => ({
      secureContext: isSecureContext,
      serviceWorker: !!navigator.serviceWorker,
      caches: !!globalThis.caches,
      indexedDB: !!globalThis.indexedDB,
    }));
    result[engine + "StorageBeforeSave"] = await page.evaluate(async () => {
      const e = await navigator.storage?.estimate?.();
      return { quota: e?.quota, usage: e?.usage };
    });
    stage = engine + "_save";
    await page.getByRole("button", { name: "Enregistrer hors connexion", exact: true }).click();
    const copy = page.getByRole("link", { name: "Ouvrir la copie enregistrée", exact: true });
    const alert = page.locator(".hb-offline-save [role=alert]");
    await Promise.race([copy.waitFor({ timeout: 90000 }), alert.waitFor({ timeout: 90000 })]);
    if (await alert.isVisible()) {
      result[engine + "StorageAfterSave"] = await page.evaluate(async () => {
        const e = await navigator.storage?.estimate?.();
        return { quota: e?.quota, usage: e?.usage };
      });
      const message = await alert.innerText();
      result.saveErrorCategory = /disponible dans ce navigateur/.test(message)
        ? "unsupported_browser"
        : /espace/.test(message)
          ? "storage_space"
          : /média|photo/.test(message)
            ? "media"
            : /lecteur|téléchargement|mode hors connexion/.test(message)
              ? "shell"
              : "unclassified";
      throw new Error("save");
    }
    const offlinePath = await copy.getAttribute("href");
    assert(offlinePath?.startsWith("/offline?slug="));
    check(engine + "_saved_text_and_photo");
    result[engine + "OfflineReady"] = await page.evaluate(async () => ({
      controlled: !!navigator.serviceWorker.controller,
      shellCached: (
        await Promise.all(
          (await caches.keys())
            .filter((n) => n.startsWith("hb-guest-shell-"))
            .map(async (n) => !!(await (await caches.open(n)).match("/offline"))),
        )
      ).some(Boolean),
    }));
    stage = engine + "_network_off";
    networkDisconnected = true;
    if (engine === "webkit") {
      // WebKit's browser offline toggle rejects navigation before this runner's SW.
      // Stop the only HTTP runtime and deny every routed network request instead.
      const exited = new Promise((resolve) => server.once("exit", resolve));
      server.kill("SIGTERM");
      await exited;
      runtimeStopped = true;
      let reachable = false;
      try {
        await fetch("http://127.0.0.1:8787/offline", { signal: AbortSignal.timeout(2000) });
        reachable = true;
      } catch {}
      assert(!reachable);
      result[engine + "Disconnection"] = {
        runtimeStopped: true,
        upstreamRequestsDenied: true,
        browserOfflineToggle: false,
      };
    } else {
      await context.setOffline(true);
      result[engine + "Disconnection"] = {
        networkRequestsDenied: true,
        browserOfflineToggle: true,
      };
    }
    stage = engine + "_offline_navigation";
    await navigateOffline(page, "http://127.0.0.1:8787" + offlinePath, engine);
    stage = engine + "_offline_text";
    await page.getByText(fixture.name, { exact: true }).first().waitFor({ timeout: 30000 });
    result[engine + "OfflineDocument"] = await page.evaluate(() => ({
      offlinePath: location.pathname === "/offline",
      offlineBanner: !!document.querySelector(".hb-offline-banner"),
      images: [...document.images].slice(0, 12).map((img) => ({
        sourceKind: img.currentSrc.startsWith("blob:")
          ? "blob"
          : img.currentSrc.startsWith("data:")
            ? "data"
            : img.currentSrc.startsWith("http")
              ? "network"
              : "empty",
        complete: img.complete,
        width: img.naturalWidth,
        height: img.naturalHeight,
      })),
    }));
    stage = engine + "_offline_photo";
    await page.waitForFunction(
      () =>
        [...document.images].some(
          (img) => img.currentSrc.startsWith("blob:") && img.complete && img.naturalWidth > 0,
        ),
      null,
      { timeout: 30000 },
    );
    stage = engine + "_offline_overflow";
    assert(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)));
    check(engine + "_offline_start_and_blob_photo");
    stage = engine + "_offline_reopen_navigation";
    await page.close();
    const reopened = await context.newPage();
    reopened.on("pageerror", pageError);
    await navigateOffline(reopened, "http://127.0.0.1:8787" + offlinePath, engine);
    stage = engine + "_offline_reopen_text";
    await reopened.getByText(fixture.name, { exact: true }).first().waitFor({ timeout: 30000 });
    stage = engine + "_offline_reopen_photo";
    await reopened.waitForFunction(() =>
      [...document.images].some(
        (img) => img.currentSrc.startsWith("blob:") && img.complete && img.naturalWidth > 0,
      ),
    );
    check(engine + "_offline_new_tab");
    networkDiagnostic.pageErrors = errors;
    stage = engine + "_offline_network_provenance";
    assert(uncontrolledResponses === 0);
    check(engine + "_no_uncached_network_responses");
    stage = engine + "_no_page_errors";
    assert(errors === 0);
    check(engine + "_no_page_errors");
    await context.close();
    context = undefined;
    rmSync(profile, { recursive: true, force: true });
    profile = undefined;
  }
  result.status = "PASS";
} catch (e) {
  const message = e?.message || "";
  result.failureCategory = /not supported|unsupported/i.test(message)
    ? "unsupported_operation"
    : /ERR_INTERNET_DISCONNECTED|internet disconnected|offline/i.test(message)
      ? "network_disconnected"
      : /Timeout|timed out/i.test(message)
        ? "timeout"
        : /assertion/.test(message)
          ? "assertion"
          : "unclassified";
  try {
    const diagnostic = JSON.parse(readFileSync(join(directory, "built-status.json"), "utf8"));
    if (
      ["checkout", "build", "worker_import", "client_audit", "http_start", "ready"].includes(
        diagnostic.phase,
      )
    )
      result.runtimePhase = diagnostic.phase;
    if (
      [
        "ENOENT",
        "ERR_MODULE_NOT_FOUND",
        "ERR_INVALID_ARG_TYPE",
        "ERR_INVALID_ARG_VALUE",
        "unspecified",
      ].includes(diagnostic.code)
    )
      result.runtimeCode = diagnostic.code;
  } catch {}
  result.status = "FAIL";
  result.failedStage = stage;
  process.exitCode = 1;
} finally {
  if (context) await context.close().catch(() => {});
  if (profile) rmSync(profile, { recursive: true, force: true });
  if (browser) await browser.close().catch(() => {});
  if (server) server.kill("SIGTERM");
  writeFileSync(join(output, "results.json"), JSON.stringify(result, null, 2), { mode: 0o600 });
  console.log(
    JSON.stringify({
      status: result.status,
      stage: result.failedStage || "complete",
      checks: result.checks.length,
    }),
  );
}
