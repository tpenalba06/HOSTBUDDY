# NONA activation checkpoint — 17 October 2026

GitHub access to private NONA-OPS is restored. The read-only audit in run 38977888022, job 117231592833 passed. It verified RLS, absence of guest policies/privileges, server execute/read rights, security-definer search path and equality of the deployed reservation function with acquired migration 0024. Authorization remains disabled and expired, cap 4,000,000 micros, cumulative reservation zero. No authorization renewal, counter reset or inference occurred.

The audit workflow is committed in NONA-OPS at fbbeb4e1b7b638b48c222dff783a41a00907405e. Its matching local file is retained; the local OPS checkout has not been reset to the remote commit.

Local source changes add a catalogue guard covering tiers, regions, cache pricing and unexpected pricing fields. A custom fetch guard bounds the actual serialized Gateway request to 24,576 UTF-8 bytes, including system prompt and JSON schema, caps output at 800, checks confidentiality flags and rejects tools, model fallback lists and redirects. These are additional controls, not a completed EUR cost proof. The existing 20,000-micro reservation is unchanged; it must not be assumed to cover vendor framing, all billing paths, exchange and fees without further validation.

Validation: 51 targeted tests passed across seven files, TypeScript passed, lint passed on the three changed source/test files, full Vite build passed. An initial Vitest run failed because its sandbox temporary module cache disappeared; rerunning with an explicit workspace-owned TEMP/TMP directory resolved that infrastructure failure. These tests do not evaluate a real model.

Remaining: account-side Gateway billing settings are not visible through the inference key or connected Vercel account metadata. Verify credit type/balance, auto top-up, provider credentials and fallback billing; finish a conservative full-call bound and verify compatibility of requested privacy controls with the actual Gateway account plan. Do not set NONA_AI_BILLING_ENVELOPE simply to bypass the check. After these conditions pass, renew TEST temporarily without resetting cumulative usage, execute one real call, inspect its receipt and consumption, then continue the authorized conversational acceptance tests.

External inference calls in this checkpoint: 0. External AI consumption: EUR 0. No Lovable calls, service payment or production deployment.
