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
- Marketing in `src/routes/index.tsx` + `src/components/marketing`; concierge app under `/app` (`src/routes/app.*`); public guest guide at `/l/$slug` with `src/components/guest` — keeps the three surfaces independent.
- All imports go through `ImportAdapter` in `src/lib/import-engine` — each source (URL, text, document, PMS) is swappable without UI changes.
- Every imported field carries `Provenance` (source, raw, confidence, verified, overridden) — human corrections must win over future syncs.
- Phase 1 persistence/auth is local (`src/lib/store.ts`) — to be replaced by Lovable Cloud behind the same functions.
