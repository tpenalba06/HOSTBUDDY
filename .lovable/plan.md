# HostBuddy V2 Phase 3

## Goal
Upgrade HostBuddy’s international positioning and premium hospitality presentation while preserving all Phase 2 authentication, tenant isolation, imports, publishing, QR, and public-guide behavior.

## What will change

### 1. International foundation
- Add one shared locale system for FR, EN, ES, DE, IT, and PT with browser detection, a visible selector, and remembered preference.
- Translate the current marketing, account, workspace, import, property review, publishing, and guest-guide interface copy.
- Keep marketing SEO metadata locale-aware without multiplying the product into separate sites.
- Add normalized guide translation storage preserving original content, machine versus human provenance, override protection, and stale-state tracking when source content changes.
- Add a translation-provider interface, but do not claim automatic translation is active until a provider is connected.

### 2. Property and review foundations
- Add an optional accommodation/operator type without lengthening first-time onboarding.
- Add a simple review configuration to each property: editable title, message, and one or more legitimate destination URLs.
- Publish configured review details through the existing secure public-guide read path, without exposing private tables or gating guests by sentiment.

### 3. Premium marketing site
- Restructure the first screen around “Votre accueil voyageur, prêt en quelques minutes,” clear pricing, and the two requested actions.
- Put the import proof immediately beside or below the opening message with the three-step flow and non-partner source labels.
- Add selective hospitality imagery, stronger orange/green contrast, editorial spacing, premium device presentation, and four focused benefit blocks plus lighter multilingual proof.
- Add the “Conçu pour…” operator strip and reusable social-proof components that remain hidden or explicitly marked until verified data exists.
- Keep unfinished payments, reviews automation, translation generation, and AI clearly described as upcoming rather than live.

### 4. Guest experience
- Redesign the public guide and Villa Mare demo around an image-led property header, 4–6 primary categories, progressive disclosure, persistent contact access, and visible language control.
- Add polished service examples for breakfast, massage, transfer, and late checkout without adding payment processing or a service-management module.
- Preserve fast loading and avoid requiring an account or installation.

### 5. Calm workspace
- Keep the workspace compact and task-focused while translating its core screens.
- Improve property cards and preview presentation only where imagery or clearer wording helps; no dense navigation or new dashboard.
- Add review and locale settings within the existing property flow rather than creating large new modules.

## Technical details
- Apply an additive database migration for locale, accommodation type, review destinations, and guide translations, with explicit grants, tenant-scoped RLS, and update triggers that mark machine translations stale.
- Extend `get_public_guide` so published review details and available translations remain accessible only through the existing security-definer RPC.
- Use a small typed translation dictionary/context in the client, with safe fallback to French/original content.
- Store bundled/generated imagery locally; no hotlinked stock images.
- Preserve original-language fields separately from translated rows. Human-edited translations remain protected from automatic overwrite.

## Verification
- Check clean build/typecheck and current preview logs.
- Test desktop and mobile marketing layouts and language switching.
- Test signed-out protection, sign-in, property list, URL/text/manual import entry points, property editing, publish, QR, and public guide.
- Verify guest browser-language detection and manual language changes.
- Verify review configuration appears only when configured and no fake social proof or unofficial partnership appears.
- Confirm tenant isolation and public data exposure remain unchanged through database-policy checks.
