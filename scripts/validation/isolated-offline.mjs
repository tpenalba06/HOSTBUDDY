// Read-only published synthetic guide, compiled build, actual offline navigation.
import { loadCredentials, verifyTarget, TEST_URL, TEST_REF } from './isolated-preview.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn, execFileSync } from 'node:child_process';
const directory=resolve(process.argv[2]), output=resolve(process.argv[3]);
mkdirSync(output,{recursive:true,mode:0o700});
const result={target:TEST_REF,status:'INCOMPLETE',checks:[]};
let stage='preflight',server,browser;
const check=(name,details={})=>{result.checks.push({name,pass:true,...details}); console.log(JSON.stringify({check:name,pass:true}));};
const assert=(v)=>{if(!v)throw new Error('assertion');};
try {
 const keys=loadCredentials(directory); await verifyTarget(keys);
 result.head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const pw=await import(pathToFileURL(process.env.NONA_PLAYWRIGHT_MODULE).href);
 browser=await pw.chromium.launch({headless:true});
 const response=await fetch(TEST_URL+'/rest/v1/properties?select=name,slug&name=like.Nona%20navigateur%20TEST%20*&status=eq.published&order=created_at.desc&limit=1',{headers:{apikey:keys.serverKey},redirect:'error',signal:AbortSignal.timeout(30000)});
 assert(response.ok); const [fixture]=await response.json();
 assert(fixture?.name.startsWith('Nona navigateur TEST ') && /^[a-zA-Z0-9_-]{1,80}$/.test(fixture.slug));
 stage='compiled_server';
 server=spawn(process.execPath,['scripts/validation/isolated-built.mjs',directory],{stdio:'ignore'});
 const path='/l/'+fixture.slug;
 let html;
 for(let n=0;n<150;n++){
  if(server.exitCode!==null)throw new Error('server');
  try {const r=await fetch('http://127.0.0.1:8787'+path,{signal:AbortSignal.timeout(2000)});if(r.ok){html=await r.text();break;}}catch{}
  await new Promise(r=>setTimeout(r,1000));
 }
 assert(html?.includes(result.head)&&!html.includes(keys.serverKey)); check('compiled_head');
 for(const engine of ['chromium','webkit']){
  stage=engine+'_online';
  if(engine==='webkit'){await browser.close();browser=await pw.webkit.launch({headless:true});}
  const context=await browser.newContext({viewport:{width:390,height:844},locale:'fr-FR'});
  await context.addInitScript(()=>{localStorage.setItem('hostbuddy.locale','fr');});
  await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin==='http://127.0.0.1:8787'||u.origin===TEST_URL||['blob:','data:'].includes(u.protocol))return route.continue();return route.abort();});
  const page=await context.newPage(); let errors=0;page.on('pageerror',()=>errors++);
  await page.goto('http://127.0.0.1:8787'+path); await page.waitForLoadState('networkidle');
  await page.getByText(fixture.name,{exact:true}).first().waitFor();
  stage=engine+'_save';
  await page.getByRole('button',{name:'Enregistrer hors connexion',exact:true}).click();
  const copy=page.getByRole('link',{name:'Ouvrir la copie enregistrée',exact:true}); await copy.waitFor({timeout:90000});
  const offlinePath=await copy.getAttribute('href'); assert(offlinePath?.startsWith('/offline?slug='));
  check(engine+'_saved_text_and_photo');
  stage=engine+'_network_off'; await context.setOffline(true);
  await page.goto('http://127.0.0.1:8787'+offlinePath);
  await page.getByText(fixture.name,{exact:true}).first().waitFor({timeout:30000});
  await page.waitForFunction(()=>[...document.images].some(img=>img.currentSrc.startsWith('blob:')&&img.complete&&img.naturalWidth>0),null,{timeout:30000});
  assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1));
  check(engine+'_offline_start_and_blob_photo');
  stage=engine+'_offline_reopen';await page.close();const reopened=await context.newPage();
  await reopened.goto('http://127.0.0.1:8787'+offlinePath);
  await reopened.getByText(fixture.name,{exact:true}).first().waitFor({timeout:30000});
  await reopened.waitForFunction(()=>[...document.images].some(img=>img.currentSrc.startsWith('blob:')&&img.complete&&img.naturalWidth>0));
  assert(errors===0);check(engine+'_offline_new_tab');
  await context.close();
 }
 result.status='PASS';
}catch{try{const diagnostic=JSON.parse(readFileSync(join(directory,'built-status.json'),'utf8'));if(['checkout','build','worker_import','client_audit','http_start','ready'].includes(diagnostic.phase))result.runtimePhase=diagnostic.phase;if(['ENOENT','ERR_MODULE_NOT_FOUND','ERR_INVALID_ARG_TYPE','ERR_INVALID_ARG_VALUE','unspecified'].includes(diagnostic.code))result.runtimeCode=diagnostic.code;}catch{} result.status='FAIL';result.failedStage=stage;process.exitCode=1;}
finally{if(browser)await browser.close().catch(()=>{});if(server)server.kill('SIGTERM');writeFileSync(join(output,'results.json'),JSON.stringify(result,null,2),{mode:0o600});console.log(JSON.stringify({status:result.status,stage:result.failedStage||'complete',checks:result.checks.length}));}
