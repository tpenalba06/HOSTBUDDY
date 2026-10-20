import { build } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { mkdir, readFile, writeFile, cp } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const source = resolve(root, ".output/hosted-test-source"),
  dist = resolve(root, ".output/hosted-test-deploy");
await mkdir(source, { recursive: true });
await mkdir(resolve(dist, "api"), { recursive: true });
await writeFile(
  resolve(source, "disabled-gateway.ts"),
  "export function createMeteredCloudDependencies(){return undefined;}\n",
);
await build({
  configFile: false,
  root,
  publicDir: false,
  logLevel: "warn",
  ssr: { noExternal: true },
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  resolve: {
    alias: {
      "@": resolve(root, "src"),
      "./concierge-cloud.server": resolve(source, "disabled-gateway.ts"),
    },
  },
  build: {
    ssr: "scripts/validation/nona-hosted-test-entry.ts",
    target: "node22",
    outDir: resolve(dist, "server"),
    emptyOutDir: true,
  },
});
await writeFile(
  resolve(dist, "api/test.mjs"),
  `import {hostedTestResponse} from '../server/nona-hosted-test-entry.js';
export default async function handler(req,res){
 try{
 const origin='https://'+process.env.VERCEL_URL;
 const kind=req.query.kind; const locale=req.query.locale||'fr';
 const url=new URL('/api/test',origin);url.searchParams.set('kind',kind);url.searchParams.set('locale',locale);
 const headers=new Headers();for(const [key,value] of Object.entries(req.headers))if(value)headers.set(key,Array.isArray(value)?value.join(','):value);
 const result=await hostedTestResponse(new Request(url,{method:req.method,headers,...(req.method==='POST'?{body:typeof req.body==='string'?req.body:JSON.stringify(req.body)}:{})}));
 res.statusCode=result.status;for(const[key,value]of result.headers)res.setHeader(key,value);res.end(Buffer.from(await result.arrayBuffer()));
 }catch{res.statusCode=503;res.end(JSON.stringify({error:'test_unavailable'}));}
}\n`,
);
let entry = await readFile(resolve(root, "scripts/validation/nona-local-ui/entry.tsx"), "utf8");
entry = entry
  .replace('JSON.stringify({ ...request, mode: "local" })', "JSON.stringify(request)")
  .replace('conciergeSlug="nona-local"', 'conciergeSlug="nona-hosted-test"')
  .replace(
    "{nonaVisualCopy(locale).local}",
    "TEST : données fictives · Ollama Cloud Free quand autorisé · aucune commande ni paiement.",
  )
  .replace('import { nonaVisualCopy } from "@/lib/nona-visual-copy";', "")
  .replace(
    "Le livret local est indisponible. Relance Ouvrir-NONA.cmd.",
    "Le guide TEST est momentanément indisponible.",
  );
await writeFile(resolve(source, "entry.tsx"), entry);
await writeFile(
  resolve(source, "index.html"),
  '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>NONA — guide TEST cloud</title></head><body><div id="root"></div><script type="module" src="./entry.tsx"></script></body></html>',
);
const ux = resolve(root, "../nona-lovable-sync/src");
const overrides = new Map(
  [
    "components/guest/GuideView.tsx",
    "components/guest/GuideContent.tsx",
    "lib/ux-copy.ts",
    "lib/i18n.tsx",
    "styles/nona-art-direction.css",
  ].map((f) => [resolve(root, "src", f).replaceAll("\\", "/"), resolve(ux, f)]),
);
await build({
  configFile: false,
  root: source,
  publicDir: false,
  logLevel: "warn",
  base: "/",
  plugins: [
    {
      name: "preserve-unpublished-ux-snapshot",
      enforce: "pre",
      resolveId(id) {
        if (id.endsWith("/lib/ux-copy")) return resolve(ux, "lib/ux-copy.ts");
      },
      async load(id) {
        const exact = id.split("?")[0].replaceAll("\\", "/");
        if (overrides.has(exact)) return readFile(overrides.get(exact), "utf8");
        if (exact === resolve(root, "src/components/guest/NonaConcierge.tsx").replaceAll("\\", "/"))
          return (await readFile(exact, "utf8")).replace("Nona · IA locale", "Nona · TEST cloud");
      },
    },
    react(),
    tailwindcss(),
  ],
  resolve: { alias: { "@": resolve(root, "src") } },
  build: { outDir: resolve(dist, "public"), emptyOutDir: true },
});
await cp(resolve(root, "public"), resolve(dist, "public"), { recursive: true });
await writeFile(
  resolve(dist, "package.json"),
  JSON.stringify({ private: true, type: "module", engines: { node: "22.x" } }),
);
await writeFile(
  resolve(dist, "vercel.json"),
  JSON.stringify({
    version: 2,
    framework: null,
    buildCommand: "",
    installCommand: "",
    outputDirectory: "public",
    functions: { "api/test.mjs": { maxDuration: 30 } },
    rewrites: [
      { source: "/chat", destination: "/api/test?kind=chat" },
      { source: "/local-guide", destination: "/api/test?kind=guide" },
    ],
    headers: [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ],
  }),
);
console.log("HOSTED_TEST_PACKAGE_BUILT_NO_CREDENTIALS_NO_INFERENCE");
