// Run the upstream UI module with synthetic host responses, never a live gateway.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile, rename, rm, realpath } from 'node:fs/promises';
import { resolve, join, basename } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { loadControlUISource, serveControlUIAsset } from './control-ui-source.mjs';
import { fileURLToPath } from 'node:url';
// Private input paths are consumed here; only allowlisted release facts enter media metadata.
export async function loadReleaseEvidence(upstream, input) {
 if (!input) return null; // Historical captures remain reproducible without a release claim.
 const evidence = JSON.parse(await readFile(input, 'utf8'));
 const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
 assert.match(evidence.tag, /^v\d+\.\d+\.\d+$/);
 assert.match(evidence.revision, /^[a-f0-9]{40}$/);
 const git = args => execFileSync('git', ['-C', upstream, ...args], {encoding:'utf8'}).trim();
 assert.equal(git(['rev-parse', 'HEAD']), evidence.revision, 'Release source revision mismatch');
 assert.equal(git(['rev-parse', evidence.tag + '^{}']), evidence.revision, 'Release tag mismatch');
 for (const kind of ['archive', 'binary']) {
  assert.match(evidence[kind + 'Sha256'], /^[a-f0-9]{64}$/);
  assert.equal(sha256(await readFile(evidence[kind + 'Path'])), evidence[kind + 'Sha256'], 'Release ' + kind + ' checksum mismatch');
 }
 assert.equal(evidence.archiveName, basename(evidence.archivePath));
 assert.match(evidence.archiveName, /^taba_[0-9.]+_(?:darwin|linux)_(?:amd64|arm64)\.tar\.gz$/);
 assert.equal(typeof evidence.binaryVcsModified, 'boolean');
 assert.equal(evidence.binaryModuleVersion, evidence.tag + (evidence.binaryVcsModified ? '+dirty' : ''));
 const runtime = await loadControlUISource(upstream);
 assert(Array.isArray(evidence.embeddedFiles) && evidence.embeddedFiles.length > 0);
 const seen = new Set();
 for (const file of evidence.embeddedFiles) {
  assert.match(file.path, /^(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+$/);
  assert(!file.path.split('/').some(part => part === '.' || part === '..'));
  assert(!seen.has(file.path), 'Duplicate embedded file'); seen.add(file.path);
  assert.match(file.sha256, /^[a-f0-9]{64}$/);
  assert.equal(sha256(await readFile(join(evidence.exportPath, file.path))), file.sha256, 'Embedded file checksum mismatch');
 }
 for (const module of runtime.modules) {
  const name = module.modulePath.replace(/^openclaw-plugin\//, '');
  assert.equal(evidence.embeddedFiles.find(file => file.path === name)?.sha256, module.sha256, 'Released renderer differs from tagged source');
 }
 return {tag:evidence.tag, revision:evidence.revision, archiveName:evidence.archiveName,
  archiveSha256:evidence.archiveSha256, binarySha256:evidence.binarySha256,
  binaryVcsModified:evidence.binaryVcsModified, binaryModuleVersion:evidence.binaryModuleVersion,
  embeddedFiles:evidence.embeddedFiles.map(({path,sha256}) => ({path,sha256})),
  correspondence:'Exported released plugin and tagged renderer bytes match; native replay uses the tagged recording adapter.',
  limitation:'Binary VCS metadata is recorded, not a pristine-source build attestation.'};
}

export async function assertRunningVersion(page, selector, version) {
 const header = page.locator(selector + ' .wtc-brand-version');
 assert.equal(await header.count(), 1, 'Missing or duplicate running version');
 assert(await header.isVisible(), 'Hidden running version');
 assert.equal((await header.innerText()).trim(), version, 'Wrong running version');
 assert.equal(await header.getAttribute('title'), `Running gateway CLI: Taba ${version.replace(/^v/, '')}\nLoaded plugin: ${version.replace(/^v/, '')}`, 'Wrong running build details');
 const bounds = await header.boundingBox(), viewport = page.viewportSize();
 assert(bounds && bounds.x >= 0 && bounds.x + bounds.width <= viewport.width, 'Clipped running version');
 assert(await header.locator('span').evaluate(node => node.scrollWidth <= node.clientWidth), 'Clipped running version text');
}

// Check the actual renderer, rather than assuming fixture data became visible UI.
export async function assertStaticDemoState(page, selector, { fullPage = false } = {}) {
 const surface = page.locator(selector);
 const visible = async (locator, label) => {
  assert.equal(await locator.count(), 1, `Missing or duplicate ${label}`);
  assert(await locator.isVisible(), `Hidden ${label}`);
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  assert(box && box.width > 0 && box.height > 0 && box.x >= 0 && box.x + box.width <= viewport.width,
   `Clipped ${label}`);
  const bounds = fullPage
   ? await page.evaluate(() => ({ top: scrollY, height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, innerHeight) }))
   : { top: 0, height: viewport.height };
  assert(box.y + bounds.top >= 0 && box.y + bounds.top + box.height <= bounds.height,
   `Outside capture: ${label}`);
 };
 for (const label of ['Public access — anyone with the link', 'Account access', 'Access unknown']) {
  const glyph = surface.getByRole('img', { name: label, exact: true });
  await visible(glyph, label);
  assert.equal(await glyph.locator('svg path').count(), 1, `Missing access glyph: ${label}`);
 }
 for (const exposure of ['public', 'account', 'unknown']) {
  await visible(surface.locator(`a[href="https://${exposure}.example.invalid"]`), `${exposure} endpoint`);
 }
 const active = surface.getByRole('link', { name: 'live', exact: true });
 await visible(active, 'active named tunnel');
 assert.equal(await active.getAttribute('href'), 'https://live.example.invalid');
 assert.match(await active.locator('..').innerText(), /live.*ready/s);
 const registered = surface.getByTitle('Registered address (stopped): https://saved.example.invalid', { exact: true });
 await visible(registered, 'stopped registration');
 assert.match(await registered.locator('..').innerText(), /saved.*idle/s);
 assert.equal(await surface.locator('a[href="https://saved.example.invalid"]').count(), 0,
  'A stopped registration must not appear as an active link');
 for (const title of [
  'Stop live; retain its registration',
  'Start saved; approve potentially public exposure for this definition',
  "Remove only saved's verified owned registration resources",
  'Start new; approve potentially public exposure for this definition',
  'Register new; approve potentially public exposure for this definition',
 ]) await visible(surface.getByRole('button', { name: title, exact: true }), title);
 assert.equal(await surface.getByRole('button', { name: 'Register saved; approve potentially public exposure for this definition', exact: true }).count(), 0,
  'An existing registration must not offer Register');
 const caption = page.locator('#caption');
 const footer = page.locator('footer');
 await visible(caption, 'demonstration caption');
 await visible(footer, 'synthetic-data footer');
 assert.match(await caption.innerText(), /^(Reported endpoint access and named tunnel states beside your work\.|Active links and retained registrations are separate; controls are not exercised\.)$/,
  'Missing demonstration caption text');
 assert.equal(await footer.innerText(), 'Synthetic host, theme and data · No backend operations',
  'Missing synthetic-data and no-backend label');
 assert.deepEqual(await page.evaluate(() => window.demoUnexpectedRequests), [], 'Unexpected fixture request');
 assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false,
  'Demo overflows the viewport');
}

