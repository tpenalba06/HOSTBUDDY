# HostBuddy V2 — consolidation UX

Scope authorized: guide and manager. The previously validated ivory/sage/sea/taupe editorial identity is retained. No production row was deleted or rewritten during development. No schema migration or broad RLS permission was introduced.

## Causes and corrections

- Draft Preview pointed to Ready/Publish, rather than rendering a guide. Drafts now get an authenticated media-resolved preview using the same GuideView as public guides.
- Section creation used different demo and real catalogues and enabled all empty facilities. One initial-section policy now proposes Welcome/Arrival/Departure and includes other sections only for confirmed fields. Explicit manager-created sections remain possible. Legacy sections are retained and can be disabled.
- Organization contact was automatically injected into every new property, overriding imported contact. New properties keep only their own imported/validated contact.
- Debounced writes could be lost on preview or publication. Editor writes are queued and flushed before these actions; errors remain visible and can be retried. Publication requests are coalesced and status is verified.
- Upload failures could leave the UI busy forever. Error paths now release busy state. Source video format, 50 MiB size and 90-second browser-readable duration are checked before upload.
- Any demo section photo changed the property hero. Property media is now separate from section media, and general guide cover selection is constrained to the Welcome section.
- Nested demo viewport + manager minimum-height layout produced competing scroll surfaces. The embedded manager has a bounded main scroll surface and an independent fixed navigation bar.

## Delivered composition and management

Mobile cover shortened, Services full-width and first, principal shortcuts in two columns, optional sections retained under All information. Welcome description remains reachable. Desktop retains photographic/editorial composition. Services available in the service catalogue also receive a shared guest entry point.

Section images have defaults for Wi-Fi, arrival, departure, contact, welcome, places and services. A generated original HostBuddy pack provides distinct hotel/chalet/glamping/apartment/countryside ambience. Real welcome photographs replace property ambience automatically. Images are optimized to WebP; source prompts and generation provenance are in `public/hostbuddy-media/README.md`.

Manager tokens use the validated guide typography and colors, compact editor tabs, direct activation checkboxes, photo upload in the content editor, and a single property-media panel with cover selection, add/replace/remove, native drag/drop and equivalent move buttons, video and guest preview.

URL photos: extract only property JSON-LD/og:image metadata, ask the host to confirm usage rights, re-read the source server-side and copy allowed image bytes into tenant-protected private storage. DNS/address checks, per-redirect checks, robots checks, bounded byte reads, format and size constraints. Individual failures retain the property and provide a visible import warning.

## Validation and limits

Automated coverage: previous compatibility tests plus hierarchy, real photo priority, no invented facilities, evidence preservation, file limits, photo metadata extraction, unsafe URL/address rejection, publication concurrency/failure/retry and gallery preservation during text editing.

The remote browser blocks loopback development URLs. Local lint, tests, TypeScript and production build are checked; visual verification is performed on the connected Lovable preview when its synchronization is available. Authenticated real publish/database end-to-end requires a signed-in manager and is not claimed from isolated tests. Browser demo publication is local only and does not publish a real listing.

Still separate infrastructure work: automatic server video transcoding, verified metadata and persistent offline guide/video download. The interface does not claim videos are optimized or offline-ready. Existing specification remains authoritative for this next pipeline.
