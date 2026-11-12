import { createServer as httpServer } from "node:http";
import { randomBytes, createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { createServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import { readVaultState, saveVault } from "./nona-lab-vault.mjs";
import { inspectLedger } from "./nona-ledger-diagnostic.mjs";
import { localStatic } from "./nona-local-static.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const localOnly = process.env.NONA_LAB_PROVIDER === "ollama-local-v1";
// The isolated Villa Mare fixture represents a French property. This changes
// only this Node process, never the Windows/user timezone.
if (localOnly) process.env.TZ = "Europe/Paris";
const securityTest = localOnly && process.env.NONA_LAB_SECURITY_TEST === "v1";
let port = localOnly ? 4182 : 4181;
let origin = `http://127.0.0.1:${port}`;
const testUrl = "https://mhhtnqfdkyudwyqlmnce.supabase.co";
const vaultPath = resolve(root, "../nona-private/credentials.dpapi");
const session = randomBytes(32).toString("hex");
let vault = localOnly ? { state: "unused-local", value: null } : await readVaultState(vaultPath);
let config = vault.value;
let commit = "unknown";
let worktreeDirty = true;
try {
  commit = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    windowsHide: true,
    encoding: "utf8",
  }).trim();
  worktreeDirty = Boolean(
    execFileSync("git", ["status", "--porcelain"], {
      cwd: root,
      windowsHide: true,
      encoding: "utf8",
    }).trim(),
  );
} catch {
  /* Explicit unknown, no fabricated version. */
}
// Separate Vite module runner only: never expose its middleware, filesystem or
// application API routes. No booking, order or payment endpoint exists here.
const vite = await createServer({
  root,
  configFile: false,
  logLevel: "silent",
  resolve: { alias: { "@": resolve(root, "src") } },
  server: { middlewareMode: true, hmr: false },
});
const core = await vite.ssrLoadModule("/src/lib/concierge.ts");
const model = await vite.ssrLoadModule("/src/lib/concierge-model.server.ts");
const localModel = localOnly
  ? await vite.ssrLoadModule("/src/lib/nona-local-model.server.ts")
  : null;
const localFixture = localOnly
  ? await vite.ssrLoadModule("/scripts/validation/nona-local-fixture.ts")
  : null;
