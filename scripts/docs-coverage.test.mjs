import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { check, digest, compareVersions, releaseQueue, proposal } from './docs-coverage.mjs';
const nl = String.fromCharCode(10);
async function fixture(t) {
 const root=await mkdtemp(join(tmpdir(),'wtc-coverage-')); t.after(()=>rm(root,{recursive:true,force:true}));
 const site=join(root,'site'),upstream=join(root,'cli');
 const put=async (base,path,text='example')=>{ const full=join(base,path); await mkdir(join(full,'..'),{recursive:true}); await writeFile(full,text); };
 for(const path of ['docs','internal/wtc/defaults','internal/wtc/release-notes/unreleased']) await mkdir(join(upstream,path),{recursive:true});
 for(const path of ['src/pages/index.astro','src/scripts/home.js','src/pages/docs/getting-started.md','src/pages/docs/team-harness.md']) await put(site,path);
 await mkdir(join(site,'docs'),{recursive:true});
 await put(site,'README.md');
 await put(upstream,'README.md');
 const manifest={schemaVersion:1,release:'v0.1.51',revision:'a'.repeat(40),sources:[{path:'README.md',sha256:digest('example'),status:'covered',reason:'Entry point',pages:['src/pages/index.astro','src/pages/docs/getting-started.md','src/pages/docs/team-harness.md']}]};
 return {site,upstream,manifest,put};
}
test('baseline passes and semver ordering is numeric',async t=>{const f=await fixture(t); assert.deepEqual(await check(f.manifest,f.site,f.upstream),[]);assert(compareVersions('0.1.9','0.1.10')<0);});
test('changed, new and removed source files are detected',async t=>{const f=await fixture(t);await f.put(f.upstream,'README.md','changed');await f.put(f.upstream,'docs/new.md');let errors=await check(f.manifest,f.site,f.upstream);assert(errors.includes('Changed upstream: README.md'));assert(errors.includes('New upstream: docs/new.md'));await rm(join(f.upstream,'README.md'));errors=await check(f.manifest,f.site,f.upstream);assert(errors.includes('Removed upstream: README.md'));});
test('missing targets, unmapped pages, duplicate paths and unsafe paths fail',async t=>{const f=await fixture(t);f.manifest.sources[0].pages.push('src/pages/docs/missing.md');await f.put(f.site,'src/pages/docs/new.md');f.manifest.sources.push({...f.manifest.sources[0]});f.manifest.sources.push({path:'docs/../../secret'});const errors=await check(f.manifest,f.site);assert(errors.some(e=>e.startsWith('Missing page:')));assert(errors.some(e=>e.startsWith('Unmapped website page:')));assert(errors.some(e=>e.startsWith('Duplicate source:')));assert(errors.some(e=>e.startsWith('Invalid source path:')));});
test('inconsistent install pins and missing rationale fail',async t=>{const f=await fixture(t);await f.put(f.site,'src/scripts/home.js','--cli-version 0.1.48');f.manifest.sources[0].reason='';const errors=await check(f.manifest,f.site);assert(errors.some(e=>e.startsWith('Install baseline mismatch:')));assert(errors.some(e=>e.startsWith('Missing coverage rationale:')));});
test('release intake includes undocumented changes, sorted releases and upcoming fragments',async t=>{const f=await fixture(t);for(const v of ['0.1.10','0.1.9'])await f.put(f.upstream,'internal/wtc/release-notes/'+v+'.md',['# wtc '+v,'## OpenClaw','New gateway behavior'].join(nl));await f.put(f.upstream,'internal/wtc/release-notes/unreleased/change.md','## Runtime'+nl+'Service update');await f.put(f.upstream,'internal/wtc/release-notes/unreleased/README.md','Format');const queue=await releaseQueue(f.manifest,f.upstream);assert.deepEqual(queue.map(x=>x.version),['0.1.9','0.1.10','unreleased']);assert(queue[0].pages.includes('src/pages/docs/openclaw.md'));assert(queue[2].pages.includes('src/pages/docs/services.md'));const report=proposal(f.manifest,'main',[],queue);assert(report.includes('upcoming, not released'));assert(report.includes('keyword heuristic'));assert.throws(()=>proposal(f.manifest,'bad-ref',[],queue));});
test('reviewed release suppressed but edited historical release reopens review',async t=>{const f=await fixture(t),path='internal/wtc/release-notes/0.1.51.md';await f.put(f.upstream,path,'old');f.manifest.sources.push({path,sha256:digest('old'),pages:['src/pages/docs/upgrades.md']});assert.equal((await releaseQueue(f.manifest,f.upstream)).length,0);await f.put(f.upstream,path,'new');assert.equal((await releaseQueue(f.manifest,f.upstream))[0].changed,true);});
test('CLI check fails on drift and propose succeeds without modifying baseline',async t=>{const f=await fixture(t);await f.put(f.site,'docs/coverage.json',JSON.stringify(f.manifest));await f.put(f.upstream,'docs/new.md');const script=new URL('./docs-coverage.mjs',import.meta.url).pathname;const result=spawnSync(process.execPath,[script,'check',f.upstream],{cwd:f.site,encoding:'utf8'});assert.equal(result.status,1);assert(result.stderr.includes('New upstream:'));const before=await readFile(join(f.site,'docs/coverage.json'),'utf8');const report=join(f.site,'proposal.md');const proposed=spawnSync(process.execPath,[script,'propose',f.upstream,'main',report],{cwd:f.site,encoding:'utf8'});assert.equal(proposed.status,0,proposed.stderr);assert.equal(await readFile(join(f.site,'docs/coverage.json'),'utf8'),before);assert((await readFile(report,'utf8')).includes('docs/new.md'));});

