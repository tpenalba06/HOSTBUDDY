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

Both returned provider HTTP 200 and target HTTP 200 repeatedly. In the final measured engine batch: Airbnb 15,349 Markdown characters, 68 image references, 6,331 ms; Booking 26,436 characters, 24 image references, 10,897 ms. Latency includes transport and local processing. Dynamic content and image-reference counts vary between calls.

Airbnb: name, approximate public locality, owner description, occupancy 2, arrival 14:00, departure 12:00, kitchen/laundry, and seven nonempty text categories reached the redacted projection. Booking: name, public locality, description, amenities, policy ranges and thirteen nonempty text categories reached the projection. Booking's room capacities do not establish one unambiguous whole-property occupancy; no number is invented.

Image references are discoveries, not licensed property photographs. Neither reader identified independently validated property-photo candidates in cleaned HTML. No third-party photograph is displayed: internal illustrative Smart Fill remains explicitly labeled. This technical test does not establish commercial extraction/reuse rights or production compatibility.

## Verification and boundaries

Full final check: 745 Vitest passed (4 skipped), 23 Node passed (1 skipped), migration integrity, lint (0 errors, existing warnings), TypeScript, build and compiled homepage smoke passed. Live recipe is opt-in; default tests never send OTA requests. Synthetic unit tests are labeled as such and do not substitute for the live trials.

The isolated experiment proves only these two real URLs, not general Airbnb/Booking coverage. Beta remains closed pending its separate security controls.

## Final remote browser evidence

Application checkpoint: `226a7b4` (descends from `eea2dd2`). Branch: `work/nona-commercial-beta`. All application fixes were pushed to GitHub without modifying the Lovable branch or published history.

Deployment: `dpl_FghpsWpp2Bgcak4d32XtFr8xKry7`, READY, staging, isolated TEST project `prj_JNddG5i5NkQyvQI83Blh7X02GVzV`.

URL: https://nona-concierge-test-20261020-ltsowi8p4.vercel.app/

SSO remains enabled (`all_except_custom_domains`), project live=false. An actual anonymous HTTP request to this final URL returned 302 to vercel.com. The browser used its authorized Vercel access; no NONA account was required to submit either URL.

| Field | Airbnb source → phone | Booking source → phone |
| --- | --- | --- |
| Name | Studio 25 m2 avec terrasse → exact heading visible | Vallais Villa → exact heading visible |
| Location | La Rochelle, France → Address section explicitly says locality | Imerovigli → Address section explicitly says locality |
| Exact street address | Not established by this trial; no street address invented | Not established by this trial; locality retained |
| Description | Owner prose → Welcome expanded and original paragraph visibly verified | Public metadata/property description → Welcome expanded; shorter than full page |
| Capacity | 2 → Property section visibly shows 2 travelers | No unique whole-property capacity; omitted |
| Arrival | 14:00 → visible in Arrival | 14:00–21:00 → exact policy range visible in Arrival |
| Departure | 12:00 → engine projection; not separately opened in the final browser replay | 07:00–11:00 → exact range visibly verified in final phone |
| Equipment | Kitchen, laundry and source notes → consultable equipment section | Television, kitchenette, free public parking, climate/heating → visibly verified |
| Recommendations/transports | Original public location/transport snippets → corresponding sections | Public surroundings/transports → corresponding sections |
| Wi-Fi | Detected by extractor, not displayed in this anonymous projection | Detected by extractor, not displayed in this anonymous projection |
| Photographs | References found; rights unconfirmed → 0 reused, labeled internal illustration | References found; rights unconfirmed → 0 reused, labeled internal illustration |

Both imports were performed from the real remote homepage. Airbnb showed 14 projected details; Booking showed 20. These are UI detail counts, not accuracy/completeness scores. Navigation was tested at viewport 390×844 and 1440×1000; no horizontal page overflow was observed (mobile client/content 375/375, desktop 1425/1425; remaining 15 px is the scrollbar). The three fictional demo-service cards remained present. No actual booking/payment operation was invoked in this mission.

Real-browser corrections made during this mission:

- Preserve heading boundaries so equipment cannot absorb the rest of the page.
- Exclude platform-generated Airbnb review highlights; keep owner prose.
- Restrict Booking to property equipment, surroundings and house-policy sections; exclude testimonials, review scores, FAQ and navigation.
- Preserve explicit policy ranges as ranges rather than invent a single time.
- A later Airbnb response put an accessibility skip-link before the property heading. Reject navigation headings and use a genuine property heading/metadata title; final real-browser replay showed the correct studio title and owner prose. This variation is a reproducibility limitation, not grounds to claim universal source compatibility.

Proof images are local technical artifacts outside Git under `output/nona-commercial-browser-tools`: `ota-airbnb-final-390.jpg`, `ota-airbnb-arrival-final-390.jpg`, `ota-booking-final-390.jpg`, `ota-booking-arrival-final-390.jpg`. They show factual labels and NONA's illustrative assets, not archived third-party galleries. Raw provider pages were not saved.

Remaining limits: only two allowlisted reference URLs; variable upstream rendering; incomplete Booking prose; Wi-Fi availability not reliably projected despite keyword detection; no independently established photo reuse rights; no claim that all source facts were mapped. The beta security verdict is unchanged. Test flag expires 21 November 2026 at 14:20 Paris time; no continuous commercial activation.

The pre-existing uncommitted `beta-security.ps1` modification was preserved, excluded from these commits, and separately backed up outside Git.
