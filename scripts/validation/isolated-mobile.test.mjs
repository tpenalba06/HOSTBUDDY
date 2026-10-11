import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedBrowserUrl } from './isolated-mobile.mjs';

test('browser network refuses source, other hosts and financial routes', () => {
  for (const url of ['https://jzbjpaucgckggumhowns.supabase.co/rest/v1/properties', 'https://api.stripe.com/v1', 'http://127.0.0.1:8787/pay/example', 'http://127.0.0.1:8787/_serverFn/billing-canary', 'https://mhhtnqfdkyudwyqlmnce.supabase.co/functions/v1/test'])
    assert.equal(allowedBrowserUrl(url, 'billing-canary'), false);
  assert.equal(allowedBrowserUrl('http://127.0.0.1:8787/app', 'billing-canary'), true);
  assert.equal(allowedBrowserUrl('https://mhhtnqfdkyudwyqlmnce.supabase.co/storage/v1/object/sign/test', 'billing-canary'), true);
});
