// Run the upstream UI module with synthetic host responses, never a live gateway.
import { chromium } from 'playwright';
import { readFile, mkdir, writeFile, rename, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const upstream = process.argv[2];
if (!upstream) throw new Error('Usage: npm run demos:openclaw -- /absolute/path/to/wtc-cli [output-directory]');
const source = resolve(upstream);
const out = resolve(process.argv[3] ?? join(root, 'public/media/openclaw'));
const modulePath = 'openclaw-plugin/dist/control-ui/v1/index.js';
const module = await readFile(join(source, modulePath), 'utf8');
const html = await readFile(join(root, 'scripts/demos/openclaw.html'), 'utf8');
const revision = execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], {encoding:'utf8'}).trim();
if(execFileSync('git',['-C',source,'status','--porcelain','--',modulePath],{encoding:'utf8'}).trim()) throw new Error('Capture requires an unchanged upstream UI module');
await mkdir(out,{recursive:true});
const browser = await chromium.launch({headless:true});
const errors=[];
try {
 const context = await browser.newContext({viewport:{width:1120,height:760},deviceScaleFactor:1,locale:'en-US',timezoneId:'UTC',recordVideo:{dir:join(out,'.video'),size:{width:1120,height:760}}});
 // Only these fixture resources may load. No gateway, account or forge traffic.
 await context.route('**/*',route=>{
  const url=route.request().url();
  if(url==='https://demo.invalid/') return route.fulfill({contentType:'text/html',body:html});
  if(url==='https://demo.invalid/plugin.js') return route.fulfill({contentType:'text/javascript',body:module});
  errors.push(`Unexpected network request: ${url}`);return route.abort();
 });
 const page=await context.newPage();
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('https://demo.invalid/');
 await page.locator('#card details').waitFor();
 await page.waitForTimeout(1200);
 if (!await page.locator('#card details').evaluate(node=>node.open)) await page.locator('#card summary').click();
 await page.getByText('api',{exact:true}).first().waitFor();
 await page.waitForTimeout(800);
 await page.screenshot({path:join(out,'collection-card.png')});
 await page.waitForTimeout(2200);
 await page.getByTitle(/^Open the (wtc|taba) Collection panel$/).click();
 await page.getByText('Repositories',{exact:true}).waitFor();
 await page.getByText('Add search endpoint',{exact:true}).waitFor();
 await page.waitForTimeout(800);
 await page.screenshot({path:join(out,'collection-panel.png')});
 await page.waitForTimeout(3000);
 const video=page.video();
 await context.close();
 await rename(await video.path(),join(out,'collection-tour.webm'));
 await rm(join(out,'.video'),{recursive:true,force:true});
 // Narrow viewport check uses the same real renderer, without another video.
 const mobile=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
 await mobile.route('**/*',route=>{
  const url=route.request().url();
  if(url==='https://demo.invalid/') return route.fulfill({contentType:'text/html',body:html});
  if(url==='https://demo.invalid/plugin.js') return route.fulfill({contentType:'text/javascript',body:module});
  errors.push(`Unexpected network request: ${url}`);return route.abort();
 });
 const small=await mobile.newPage();
 small.on('pageerror',error=>errors.push(error.message));
 await small.goto('https://demo.invalid/');
 await small.getByTitle(/^Open the (wtc|taba) Collection panel$/).click();
 await small.getByText('Repositories',{exact:true}).waitFor();
 if(await small.evaluate(()=>document.documentElement.scrollWidth>innerWidth)) errors.push('Narrow demo overflows the viewport');
 await small.screenshot({path:join(out,'collection-mobile.png'),fullPage:true});
 await mobile.close();
 if(errors.length) throw new Error(errors.join('\n'));
 await writeFile(join(out,'provenance.json'),JSON.stringify({kind:'Real plugin renderer with synthetic host responses; not a live gateway',repository:'https://github.com/lcorneliussen/wtc-cli',revision,modulePath,sha256:createHash('sha256').update(module).digest('hex'),playwright:JSON.parse(await readFile(join(root,'node_modules/playwright/package.json'),'utf8')).version,browser:browser.version(),scenario:['Expand collection card','Open Collection panel'],limitations:['Synthetic surrounding shell, theme and data','No clone, publish, catch-up or service backend is exercised']},null,2)+'\n');
 console.log(`Captured and verified plugin UI from ${revision} in ${out}`);
} finally {await browser.close()}
