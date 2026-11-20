# Public OTA technical experiment — 20 November 2026

Scope: protected TEST Preview only; no production, Lovable, commercial publication, paid account, paid proxy or provider credential. Starting checkpoint: eea2dd2.

## Changes

Both Airbnb refusals were internal policy guards: anonymous preview server and URL engine. They remain closed normally. A server-only, expiring exact-URL allowlist permits the two requested reference URLs exclusively in Preview using Supabase TEST. Vercel Preview flag expires 2026-11-21T13:20:00Z. No client-supplied activation flag.

Firecrawl v2 scrape uses no Authorization, basic proxy only, markdown/html/images, storeInCache=false, maxAge=0; no retry, stealth, browser actions, CAPTCHA handling, account credit or AI extraction. Provider payloads stay in memory; only redacted preview and diagnostic counts cross the frontend boundary. Cache disabling is not an assertion about all provider retention practices.

The existing six-language document engine and phone projection are reused. Firecrawl separates metadata from cleaned HTML: name/locality/description are recovered from the public Markdown/metadata rather than silently lost. Review and date-selection blocks are excluded from the Markdown projection. Existing secret filtering remains in place. Raw HTML, metadata tokens and image URLs are not serialized into the phone.

## Actual trials, not mocks

Sources:

- https://www.airbnb.fr/rooms/1086157072408105944
- https://www.booking.com/hotel/gr/vallais-villa.fr.html

Both returned provider HTTP 200 and target HTTP 200 repeatedly. In the measured engine run: Airbnb 14,459 Markdown characters, 39 image references, 6,343 ms; Booking 31,308 characters, 33 image references, 8,635 ms. Dynamic content and image-reference counts vary between calls.

Airbnb: name, approximate public locality, description, occupancy 2, departure 12:00, kitchen/laundry, and nine nonempty text categories reached the redacted projection. Booking: name, public locality, description, amenities, arrival-policy text and thirteen nonempty text categories reached the projection. Booking's multiple room capacities do not establish one unambiguous whole-property occupancy; no number is invented.

Image references are discoveries, not licensed property photographs. Neither reader identified independently validated property-photo candidates in cleaned HTML. No third-party photograph is displayed: internal illustrative Smart Fill remains explicitly labeled. This technical test does not establish commercial extraction/reuse rights or production compatibility.

## Verification and boundaries

Full check: 740 Vitest passed, 23 Node passed, migration integrity, lint, TypeScript, build and compiled homepage smoke passed. Live recipe is opt-in; default tests never send OTA requests. Synthetic unit tests are labeled as such and do not substitute for the live trials.

The isolated experiment proves only these two real URLs, not general Airbnb/Booking coverage. Preview-browser verification and deployment identifiers are recorded in the final execution checkpoint. Beta remains closed pending its separate security controls.
