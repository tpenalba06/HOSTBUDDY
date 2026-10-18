# V1 network validation — 2026-10-05

Scope: validation only. No production publish, no Stripe secret change, no schema change, no real data deleted, no real email/SMS sent. `billing-sync` / `payment-environment` untouched.

## 1. SSR "Suspense boundary … Switched to client rendering" on `/`

**Root cause (reproduced, then fixed).** The server bundle was run in the real Cloudflare `workerd` runtime (wrangler 4, `nodejs_compat`). Every page that imports `QrCard` (homepage and `/demo` via the shared demo manager, `/app`, `/app/p/$id`) failed SSR with `Error in renderToReadableStream: No such module "node:fs"`. The cause was the static `import QRCode from "qrcode"`: its Node build requires `node:fs`, which the runtime refuses. React then emitted `<!--$!-->` for the root boundary and fell back to client rendering. Node/Bun SSR does not reproduce it, which is why dev and CI were green.

**Fix.** `src/lib/qr.ts` now loads `qrcode` on demand inside `generateQrAssets` (it only runs in the browser after a click/effect). QR output is unchanged.

**Proof (workerd, build:dev bundle):** before → `/` and `/demo` contained `<!--$!-->` plus the node:fs error in the runtime log. After → `/`, `/demo`, `/auth`, `/integrations`: HTTP 200, 0 `<!--$!-->`, no runtime errors. `/l/<unknown>` → 404 with the "guide unavailable" page.

Still to confirm on the hosted preview once it rebuilds from this commit: the console warning should be gone.

## 2. Responsive matrix (dev server, fr-FR, viewport height 900)

Widths: 360, 390, 430, 768, 820, 1024, 1440. Pages: `/`, `/auth`, `/demo` Voyageur, Voyageur › Services, Voyageur › Bonnes adresses, `/demo` Gestionnaire. 42 screenshots in `/tmp/browser/v1net/shots/` (sandbox).

- Horizontal overflow: 0 px on all 42.
- Raw i18n keys in body text: none.
- Console errors/warnings: none (except 404s on platform-hosted marketing images, which only fail locally).
- Bug found and fixed: on Services (≥640 px), the section's single photo filled only half of a 2-column grid and touched the service cards below it. A single section photo now spans the row (shorter ratio on full-width pages) with spacing. Rechecked at 390/768/1440: 0 overflow.

## 3. Real offline test (Playwright `context.set_offline(true)`)

Guide: existing fictional published guide `validation-hostbuddy-video-offline-03-10-aa6d23` (fake Wi-Fi `HB_OFFLINE_VERIFIE` / `TEST_UNIQUEMENT_2026`). Server: production bundle in workerd at 390×844.

1. Online: "Enregistrer" → "Guide et médias enregistrés sur cet appareil" after about 2 s; service worker in control; cache `hb-guest-shell-*` contains 124 entries.
2. Page closed → context offline (`navigator.onLine=false`; same-origin and external fetches both fail).
3. New page `/l/<slug>`: guide rendered with its text, 5/5 images loaded, and Wi-Fi and Mon arrivée opened and read correctly, with back navigation working.
4. `/offline?slug=…` showed "Copie enregistrée · lecture sans réseau" with full content.
- Video: **not tested.** This guide has no section video (no `section_media` rows), so no claim is made.

## 4. Network RLS (Auth API JWT + PostgREST)

- JWT A: real session minted for the requesting user (`lovable auth-session --self`), sent over HTTPS to the REST API.
- **JWT B: blocked.** Minting a second account needs interactive user approval, which isn't available here. Fictional sign-up with an `@example.invalid` address would need email confirmation, so it wasn't done. Instead, other-tenant isolation was tested with JWT A against a property and organization that belong to a different organization.

Results:
- JWT A: own properties 13. Other-org property read → 0, members → 0, organization → 0. PATCH → 0 rows, DELETE → 0 rows, INSERT into the other org → 403 RLS violation.
- Property-scoped tables filtered by the other-org property: review settings/destinations, messaging settings, fields and sections → 0 each.
- Org-scoped tables filtered by the other org: section_media, conversations, services, orders, guest_feedback, invitations, members, properties, import_runs, publications, provider links, payment accounts → 0. pms_connections, order_payments and billing_sync → 403.
- Anonymous key, no JWT, across all 27 public tables: 0 rows or 401. No anonymous read.

## Not validated (not exercised)

Email signup and password reset, Google sign-in, Stripe Checkout, physical QR scan on a phone, offline video, and a two-JWT A↔B symmetric test.
