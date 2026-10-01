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
