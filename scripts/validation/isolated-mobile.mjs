// TEST-only browser recipe. No production configuration, billing or cleanup deletes.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID, randomBytes } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { loadCredentials, verifyTarget, TEST_URL, TEST_REF } from './isolated-preview.mjs';

export function allowedBrowserUrl(value, billingId) {
  try {
    const u = new URL(value);
    if (u.protocol === 'data:' || u.protocol === 'blob:') return true;
    if (u.origin === 'http://127.0.0.1:8787')
      return !u.pathname.startsWith('/pay/') && !u.pathname.includes(billingId);
    return u.origin === TEST_URL && !u.pathname.startsWith('/functions/');
  } catch { return false; }
}

async function main() {
  const directory = resolve(process.argv[2] || '../nona-target-private');
  const output = resolve(process.argv[3] || '../nona-mobile-results');
  mkdirSync(output, { recursive: true, mode: 0o700 });
  const results = { target: TEST_REF, status: 'INCOMPLETE', checks: [], financialRequestsBlocked: 0, authRequests: 0, pageErrors: 0 };
  let stage = 'preflight', server, browser;
  const record = (name, details = {}) => {
    results.checks.push({ name, pass: true, ...details });
    console.log(JSON.stringify({ check: name, pass: true }));
  };
  const requireTrue = (value) => { if (!value) throw new Error('assertion'); };
  try {
    const credentials = loadCredentials(directory);
    await verifyTarget(credentials);
    results.head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const module = process.env.NONA_PLAYWRIGHT_MODULE;
    requireTrue(module && module.startsWith('/'));
    const pw = await import(pathToFileURL(module).href);
    // Fail before creating TEST data if the browser is unavailable.
    stage = 'browser_start';
    browser = await pw.chromium.launch({ headless: true });
    await browser.close(); browser = undefined;
    server = spawn(process.execPath, ['scripts/validation/isolated-preview.mjs', '--serve', directory],
      { stdio: ['ignore', 'ignore', 'ignore'] });
    stage = 'server_start';
    let html;
    for (let attempt = 0; attempt < 90; attempt++) {
      if (server.exitCode !== null) throw new Error('server');
      try {
        const r = await fetch('http://127.0.0.1:8787/auth?mode=login', { signal: AbortSignal.timeout(2000) });
        if (r.ok) { html = await r.text(); break; }
      } catch { /* bounded readiness wait */ }
      await new Promise((done) => setTimeout(done, 1000));
    }
    requireTrue(html?.includes(results.head) && !html.includes(credentials.serverKey));
    const client = await (await fetch('http://127.0.0.1:8787/src/integrations/supabase/client.ts')).text();
    requireTrue(client.includes(TEST_URL) && !client.includes('jzbjpaucgckggumhowns') && !client.includes(credentials.serverKey));
    record('served_head_and_test_client');
    // Exclude the automatic financial query before it can reach a server handler.
    const financialModule = await (await fetch('http://127.0.0.1:8787/src/lib/integrations/billing.functions.ts')).text();
    const billingId = financialModule.match(/createClientRpc\(\s*["']([^"']+)["']/)?.[1];
    requireTrue(billingId && billingId.length > 4);
    const request = async (path, data, key = credentials.serverKey) => {
      requireTrue(path.startsWith('/auth/v1/admin/users') || path.startsWith('/rest/v1/'));
      const response = await fetch(TEST_URL + path, {
        method: data === undefined ? 'GET' : 'POST', redirect: 'error',
        signal: AbortSignal.timeout(30000),
        headers: { apikey: key, 'Content-Type': 'application/json' },
        body: data === undefined ? undefined : JSON.stringify(data),
      });
      requireTrue(response.ok); return response.json();
    };
    stage = 'synthetic_account';
    const account = { email: `nona-browser-${randomUUID()}@example.invalid`, password: randomBytes(32).toString('base64url') };
    const user = await request('/auth/v1/admin/users', { ...account, email_confirm: true, user_metadata: { first_name: 'Recette TEST' } });
    requireTrue(user.id);
    // Private recovery data; no cookies, HAR, traces, credentials or SQL in artifacts.
    writeFileSync(join(directory, 'mobile-fixture.json'), JSON.stringify({ ...account, userId: user.id }), { mode: 0o600, flag: 'wx' });
    const propertyName = `Nona navigateur TEST ${randomUUID().slice(0, 8)}`;
    let propertyId;
    const visit = async (engine, width, create = false) => {
      stage = `${engine}_${width}_browser`;
      browser = await pw[engine].launch({ headless: true });
      const context = await browser.newContext({ viewport: { width, height: 844 }, acceptDownloads: true, locale: 'fr-FR' });
      await context.addInitScript(() => { localStorage.setItem('hostbuddy.locale', 'fr'); });
      await context.route('**/*', async (route) => {
        const url = route.request().url();
        if (new URL(url).pathname.includes(billingId)) {
          results.financialRequestsBlocked++;
          return route.fulfill({ status: 403, contentType: 'application/json', body: '{}' });
        }
        if (!allowedBrowserUrl(url, billingId)) return route.abort('blockedbyclient');
        return route.continue();
      });
      const page = await context.newPage();
      let pageErrors = 0;
      page.on('pageerror', () => { pageErrors++; results.pageErrors++; });
      page.on('request', request => { const u = new URL(request.url()); if (u.origin === TEST_URL && u.pathname.startsWith('/auth/')) results.authRequests++; });
      page.on('response', response => {
        const u = new URL(response.url());
        if (u.origin === TEST_URL && response.status() >= 400) {
          results.lastProviderFailure = { service: u.pathname.startsWith('/auth/') ? 'auth' : u.pathname.startsWith('/storage/') ? 'storage' : 'data', status: response.status() };
        }
      });
      stage = `${engine}_${width}_login_page`;
      await page.goto('http://127.0.0.1:8787/auth?mode=login');
      await page.waitForLoadState('networkidle');
      await page.locator('input[type=email]').fill(account.email);
      await page.locator('input[type=password]').fill(account.password);
      stage = `${engine}_${width}_login_submit`;
      await page.locator('form button.btn-primary').click();
      await page.waitForURL(/\/app(?:\/|$)/, { timeout: 60000 });
      record(`login_${engine}_${width}`);
      if (create) {
        stage = 'manual_property';
        await page.goto('http://127.0.0.1:8787/app/manual');
        await page.getByPlaceholder('Ex. : Villa des Oliviers').fill(propertyName);
        await page.getByRole('button', { name: 'Continuer', exact: true }).click();
        await page.waitForURL(/\/app\/p\/[a-f0-9-]+/, { timeout: 60000 });
        propertyId = new URL(page.url()).pathname.split('/').at(-1);
        requireTrue(/^[a-f0-9-]{36}$/.test(propertyId));
        await page.goto(`http://127.0.0.1:8787/app/p/${propertyId}?step=review`);
        // Upload a synthetic image through the real authenticated UI and Storage API.
        stage = 'photo_upload';
        const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aVZkAAAAASUVORK5CYII=', 'base64');
        await page.locator('section.property-media-editor input[type=file]').first().setInputFiles({ name: 'nona-test.png', mimeType: 'image/png', buffer: png });
        await page.waitForFunction(() => document.querySelector('section.property-media-editor img')?.getAttribute('src')?.includes('/storage/v1/object/sign/'), null, { timeout: 60000 });
        record('authenticated_photo_upload');
        stage = 'publication';
        await page.getByRole('button', { name: 'Publier mon guide', exact: true }).click();
        await page.waitForFunction(() => document.body.textContent.includes('Publier les modifications'), null, { timeout: 60000 });
        record('authenticated_publication');
      }
      stage = `${engine}_${width}_ready`;
      await page.goto(`http://127.0.0.1:8787/app/p/${propertyId}?step=ready`);
      await page.getByRole('heading', { name: 'Votre guide est prêt', exact: true }).waitFor({ timeout: 60000 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      requireTrue(!overflow);
      record(`published_reload_and_width_${engine}_${width}`);
      for (const extension of ['PNG', 'SVG']) {
        stage = `${engine}_${width}_qr_${extension.toLowerCase()}`;
        const downloadPromise = page.waitForEvent('download', { timeout: 20000 });
        await page.getByRole('link', { name: extension, exact: true }).click();
        const download = await downloadPromise;
        requireTrue(!(await download.failure()));
        const file = await download.path();
        const bytes = readFileSync(file);
        requireTrue(extension === 'PNG' ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : bytes.toString().includes('<svg'));
        record(`qr_download_${extension.toLowerCase()}_${engine}_${width}`, { bytes: bytes.length });
      }
      stage = `${engine}_${width}_public`;
      const guide = await page.getByRole('link', { name: /Voir.*guide|Ouvrir.*guide/i }).getAttribute('href');
      requireTrue(guide?.startsWith('/l/'));
      await page.goto('http://127.0.0.1:8787' + guide);
      await page.getByText(propertyName, { exact: true }).first().waitFor({ timeout: 60000 });
      requireTrue(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)));
      requireTrue(pageErrors === 0);
      record(`public_guide_${engine}_${width}`);
      await context.close(); await browser.close(); browser = undefined;
    };
    await visit('chromium', 390, true);
    await visit('chromium', 360);
    await visit('chromium', 768);
    await visit('webkit', 390);
    requireTrue(results.financialRequestsBlocked > 0);
    results.status = 'PASS';
  } catch {
    // Never include provider responses, exception messages, paths, tokens or DOM.
    results.status = 'FAIL'; results.failedStage = stage; process.exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server) server.kill('SIGTERM');
    writeFileSync(join(output, 'results.json'), JSON.stringify(results, null, 2), { mode: 0o600 });
    console.log(JSON.stringify({ status: results.status, stage: results.failedStage ?? 'complete', checks: results.checks.length }));
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) await main();
