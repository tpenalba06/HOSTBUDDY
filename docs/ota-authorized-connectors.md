# Airbnb and Booking imports in TEST

The homepage recognizes HTTPS accommodation links by domain and path. Airbnb room identifiers and Booking hotel slugs are variable. The public input keeps its original form in the browser, and only the canonical listing URL is sent to the configured data connector. Search pages, short links and private URLs are outside this version's supported formats.

## Connecting an authorized source

Provision independently on the isolated Preview with `NONA_AIRBNB_AUTHORIZED_ENDPOINT` and `NONA_AIRBNB_AUTHORIZED_TOKEN`, or the corresponding `NONA_BOOKING_AUTHORIZED_*` pair. Configure these only for a trusted connector whose platform access, data reuse and costs are approved. The old expiry setting does not enable OTA collection. The app returns an explicit authorization status when a pair is absent.

The server sends a bounded HTTPS POST with a bearer credential and JSON `{ "url": "<canonical listing URL>", "platform": "airbnb|booking" }`. The remote connector must verify its entitlement, return only permitted content, and stop on authentication, challenges or denied access. It returns JSON `{ "success": true, "data": { "markdown": "...", "metadata": { "sourceURL": "<canonical listing URL>", "statusCode": 200, "title": "...", "ogDescription": "..." } } }`. Optional HTML is accepted. If provided, the final metadata URL must match the requested URL. A connector returning 401/403/429 does not trigger a retry or alternative source. Do not send guest secrets or private back-office content. Images in the anonymous preview continue to use Smart Fill.

The response passes through the existing extractor and redacted phone preview. Multilingual section recognition covers the six configured languages, but local formats and live platform variants still need a sample from the authorized connector. The fixture suite exercises 20 distinct Airbnb and 20 distinct Booking URLs with synthetic responses. These counts measure the application path only. Actual coverage, field accuracy and remote latency require real authorized responses.