async function record() {
const root = fileURLToPath(new URL('../', import.meta.url));
const upstream = process.argv[2];
if (!upstream) throw new Error('Usage: npm run demos:openclaw -- /absolute/path/to/wtc-cli [output-directory]');
const source = resolve(upstream);
const out = resolve(process.argv[3] ?? join(root, 'public/media/openclaw'));
const runtime = await loadControlUISource(source);
const { modulePath, revision, entry: module } = runtime;
const release = await loadReleaseEvidence(source, process.argv[4]);
let html = await readFile(join(root, 'scripts/demos/openclaw.html'), 'utf8');
if (release) {
 assert.equal(html.split('version:null,').length, 2, 'Shared version fixture boundary changed');
 html = html.replace('version:null,', `version:${JSON.stringify({wtc:release.tag.slice(1),plugin:release.tag.slice(1)})},`);
}
await mkdir(out,{recursive:true});
const browser = await chromium.launch({headless:true});
const errors=[];
try {
 const context = await browser.newContext({viewport:{width:1120,height:760},deviceScaleFactor:1,locale:'en-US',timezoneId:'UTC',recordVideo:{dir:join(out,'.video'),size:{width:1120,height:760}}});
 // Only these fixture resources may load. No gateway, account or forge traffic.
 await context.route('**/*',route=>{
  const url=route.request().url();
  if(url==='https://demo.invalid/') return route.fulfill({contentType:'text/html',body:html});
  return serveControlUIAsset(route, runtime.assets, url => errors.push(`Unexpected network request: ${url}`));
 });
 const page=await context.newPage();
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('https://demo.invalid/');
 await page.locator('#card details').waitFor();
 await page.waitForTimeout(1200);
 if (!await page.locator('#card details').evaluate(node=>node.open)) await page.locator('#card summary').click();
 await page.getByText('api',{exact:true}).first().waitFor();
 await page.waitForTimeout(800);
 await assertStaticDemoState(page, '#card');
 if (release) await assertRunningVersion(page, '#card', release.tag);
 if(errors.length) throw new Error(errors.join('\n'));
 await page.screenshot({path:join(out,'collection-card.png')});
 await page.waitForTimeout(2200);
 await page.getByTitle(/^Open the (wtc|taba) Collection panel$/).click();
 await page.getByText('Repositories',{exact:true}).waitFor();
 await page.getByText('Add search endpoint',{exact:true}).waitFor();
 await page.waitForTimeout(800);
 await assertStaticDemoState(page, '#panel');
 if (release) await assertRunningVersion(page, '#panel', release.tag);
 if(errors.length) throw new Error(errors.join('\n'));
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
  return serveControlUIAsset(route, runtime.assets, url => errors.push(`Unexpected network request: ${url}`));
 });
 const small=await mobile.newPage();
 small.on('pageerror',error=>errors.push(error.message));
 await small.goto('https://demo.invalid/');
 await small.getByTitle(/^Open the (wtc|taba) Collection panel$/).click();
 await small.getByText('Repositories',{exact:true}).waitFor();
 await assertStaticDemoState(small, '#panel', { fullPage: true });
 if (release) await assertRunningVersion(small, '#panel', release.tag);
 if(errors.length) throw new Error(errors.join('\n'));
 await small.screenshot({path:join(out,'collection-mobile.png'),fullPage:true});
 await mobile.close();
 if(errors.length) throw new Error(errors.join('\n'));
 await runtime.assertUnchanged();
 if (release) assert.deepEqual(await loadReleaseEvidence(source, process.argv[4]), release);
 await writeFile(join(out,'provenance.json'),JSON.stringify({kind:'Real plugin renderer with synthetic host responses; not a live gateway',repository:'https://github.com/lcorneliussen/taba',...(release ? {release} : {}),revision,modulePath,modules:runtime.modules,sha256:createHash('sha256').update(module).digest('hex'),playwright:JSON.parse(await readFile(join(root,'node_modules/playwright/package.json'),'utf8')).version,browser:browser.version(),scenario:['Expand collection card','Open Collection panel','Inspect reported public, account and unknown endpoint access','Inspect active, registered-stopped and unregistered named entries without lifecycle clicks'],fixtureSha256:createHash('sha256').update(html).digest('hex'),recorderSha256:createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex'),limitations:['Synthetic surrounding shell, theme and data','Named entries show recorded state and controls, not provider verification','Access glyphs are rendered for existing endpoints; managed named entries have separate state controls','No clone, publish, catch-up or service backend is exercised','No tunnel lifecycle control is clicked; strict interaction geometry is not checked']},null,2)+'\n');
 console.log(`Captured and verified plugin UI from ${revision} in ${out}`);
} finally {await browser.close()}

}

if (process.argv[1] && await realpath(process.argv[1]) === fileURLToPath(import.meta.url)) await record();
