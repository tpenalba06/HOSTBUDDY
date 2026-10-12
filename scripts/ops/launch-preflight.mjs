// Offline deployment input checks only: no Stripe/API call and no activation.
import { readFileSync, lstatSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const TEST_REF = 'mhhtnqfdkyudwyqlmnce';
function origin(value) {
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && !u.search && !u.hash && u.pathname === '/' ? u.origin : null; } catch { return null; }
}
export function preflight(env, expectedRef, expectedOrigin) {
  const blockers = new Set();
  const add = (condition, code) => { if (!condition) blockers.add(code); };
  add(typeof expectedRef === 'string' && /^[a-z0-9]{20}$/.test(expectedRef) && expectedRef !== TEST_REF, 'production_target_required');
  const app = origin(expectedOrigin);
  add(app && !/localhost|127\.0\.0\.1|id-preview--/.test(app), 'commercial_origin_required');
  const backend = `https://${expectedRef}.supabase.co`;
  for (const key of ['SUPABASE_URL', 'VITE_SUPABASE_URL']) add(env[key] === backend, 'backend_target_mismatch');
  for (const key of ['SUPABASE_PROJECT_ID', 'VITE_SUPABASE_PROJECT_ID']) add(env[key] === expectedRef, 'backend_target_mismatch');
  add(env.SUPABASE_PUBLISHABLE_KEY === env.VITE_SUPABASE_PUBLISHABLE_KEY && /^sb_publishable_/.test(env.SUPABASE_PUBLISHABLE_KEY || ''), 'public_key_mismatch');
  add(/^sb_secret_/.test(env.SUPABASE_SERVICE_ROLE_KEY || ''), 'server_backend_key_missing');
  add(/^sk_live_/.test(env.STRIPE_SECRET_KEY || ''), 'stripe_live_input_missing');
  add(/^price_/.test(env.STRIPE_PRICE_BASE || '') && /^price_/.test(env.STRIPE_PRICE_EXTRA || '') && env.STRIPE_PRICE_BASE !== env.STRIPE_PRICE_EXTRA, 'billing_prices_missing');
  add(/^whsec_/.test(env.STRIPE_WEBHOOK_SECRET || '') && /^whsec_/.test(env.STRIPE_CONNECT_WEBHOOK_SECRET || '') && env.STRIPE_WEBHOOK_SECRET !== env.STRIPE_CONNECT_WEBHOOK_SECRET, 'separate_webhook_secrets_required');
  add(typeof env.BILLING_SYNC_SECRET === 'string' && env.BILLING_SYNC_SECRET.length >= 32, 'billing_scheduler_secret_missing');
  add(origin(env.HOSTBUDDY_APP_URL) === app && origin(env.HOSTBUDDY_CONNECT_APP_URL) === app && app, 'return_origin_mismatch');
  // This tool is for preparation. It must never become a way to arm Live.
  add(env.STRIPE_LIVE_VERIFIED === 'false', 'live_activation_not_authorized');
  for (const [key, value] of Object.entries(env)) {
    if (!key.startsWith('VITE_') || !value) continue;
    let privateJwt = false;
    if (typeof value === 'string' && value.startsWith('eyJ')) {
      try { privateJwt = JSON.parse(Buffer.from(value.split('.')[1], 'base64url').toString()).role === 'service_role'; } catch {}
    }
    add(!/(SECRET|PASSWORD|PRIVATE|SERVICE_ROLE)/i.test(key) && !/^(sb_secret_|(?:sk|rk)_(test|live)_|whsec_)/.test(String(value)) && !privateJwt, 'frontend_secret_rejected');
  }
  return { schema: 'nona.launch.v1', state: blockers.size ? 'BLOCKED' : 'INPUTS_PREPARED',
    activated: false, blockers: [...blockers],
    remainingEvidence: ['live_price_metadata_and_amounts', 'platform_live_approval', 'manager_live_capabilities', 'webhook_live_delivery', 'auth_mail_and_redirects', 'recoverable_backups', 'http_and_error_alert_receipt', 'legal_and_seller_terms'] };
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  let result;
  try {
    const path = process.argv[2], info = lstatSync(path);
    if (!info.isFile() || info.isSymbolicLink() || info.mode & 0o077 || info.size > 65536) throw new Error('private_input');
    const value = JSON.parse(readFileSync(path, 'utf8'));
    result = preflight(value.env, value.expectedRef, value.expectedOrigin);
  } catch { result = { schema: 'nona.launch.v1', state: 'BLOCKED', activated: false, blockers: ['private_configuration_required'] }; }
  console.log(JSON.stringify(result));
  process.exitCode = result.state === 'INPUTS_PREPARED' ? 0 : 1;
}
