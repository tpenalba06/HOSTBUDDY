import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Temporary LAN capability, exclusively for the synthetic local recipe. No
// firewall changes, cloud APIs, account routes, payments or production data.
const address = Object.values(networkInterfaces())
  .flat()
  .find(
    (entry) =>
      entry?.family === "IPv4" &&
      !entry.internal &&
      /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(entry.address),
  )?.address;
if (!address) throw new Error("private_wifi_address_unavailable");
const port = 4184;
const origin = `http://${address}:${port}`;
const token = randomBytes(32).toString("hex");
const expiresAt = Date.now() + 4 * 60 * 60 * 1000;
// Plain LAN HTTP does not expose randomUUID in mobile browsers. This local
// recipe-only adapter preserves cryptographic UUIDs through getRandomValues;
// it never changes the production app or uses Math.random for identifiers.
const uuidAdapter = `<script>if(globalThis.crypto&&!crypto.randomUUID){Object.defineProperty(crypto,"randomUUID",{value:()=>{const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;const h=Array.from(bytes,v=>v.toString(16).padStart(2,"0")).join("");return h.slice(0,8)+"-"+h.slice(8,12)+"-"+h.slice(12,16)+"-"+h.slice(16,20)+"-"+h.slice(20);}});}</script>`;
const directory = fileURLToPath(new URL("../../../nona-private/", import.meta.url));
const initial = await fetch("http://127.0.0.1:4182/nona", { signal: AbortSignal.timeout(3000) });
const cookie = initial.headers.get("set-cookie")?.split(";")[0];
const status = await fetch("http://127.0.0.1:4182/status", {
  headers: { cookie },
  signal: AbortSignal.timeout(3000),
}).then((response) => response.json());
if (
  status.localOnly !== true ||
  status.paidApisEnabled !== false ||
  status.provider !== "ollama-local"
)
  throw new Error("local_only_recipe_required");

function equals(value) {
  return (
    typeof value === "string" &&
    /^[a-f0-9]{64}$/.test(value) &&
    timingSafeEqual(Buffer.from(value), Buffer.from(token))
  );
}
function authorized(request) {
  return request.headers.cookie
    ?.split(";")
    .some(
      (part) =>
        part.trim().startsWith("nona_design=") && equals(part.trim().slice("nona_design=".length)),
    );
}
const server = createServer(async (request, response) => {
  response.setHeader("cache-control", "no-store");
  response.setHeader("referrer-policy", "no-referrer");
  response.setHeader("x-content-type-options", "nosniff");
  response.setHeader(
    "content-security-policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; media-src 'self' blob:; worker-src 'self' blob:; form-action 'self'; base-uri 'self'; frame-ancestors 'none'",
  );
  const fail = (code) => {
    response.writeHead(code);
    response.end();
  };
  if (Date.now() >= expiresAt) return fail(410);
  if (request.headers.host !== `${address}:${port}`) return fail(403);
  const url = new URL(request.url, origin);
  const entry = url.pathname.match(/^\/p\/([a-f0-9]{64})\/(guide|manager)$/);
  if (request.method === "GET" && entry && equals(entry[1])) {
    response.setHeader(
      "set-cookie",
      `nona_design=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=14400`,
    );
    response.writeHead(303, {
      location: entry[2] === "manager" ? "/demo?preview=manager" : "/nona",
    });
    return response.end();
  }
  if (!authorized(request)) return fail(404);
  if (request.method === "POST" && request.headers.origin !== origin) return fail(403);
  const lab =
    /^\/(nona(?:\/|$)|nona-ui\/assets\/|local-guide(?:$|\?)|status$|demo-guide\/|hostbuddy-media\/|guide-fonts\/)/.test(
      url.pathname,
    );
  const compiled =
    url.pathname === "/demo" ||
    url.pathname.startsWith("/assets/") ||
    url.pathname === "/favicon.ico";
  const chat = request.method === "POST" && url.pathname === "/chat";
  if ((!lab && !compiled && !chat) || (request.method !== "GET" && !chat)) return fail(404);
  try {
    let body;
    if (chat) {
      let length = 0;
      const chunks = [];
      for await (const chunk of request) {
        length += chunk.length;
        if (length > 32768) return fail(413);
        chunks.push(chunk);
      }
      const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (data.mode !== "local") return fail(403);
      body = JSON.stringify(data);
    }
    const target = `http://127.0.0.1:${compiled ? 4183 : 4182}`;
    const result = await fetch(target + url.pathname + url.search, {
      method: request.method,
      headers: {
        cookie: request.headers.cookie ?? "",
        ...(chat ? { origin: target, "content-type": "application/json" } : {}),
      },
      ...(body ? { body } : {}),
      redirect: "manual",
      signal: AbortSignal.timeout(chat ? 135000 : 15000),
    });
    const cookies = result.headers.getSetCookie();
    if (cookies.length) response.setHeader("set-cookie", cookies);
    response.writeHead(result.status, {
      "content-type": result.headers.get("content-type") ?? "application/octet-stream",
    });
    const bytes = Buffer.from(await result.arrayBuffer());
    response.end(
      result.headers.get("content-type")?.includes("text/html")
        ? bytes.toString("utf8").replace("<head>", "<head>" + uuidAdapter)
        : bytes,
    );
  } catch {
    fail(502);
  }
});
server.listen(port, address, async () => {
  const guide = `${origin}/p/${token}/guide`;
  const manager = `${origin}/p/${token}/manager`;
  await mkdir(directory, { recursive: true });
  await writeFile(
    directory + "design-preview.json",
    JSON.stringify(
      { guide, manager, expiresAt: new Date(expiresAt).toISOString(), pid: process.pid },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ guide, manager, expiresAt: new Date(expiresAt).toISOString() }));
});
setTimeout(() => server.close(), expiresAt - Date.now()).unref();
