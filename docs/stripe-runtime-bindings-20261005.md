# Stripe runtime bindings — 2026-10-05

## Diagnosis and scope

The installed Nitro Cloudflare adapter sets `request.runtime.cloudflare.env`
before dispatching to TanStack Start. The production Stripe module was compiled
against native `node:process` and read only `process.env`. Native Node environment
population depends on the deployed worker compatibility settings; bindings on
the actual request are the authoritative source for this deployment.

Stripe now reads the current request through TanStack Start's `getRequest()`;
the webhook passes its request explicitly. Only known payment configuration
keys and string values are selected. Missing Cloudflare bindings do not fall
back to Node values or `globalThis.__env__`, avoiding cross-request/stale
configuration. Local Node development and calls outside request handlers retain
their `process.env` fallback. No configuration values are logged, cached, or
returned to the browser. The existing explicit live-mode verification gate is
preserved.

## Validation

- Six synthetic regression tests cover worker bindings, missing worker values,
  successive requests, Node fallback, allowlisted string values and live gating.
- Payment orchestration, policy and webhook signature tests pass with this change.
- This source-level fix does **not** prove that Lovable deployed the expected
  bindings or that real sandbox Checkout/webhook delivery works. Those require
  authenticated preview checks and a real Stripe sandbox transaction.

## Rollback

Revert the dedicated runtime-bindings commit to restore direct `process.env`
reads. No migration, user data change or secret rotation is involved.
