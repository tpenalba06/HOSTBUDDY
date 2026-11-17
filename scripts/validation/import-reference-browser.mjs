import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { writeFileSync, mkdirSync } from "node:fs";
const output = process.env.NONA_IMPORT_E2E_OUTPUT || "../nona-commercial-browser-tools";
mkdirSync(output, { recursive: true });
import {
  referenceDocument,
  referenceLocales,
} from "../../src/lib/import-engine/reference-corpus.ts";
const { chromium } = await import(process.env.NONA_PLAYWRIGHT_MODULE || "playwright");

const origin = "http://127.0.0.1:4273";
const local = origin.startsWith("http://127.0.0.1:");
const server = local
  ? spawn(
      process.execPath,
      [
        "node_modules/vite/bin/vite.js",
        "dev",
        "--host",
        "127.0.0.1",
        "--port",
        "4273",
        "--strictPort",
      ],
      {
        windowsHide: true,
        stdio: "ignore",
        env: {
          ...process.env,
          VITE_SUPABASE_URL: "http://127.0.0.1:9",
          VITE_SUPABASE_PROJECT_ID: "synthetic-test",
          VITE_SUPABASE_PUBLISHABLE_KEY: "synthetic-test",
        },
      },
    )
  : null;
const titles = {
  description: "Bienvenue",
  address: "Adresse",
  departure: "Mon départ",
  access: "Mon arrivée",
  transport: "Transports",
  equipment: "Équipements",
  kitchen: "Équipements",
  climate: "Équipements",
  parking: "Équipements",
  rules: "Règlement",
  trash: "Mon départ",
  recommendations: "Bonnes adresses",
  contact: "Contact",
  emergency: "Urgences",
  services: "Services mentionnés dans votre texte",
};
let browser;
const results = [];
try {
  for (let n = 0; local && n < 240; n++) {
    if (
      await fetch(origin).then(
        (r) => r.ok,
        () => false,
      )
    )
      break;
    if (n === 239) throw Error("server unavailable");
    await delay(250);
  }
  browser = await chromium.launch({ channel: "chrome", chromiumSandbox: true });
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, locale: "fr-FR" });
    if (local)
      await page.route("**/*", (r) =>
        new URL(r.request().url()).origin === origin ? r.continue() : r.abort(),
      );
    await page.goto(origin);
    for (const locale of Object.keys(referenceLocales))
      for (const words of process.env.NONA_IMPORT_E2E_SMOKE === "true"
        ? [5000]
        : [500, 2000, 5000]) {
        const doc = referenceDocument(locale, words);
        await page.getByRole("button", { name: "Coller du texte", exact: true }).click();
        await page.getByRole("textbox", { name: "Texte de l’annonce" }).fill(doc.text);
        const start = Date.now();
        await page.getByRole("button", { name: "Générer mon aperçu", exact: true }).click();
        const phone = page.frameLocator('iframe[src^="/phone-preview"]');
        await phone.getByRole("heading", { name: doc.name, exact: true }).waitFor();
        assert.equal(
          await phone.getByText("18:00", { exact: true }).count(),
          0,
          "a conflicting arrival time was chosen",
        );
        const generationMs = Date.now() - start;
        const groups = Object.groupBy(
          doc.facts.filter((f) => !f.private && !f.conflict && !["name", "wifi"].includes(f.key)),
          (f) => titles[f.key],
        );
        let visibleFacts = 1;
        for (const [title, facts] of Object.entries(groups)) {
          const menu = phone.getByRole("button", { name: "Explorer le guide", exact: true });
          if (await menu.isVisible()) await menu.click();
          else
            await phone
              .getByRole("button", { name: "Rechercher dans le guide", exact: true })
              .click();
          await phone
            .getByRole("dialog")
            .getByRole("textbox", { name: "Rechercher dans le guide", exact: true })
            .fill(title);
          await phone.getByRole("dialog").getByRole("button", { name: title, exact: true }).click();
          await phone.getByRole("dialog").waitFor({ state: "hidden" });
          for (const fact of facts) {
            const content = phone.getByText(fact.text, { exact: true }).first();
            await content.waitFor({ state: "attached" });
            if (!(await content.isVisible()))
              await phone.locator("details").filter({ has: content }).locator("summary").click();
            await content.waitFor();
            visibleFacts++;
          }
          const body = await phone.locator("body").innerText();
          if (title === "Mon arrivée")
            assert.ok(
              !body.includes("18:00") && !body.includes("16:00"),
              "conflicting arrival exposed",
            );
          assert.ok(
            !/7319|(?:RECETTE|RECIPE|RECETA|REZEPT|RICETTA|RECEITA)_WIFI|@example\.invalid/.test(
              body,
            ),
            "private data visible",
          );
          if (
            locale === "fr" &&
            words === 5000 &&
            ["Mon arrivée", "Transports", "Bonnes adresses"].includes(title)
          ) {
            await page.locator('iframe[src^="/phone-preview"]').screenshot({
              path: `${output}/reference-${title === "Mon arrivée" ? "arrival" : title === "Transports" ? "transport" : "places"}-${width}.png`,
            });
          }
        }
        await phone.getByRole("button", { name: "Rechercher dans le guide", exact: true }).click();
        await phone
          .getByRole("dialog")
          .getByRole("textbox", { name: "Rechercher dans le guide", exact: true })
          .fill("Wi-Fi");
        await phone.getByRole("dialog").getByRole("button", { name: "Wi-Fi", exact: true }).click();
        await phone.getByRole("dialog").waitFor({ state: "hidden" });
        await phone.getByText("Wi-Fi disponible", { exact: true }).first().waitFor();
        results.push({
          locale,
          words,
          width,
          visibleFacts,
          expectedPublicFacts: doc.facts.filter(
            (f) => !f.private && !f.conflict && f.key !== "wifi",
          ).length,
          secretsHidden: true,
          wifiAvailableVisible: true,
          generationMs,
        });
        await page.getByRole("button", { name: "Revenir à Villa Mare", exact: true }).click();
        await phone.getByRole("heading", { name: "Villa Mare", exact: true }).waitFor();
        console.log(JSON.stringify(results.at(-1)));
      }
    await page.close();
  }
} finally {
  writeFileSync(`${output}/reference-browser-results.json`, JSON.stringify(results, null, 2));
  await browser?.close();
  server?.kill();
}
