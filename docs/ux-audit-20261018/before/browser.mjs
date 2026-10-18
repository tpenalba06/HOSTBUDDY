import { chromium } from 'file:///C:/Users/trpe0/.codex/.chatgpt-projects/g-p-6ac91118e6d081918e1868cfe80ce3cf/foliorelais/node_modules/.pnpm/playwright-core@1.58.2/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';
const dir = new URL('.', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const mode = process.argv[2];
if(mode==='serve') {
 const server=await chromium.launchServer({executablePath:'C:/Users/trpe0/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe', headless:true});
 fs.writeFileSync(dir+'endpoint.txt',server.wsEndpoint());
 console.log('BROWSER_READY');
 await new Promise(()=>{});
} else {
 const browser=await chromium.connect(fs.readFileSync(dir+'endpoint.txt','utf8'));
 const arg=JSON.parse(process.argv[3]||'{}');
 let ctx=browser.contexts()[0];
 if(mode==='new') {ctx=await browser.newContext(arg.mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1}:{viewport:{width:1440,height:1000}});await ctx.tracing.start({screenshots:true,snapshots:true});const p=await ctx.newPage();await p.goto('http://127.0.0.1:4184/');}
 const page=ctx.pages().at(-1);
 if(mode==='click') await page.getByRole(arg.role,{name:arg.name,exact:true}).nth(arg.nth||0).click();
 if(mode==='fill') await page.getByRole(arg.role,{name:arg.name,exact:true}).fill(arg.value);
 if(mode==='back') await page.goBack();
 if(mode==='trace') await ctx.tracing.stop({path:dir+arg.file});
 if(mode==='closecontext') {await ctx.close();await browser.close();process.exit(0);}
 await page.waitForTimeout(600);
 if(arg.shot) await page.screenshot({path:dir+arg.shot,fullPage:true});
 console.log(JSON.stringify({url:page.url(),title:await page.title(),snapshot:await page.locator('body').ariaSnapshot()},null,2));
 await browser.close();
}

