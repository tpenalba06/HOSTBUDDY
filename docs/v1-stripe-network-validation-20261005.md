# V1 Stripe sandbox network validation — 2026-10-05

Base: commit `2a2968d`. No production publish, no design change, no billing-sync
scheduler file touched, no Stripe Live, no real email, no real data changed.

## Identity and fixture
- Identity: Lovable `auth-session --self` (owner account of the requester). No
  token was printed, logged or written outside the sandbox session file.
- Fixture created (data only): organization `V1_STRIPE_TEST_20261005`
  (`5da36510-4f76-4f36-99b6-483c1af29357`), owner = self, two **draft**
  properties `v1-stripe-test-20261005-a` / `-b`. The real organization was not read
  for mutation or modified.

## Executed
| Check | Result |
|---|---|
| Server key mode | `sk_test` (sandbox); `STRIPE_LIVE_VERIFIED` unset |
| `STRIPE_PRICE_BASE` | 999 EUR / month, `livemode=false` |
| `STRIPE_PRICE_EXTRA` | 299 EUR / month, `livemode=false` |
| `managePayments overview` (self, via app server function) | `mode=test, billing=true, connect=true`, quote `propertyCount=2, extraQuantity=0, monthlyCents=999` |
| `managePayments billing` | Checkout Session `cs_test_a1wLSQ6D42ok…` created: `mode=subscription`, `livemode=false`, `status=open`, total 999 EUR, one line 999 x1, metadata `organization_id`, `property_count=2`, `pricing_version=free-plus-two-v2` |
| Foreign organization (owner check) | rejected `not_allowed` |
| Webhook endpoints in sandbox | 2 enabled, both `preview--host-buddy-concierge.lovable.app/api/stripe-webhook` |
| Local webhook, bad / missing signature | HTTP 400 (rejected) |

## 999 + 299 extra
Current policy (`free-plus-two-v2`): 1 property free, 2 included in 999,
each extra +299. With the requested **two** properties the session is
999 only (verified). 999 + 299 needs a third property; not created to respect
the two-property limit. The 3-property amount is covered by unit tests only.

## Not executed / blockers
- **Checkout payment**: requires a human to open the sandbox URL and pay with
  test card `4242 4242 4242 4242` (any future date, any CVC). Step: as owner of the
  test org, open the Checkout URL returned by "Configurer l'abonnement" (session
  above, valid ~24h) and submit. No payment was simulated or claimed.
- **Real webhook delivery** (`checkout.session.completed`,
  `customer.subscription.*`): depends on that payment, and the endpoints target the
  preview host, not this sandbox. Not observed.
- The app's payments page shows the first organization of the user; the test org
  was exercised through the same server function directly, not through the page.
- Connect onboarding, order payment links, refunds: not run (need a payment).
- Network imports and real QR PNGs on fixtures: deferred to keep this batch scoped.

## Cleanup
Fixture deletion (when no longer needed): delete the two properties then the
organization `V1_STRIPE_TEST_20261005`; Stripe test customer metadata
`organization_id=5da36510-…` can be left in sandbox.
