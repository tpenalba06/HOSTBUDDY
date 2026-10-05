# P0 public guide restoration — 2026-10-05

## Confirmed cause

Remote branch inspected at `1ddde68fb4b76bcb0506eb2527d8a8ece84ba485`.
`d95239dd41425467e95d2e3cba86c997a95256d4` introduced migration 0018,
whose `get_public_guide` read gate retrospectively denies all but the earliest
published property when the organization's subscription is absent/ineligible.
In the connected database, 13 published properties have valid snapshots; nine
return null. The public `/l/$slug` loader turns null into the unavailable screen.
The anonymous browser reproduces this on
`https://host-buddy-concierge.lovable.app/l/audit-hostbuddy-04-10-2026-7ad333`.
Demo and manager preview render local/tenant data rather than this public RPC.

## Minimal correction

0019 restores the snapshot-only public read contract from 0010: explicit
published status plus a publication snapshot. The SQL publication trigger still
checks subscription and quantity reconciliation when publishing; no private
table grants/policies, renderer, saved order, videos, or customer rows change.
Deliberately published snapshots remain available after billing state changes;
new publication still requires billing authorization where applicable.
Rollback restores precisely the 0018 read gate, with no data changes.

## Executed evidence

- The enhanced real PostgreSQL lifecycle test fails before the fix with
  `expired grace hid published snapshot`, and passes with 0019 in the same
  transaction, then ROLLBACK.
- Actual create → content/media metadata → `publish_property` → `SET LOCAL ROLE
  anon` (empty auth.uid) → snapshot read and repeated read. Exact snapshot,
  coverage ID/media reference, content, saved section order, hidden sections,
  draft/missing rejection and private-row RLS checked.
- Free first publication, rejected unpaid second publication with first intact,
  active test subscription publication, quantity-sync gate, tenant isolation,
  expired grace/cancellation preserving already published snapshots checked.
  Subscription rows are synthetic SQL fixtures; no Stripe API call.
- In a separate rollback transaction, 0019 makes all 13 existing published
  guides readable by the actual anonymous SQL role (before: four).
- Targeted publication/guide-renderer tests: 17/17.
- Normal suite: 228/228, 41 files. TypeScript and build pass.
- Lint: zero errors, 16 existing warnings.

## Application boundary / remaining verification

The available database is shared with the published site (same RPC reproduces
its exact failure). No isolated preview database is exposed by the connector.
All SQL changes/fixtures above were rolled back. **0019 has not been applied
persistently**: permission only covered test/preview migration, not production.
No production deployment, merge, deletion, republishing, Lovable agent request,
or Stripe operation was performed.

The live broken links remain broken until an explicitly authorized database
application. A corrected HTTP/browser lifecycle (anonymous public URL, refresh,
media URL loading, navigation, mobile and desktop) cannot honestly be reported
as passing while the live RPC is unchanged. Complete those targeted checks
following authorized application; do not start unrelated work.
