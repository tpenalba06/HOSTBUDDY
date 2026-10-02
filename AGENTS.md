<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Architecture rules
- Marketing in `src/routes/index.tsx` + `src/components/marketing` (Villa Mare demo data stays isolated in `src/components/guest`); concierge app under `src/routes/_authenticated/app.*`; public guest guide at `/l/$slug` — keeps the three surfaces independent.
- Multi-tenancy: every row belongs to an organization; RLS uses security-definer helpers `is_org_member` / `can_access_property` — never add broad or anon table policies.
- Organization + owner membership are created by the idempotent RPC `ensure_my_organization` on first app load (no triggers on auth schema).
- Public guide reads only through the security-definer RPC `get_public_guide` (published properties, visible sections) via a server function — guests never touch tables.
- Publishing rebuilds `guide_sections` from confirmed (`found`) fields only; unverified data is never shown to guests.
- Text extraction goes through the `Extractor` interface (`rules-extractor.ts` today) so an AI extractor can replace it without UI changes.
- URL import: one `UrlSourceAdapter` per source in `url-adapters.ts`, all backed by the auth-protected `importFromUrl` server fn that respects robots.txt, blocks private hosts, and never bypasses access controls; failures return a reason, never fake data.
- Every field stores provenance (source, raw snippet, confidence, imported_at, manually_verified, manually_overridden); human answers always set verified/overridden.
- Concierge data access lives in `src/lib/data/properties.ts` (browser client + RLS) and throws only friendly French messages.
- Server functions get the user's token via the `attachAuth` function middleware in `src/start.ts`.
- Interface localization and property-content translation are separate layers: UI copy uses the shared locale provider, while guide translations remain normalized with provenance, human overrides, and machine-translation staleness.
- Review requests use tenant-protected property settings and legitimate HTTPS destinations; the public guide receives enabled review content only through `get_public_guide`.
- Integration claims and connection UX derive from the typed registry; provider adapters normalize into the Universal Import Engine model, and planned connectors must remain explicit non-operational stubs until real authorization exists.
- Guide media lives in the private `guide-media` bucket under organization/property/section paths; managers use tenant RLS and published guides receive short-lived signed URLs through the public guide server function.
- Guest messages enter only through the validated, rate-limited public endpoint; managers read and reply through tenant-isolated tables.
- Guest orders and private feedback use validated rate-limited security-definer submissions; operational tables stay tenant-isolated, while owner-only team changes use authenticated RPCs.
- Organization roles are authoritative in membership rows: owners manage team and financial summaries, admins edit content and settings, and members have read-only property plus operational access.
- Authenticated and demo manager experiences share `ManagerShell`; demo navigation uses local adapters so its responsive structure cannot drift from production.
- Public backend URL/publishable key have a build-time fallback in `vite.config.ts` because `.env` is untracked and absent from published builds.
