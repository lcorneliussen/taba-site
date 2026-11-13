import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { loadOpenClawHostSource } from './openclaw-host-source.mjs';
import { chromium } from 'playwright';
import { collectVisualMeasurements, inspectVisualMeasurements } from './openclaw-visual-audit.mjs';

async function repository(t) {
  const root = await mkdtemp(join(tmpdir(), 'host-contract-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const files = {
    'package.json': JSON.stringify({ name: 'openclaw', version: '2026.10.2' }),
    'ui/src/styles/base.css': 'body {font:400 14px/1.55 var(--font-body)}',
    'ui/src/app/typography.ts': '// synthetic contract',
    'ui/src/plugins/control-ui-view.runtime.ts': '// synthetic mount',
    'ui/src/plugins/control-ui-view.ts': '// synthetic surface',
    'ui/src/styles/chat/composer-progress.css': '.loading {min-height:40px}',
  };
  for (const name of ['instrument-sans.css', 'instrument-sans-OFL.txt',
    'instrument-sans-latin.woff2', 'instrument-sans-latin-ext.woff2',
    'instrument-sans-italic-latin.woff2', 'instrument-sans-italic-latin-ext.woff2']) files[`ui/public/fonts/${name}`] = 'synthetic bytes';
  for (const [path, bytes] of Object.entries(files)) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), bytes);
  }
  const git = (...args) => execFileSync('git', ['-C', root, '-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', '-c', 'user.name=Example', '-c', 'user.email=demo@example.invalid', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('init', '-q'); git('add', '.'); git('commit', '-qm', 'Synthetic host fixture');
  return { root, git };
}

test('host assets carry exact committed provenance and expose only CSS/fonts at exact URLs', async t => {
  const { root, git } = await repository(t);
  const source = await loadOpenClawHostSource(root);
  assert.equal(source.provenance.revision, git('rev-parse', 'HEAD'));
  assert.equal(source.provenance.modules.length, 12);
  assert(source.provenance.modules.every(item => /^[a-f0-9]{64}$/.test(item.sha256)));
  assert(!JSON.stringify(source.provenance).includes(root));
  assert.equal(source.assets.get('https://demo.invalid/host/base.css').contentType, 'text/css');
  assert.equal(source.assets.get('https://demo.invalid/host/fonts/instrument-sans-latin.woff2').contentType, 'font/woff2');
  for (const url of ['https://example.invalid/host/base.css', 'https://demo.invalid/host/base.css?query',
    'https://demo.invalid/package.json', 'https://demo.invalid/host/fonts/instrument-sans-OFL.txt']) assert(!source.assets.has(url));
  await source.assertUnchanged();
  await writeFile(join(root, 'ui/src/styles/base.css'), 'body {font-size:32px}');
  await assert.rejects(source.assertUnchanged(), /changed during capture/);
  await assert.rejects(loadOpenClawHostSource(root), /unchanged tracked/);
});

test('a changed source head, unsupported version and symlinked asset fail closed', async t => {
  const { root, git } = await repository(t);
  const source = await loadOpenClawHostSource(root);
  git('commit', '--allow-empty', '-qm', 'Next fixture revision');
  await assert.rejects(source.assertUnchanged(), /changed during capture/);
  await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'openclaw', version: '2026.10.3' }));
  git('add', '.'); git('commit', '-qm', 'Different contract');
  await assert.rejects(loadOpenClawHostSource(root), /requires OpenClaw 2026.10.2/);
  const font = join(root, 'ui/public/fonts/instrument-sans-latin.woff2');
  await rm(font); await symlink(join(root, 'package.json'), font);
  await assert.rejects(loadOpenClawHostSource(root), /symlinks/);
});

test('table baseline checks ignore preview paint layers but still reject displaced real cells', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(`<div id="surface"><div class="wtc-table" data-columns="3" style="position:relative;display:grid;grid-template-columns:100px 100px 100px;font:14px/20px sans-serif">
      <span>Repo</span><span>State</span><span>Action</span>
      <span>api</span><span>Current</span><span>Inspect</span>
      <span class="wtc-action-preview-wash" style="position:absolute;inset:20px 0 0;pointer-events:none"></span>
      <span>web</span><span id="state">Pending</span><span>Wait</span>
    </div></div>`);
    const collect = () => page.evaluate(collectVisualMeasurements, '#surface');
    const normal = inspectVisualMeasurements(await collect());
    assert.equal(normal.errors.length, 0);
    assert.equal(normal.groups.filter(group => group.name.includes('row')).length, 2);
    assert(normal.groups.every(group => group.members.length === 3));
    await page.locator('#state').evaluate(node => node.style.transform = 'translateY(3px)');
    const displaced = inspectVisualMeasurements(await collect());
    assert(displaced.errors.some(error => /row 2 baseline: 3.00px spread/.test(error)));
    await page.locator('#state').evaluate(node => node.style.transform = '');
    await page.locator('.wtc-action-preview-wash').evaluate(node => node.remove());
    assert.equal(inspectVisualMeasurements(await collect()).errors.length, 0);
  } finally { await browser.close(); }
});

