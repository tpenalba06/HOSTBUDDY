# V1 Stripe sandbox network validation — 2026-10-05 (pass 2)

Follows `ec46b2f`. Sandbox only (`sk_test`, every object `livemode=false`). No
production publish, no design change, no scheduler / billing-sync file touched,
no real email (checkout email `v1-stripe-test@example.com`, reserved domain), the
13 real properties untouched. Identity: Lovable `auth-session --self`; no JWT or
Stripe secret printed or stored outside the sandbox.

## Fixture
Organization `V1_STRIPE_TEST_20261005` (`5da36510-…`), owner self, draft
properties `v1-stripe-test-20261005-a`, `-b`, and (this pass) `-c`.

## Subscription — executed on the network
| Step | Evidence |
|---|---|
| Quote via app server function (3 properties) | `propertyCount=3, extraQuantity=1, monthlyCents=1298` |
| Checkout Session `cs_test_b10RgbNA7Uvb…` | 1298 EUR, lines 999x1 + 299x1, `livemode=false` |
| Real hosted Checkout (headless browser), test card 4242, no captcha/OTP shown | session `complete`, `paid` |
| Stripe subscription `sub_1UN8k0PirDxaYw93L5vFruXd` | `active`, items 999x1 + 299x1, `livemode=false` |
| Events emitted by Stripe | `checkout.session.completed`, `customer.subscription.created`, `invoice.payment_succeeded`… |

## Webhook — BLOCKER found
- Stripe reports `pending_webhooks=1` on the events: delivery fails.
- Both sandbox endpoints target `https://preview--host-buddy-concierge.lovable.app/api/stripe-webhook`.
  A test POST there returns **HTTP 401**: the preview site's access protection
  blocks Stripe. Only `/api/public/*` passes that protection. The published site
  returns 404 because the route isn't published.
- Fix (not applied in this batch): expose the webhook under `/api/public/…`
  (the signature check stays), then point the sandbox endpoints at it.
- Processing proof: the **genuine** Stripe events (fetched from the API, not
  invented) were re-signed with the configured webhook secret and replayed to the
  local app, the same way the Stripe CLI forwards events. All 3 returned 200. In the
  database the test org now has `subscription_status=active`, the subscription id,
  and `current_period_end=2026-11-05`. This proves processing, **not** delivery by Stripe.

## Archive / restore reconciliation (fixture C only)
| Action | Overview quote | Stripe subscription items |
|---|---|---|
| Archive C, then open the overview | 2 properties, 999 | 999x1 (extra removed) |
| Restore C to draft, then open the overview | 3 properties, 1298 | 999x1 + 299x1 |

## Connect / 2% / refunds — BLOCKER
- The `connect` action returns `payment_unavailable`.
- Calling the same Accounts v2 request straight against Stripe sandbox:
  1. A non-preview `Stripe-Version` gets 404 ("specify a .preview Stripe-Version").
  2. With `2025-09-30.preview`, it gets 400: "identity.country is required before
     setting configuration.merchant".
- The fix is a code and product decision (which API version, and which country
  source for international customers). Not applied. Nothing was created on the
  Stripe side.
- The 2% fee, guest payment links and refunds depend on a connected account and
  were not run on the network.

## Imports (network, read-only, no property created)
- Text extraction (fictional text): address, arrival, departure, Wi-Fi, parking
  and rules were found, each with confidence 0.85.
- `importFromUrl` (authenticated server function, robots.txt respected):
  - `https://example.com/`: `insufficient` (no invented data)
  - `https://www.wikipedia.org/`: ok, 5 fields from a non-property page. Needs
    review for relevance.
  - `http://127.0.0.1/`: `invalid` (private host blocked)

## QR PNG
`generateQrAssets` for fixtures A and B produced 1024x1024 PNGs.
`zbarimg` decodes them to `https://host-buddy-concierge.lovable.app/l/v1-stripe-test-20261005-a`
and `-b`. Those pages aren't reachable because the fixtures are draft and
unpublished.

## Cleanup
In Stripe sandbox, cancel `sub_1UN8k0…`, then delete properties A, B, C and the
organization `V1_STRIPE_TEST_20261005`.

---

# Pass 3 — source 33ef9c8 (feat/guest-guide-v2-lot1), 2026-10-05 10:16–10:30 UTC

Source checked: HEAD = `33ef9c8` (public webhook route, explicit Connect country,
`2025-09-30.preview` only on Accounts/AccountLinks). This report restores the
pass-2 content from `0fa6844`, which had been overwritten by the ec46 version.

