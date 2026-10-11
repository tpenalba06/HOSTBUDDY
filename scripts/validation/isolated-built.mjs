// Compiled TEST runtime. No .env files, production connection or deployment.
import { loadCredentials, verifyTarget, isolatedEnvironment } from './isolated-preview.mjs';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, symlinkSync, rmSync, readFileSync, statSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
const repo = process.cwd();
const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: ['ignore','pipe','pipe'] }).trim();
let server, directory, checkout;
let phase='preflight';
const statusFile=join(resolve(process.argv[2]),'built-status.json');
const mark=value=>{phase=value;writeFileSync(statusFile,JSON.stringify({phase}),{mode:0o600});};
try {
  const keys = loadCredentials(resolve(process.argv[2]));
  await verifyTarget(keys);
  if (git('status','--porcelain','--untracked-files=no')) throw new Error('checkout');
  const head = git('rev-parse','HEAD');
  if (git('ls-tree','-r','--name-only',head).split('\n').some(p => /^\.env(?:$|\.)/.test(p) && !/\.(example|sample)$/.test(p))) throw new Error('env');
  mark('checkout');
  directory = mkdtempSync(join(tmpdir(),'nona-built-test-'));
  checkout = join(directory,'checkout');
  git('worktree','add','--detach',checkout,head);
  symlinkSync(join(repo,'node_modules'),join(checkout,'node_modules'),'dir');
  const env = { ...isolatedEnvironment(process.env,keys), NODE_ENV:'production' };
  for (const key of Object.keys(process.env)) delete process.env[key];
  Object.assign(process.env,env); process.chdir(checkout);
  mark('build');
  const { createBuilder } = await import('vite');
  const builder = await createBuilder({ root:checkout, configFile:join(checkout,'vite.config.ts'), mode:'nona-isolated-test', logLevel:'silent' });
  await builder.buildApp();
  mark('worker_import');
  const worker = (await import(pathToFileURL(join(checkout,'.output/server/index.mjs')).href)).default;
  if (typeof worker.fetch !== 'function') throw new Error('worker');
  const publicRoot = join(checkout,'.output/public');
  const audit = dir => { for(const e of readdirSync(dir,{withFileTypes:true})) { const p=join(dir,e.name); if(e.isDirectory())audit(p); else if(/\.(js|html|json)$/.test(p)){const text=readFileSync(p,'utf8');if(text.includes(keys.serverKey)||text.includes('jzbjpaucgckggumhowns'))throw new Error('client_configuration');} } };
  mark('client_audit');
  audit(publicRoot);
  const mime = { '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.html':'text/html', '.woff2':'font/woff2', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp', '.svg':'image/svg+xml', '.mp4':'video/mp4' };
  mark('http_start');
  server = createServer(async (req,res) => {
    try {
      const url = new URL(req.url,'http://127.0.0.1:8787');
      const path = resolve(publicRoot,'.'+decodeURIComponent(url.pathname));
      if (req.method === 'GET' && path.startsWith(publicRoot+'/')) {
        try { if (statSync(path).isFile()) { res.writeHead(200,{'Content-Type':mime[extname(path)] || 'application/octet-stream'}); res.end(readFileSync(path)); return; } } catch { /* SSR route */ }
      }
      if (req.method !== 'GET' || !(/^\/l\/[a-zA-Z0-9_-]{1,80}$/.test(url.pathname) || url.pathname === '/offline')) { res.writeHead(403); res.end(); return; }
      const response = await worker.fetch(new Request(url,{headers:req.headers}),{}, { waitUntil(p){p.catch(()=>{});} });
      res.writeHead(response.status,Object.fromEntries(response.headers));
      if (response.body) Readable.fromWeb(response.body).pipe(res); else res.end();
    } catch { res.writeHead(500); res.end('TEST runtime error'); }
  });
  await new Promise(done => server.listen(8787,'127.0.0.1',done));
  mark('ready');
  const cleanup = () => { server.close(); process.chdir(repo); git('worktree','remove','--force',checkout); rmSync(directory,{recursive:true,force:true}); process.exit(0); };
  process.once('SIGTERM',cleanup); process.once('SIGINT',cleanup);
} catch(error) {
  const code=['ENOENT','ERR_MODULE_NOT_FOUND','ERR_INVALID_ARG_TYPE','ERR_INVALID_ARG_VALUE'].includes(error.code)?error.code:'unspecified';
  try {writeFileSync(statusFile,JSON.stringify({phase,code}),{mode:0o600});}catch{}
  if (server) server.close();
  process.chdir(repo);
  if (checkout) { try { git('worktree','remove','--force',checkout); } catch {} }
  if (directory) rmSync(directory,{recursive:true,force:true});
  process.exitCode=1;
}
