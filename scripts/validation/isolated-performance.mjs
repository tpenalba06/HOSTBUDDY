// Read-only compiled TEST guide. Lab baseline, not field Core Web Vitals.
import { loadCredentials, verifyTarget, TEST_URL, TEST_REF } from './isolated-preview.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn, execFileSync } from 'node:child_process';

const directory = resolve(process.argv[2]), output = resolve(process.argv[3]);
mkdirSync(output, { recursive: true, mode: 0o700 });
const result = { target: TEST_REF, status: 'INCOMPLETE', kind: 'compiled_read_only_lab',
  profile: { width: 390, height: 844, latencyMs: 150, downloadBitsPerSecond: 1600000,
    uploadBitsPerSecond: 750000, cpuSlowdown: 4, cache: 'disabled', externalFonts: 'blocked' },
  samples: [], pageErrors: 0, unexpectedRequests: 0 };
let stage = 'preflight', server, browser;
const assert = value => { if (!value) throw new Error('assertion'); };
try {
  const keys = loadCredentials(directory);
  await verifyTarget(keys);
  result.head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const module = process.env.NONA_PLAYWRIGHT_MODULE;
  assert(module?.startsWith('/'));
  const pw = await import(pathToFileURL(module).href);
  browser = await pw.chromium.launch({ headless: true });
  stage = 'synthetic_fixture';
  const response = await fetch(TEST_URL + '/rest/v1/properties?select=name,slug&name=like.Nona%20navigateur%20TEST%20*&status=eq.published&order=created_at.desc&limit=1',
    { headers: { apikey: keys.serverKey }, redirect: 'error', signal: AbortSignal.timeout(30000) });
  assert(response.ok);
  const [fixture] = await response.json();
  assert(fixture?.name.startsWith('Nona navigateur TEST ') && /^[a-zA-Z0-9_-]{1,80}$/.test(fixture.slug));
  stage = 'compiled_server';
  server = spawn(process.execPath, ['scripts/validation/isolated-built.mjs', directory], { stdio: 'ignore' });
  const url = 'http://127.0.0.1:8787/l/' + fixture.slug;
  let html;
  for (let n = 0; n < 150; n++) {
    if (server.exitCode !== null) throw new Error('server');
    try { const r = await fetch(url, { signal: AbortSignal.timeout(2000) }); if (r.ok) { html = await r.text(); break; } } catch { /* bounded readiness */ }
    await new Promise(done => setTimeout(done, 1000));
  }
  assert(html?.includes(result.head) && !html.includes(keys.serverKey));
  for (let n = 0; n < 3; n++) {
    stage = 'sample_' + (n + 1);
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fr-FR', serviceWorkers: 'block' });
    await context.route('**/*', route => {
      const request = route.request(), u = new URL(request.url());
      if (['data:', 'blob:'].includes(u.protocol)) return route.continue();
      const safe = request.method() === 'GET' && (u.origin === 'http://127.0.0.1:8787' ||
        (u.origin === TEST_URL && u.pathname.startsWith('/storage/v1/object/sign/')));
      if (!safe) {
        if (!['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(u.origin)) result.unexpectedRequests++;
        return route.abort('blockedbyclient');
      }
      return route.continue();
    });
    await context.addInitScript(() => {
      localStorage.setItem('hostbuddy.locale', 'fr');
      window.__nonaLab = { lcpMs: null, fcpMs: null, cls: 0 };
      new PerformanceObserver(list => { for (const e of list.getEntries()) window.__nonaLab.lcpMs = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver(list => { for (const e of list.getEntries()) if (e.name === 'first-contentful-paint') window.__nonaLab.fcpMs = e.startTime; }).observe({ type: 'paint', buffered: true });
      new PerformanceObserver(list => { for (const e of list.getEntries()) if (!e.hadRecentInput) window.__nonaLab.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
    });
    const page = await context.newPage();
    page.on('pageerror', () => result.pageErrors++);
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150,
      downloadThroughput: 1600000 / 8, uploadThroughput: 750000 / 8, connectionType: 'cellular4g' });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    let receivedBytes = 0, requests = 0;
    cdp.on('Network.loadingFinished', event => { receivedBytes += event.encodedDataLength; requests++; });
    await page.goto(url, { timeout: 90000 });
    await page.getByText(fixture.name, { exact: true }).first().waitFor({ timeout: 30000 });
    await page.getByRole('button', { name: 'Enregistrer hors connexion', exact: true }).waitFor({ timeout: 30000 });
    await page.waitForFunction(() => [...document.images].some(img => img.complete && img.naturalWidth > 0), null, { timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    // Fixed final observation window; no click before LCP is collected.
    await page.waitForTimeout(2000);
    const measured = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      return { ...window.__nonaLab, ttfbMs: nav.responseStart - nav.startTime,
        loadMs: nav.loadEventEnd - nav.startTime, observationMs: performance.now(),
        overflow: document.documentElement.scrollWidth > innerWidth + 1 };
    });
    for (const key of ['lcpMs', 'fcpMs', 'cls', 'ttfbMs', 'loadMs', 'observationMs']) {
      assert(typeof measured[key] === 'number' && Number.isFinite(measured[key]) && measured[key] >= 0);
      measured[key] = Math.round(measured[key] * 100) / 100;
    }
    assert(!measured.overflow && receivedBytes > 0);
    result.samples.push({ ...measured, receivedBytes, completedRequests: requests });
    await context.close();
  }
  assert(result.pageErrors === 0 && result.unexpectedRequests === 0);
  const median = key => result.samples.map(sample => sample[key]).sort((a, b) => a - b)[1];
  result.median = Object.fromEntries(['lcpMs', 'fcpMs', 'ttfbMs', 'loadMs', 'cls', 'receivedBytes'].map(key => [key, median(key)]));
  result.status = 'PASS';
} catch {
  result.status = 'FAIL'; result.failedStage = stage; process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) server.kill('SIGTERM');
  writeFileSync(join(output, 'results.json'), JSON.stringify(result, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ status: result.status, stage: result.failedStage || 'complete', samples: result.samples.length }));
}