const html = await readFile(new URL("./nona-ai-lab.html", import.meta.url), "utf8");
async function preflight() {
  if (localOnly) {
    let available = false;
    try {
      available = await localModel.inspectLocalModel();
    } catch {
      /* explicit unavailable state */
    }
    return {
      status: {
        backend: "ok",
        commit,
        worktreeDirty,
        configured: true,
        provider: "ollama-local",
        localModel: localModel.LOCAL_NONA_MODEL,
        localOnly: true,
        paidApisEnabled: false,
        costEuros: 0,
        guideSource: "Villa Mare — données de démonstration locales ; massage fictif de recette",
        ready: available,
        issues: available ? [] : ["Le modèle local ne répond pas. Relance Ouvrir-NONA.cmd."],
      },
      guide: localFixture.localGuide(),
    };
  }
  const status = {
    backend: "ok",
    commit,
    worktreeDirty,
    configured: Boolean(config),
    vaultState: vault.state,
    gateway: false,
    publishedGuide: false,
    ledger: null,
    billingVerified: process.env.NONA_AI_BILLING_ENVELOPE === "verified-eur-ceiling-v1",
    ready: false,
    issues: [],
  };
  if (!config) {
    status.issues.push(
      vault.state === "missing"
        ? "Aucun accès n’a été enregistré sur ce serveur. Renseigne les deux clés puis clique sur Enregistrer les accès chiffrés."
        : "Le coffre chiffré existe mais ne peut pas être ouvert avec ce compte Windows. Son contenu est conservé ; Work doit rétablir l’accès.",
    );
    return { status };
  }
  let guide;
  try {
    const response = await fetch("https://ai-gateway.vercel.sh/v1/credits", {
      headers: { Authorization: `Bearer ${config.gateway}` },
      signal: AbortSignal.timeout(5000),
    });
    status.gateway = response.ok; // Account read only, no inference, no top-up.
    if (!response.ok)
      status.issues.push(
        "AI Gateway refuse le contrôle d’accès (HTTP " +
          response.status +
          "). Aucun appel IA effectué.",
      );
  } catch {
    status.issues.push(
      "AI Gateway est injoignable ou le contrôle a expiré. Aucun appel IA effectué.",
    );
  }
  try {
    const db = createClient(testUrl, config.supabase, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(5000) }) },
    });
    const result = await db.rpc("get_public_guide", { _slug: config.slug });
    if (!result.error && result.data?.id) {
      guide = result.data;
      status.publishedGuide = true;
    }
    if (!status.publishedGuide)
      status.issues.push(
        "Le livret TEST publié est introuvable ou l’accès Supabase TEST est refusé.",
      );
    const ledger = await inspectLedger(config);
    status.ledgerDiagnostic = ledger;
    if (ledger.ok) status.ledger = ledger.authorization;
    else
      status.issues.push(
        "Le registre budgétaire TEST est inaccessible : " +
          ledger.reason +
          (ledger.httpStatus ? " (HTTP " + ledger.httpStatus + ")" : "") +
          ". Aucun appel IA.",
      );
  } catch {
    status.issues.push("Supabase TEST est injoignable ou le contrôle a expiré.");
  }
  const ledger = status.ledger;
  if (!status.billingVerified)
    status.issues.push("La garantie de facturation sous 5 € n’a pas encore été validée par Work.");
  if (ledger && !ledger.enabled)
    status.issues.push(
      "Le registre budgétaire TEST est désactivé : la consommation reste bloquée.",
    );
  if (ledger && Date.parse(ledger.expires_at) <= Date.now())
    status.issues.push("L’autorisation budgétaire TEST a expiré.");
  if (ledger && (ledger.cap_micros > 4000000 || ledger.reserved_micros + 20000 > ledger.cap_micros))
    status.issues.push("Le plafond interne de 4 € est invalide ou épuisé.");
  status.ready = Boolean(
    status.gateway &&
    status.publishedGuide &&
    status.billingVerified &&
    ledger?.enabled &&
    Date.parse(ledger.expires_at) > Date.now() &&
    ledger.cap_micros <= 4000000 &&
    ledger.reserved_micros + 20000 <= ledger.cap_micros,
  );
  return { status, guide };
}
async function body(request) {
  if (request.headers["content-type"] !== "application/json") throw new Error("invalid");
  let length = 0;
  const chunks = [];
  for await (const chunk of request) {
    length += chunk.length;
    if (length > 16384) throw new Error("invalid");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
let active = false;
const server = httpServer(async (request, response) => {
  const nonce = randomBytes(18).toString("base64");
  const headers = {
    "cache-control": "no-store",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "content-security-policy": `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'`,
  };
  const send = (code, data) => {
    response.writeHead(code, { ...headers, "content-type": "application/json" });
    response.end(JSON.stringify(data));
  };
  if (request.headers.host !== `127.0.0.1:${port}`)
    return send(403, { error: "Adresse locale requise" });
  if (localOnly && request.method === "GET") {
    const asset = await localStatic(root, request.url);
    if (asset) {
      response.writeHead(200, {
        ...headers,
        "content-type": asset.type,
        "content-security-policy":
          "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'",
        ...(asset.page
          ? { "set-cookie": `nonaLab=${session}; HttpOnly; SameSite=Strict; Path=/` }
          : {}),
      });
      return response.end(asset.content);
    }
  }
  if (request.url === "/" && request.method === "GET") {
    response.writeHead(200, {
      ...headers,
      "content-type": "text/html; charset=utf-8",
      "set-cookie": `nonaLab=${session}; HttpOnly; SameSite=Strict; Path=/`,
    });
    return response.end(
      html
        .replaceAll("NONCE", nonce)
        .replaceAll("LOCAL_ONLY", String(localOnly))
        .replaceAll("COMMIT", commit + (worktreeDirty ? " + corrections locales" : "")),
    );
  }
  if (!request.headers.cookie?.split("; ").includes(`nonaLab=${session}`))
    return send(403, {
      code: "SESSION_EXPIRED",
      error: "La session locale a expiré après le redémarrage du serveur.",
    });
  if (request.method === "POST" && request.headers.origin !== origin)
    return send(403, { error: "Origine locale requise" });
  try {
    if (localOnly && request.method === "GET" && request.url.startsWith("/local-guide?")) {
      const locale = new URL(request.url, origin).searchParams.get("locale");
      if (!["fr", "en", "es", "de", "it", "pt"].includes(locale))
        return send(400, { error: "Langue invalide" });
      return send(200, localFixture.localGuide(locale));
    }
    if (request.url === "/status" && request.method === "GET")
      return send(200, (await preflight()).status);
    if (localOnly && request.url === "/stop" && request.method === "POST") {
      if (active) return send(409, { error: "Une réponse est en cours." });
      send(200, { stopped: true });
      server.close(async () => {
        await vite.close();
        process.exit(0);
      });
      return;
    }
    if (request.url === "/configure" && request.method === "POST") {
      if (localOnly)
        return send(403, { error: "Aucune clé nécessaire : recette locale uniquement." });
      if (active) return send(409, { error: "Une requête est en cours" });
      active = true;
      try {
        const value = await body(request);
        if (
          typeof value.gateway !== "string" ||
          value.gateway.length < 15 ||
          value.gateway.length > 4096 ||
          typeof value.supabase !== "string" ||
          !/^(sb_secret_|eyJ)/.test(value.supabase) ||
          value.supabase.length > 4096 ||
          !/^[a-z0-9-]{1,80}$/.test(value.slug)
        )
          return send(400, { error: "Vérifie les deux clés et le livret TEST" });
        const next = { gateway: value.gateway, supabase: value.supabase, slug: value.slug };
        await saveVault(vaultPath, next);
        config = next;
        vault = { state: "ready", value: next };
        return send(200, { saved: true });
      } finally {
        active = false;
      }
    }
    if (request.url === "/chat" && request.method === "POST") {
      if (active) return send(429, { error: "Attends la réponse en cours" });
      active = true;
      try {
        const raw = await body(request);
        const mode = raw.mode;
        delete raw.mode;
        if (mode !== "ai" && mode !== "guided" && mode !== "local")
          return send(400, { error: "Mode invalide" });
        if (localOnly && mode === "ai")
          return send(403, { error: "Haiku reste désactivé. Choisis IA locale." });
        if (!localOnly && mode === "local")
          return send(503, { error: "Relance Ouvrir-NONA.cmd pour le modèle local." });
        const { status, guide } = await preflight();
        if (!guide)
          return send(503, {
            error: status.issues.join(" ") || "Le livret Supabase TEST publié est indisponible.",
          });
        const input = core.conciergeRequestSchema.parse({
          ...raw,
          slug: localOnly ? "nona-local" : config.slug,
        });
        if (mode === "local") {
          if (!status.ready) return send(503, { error: status.issues.join(" ") });
          try {
            return send(
              200,
              await localModel.runLocalNona(input, localFixture.localGuide(input.locale)),
            );
          } catch (error) {
            console.error(
              "NONA local: réponse indisponible ou rejetée",
              /^[a-z-]{1,70}$/.test(error.message) ? error.message : "invalid-model-output",
            );
            return send(503, {
              error:
                "Le modèle local n’a pas produit de réponse valide. Aucun texte guidé substitué, aucune dépense. Tu peux reformuler ton message.",
            });
          }
        }
        if (mode === "guided")
          return send(
            200,
            core.validateConciergeTurn(input, guide, core.guidedProposal(input, guide)),
          );
        if (!status.ready)
          return send(503, {
            error: "IA réelle inactive. " + status.issues.join(" ") + " Aucun appel facturable.",
          });
        process.env.AI_GATEWAY_API_KEY = config.gateway;
        process.env.SUPABASE_SERVICE_ROLE_KEY = config.supabase;
        process.env.SUPABASE_URL = testUrl;
        process.env.NONA_AI_ENABLE = "isolated-test-v1";
        const turn = await model.runConciergeModel(
          input,
          guide,
          createHash("sha256").update("nona-work-local-lab").digest("hex"),
        );
        if (
          turn.mode !== "ai" &&
          !(turn.usage.modelCalls === 0 && (turn.persona === "emergency" || turn.tracking))
        )
          return send(503, {
            error:
              "Réponse IA indisponible ou rejetée par les contrôles ; aucun mode guidé présenté comme IA. Une tentative peut avoir été réservée.",
          });
        return send(200, turn);
      } finally {
        active = false;
      }
    }
    return send(404, { error: "Action absente du laboratoire" });
  } catch {
    return send(400, { error: "Requête invalide ou accès indisponible" });
  }
});
server.listen(securityTest ? 0 : port, "127.0.0.1", () => {
  if (securityTest) {
    port = server.address().port;
    origin = `http://127.0.0.1:${port}`;
  }
  console.log(`NONA Work lab ${commit}: ${origin} (aucune inférence au démarrage)`);
});
