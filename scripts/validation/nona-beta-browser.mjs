import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const { chromium } = await import(process.env.HOSTBUDDY_PLAYWRIGHT_MODULE);
const browser = await chromium.launch({ headless: true });
const results = [];
let nextChatAt = 0;
try {
  for (const [name, width, height] of [
    ["desktop", 1440, 1000],
    ["mobile", 390, 844],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      locale: "fr-FR",
      timezoneId: "Europe/Paris",
      isMobile: name === "mobile",
      hasTouch: name === "mobile",
    });
    // No provider key, customer data, remote site or billable call on the runner.
    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.hostname !== "127.0.0.1") return route.abort();
      if (url.pathname === "/chat" && route.request().method() === "POST") {
        // Pace EVERY request, including form quote refreshes and both devices,
        // within the real 20/minute shared network limit. No guard is disabled.
        const at = Math.max(Date.now(), nextChatAt);
        nextChatAt = at + 3200;
        await new Promise((resolve) => setTimeout(resolve, Math.max(0, at - Date.now())));
      }
      return route.continue();
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      const guideResponse = page.waitForResponse(
        (r) => new URL(r.url()).pathname === "/local-guide",
      );
      await page.goto("http://127.0.0.1:4196/", { waitUntil: "networkidle" });
      const source = await (await guideResponse).json();
      const slot = source.services.find((s) => s.id === "bf").bookingConfig.slots[0];
      const sourceDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(
        new Date(slot),
      );
      await page.locator(".nona-launcher").click();
      await page.getByRole("dialog").waitFor();
      const send = async (message, label) => {
        const pending = page.waitForResponse(
          (r) =>
            r.url().endsWith("/chat") &&
            r.request().method() === "POST" &&
            r.request().postDataJSON()?.message === message,
        );
        await page.locator(".nona-composer textarea").fill(message);
        await page.locator(".nona-composer textarea").press("Enter");
        const response = await pending;
        assert.equal(response.status(), 200);
        const turn = await response.json();
        assert.equal(turn.usage.modelCalls, 0);
        assert.equal(turn.mode, "guided");
        await page.getByRole("dialog").getByText(turn.text, { exact: true }).last().waitFor();
        await page.screenshot({ path: `qa-results/${name}-${label}.png` });
        results.push({
          name,
          label,
          message,
          mode: turn.mode,
          nextStep: turn.nextStep,
          quote: turn.quote,
          text: turn.text,
        });
        return turn;
      };
      await send(`Petit-déjeuner pour le ${sourceDate}`, "breakfast-start");
      const quantity = await send("Pour trois personnes", "breakfast-quantity");
      assert.ok(quantity.choices[0]?.message, "server must offer a real slot");
      await send(quantity.choices[0].message, "breakfast-time");
      const breakfast = await send("Classique", "breakfast-ready");
      assert.equal(breakfast.quote?.totalCents, 7500);
      assert.equal(breakfast.nextStep, "ready");
      const social = await send(
        "Merci. On fête notre anniversaire ici, qu’est-ce qu’on pourrait faire pour se détendre après le trajet ?",
        "topic-change",
      );
      assert.equal(social.nextStep, null);
      assert.equal(social.quote, null);
      const massage = await send(
        `Je change de sujet : je voudrais un massage pour le ${sourceDate}, pour une personne.`,
        "massage",
      );
      assert.equal(massage.nextStep, "time");
      assert.equal(massage.draft.quantity, 1);
      assert.equal(massage.draft.date, breakfast.draft.date);
      assert.equal(massage.draft.time, undefined);
      const resumed = await send("Revenons au petit-déjeuner", "breakfast-resumed");
      assert.equal(resumed.quote?.totalCents, 7500);
      for (const [locale, message] of [
        ["fr", "Quel est le code de la boîte à clés ?"],
        ["en", "What is the key box code?"],
        ["es", "¿Cuál es el código de la caja de llaves?"],
        ["de", "Hallo Nona, wir feiern unseren Hochzeitstag. Hast du einen lieben Rat?"],
        ["it", "Qual è il codice della cassetta delle chiavi?"],
        ["pt", "Qual é o código da caixa de chaves?"],
      ]) {
        await page.locator(".nona-language select").selectOption(locale);
        const unknown = await send(message, `language-${locale}`);
        assert.equal(unknown.nextStep, null);
        assert.equal(unknown.quote, null);
      }
      assert.deepEqual(errors, []);
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2),
        false,
      );
      // Never click a booking confirmation, fill contacts or execute a payment.
    } catch (error) {
      results.push({ name, error: error.message, pageErrors: errors });
      await page.screenshot({ path: `qa-results/${name}-failure.png`, fullPage: true });
      process.exitCode = 1;
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  await writeFile(
    "qa-results/browser.json",
    JSON.stringify(
      {
        kind: "shared UI and compiled API, synthetic data, guided fallback only; not a live AI test",
        actualModelCalls: 0,
        results,
      },
      null,
      2,
    ),
  );
}
