# HOSTBUDDY

Create a brand-new production-grade SaaS project named HostBuddy V2. Do not clone or reuse any existing HostBuddy code.

PRODUCT VISION
HostBuddy is NOT a simple digital guestbook and must not be a clone of Sunver. Sunver and similar guest-experience apps are benchmarks only. HostBuddy's core differentiation is radically simpler UX plus automatic property creation/import.

North star: "HostBuddy should make it feel like an excellent concierge organized the whole guest stay, while the property manager only spent a few minutes configuring it."

Primary users:
1) Property-management/concierge companies, including non-technical users uncomfortable with smartphones.
2) Travelers/guests. They must NOT need an account or app install.

CRITICAL PRODUCT PRINCIPLES
- Mobile-first and PWA-first.
- Extremely simple UX: one obvious primary action per screen, large touch targets, plain French, no technical jargon.
- No hidden mandatory gestures; any drag-and-drop must have visible alternatives.
- Autosave.
- Complex backend logic must remain invisible to users.
- Guests: QR/link -> content immediately. No login, no install.
- Contact actions must be one tap: phone, WhatsApp, email.
- Services/upsells must be accessible in a few taps and payable without guest account.
- HostBuddy should be usable self-service without sales onboarding.
- Multi-tenant SaaS security must be designed from day one.

MASTER FEATURE: UNIVERSAL IMPORT ENGINE
The master HostBuddy feature is "Paste a URL -> property almost ready".
The UI must support:
- Public URL import from Airbnb, Booking, Sunver, other digital guestbook/competitor pages, property websites, when technically and contractually permitted.
- Future official PMS/channel-manager connectors/API integrations.
- A universal "Paste text" mode where the user can paste a large unstructured block of text from Notes, WhatsApp, Google Docs, emails, legacy guestbooks, etc. The system will later classify it using deterministic rules/keywords + structured AI extraction.
- Future document import (PDF/images/documents).
- Manual creation as fallback.

Important: Do NOT implement brittle or unauthorized scraping assumptions. Design the import architecture and UX so that each source can have an adapter and multiple fallback paths.

Imported data model requirements:
Every imported field should eventually be able to store provenance/source, original raw value/text, imported_at, confidence, manually_verified, manually_overridden. Human corrections must override future synchronization.

AUTO-IMPORT TARGET FIELDS
Property name, description, address/location when available, photos/media references, capacity, bedrooms, equipment, check-in/check-out, house rules, parking, arrival/access instructions, Wi-Fi if present, trash instructions, contacts, pool, kitchen, climate control, departure instructions, recommendations, and any other useful guest information.
Never invent missing factual information. Missing or ambiguous data must be shown as "to verify" or "missing".

PHASE 1 ONLY — BUILD THE FOUNDATION, LANDING, INTERACTIVE DEMO, AUTH/ONBOARDING SKELETON, AND IMPORT UX. Do NOT attempt the entire SaaS in one generation.

PUBLIC MARKETING EXPERIENCE
Landing goal: a property manager understands HostBuddy within 10 seconds.
Primary promise:
"Moins de messages. Une meilleure expérience voyageur. Plus de services vendus."
Pricing working hypothesis:
- €9.99/month includes up to 3 properties
- +€2.99/month for each additional property
- 30-day free trial
Do not invent extra pricing tiers yet.

Hero should include:
- strong French headline
- concise benefits
- visible pricing
- primary CTA "Essayer gratuitement"
- secondary CTA "Voir la démo"
- note: "30 jours gratuits • Aucune installation pour vos voyageurs"

INTERACTIVE DEMO — IMPORTANT
Create a real interactive phone mockup, not a static screenshot.
Fake property: "Villa Mare".
Guest view sections:
- Bienvenue
- Mon arrivée
- Wi-Fi
- La maison
- Piscine
- Bonnes adresses
- Services
- Mon départ
- Contact
Allow the visitor to switch:
"Voyageur" <-> "Conciergerie"
In Concierge view, allow at least one real simulated edit (e.g. Wi-Fi) with a clear autosave confirmation, so the prospect experiences how simple editing is.
Services demo should include examples such as:
- Petit-déjeuner — 25 €
- Massage à domicile — 90 €
- Transfert — 60 €
A demo checkout can be simulated visually for now; do not integrate real payments in this first phase.

