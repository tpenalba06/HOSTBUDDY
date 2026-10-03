# HostBuddy — Read-only audit (no changes made)

Based on the current code, roadmap, and the Playwright checks from the last turns (homepage and /demo at 390–1440px). Nothing was edited or deployed.

## 1. Traveler guide (public `/l/<slug>`, plus the demo's Voyageur mode)
- **Structure:** a cover photo with the property name, then 4–6 main sections as compact rows (icon and title): Arrivée, Wi-Fi, Le logement, Bonnes adresses, Services, Départ. Extra sections (Piscine/Spa, Règlement, Parking, Équipements, custom) sit underneath in the same white cards. Contact is kept apart as its own area: call, WhatsApp, email, plus a message form when the manager turns it on.
- **Inner pages:** each type of section has its own layout. Arrivée shows steps and access details, Wi-Fi is a copy card, Logement has a photo gallery and rules, Bonnes adresses uses cards with a directions button, Services uses photo cards, Départ has a checklist then a review prompt, and custom sections use a generic layout.
- **Languages:** the guide uses the phone's language and has a visible switcher. Buttons and labels are translated into 6 languages. Section text only appears translated if a translation was saved. Otherwise the original text is shown.
- **Other:** photos and videos load only when needed, through short-lived private links. The guide can be saved for offline use. Empty optional sections are hidden.

## 2. Manager workspace (`/app`)
- **Navigation (one shell shared with the demo):** Hébergements, Messages, Commandes, Retours, Connexions, Tableau de bord, Équipe (owner only), plus "Ajouter un hébergement". There is a sidebar on tablet and desktop, and a bottom bar with a "Plus" menu on phones.
- **Main workflows:**
  1. Add a property by link, by pasting text, or manually.
  2. Check what was imported (found / to verify / missing), with a question-by-question wizard for missing information.
  3. Edit the guide: sections, order, visibility, icons, button labels, photos and videos, live preview, autosave.
  4. Publish, then get a QR code to download or print, and take the guide offline if needed.
  5. Manage services, guest messages and replies, orders, private feedback, review links and team invitations.
- **Roles:** the owner manages everything. A Responsable (admin) edits content and settings. An Employé (member) can only view.

## 3. What really works vs demo-only vs unfinished
**Really works:** email/password accounts; each company's data kept separate; the company account created automatically; importing from pasted text (rule-based, with the source of each field kept); importing from a public link (respects site rules, fails honestly); publishing (only confirmed information is shown to guests); QR codes; private photo/video uploads; guest messages with spam limits; service orders and feedback stored; team roles; interface in 6 languages; saved guide translations with human/machine tracking.

**Demo/local only:** Villa Mare and every screen in the demo Gestionnaire (it uses the real interface, but changes are only kept in the browser session).

**Unfinished or not connected:**
- **Payments:** Stripe isn't connected. Orders are requests, with no online payment.
- **Automatic translation:** turned off. The app honestly says no translation service is connected.
- **Property-manager tools (Guesty, Hostaway, etc.):** listed as planned only, with no real connection.
- **Airbnb / Booking / Sunver:** marked "beta", but they go through the generic link import and haven't been tested on real pages.
- **Other:** no guest AI assistant, no billing or subscription, no free-trial enforcement. Google sign-in and confirmation emails are untested. Team invitations don't send an email yet; adding someone works at the database level only, so please check this.

## 4. Mobile and responsive behavior
- **Good:** no sideways scrolling at 360–1440px in the last checks. The demo adapts to the space it's shown in, not just the screen size. Tap targets are 48px or more. Dark text on light backgrounds.
- **Weak points:**
  - The large homepage preview is tall on phones and scrolls inside itself, so the page is long.
  - Some text is still written directly in the code in French, so it won't change language (for example the employee view and publish screens in `app.p.$id.tsx`: "Prêt à publier…", "Mettre le guide hors ligne").
  - The editor shows a lot at once on phones (several tabs plus the section list).
  - The "Remplissage" mode in the Arrivée steps feels thin when there is little data.
  - 16 minor code-style warnings and a few outdated function calls remain. None are blocking.

## 5. Strengths beyond a mockup
- Real accounts, company data kept separate, and roles enforced by the database, not just hidden screens.
- The source of each imported field is kept, and nothing is invented: "to verify" and "missing" are shown openly.
- One manager interface shared by the real app and the demo, so they don't drift apart.
- Private media delivered through short-lived links, and guest forms protected against spam.
- An honest list of integrations, with no fake partner logos.
- Interface in 6 languages, a test that checks no translation is missing, and offline use.

## 6. Blockers before a sellable V1
1. **Billing:** Stripe subscription (€9.99 for 3 properties + €2.99 each), a 30-day trial, and what happens when it ends.
2. **Payments for guest services** (Stripe Connect), or clear positioning as "requests only".
3. **Link import tested on real pages** (Airbnb/Booking): check the success rate, and lower to "planned" if it is poor.
4. **Account emails:** confirmation, password reset and team invitations, sent from your own domain. Plus Google sign-in tested.
5. **Translation service** connected (otherwise guide content stays in one language), and the leftover hard-coded French text translated.
6. **Legal pages:** terms, privacy policy, GDPR and data processing agreement, cookies, legal notice.
7. **Production basics:** error monitoring, backups, a security scan, and a check of guest-form limits under load.
8. **One full real-world run:** sign up → import → publish → scan the QR on a real phone → message, order and feedback reach the manager.
