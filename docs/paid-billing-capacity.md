# Paid capacity and renewal policy

Implementation on top of 0a63c008. No hosted migration, existing TEST data, Stripe Live or production operation performed.

## Architecture

- `organization_billing_capacity` persists subscription, period bounds, paid high-water capacity, renewal inventory, schedule and verified invoice IDs. A same-period decrease of the paid mark is rejected by SQL. Only the server/service role can read/write it.
- Bootstrap and renewal reset require a **paid creation/cycle invoice**, with matching recurring prices, quantities and period. Capacity never derives solely from instantaneous property count. A paid upgrade is recovered after an interrupted DB write; an unpaid upgrade does not grant paid capacity.
- Stripe Subscription Schedule current phase retains the maximum paid capacity. Next phase contains actual non-archived inventory. Both phase transitions use `proration_behavior: none`. The current phase changes only for a genuine excess, using `always_invoice` to collect the excess immediately.
- Returning to one or zero properties keeps the paid current phase, then the schedule cancels at period end. Restoring within that period reinstates renewal, with no new base charge. Once cancellation is effective, existing `startBilling` creates a fresh 9.99 Checkout subscription when a second property is added.
- After a failed upgrade, inventory decreases still correct the next phase with `none`; the pending invoice remains outstanding and DB paid capacity remains unchanged. Reconciliation stays pending until payment resolves.
- Organization lease is refreshed immediately before Stripe mutations. SQL capacity writes reject expired leases, stale revisions, subscription mismatches, older periods and same-period capacity regression. Stable Stripe idempotency keys plus paid-invoice recovery protect retries.
- Foreign schedules, unsupported legacy discounts/transfers/tax-rate overrides or unverified financial state fail closed, leaving reconciliation pending rather than silently rewriting a customer's financial configuration.
- Archive and permanent deletion feed the same existing authoritative non-archived counter/outbox. No UI or pricing change. Existing publication gate refuses new paid publications while synchronization is pending.

## Migration / rollout

New additive `0022_paid_billing_capacity.sql` has no dependency on 0021. An isolated PostgreSQL test applies migrations 0000–0020 plus 0022, explicitly excluding 0021, and verifies both archive/deletion counters and capacity storage. **Neither 0021 nor 0022 has been applied to hosted TEST.**

Do not run the whole migration chain to deploy this billing prerequisite: use a reviewed targeted application of the idempotent 0022 SQL, while leaving 0021 pending. Do not advance the chronological Drizzle journal past 0021: after explicit approval for 0021, the regular chain can apply 0021 and replay 0022 safely. Activate the new server code alongside 0022; without the capacity table/RPC, synchronization fails closed/pending. There is no destructive backfill and no fabricated paid capacity. Existing accounts initialize from verified Stripe paid invoices on reconciliation. Historical credits already created by the old policy are not erased or refunded by this migration.

## Validation

All seven requested financial sequences are regression-tested against a stateful Stripe double; archive and deletion counter equivalence is tested in real isolated PostgreSQL (PGlite). Payment failure, failed-upgrade deletion, retry after paid upgrade/DB failure, period rollover, stale leases, foreign schedules and price mismatches are included. These are **not claims of Stripe network validation**.

`node scripts/validation/paid-capacity-stripe-test.mjs` executes seven real scenarios with isolated Stripe TEST customers/subscriptions/Test Clocks, verifies invoice totals, no pending invoice items/credit balance, renewal quantity and effective cancellation. It refuses missing/live secret keys. It does not write to the HostBuddy database, apply migrations or mutate existing TEST fixtures. Only the Test Clocks it creates are deleted; its temporary prices/products are deactivated.

Current runtime has no Stripe TEST secret binding. Network execution reports `NOT_RUN`; actual Stripe TEST results remain unproved. The new-subscription scenario uses the real Subscription API in that runner; the application's Checkout creation path is additionally tested through `startBilling` with mocked provider transport.

## Stripe references checked

- https://docs.stripe.com/api/subscription_schedules/update — current-phase `none` vs `always_invoice`, phase durations and end behavior.
- https://docs.stripe.com/api/subscription_schedules/create — adopt an existing subscription via `from_subscription`.
- https://docs.stripe.com/api/subscriptions/update — `create_prorations` alone does not collect an upgrade immediately.