test('source links use Markdown syntax and ignore examples and web destinations',async t=>{
 const f=await fixture(t);
 await f.put(f.site,'docs/guide with spaces.md');
 await f.put(f.site,'docs/assets/image.svg');
 await f.put(f.site,'README.md',[
  '[Guide](docs/guide%20with%20spaces.md?view=1#heading "Title")',
  '[Reference][guide]', '[guide]: <docs/guide with spaces.md> "Title"',
  '![Image](docs/assets/image.svg)', '<a href="docs/guide%20with%20spaces.md">HTML</a>',
  '[Web](https://example.com/missing.md) [Route](/docs/guide/) [Anchor](#heading)',
  '`[Inline example](absent.md)`', '```md', '[Fenced example](absent.md)', '```',
 ].join(nl));
 await f.put(f.site,'docs/nested/usage.md','[Home](../../README.md)');
 assert.deepEqual(await check(f.manifest,f.site),[]);
});
test('deleted targets in root and nested documents fail the shared CLI check',async t=>{
 const f=await fixture(t);
 await f.put(f.site,'docs/coverage.json',JSON.stringify(f.manifest));
 await f.put(f.site,'README.md','[Guide](docs/guide.md "Title")');
 await f.put(f.site,'docs/nested/usage.md','[Reference][guide]'+nl+'[guide]: ../guide.md'+nl+'![Image](../image.svg)'+nl+'<a href="../html.md">HTML</a>');
 for(const name of ['guide.md','image.svg','html.md']) await f.put(f.site,'docs/'+name);
 assert.deepEqual(await check(f.manifest,f.site),[]);
 for(const name of ['guide.md','image.svg','html.md']) await rm(join(f.site,'docs',name));
 const script=new URL('./docs-coverage.mjs',import.meta.url).pathname;
 const result=spawnSync(process.execPath,[script,'check'],{cwd:f.site,encoding:'utf8'});
 assert.equal(result.status,1);
 for(const target of ['README.md','docs/nested/usage.md','guide.md','image.svg','html.md']) assert(result.stderr.includes(target),result.stderr);
});
test('source links cannot escape the repository or contain malformed escapes',async t=>{
 const f=await fixture(t);
 await f.put(f.site,'README.md','[Outside](../outside.md) [Invalid](bad%ZZ.md)');
 const errors=await check(f.manifest,f.site);
 assert(errors.some(e=>e.includes('outside.md')&&e.includes('escapes repository')));
 assert(errors.some(e=>e.includes('bad%ZZ.md')&&e.includes('invalid local target')));
});
