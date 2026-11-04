# NONA consolidated TEST checkpoint — 22 October 2026

Status: consolidated TEST package ready for a bounded real-cloud recipe; private beta not opened.

Source HEAD before documentation: 16f247ad7959de524cf52ed025f07644a31d4e1c. Original stabilized IA source ee6734118ff9de3e25935d2b4759f2e55dace28b and unpublished UX worktree preserved. See consolidation-sources-20261022.json for source hashes. No production, Stripe, service engine, artwork, or import engine changes beyond previously validated access/allergen fixes.

Packaging now reads one consolidated tree instead of overriding files from a sibling worktree. TEST labels distinguish cloud from guided replies. GitHub browser checks use installed Chrome with a bounded installation fallback.

## Verification

- GitHub run: https://github.com/tpenalba06/HOSTBUDDY/actions/runs/39794123690
- Remote verification head: f758e84b0d8a80a532299352f6288b3880cb64b0.
- All 18 job steps completed successfully, including Complete job and both artifact uploads. GitHub aggregate status still returned in_progress/null at final metadata read; do not claim aggregate success independently of step results.
- 658 Vitest passes (2 skipped), 19 Node passes (1 skipped); TypeScript and lint completed successfully. Existing lint warnings remain.
- 12 layout checks across FR/EN/ES/DE/IT/PT and mobile/desktop; 26 guided chat/booking steps. Server summary 7500 cents rendered on desktop and mobile without sending an order or payment. Zero real model calls in this recipe.
- Earlier browser-download run 39792589389 stalled and was superseded by the installed-Chrome recipe above.
- Portable compiled package verified with outbound fetch blocked: guide/chat 200, guided mode, foreign origin 403, order 405, production 403, outbound attempts zero. See portable-package-check.json.
- Pattern scan found none of the tested private-key formats; public client contains neither OLLAMA_API_KEY nor SUPABASE_SERVICE_ROLE_KEY names. This is a bounded pattern scan, not a universal secret proof. No provider credentials or customer data supplied to CI.

## Artifacts

- NONA-beta-paquet-TEST-20261022.zip SHA256 a08ab28f93759617b1e2772d8efb8663e3e7c94b7fed1d110ab23c945d4139ed.
- NONA-beta-preuves-20261022.zip SHA256 43fb6a3129a99c7353998a9eb3fa02738536e1b17eb6b91e424fb5a218bc0c50; 44 evidence files, guided only.

## Cloud safeguards and remaining gate

Read-only TEST ledger inspection: concierge-test-20261015 enabled=false, expired 2026-10-20 17:21:38.308 UTC, attempts=63, observations=63, reserved_micros=1260000, cap_micros=1380000. Monthly enabled=false, monthly_cap_micros=20000000; anonymous/authenticated cannot execute monthly reserve and anonymous cannot select observation table. No SQL writes or activation performed.

Public Ollama catalog/privacy documentation checked; actual account free balance, current model eligibility and billing state have NOT been reverified. No provider call was made. No observed new model latency/cost comparison is available. Gemma remains selected; Haiku remains untested candidate.

Next: explicit renewal for private TEST preview update plus at most 20 Gemma Free attempts over 15 minutes, maximum new spend EUR0. Verify actual free eligibility first; stop if unverifiable, no paid fallback. Preserve cumulative reservation and set a bounded cap rather than resetting counters. Monthly EUR20 stays disabled. Then validate actual cloud responses and a real TEST manager/property session before declaring beta readiness.
