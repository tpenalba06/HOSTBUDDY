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