async function displacedRenderer(t) {
  const { root, git } = await repository(t);
  const entry = 'openclaw-plugin/dist/control-ui/v1/index.js';
  await mkdir(dirname(join(root, entry)), { recursive: true });
  await writeFile(join(root, entry), `const OPEN_KEY = "fixture-open";
    export default {activate(host) {host.ui.registerReplacement({mount(container) {
      container.innerHTML = '<details class="wtc-collection-card" open><summary style="display:flex;padding:0 12px"><span class="wtc-brand-word">Collection</span><span class="wtc-header-controls" style="margin-left:auto"><button title="Deliberately displaced"><svg width="14" height="14" style="transform:translateY(12px)"><path d="M1 1L13 13"/></svg></button></span></summary><div class="wtc-repositories">Synthetic repository</div></details>';
    }})}};`);
  git('add', '.'); git('commit', '-qm', 'Synthetic displaced renderer');
  return root;
}

test('legacy invocation remains available with explicit fixture provenance and strict rejection', async t => {
  const root = await displacedRenderer(t);
  const output = join(root, 'legacy-take');
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('./record-openclaw-interactions.mjs', import.meta.url)), root, output, 'push'], { encoding: 'utf8', timeout: 30000 });
  assert.equal(result.status, 1, result.stderr);
  const manifest = JSON.parse(await readFile(join(output, 'manifest.json')));
  assert.match(manifest.error, /Visual alignment/);
  assert.equal(manifest.host.sourceBacked, false);
  assert.match(manifest.host.scope, /Legacy standalone fixture/);
  assert.deepEqual(manifest.recordings, []);
  assert.equal(manifest.recorder.hostSourceLoaderSha256, createHash('sha256').update(await readFile(new URL('./openclaw-host-source.mjs', import.meta.url))).digest('hex'));
});

test('failed desktop/mobile captures retain host provenance, raw pixels, audits and traces', { skip: !process.env.OPENCLAW_HOST_SOURCE }, async t => {
  const root = await displacedRenderer(t);
  for (const width of [1120, 390]) {
    const output = join(root, `take-${width}`);
    const result = spawnSync(process.execPath, [fileURLToPath(new URL('./record-openclaw-interactions.mjs', import.meta.url)),
      root, output, 'push', '--width', String(width), '--host-source', process.env.OPENCLAW_HOST_SOURCE], { encoding: 'utf8', timeout: 30000 });
    assert.equal(result.status, 1, result.stderr);
    const manifest = JSON.parse(await readFile(join(output, 'manifest.json')));
    assert.equal(manifest.status, 'failed');
    assert.match(manifest.error, /Visual alignment/);
    assert.deepEqual(manifest.recordings, []);
    assert.equal(manifest.host.version, '2026.10.2');
    assert.equal(manifest.host.sourceBacked, true);
    assert.equal(manifest.host.revision, 'b8952d477f0c932d8ddc6da5c89cab5a169b6ff1');
    const dir = join(output, '01-push-create-pr');
    const png = await readFile(join(dir, 'idle.png'));
    const audit = JSON.parse(await readFile(join(dir, 'idle.visual.json')));
    assert(audit.errors.some(error => error.includes('Deliberately displaced')));
    assert.equal(audit.image.sha256, createHash('sha256').update(png).digest('hex'));
    assert.match(await readFile(join(dir, 'idle.audit.html'), 'utf8'), /Deliberately displaced/);
    assert.match(await readFile(join(dir, 'idle.guides.svg'), 'utf8'), /data:image\/png;base64/);
    assert.equal(JSON.parse(await readFile(join(dir, 'layout-positions.json'))).length, 1);
    assert(Array.isArray(JSON.parse(await readFile(join(dir, 'trace.json')))));
  }
});