## Webhooks — real external delivery
- `preview--host-buddy-concierge.lovable.app` still answers 401 to anonymous POSTs
  on both paths, so Stripe cannot reach it.
- Stable preview host `project--ad0b09fe-…-dev.lovable.app/api/public/stripe-webhook`
  answers **400 "Invalid signature"** to a POST with a bad signature (curl, network).
  The old `/api/stripe-webhook` path on that host answers 403.
- Updated only the two existing TEST endpoints (`we_1UN72k…`, `we_1UN06z…`,
  livemode=false) to that URL. Secrets and enabled events unchanged; no new endpoint,
  nothing Live.
- Fixture-only trigger: metadata update on test subscription `sub_1UN8k0…` produced
  `evt_1UN8wyPirDxaYw93oT7KhMJV` (customer.subscription.updated). Stripe reported
  `pending_webhooks=0` within seconds, and `stripe_processed_events` holds the row
  with `processed_at 2026-10-05 10:16:54Z`. Pass-2 rows (10:04Z) were the localhost
  signed replays; this one is a genuine Stripe → hosted preview delivery.
- Older events (`evt_1UN8k2…`, `evt_1UN8lf…`) still show `pending_webhooks=1`
  (Stripe retry schedule from the earlier 401s); they are idempotent and already applied.

## Connect (country FR, fictional org 5da36510)
- `managePayments.connect` with `country:"FR"` first returned `payment_unavailable`.
- Reproduced directly against Stripe test mode: account creation succeeds
  (`acct_1UN8xaPirDdDd4tf`, livemode=false, stored on the org); **AccountLinks v2
  returned 400 `use_case.account_onboarding.configurations: Required request field missing`**.
- Fix (one line, reversible): send `configurations: ["merchant"]` in the onboarding
  link. Stripe then returned 200; the app replay returned a
  `https://connect.stripe.com/setup/s/acct_1UN8x…` onboarding URL.
- Not continued: onboarding requires accepting Stripe's connected-account agreement
  and identity steps (legal agreement). Not submitted. `charges_enabled=false`, so the
  2% fee, guest service payment and refund were **not tested**.

## Wikipedia false positives (before photo import)
Network result on `https://www.wikipedia.org/` (authenticated `importFromUrl`), 5 fields:
- `description` from the generic meta description (no lodging JSON-LD);
- `access` from "Asturianu"/"Türkçe" (`t[üu]r`), `kitchen` from "Slovenčina"
  ("oven"), `trash` from "Binisaya" ("bin"), `pool` from "Español" ("spa" + `\b`
  not Unicode-aware).
Fixes: rule keywords must start a word (Unicode-aware boundaries; `tür`/`bins?` need
a word end), snippets over 300 chars are ignored for web pages, and a meta
description without lodging JSON-LD stays `to_verify` and does not count toward the
"enough information" threshold. Re-run over the network: **`insufficient`, 0 fields**.
example.com still `insufficient`; 127.0.0.1 still `invalid`. Regression tests in
`non-property-page.test.ts`; full suite 207/207. Photo import itself not run.

## Offline video
- Fixture: synthetic 4 s 640×360 H.264 baseline + AAC MP4 made with ffmpeg **in the
  sandbox** (no server-side ffmpeg exists in the app).
- Uploaded to fixture A (`welcome` section) through the app's real browser pipeline
  (`uploadSectionMedia` → in-browser ffmpeg.wasm preparation → private storage →
  `section_media` row, 123 147 bytes after preparation). Fixture A published (fictional).
  Dev server does not serve the codec (build-only asset), so the codec files from the
  local production build were served to that page. The bundled Playwright Chromium
  cannot decode H.264; the system Chromium (`canPlayType = probably`) was used.
- Guest test: local production build in workerd (wrangler dev), 390×844, fr-FR:
  online play+seek OK → "Enregistrer hors connexion" → "Guide et médias enregistrés"
  → page closed → context offline **and the local server stopped** (curl 000) →
  reopened `/l/v1-stripe-test-20261005-a`: service worker redirected to
  `/offline?slug=…`, video from a `blob:` URL, duration 4.08 s, playback advanced to
  1.45 s, seek to 2.5 s fired `seeked`, readyState 4, no media error, 640×360.
- Pitfall found: with Playwright offline emulation alone the worker still reached
  localhost, so `/l/` rendered online HTML with a remote signed URL. Only the
  stopped-server run counts as offline proof.

## Cleanup (user)
Cancel `sub_1UN8k0…` in Stripe sandbox, delete test account `acct_1UN8xa…`, unpublish
and delete fixture properties A/B/C (A now has one synthetic video) and the
organization `V1_STRIPE_TEST_20261005`.
