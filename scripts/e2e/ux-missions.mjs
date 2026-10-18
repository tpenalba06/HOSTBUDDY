// Directed browser verification, NOT a cold UX agent or human usability validation.
// Uses the shared public demo/renderer and synthetic data only. No account, AI or payment calls.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const origin = new URL(process.env.HOSTBUDDY_TEST_ORIGIN || "http://127.0.0.1:5173");
if (
  origin.protocol !== "http:" ||
  !["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname) ||
  origin.username ||
  origin.password ||
  origin.pathname !== "/" ||
  origin.search ||
  origin.hash
)
  throw Error("Only a local isolated NONA origin is allowed");
const output = join(process.env.RUNNER_TEMP || tmpdir(), "nona-missions");
await mkdir(output, { recursive: true });
const { chromium } = await import(process.env.HOSTBUDDY_PLAYWRIGHT_MODULE || "playwright-core");
const report = {
  kind: "directed-playwright-browser-missions",
  claims:
    "Real browser interactions with source-informed accessible labels. Not cold discovery, not human validation.",
  restrictions:
    "Synthetic browser-memory demo; no production account/data, AI provider or payment calls.",
  startedAt: new Date().toISOString(),
  viewports: [],
  failures: [],
};
const browser = await chromium.launch({
  headless: true,
  ...(process.env.HOSTBUDDY_CHROMIUM ? { executablePath: process.env.HOSTBUDDY_CHROMIUM } : {}),
});
try {
  for (const width of [1440, 360, 390, 430]) {
    const height = width === 1440 ? 1000 : 844;
    const directory = join(output, String(width));
    await mkdir(directory, { recursive: true });
    const result = {
      width,
      height,
      input: width < 500 ? "touch-emulation" : "mouse",
      missions: [],
      actions: [],
      pageErrors: [],
      blockedNetwork: [],
      navigation: [],
      accessibilityFindings: [],
    };
    report.viewports.push(result);
    const context = await browser.newContext({
      viewport: { width, height },
      isMobile: width < 500,
      hasTouch: width < 500,
      locale: "fr-FR",
      timezoneId: "Europe/Paris",
      serviceWorkers: "block",
      ...(process.env.NONA_UX_VIDEO === "1"
        ? { recordVideo: { dir: directory, size: { width, height } } }
        : {}),
    });
    context.setDefaultTimeout(8000);
    context.setDefaultNavigationTimeout(20000);
    // Permit app assets and passive public images/fonts. Never permit an external API,
    // iframe, navigation, analytics request or production data mutation.
    await context.route("**/*", async (route) => {
      const request = route.request(),
        url = new URL(request.url());
      const local = url.origin === origin.origin;
      const passiveAsset =
        request.method() === "GET" &&
        ["image", "font", "stylesheet"].includes(request.resourceType());
      if (
        (local && request.method() === "GET") ||
        passiveAsset ||
        ["data:", "blob:"].includes(url.protocol)
      )
        return route.continue();
      result.blockedNetwork.push({
        method: request.method(),
        origin: url.origin,
        type: request.resourceType(),
      });
      return route.abort("blockedbyclient");
    });
    await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
    const page = await context.newPage();
    page.on("pageerror", (error) => result.pageErrors.push(error.message));
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) result.navigation.push({ at: Date.now(), url: frame.url() });
    });
    let currentMission;
    const action = async (kind, label, operation) => {
      const row = { mission: currentMission, kind, label, at: Date.now(), status: "attempted" };
      result.actions.push(row);
      try {
        const value = await operation();
        row.status = "completed";
        return value;
      } catch (error) {
        row.status = "failed";
        row.error = String(error);
        throw error;
      }
    };
    const click = (locator, label) => action("click", label, () => locator.click());
    const fill = (locator, value, label) => action("fill", label, () => locator.fill(value));
    const press = (key) => action("key", key, () => page.keyboard.press(key));
    const see = (locator) => locator.waitFor({ state: "visible", timeout: 8000 });
    const demo = () => page.locator(".demo-container").filter({ visible: true }).first();
    const manager = () => demo().getByRole("tabpanel").filter({ visible: true });
    const guest = () => demo().getByRole("tabpanel").filter({ visible: true });
    const switchMode = async (mode) => {
      const tab = demo().getByRole("tab", {
        name: mode === "manager" ? /gestionnaire/i : /voyageur/i,
      });
      if ((await tab.getAttribute("aria-selected")) !== "true")
        await click(tab, "Switch to " + mode);
      await see(demo().getByRole("tabpanel").filter({ visible: true }));
    };
    const resetToDemo = async () => {
      await action("navigation-reset", "Reset to homepage", () => page.goto(origin.href));
      await see(page.getByRole("main"));
      const link = page
        .getByRole("link", { name: /explorer la d.mo|voir la d.mo|d.couvrir la d.mo/i })
        .first();
      await click(link, "Homepage demo link");
      await see(demo());
    };
    const snapshot = async (id, failure = false) => {
      await page
        .screenshot({ path: join(directory, id + ".png"), animations: "disabled" })
        .catch(() => {});
      if (failure)
        await page
          .screenshot({
            path: join(directory, id + "-full.png"),
            fullPage: true,
            animations: "disabled",
          })
          .catch(() => {});
    };
    const mission = async (id, name, operation) => {
      currentMission = id;
      const record = {
        id,
        name,
        status: "running",
        startedAt: Date.now(),
        errors: [],
        observations: [],
      };
      result.missions.push(record);
      const firstAction = result.actions.length;
      try {
        await operation(record);
        record.status = "passed";
        record.horizontalOverflow = await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 2,
        );
        if (record.horizontalOverflow) record.observations.push("Document exceeds viewport width");
      } catch (error) {
        record.status = "failed";
        record.errors.push(String(error));
        record.visibleTextAtFailure = (
          await page
            .locator("body")
            .innerText({ timeout: 2000 })
            .catch(() => "<body unavailable>")
        ).slice(0, 24000);
        report.failures.push({ width, mission: id, error: String(error) });
      } finally {
        record.durationMs = Date.now() - record.startedAt;
        record.actions = result.actions.length - firstAction;
        record.clicks = result.actions
          .slice(firstAction)
          .filter((row) => row.kind === "click").length;
        await snapshot(id, record.status === "failed");
        console.log(
          JSON.stringify({
            width,
            mission: id,
            status: record.status,
            clicks: record.clicks,
            durationMs: record.durationMs,
          }),
        );
        await writeFile(join(directory, "report.json"), JSON.stringify(result, null, 2));
      }
    };
    let imported = false;
    const syntheticName = "Maison Test UX " + width;
    const renamed = syntheticName + " Jardin";
    try {
      await mission(
        "01-discovery",
        "Discover NONA and visible value proposition",
        async (record) => {
          await action("navigation", "Homepage", () => page.goto(origin.href));
          await see(page.getByRole("main"));
          await see(page.getByRole("heading", { level: 1 }).first());
          record.heading = await page.getByRole("heading", { level: 1 }).first().innerText();
          record.visibleLinks = await page.getByRole("main").getByRole("link").allTextContents();
          assert.match(await page.getByRole("main").innerText(), /logement|voyageur|livret/i);
          record.observations.push(
            "Visible copy recorded; automated semantic check does not measure human understanding.",
          );
        },
      );
      await mission(
        "02-demo",
        "Launch demo through visible homepage action and explore",
        async () => {
          await click(
            page
              .getByRole("link", { name: /explorer la d.mo|voir la d.mo|d.couvrir la d.mo/i })
              .first(),
            "Explore demo",
          );
          await see(demo());
          await switchMode("guest");
          await see(
            guest()
              .getByRole("heading", { name: /Villa Mare/i })
              .first(),
          );
          await click(
            guest()
              .getByRole("button", { name: /^Arriv.e$/i })
              .first(),
            "Arrival information",
          );
          await see(
            guest()
              .getByRole("button", { name: /^Retour.*accueil$/i })
              .first(),
          );
          await click(
            guest()
              .getByRole("button", { name: /^Retour.*accueil$/i })
              .first(),
            "Return from arrival",
          );
        },
      );
      await mission(
        "03-concierge",
        "Open concierge and receive a guided Wi-Fi answer",
        async (record) => {
          if (
            !(await demo()
              .isVisible()
              .catch(() => false))
          )
            await resetToDemo();
          await switchMode("guest");
          await click(
            page.getByRole("button", { name: "Discuter avec Nona", exact: true }).last(),
            "Open NONA",
          );
          const chat = page.getByRole("dialog", { name: "Nona, ta concierge", exact: true });
          await see(chat);
          await fill(
            chat.getByRole("textbox", { name: /Ta question ou ton envie/ }),
            "Quel est le Wi-Fi ?",
            "Ask for Wi-Fi",
          );
          await click(
            chat.getByRole("button", { name: "Envoyer", exact: true }),
            "Send concierge question",
          );
          await see(
            chat
              .getByRole("log")
              .getByText(/VillaMare_5G|soleil2026/i)
              .first(),
          );
          record.answer = await chat.getByRole("log").innerText();
          record.observations.push(
            "Guided local demo transport; this does not validate model intelligence or a hosted local AI connection.",
          );
          await click(chat.getByRole("button", { name: "Fermer Nona", exact: true }), "Close NONA");
        },
      );
      await mission(
        "04-import",
        "Import a synthetic property through text and confirm draft",
        async (record) => {
          if (
            !(await demo()
              .isVisible()
              .catch(() => false))
          )
            await resetToDemo();
          // Escape is an explicit user action to dismiss any dialog left by a failed mission.
          await press("Escape");
          const openChat = page.getByRole("button", { name: "Fermer Nona", exact: true });
          if (await openChat.isVisible()) await click(openChat, "Dismiss remaining concierge");
          await switchMode("manager");
          await click(
            manager()
              .getByRole("button", { name: /Ajouter un h.bergement|Ajouter un logement/i })
              .first(),
            "Add property",
          );
          await click(
            manager().getByRole("button", { name: /Coller du texte/i }),
            "Choose text import",
          );
          const text = manager().getByPlaceholder(/Arriv.e.*16h/);
          record.observations.push(
            "Text import is selected by its visible placeholder because the current textarea lacks an accessible label.",
          );
          result.accessibilityFindings.push({
            mission: "04-import",
            issue: "Demo text-import textarea has no programmatic accessible name.",
          });
          await fill(
            text,
            [
              "Nom du logement : " + syntheticName,
              "Description : Maison de test fictive avec jardin, destinée uniquement aux essais NONA.",
              "Adresse : 1 rue des Tests, 17000 La Rochelle, France",
              "Arrivée : 16h00. Départ : 10h00.",
              "Wi-Fi : réseau TEST-NONA. Mot de passe : demo-uniquement-2026.",
              "Équipements : cuisine, parking, lave-linge.",
              "Règles : non-fumeur, aucun événement.",
              "Contact : Équipe test, contact@example.invalid.",
            ].join("\n"),
            "Paste synthetic property text",
          );
          await click(
            manager().getByRole("button", { name: "Ranger mes informations", exact: true }),
            "Analyze pasted text",
          );
          await see(manager().getByRole("button", { name: "Créer ce logement", exact: true }));
          await fill(
            manager().getByRole("textbox", { name: "Nom du logement", exact: true }),
            syntheticName,
            "Confirm extracted property name",
          );
          await click(
            manager().getByRole("button", { name: "Créer ce logement", exact: true }),
            "Confirm import into draft",
          );
          const card = manager().getByRole("article").filter({ hasText: syntheticName });
          await see(card);
          assert.match(await card.innerText(), /Brouillon/i);
          imported = true;
        },
      );
      await mission(
        "05-edit-preview",
        "Rename a property then inspect shared traveler preview",
        async (record) => {
          await switchMode("manager");
          if (imported) {
            const card = manager().getByRole("article").filter({ hasText: syntheticName });
            await click(
              card.getByRole("button", { name: "Modifier le livret", exact: true }),
              "Edit imported draft",
            );
          } else {
            record.observations.push(
              "Import mission failed; editing existing synthetic Villa Mare fixture instead.",
            );
            await click(
              manager().getByRole("button", { name: "Modifier Villa Mare", exact: true }),
              "Edit Villa Mare fallback",
            );
          }
          const name = manager().getByRole("textbox", { name: /Nom du logement/i });
          await fill(name, renamed, "Rename property");
          // Wait for user-visible saved heading, not a fixed debounce delay.
          await see(manager().getByRole("heading", { name: renamed, exact: true }));
          await click(
            manager().getByRole("button", { name: "Voir côté voyageur", exact: true }).first(),
            "Preview traveler guide",
          );
          await see(manager().getByRole("heading", { name: renamed, exact: true }).first());
          record.observations.push(
            "Shared renderer preview includes the updated name; no publication requested.",
          );
          await click(
            manager()
              .getByRole("button", { name: /^Retour$/i })
              .first(),
            "Return to editor",
          );
        },
      );
      await mission(
        "06-service",
        "Add a synthetic service through the real shared editor",
        async (record) => {
          await switchMode("manager");
          const servicesButton = manager().getByRole("button", { name: "Services", exact: true });
          if (!(await servicesButton.isVisible())) {
            const edit = manager()
              .getByRole("button", { name: /^Modifier /i })
              .first();
            await click(edit, "Open available property editor after earlier failure");
          }
          await click(
            manager().getByRole("button", { name: "Services", exact: true }),
            "Open property services",
          );
          await click(
            manager().getByRole("button", { name: "Ajouter un service", exact: true }),
            "Add service",
          );
          const form = manager()
            .locator("form")
            .filter({
              has: manager().getByRole("button", { name: "Enregistrer le service", exact: true }),
            });
          await fill(
            form.getByRole("textbox", { name: "Nom", exact: true }).first(),
            "Accueil test gratuit",
            "Service name",
          );
          await fill(
            form.getByRole("textbox", { name: "Description", exact: true }),
            "Service fictif pour le test UX, sans paiement.",
            "Service description",
          );
          await fill(
            form.getByRole("spinbutton", { name: "Prix en euros", exact: true }),
            "0",
            "Service price zero",
          );
          await click(
            form.getByRole("button", { name: "Enregistrer le service", exact: true }),
            "Save synthetic service",
          );
          await see(manager().getByRole("article").filter({ hasText: "Accueil test gratuit" }));
          record.observations.push(
            "Creates a browser-memory free service; paid-service terms and live API persistence are outside this scenario.",
          );
        },
      );
      await mission(
        "07-guest-booking",
        "Find Wi-Fi and submit a synthetic traveler service request",
        async (record) => {
          await switchMode("guest");
          await click(
            guest()
              .getByRole("button", { name: /^Wi-Fi$/i })
              .first(),
            "Find guest Wi-Fi",
          );
          assert.match(await guest().innerText(), /Wi-Fi|r.seau|mot de passe/i);
          await click(
            guest()
              .getByRole("button", { name: /^Retour.*accueil$/i })
              .first(),
            "Back to guest guide",
          );
          // Use the existing Villa Mare services and the acquired in-memory booking transport.
          await click(
            guest()
              .getByRole("button", { name: /^(Services|Services additionnels)$/i })
              .first(),
            "Explore traveler services",
          );
          await click(
            guest().getByRole("button", { name: "Demander", exact: true }).first(),
            "Request first service",
          );
          const booking = page
            .getByRole("dialog")
            .filter({ has: page.getByRole("button", { name: "Envoyer la demande", exact: true }) });
          await see(booking);
          await fill(
            booking.getByRole("textbox", { name: "Votre nom", exact: true }),
            "Voyageur Test UX",
            "Booking synthetic guest name",
          );
          await fill(
            booking.getByRole("textbox", { name: /Ton e-mail ou t.l.phone/i }),
            "voyageur@example.invalid",
            "Booking synthetic contact",
          );
          // These optional controls are discovered in the rendered form, never preseeded.
          const details = booking.locator("details");
          if ((await details.count()) && !(await details.first().getAttribute("open")))
            await click(details.first().locator("summary"), "Open booking information");
          const date = booking.locator('input[type="datetime-local"]');
          if (await date.isVisible()) {
            const tomorrow = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 16);
            await fill(date, tomorrow, "Booking future test date");
          }
          const slot = booking.getByRole("combobox", { name: "Créneaux proposés", exact: true });
          if (await slot.isVisible())
            await action("select", "Select displayed future booking slot", () =>
              slot.selectOption({ index: 1 }),
            );
          const terms = booking.getByRole("checkbox");
          for (let i = 0; i < (await terms.count()); i++)
            if (!(await terms.nth(i).isChecked()))
              await action("check", "Accept displayed booking terms", () => terms.nth(i).check());
          await click(
            booking.getByRole("button", { name: "Envoyer la demande", exact: true }),
            "Submit DEMO request",
          );
          await see(booking.getByRole("heading", { name: "Demande enregistrée", exact: true }));
          record.receipt = await booking.getByRole("status").innerText();
          record.observations.push(
            "Synthetic booking receipt only; no real reservation, payment or Stripe request.",
          );
          await press("Escape");
        },
      );
    } catch (error) {
      report.failures.push({ width, mission: currentMission || "setup", error: String(error) });
    } finally {
      await context.tracing.stop({ path: join(directory, "trace.zip") }).catch(() => {});
      await writeFile(join(directory, "report.json"), JSON.stringify(result, null, 2));
      await context.close();
      await writeFile(join(output, "report.json"), JSON.stringify(report, null, 2));
    }
  }
} finally {
  report.finishedAt = new Date().toISOString();
  await writeFile(join(output, "report.json"), JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(
  JSON.stringify({
    output,
    missions: report.viewports.reduce((n, row) => n + row.missions.length, 0),
    failed: report.failures.length,
  }),
);
if (report.failures.length) process.exitCode = 1;
