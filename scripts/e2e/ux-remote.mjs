// A remote browser controlled by observed screenshots, never arbitrary JavaScript.
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";

export async function runRemoteUx() {
  const runtime = createRequire(path.join(process.env.RUNNER_TEMP, "nona-browser/package.json"));
  const { chromium } = runtime("playwright");
  const { DefaultArtifactClient } = runtime("@actions/artifact");
  const artifact = new DefaultArtifactClient();
  const origin = "http://127.0.0.1:5173";
  const root = path.join(process.env.RUNNER_TEMP, "nona-ux-evidence");
  await mkdir(root, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const journal = [];
  const failures = [];
  const source = execFileSync(
    "git",
    ["-C", path.join(process.env.GITHUB_WORKSPACE, "ux-product"), "rev-parse", "HEAD^{tree}"],
    { encoding: "utf8" },
  ).trim();
  let context,
    page,
    profile = "desktop",
    last = -1,
    done = false;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  async function reset(width = 1440, height = 1000, mobile = false) {
    if (context) {
      await context.tracing.stop({ path: path.join(root, `${profile}-trace-${last}.zip`) });
      await context.close();
    }
    profile = `${mobile ? "mobile" : "desktop"}-${width}`;
    context = await browser.newContext({
      viewport: { width, height },
      isMobile: mobile,
      hasTouch: mobile,
      locale: "fr-FR",
      recordVideo: { dir: path.join(root, "videos"), size: { width, height } },
    });
    await context.route("**/*", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (
        url.origin === origin ||
        ["data:", "blob:"].includes(url.protocol) ||
        (url.protocol === "https:" && ["image", "font"].includes(request.resourceType()))
      )
        return route.continue();
      return route.abort("blockedbyclient");
    });
    await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
    page = await context.newPage();
    page.on("pageerror", (error) => failures.push({ profile, error: error.message.slice(0, 600) }));
    await page.goto(origin, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
  }
  async function capture(sequence, commandError = null) {
    await page.waitForTimeout(350);
    const dir = path.join(root, `state-${String(sequence).padStart(3, "0")}`);
    await mkdir(dir, { recursive: true });
    const image = path.join(dir, "screen.png");
    await page.screenshot({ path: image });
    const state = {
      sequence,
      profile,
      run: process.env.GITHUB_RUN_ID,
      revision: process.env.GITHUB_SHA,
      source,
      url: page.url(),
      title: await page.title(),
      viewport: page.viewportSize(),
      commandError,
      accessibility: await page.locator("body").ariaSnapshot(),
      layout: await page.evaluate(() => ({
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        scrollY,
        focus:
          document.activeElement?.getAttribute("aria-label") ||
          document.activeElement?.textContent?.slice(0, 100),
      })),
      journal: journal.slice(),
      errors: failures.slice(),
    };
    const json = path.join(dir, "state.json");
    await writeFile(json, JSON.stringify(state, null, 2));
    const result = await artifact.uploadArtifact(
      `ux-live-${String(sequence).padStart(3, "0")}-${profile}`,
      [image, json],
      dir,
      { retentionDays: 3 },
    );
    console.log(JSON.stringify({ state: sequence, artifact: result.id, profile, commandError }));
  }
  async function act(action) {
    const start = Date.now();
    if (action.type === "reset") await reset(action.width, action.height, action.mobile);
    else if (action.type === "click") {
      if (profile.startsWith("mobile")) await page.touchscreen.tap(action.x, action.y);
      else await page.mouse.click(action.x, action.y);
    } else if (action.type === "type")
      await page.keyboard.insertText(String(action.text).slice(0, 20000));
    else if (action.type === "key") await page.keyboard.press(action.key);
    else if (action.type === "scroll") {
      if (profile.startsWith("mobile")) {
        const cdp = await context.newCDPSession(page);
        await cdp.send("Input.synthesizeScrollGesture", {
          x: action.x ?? 190,
          y: action.y ?? 650,
          yDistance: -(action.dy ?? 450),
          gestureSourceType: "touch",
          speed: 650,
        });
        await cdp.detach();
      } else {
        await page.mouse.move(action.x ?? 650, action.y ?? 650);
        await page.mouse.wheel(0, action.dy ?? 500);
      }
    } else if (action.type === "back") await page.goBack();
    else if (action.type === "wait") await sleep(Math.min(action.ms ?? 800, 3000));
    else if (action.type === "stop") done = true;
    else if (action.type !== "observe") throw new Error("Unsupported browser action");
    journal.push({
      action: action.type,
      profile,
      mission: action.mission ?? null,
      x: action.x,
      y: action.y,
      key: action.key,
      textLength: action.text?.length,
      at: new Date().toISOString(),
      durationMs: Date.now() - start,
      url: page.url(),
    });
  }
  try {
    await reset();
    await capture(0);
    const deadline = Date.now() + 27 * 60_000;
    while (!done && Date.now() < deadline) {
      const response = await fetch(
        `https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/contents/scripts/e2e/ux-commands.json?ref=${encodeURIComponent(process.env.GITHUB_REF_NAME)}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
            Accept: "application/vnd.github+json",
            "Cache-Control": "no-cache",
          },
        },
      );
      if (!response.ok) {
        await sleep(2500);
        continue;
      }
      const file = await response.json();
      const command = JSON.parse(Buffer.from(file.content, "base64").toString("utf8"));
      if (command.sequence > last && command.sequence > 0) {
        last = command.sequence;
        let error = null;
        try {
          for (const action of (command.actions ?? []).slice(0, 12)) await act(action);
        } catch (reason) {
          error = reason.message.slice(0, 1000);
        }
        await capture(last, error);
      }
      await sleep(2000);
    }
  } finally {
    if (context) {
      await context.tracing.stop({ path: path.join(root, `${profile}-trace-final.zip`) });
      await context.close();
    }
    await browser.close();
    await writeFile(
      path.join(root, "journal.json"),
      JSON.stringify({ source, journal, failures }, null, 2),
    );
    // Final archive includes every state, journal, traces and completed recordings.
  }
}
