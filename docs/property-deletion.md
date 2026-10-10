# Permanent property deletion

The menu action is restricted to owner/admin and requires the exact property name. The authenticated server calls `delete_property_permanently`; the RPC repeats the role, tenant and name checks. Direct authenticated DELETE on properties is revoked.

## Foreign-key audit

| Reference | Existing delete rule | Handling |
| --- | --- | --- |
| property_fields.property_id | CASCADE | Cascade |
| guide_sections.property_id | CASCADE | Cascade; translations follow section_id |
| section_media.property_id / section_id | CASCADE | Cascade DB rows; durable Storage manifest |
| property_messaging_settings.property_id | CASCADE | Cascade |
| property_review_settings.property_id | CASCADE | Cascade |
| property_review_destinations.property_id | CASCADE | Cascade |
| conversations.property_id | CASCADE | Cascade messages and guest_conversation_sessions |
| services.property_id | CASCADE | Delete property services only; NULL/global services remain |
| orders.property_id | CASCADE | Explicit delete before services (service_id is RESTRICT) |
| guest_feedback.property_id | CASCADE | Cascade |
| property_publications.property_id | CASCADE | Cascade snapshot; public RPC no longer resolves slug |
| import_runs.property_id | SET NULL | Explicit delete so import payloads are removed |
| provider_import_links.property_id (0012) | NO ACTION | Explicit delete, scoped to property and organization |
| order_payments.order_id | NO ACTION / NOT NULL | Make nullable; detach before deleting the order, retain organization's payment ledger |

PMS connections are organization-wide and are retained. Rate-limit tables and Stripe event deduplication are not property data and are retained. A service referenced by an unrelated order causes a transactional rollback, rather than deleting that unrelated order.

## Storage and billing

Migration 0021 does not delete any existing data. Apply it to the preview database before using this feature. No hosted migration or test-data deletion is performed as part of implementation.

The RPC records only guide-media object names under the exact organization/property namespace, excluding files referenced by other properties or global services. The Storage write guard serializes concurrent uploads with property deletion. Files are removed through the Storage API, never by SQL removal of storage.objects. DB deletion and cleanup manifest creation are one transaction. Failed Storage cleanup remains visible to admins after reload and can be retried with the same strong confirmation.

The existing DELETE billing trigger queues reconciliation from the remaining authoritative inventory; the server also requests immediate reconciliation. A Storage or billing outage does not restore a deleted publication. A pending billing revision does not prevent the sole remaining property from being published for free.

Tests run every repository migration in isolated PostgreSQL (PGlite) with synthetic auth/storage schemas. They test role checks, related rows, public-link invalidation, Storage manifests/retries and two unpaid properties → delete one → publish the remaining property. Storage transport is mocked; no hosted customer or TEST data is touched.