SIGNUP / ONBOARDING UX
After CTA:
- first name
- email
- password
- Google sign-in placeholder/ready integration if appropriate
Do NOT ask for SIRET, company address, card, employee count, etc. at this stage.

First authenticated screen must NOT be an empty dashboard.
Display:
"Créons votre premier logement"
Three options:
1. "Importer depuis un lien" — Recommended. Airbnb • Booking • Sunver • autre page web
2. "Coller du texte"
3. "Créer manuellement"

IMPORT URL FLOW
Screen:
"Collez simplement le lien de votre logement"
Single URL field + "Importer"
Reassurance: "Vous pourrez tout vérifier et modifier avant publication."
For Phase 1, create a realistic mocked import pipeline with clear architecture hooks for real adapters later.
Progress UI should show meaningful stages, not a blank spinner:
- Lecture du logement
- Nom trouvé
- Description trouvée
- Équipements trouvés
- Informations organisées

Result screen:
"Voici ce que nous avons préparé"
Show extracted items and:
"Il reste X informations à compléter"
Then simple one-question-per-screen completion flow, e.g. Wi-Fi, parking, checkout.
End state:
"🎉 Votre livret est prêt"
Show large QR placeholder, "Voir mon livret", "Télécharger le QR", "Continuer la personnalisation".

PASTE TEXT FLOW — CORE FEATURE
Create a large, extremely obvious textarea with copy:
"Collez tout ce que vous avez. Même si c'est mal rangé."
"HostBuddy s'occupe du reste."
For Phase 1, use a local deterministic mock parser / demo data transformation if backend AI is not yet configured, but architect it so a future structured AI extractor can replace it cleanly.
Show categorized extraction preview:
- Arrivée
- Parking
- Wi-Fi
- Piscine
- Départ
- Déchets
- Contact
Mark ambiguous/missing fields clearly. User must confirm before publication.

DESIGN DIRECTION
Professional SaaS, warm, reassuring, modern, slightly playful but never childish.
Do NOT look like generic enterprise software.
Do NOT imitate Sunver's visual identity.
Design for users with low digital confidence:
- body text >= 16px
- strong contrast
- touch targets ~48px minimum
- no icon-only critical actions
- plain French
- one main CTA per view
- generous whitespace
- clear progress and feedback
- responsive on small phones first
- desktop should also look premium

ARCHITECTURE PREPARATION
Use a maintainable TypeScript structure.
Prepare separation between:
- marketing site
- authenticated concierge app
- public guest experience
- import engine/adapters
- shared design system/components
Do not overengineer, but avoid putting the entire app in one file.

FUTURE PRODUCT AREAS THAT MUST GUIDE ARCHITECTURE BUT DO NOT FULLY BUILD YET
- Property editor / guide sections
- Shared content across many properties
- Translation
- PWA/offline guest essentials
- QR per property
- Concierge branding
- Services and upsells
- Orders
- Stripe / Stripe Connect
- Referral program
- Affiliate program
- Analytics
- Stay-aware content (before arrival / during stay / departure)
- Guest AI assistant grounded only in verified property content
- Roles/permissions
- PMS/channel-manager integrations
- Google Places/location enrichment

DO NOT:
- build a giant admin panel
- expose technical language
- invent factual data on import
- force guests to sign up
- force installation
- make the UI depend on perfect API access
- build the whole V1 in one pass

Deliver Phase 1 as a polished, coherent product foundation with premium responsive UX and realistic mocked data where external integrations are not yet connected.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ad0b09fe-b134-491b-8601-9d64d6d27b86).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
