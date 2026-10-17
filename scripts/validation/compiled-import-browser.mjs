import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFile } from "node:fs/promises";

// Run against compiled-demo-local.mjs and its fictitious backend build only.
// Browser traffic is restricted to this loopback origin, including images.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const { chromium } = createRequire(resolve(root, "../tools/package.json"))("playwright");
const origin = "http://127.0.0.1:4183";
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--disable-background-networking", "--no-first-run", "--disable-gpu"],
});
const page = await browser.newPage({ locale: "fr-FR", viewport: { width: 1440, height: 1000 } });
try {
  const errors = [];
  const blockedOrigins = new Set();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", (route) => {
    const target = new URL(route.request().url()).origin;
    if (target === origin) return route.continue();
    blockedOrigins.add(target);
    return route.abort();
  });
  await page.goto(origin + "/demo");
  await page.waitForFunction(
    () => sessionStorage.getItem("hostbuddy.demo.properties.v1.fr") !== null,
  );
  await page.getByRole("tab", { name: "Gestionnaire", exact: true }).click();
  await page
    .getByRole("button", { name: /Ajouter un h/ })
    .first()
    .click();
  await page.getByRole("button", { name: /Coller du texte/ }).click();
  const source = [
    "Nom du logement : Villa Recette Texte",
    ...Array.from({ length: 12 }, (_, index) => `Arrivée à 16h, consigne ${index + 1}.`),
    "Arrivée à 18h : horaire à confirmer.",
    ...Array.from({ length: 12 }, (_, index) => `Wi-Fi : information générique ${index + 1}.`),
    "Wi-Fi : SSID RECETTE_FINAL ; mot de passe SYNTHETIQUE_2026.",
    "Départ avant 10h.",
    "Piscine peut-être disponible : à confirmer.",
    "Parking privé gratuit devant la maison.",
  ].join("\n");
  await page.locator("textarea:visible").fill(source);
  await page.getByRole("button", { name: "Ranger mes informations", exact: true }).click();
  const arrival = page.getByRole("textbox", { name: /arriv/i, exact: false });
  await arrival.waitFor();
  const arrivalArticle = page.locator("article").filter({ has: arrival });
  assert.match(await arrivalArticle.innerText(), /À vérifier/);
  assert.match(await arrival.inputValue(), /18h/);
  assert.match(await arrivalArticle.locator("details p").textContent(), /consigne 6/);
  const wifi = page.getByRole("textbox", { name: "Wi-Fi", exact: true });
  assert.match(await wifi.inputValue(), /RECETTE_FINAL/);
  assert.match(await page.locator("article").filter({ has: wifi }).innerText(), /À vérifier/);
  await arrival.fill("Arrivée à 18h, horaire confirmé par le gestionnaire.");
  await wifi.fill("Wi-Fi : RECETTE_FINAL ; mot de passe SYNTHETIQUE_2026.");
  await page.getByRole("button", { name: "Créer ce logement", exact: true }).click();
  const propertyCard = page.locator("article").filter({ hasText: "Villa Recette Texte" });
  await propertyCard.waitFor();
  const stored = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem("hostbuddy.demo.properties.v1.fr") ?? "[]"),
  );
  const property = stored.find((item) => item.name === "Villa Recette Texte");
  assert.ok(property);
  assert.equal(property.status, "draft");
  const fields = property.fields;
  for (const key of ["arrival", "wifi"]) {
    const field = fields.find((item) => item.key === key);
    assert.equal(field.status, "found");
    assert.equal(field.source_type, "text");
    assert.equal(field.manually_verified, true);
    assert.equal(field.manually_overridden, true);
    assert.ok(field.raw_value.length > field.value.length);
  }
  assert.match(fields.find((item) => item.key === "arrival").raw_value, /consigne 6/);
  assert.equal(fields.find((item) => item.key === "pool").status, "to_verify");
  assert.equal(
    property.sections.some((item) => item.section_key === "pool"),
    false,
  );
  await propertyCard.getByRole("button", { name: /Villa Recette Texte/ }).click();
  // This action changes only the isolated demo's sessionStorage.
  await page.getByRole("button", { name: "Publier mon guide", exact: true }).click();
  await page.waitForFunction(() =>
    JSON.parse(sessionStorage.getItem("hostbuddy.demo.properties.v1.fr") ?? "[]").some(
      (item) => item.name === "Villa Recette Texte" && item.status === "published",
    ),
  );
  await page.getByRole("button", { name: "Voir côté voyageur", exact: true }).first().click();
  await page.getByRole("button", { name: /Wi-Fi/ }).click();
  await page
    .getByText(/RECETTE_FINAL/)
    .first()
    .waitFor();
  assert.match(await page.locator("body").innerText(), /SYNTHETIQUE_2026/);
  assert.deepEqual(errors, []);
  const evidence = {
    checkedAt: new Date().toISOString(),
    scope: "compiled local demo; simulated persistence, no remote publication",
    paidApiCalls: 0,
    lateContradictionReviewed: true,
    lateWifiCredentialsRetained: true,
    originalEvidenceRetained: true,
    humanCorrection: true,
    createdAsDraft: true,
    provenanceAndManualFlags: true,
    uncertainPoolExcludedFromGuide: true,
    simulatedPublication: true,
    travelerWifiVisible: true,
    blockedOrigins: [...blockedOrigins],
    pageErrors: errors,
  };
  await writeFile(
    resolve(root, "docs/evidence/nona-compiled-import-20261017.json"),
    JSON.stringify(evidence, null, 2),
  );
  console.log(JSON.stringify(evidence));
} catch (error) {
  console.error((await page.locator("body").innerText()).slice(-8000));
  throw error;
} finally {
  await browser.close();
}
