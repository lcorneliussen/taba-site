import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { loadLocalModuleGraph, loadControlUISource, serveControlUIAsset, controlUIModulePath } from './control-ui-source.mjs';

async function fixture(t, files) {
  const root = await mkdtemp(join(tmpdir(), 'capture-modules-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const [name, content] of Object.entries(files)) {
    await mkdir(dirname(join(root, name)), { recursive: true });
    await writeFile(join(root, name), content);
  }
  return root;
}

test('follows static, side-effect, re-export and literal dynamic imports without executing source', async t => {
  const files = {
    'index.js': `import './side.js'; export { value } from './nested/export.js';
      const later = () => import('./dynamic.mjs'); throw Error('must not execute');
      // import './absent-comment.js';
      const text = "import './absent-string.js'";`,
    'side.js': `export * from './nested/export.js';`,
    'nested/export.js': `import '../index.js'; export const value = 1;`,
    'dynamic.mjs': `export default 2;`,
    'unreferenced.js': 'export default 3;',
  };
  const root = await fixture(t, files);
  const graph = await loadLocalModuleGraph(root);
  assert.deepEqual(graph.modules.map(module => module.path), ['dynamic.mjs', 'index.js', 'nested/export.js', 'side.js']);
  for (const module of graph.modules) {
    assert.equal(module.sha256, createHash('sha256').update(files[module.path]).digest('hex'));
    assert.equal(graph.assets.get(`https://demo.invalid/${module.path}`), files[module.path]);
  }
});

test('missing dependencies and invalid JavaScript fail before capture', async t => {
  const root = await fixture(t, { 'index.js': `import './missing.js';` });
  await assert.rejects(loadLocalModuleGraph(root), { code: 'ENOENT' });
  await writeFile(join(root, 'index.js'), 'import {');
  await assert.rejects(loadLocalModuleGraph(root), /Invalid capture module syntax/);
});

test('refuses remote, bare, computed and ambiguously encoded module imports', async t => {
  const root = await fixture(t, { 'index.js': '' });
  for (const source of [
    `import 'https://example.invalid/remote.js';`, `import 'node:fs';`, `import 'package';`,
    `import '/absolute.js';`, `import(name);`, `import('./a.js?mode=1');`,
    `import './%2e%2e/outside.js';`, `import './a.js#fragment';`, `import './a\\\\b.js';`,
  ]) {
    await writeFile(join(root, 'index.js'), source);
    await assert.rejects(loadLocalModuleGraph(root), /Capture requires|Unsupported capture module path/);
  }
});

test('refuses directory escapes and symlink imports, including an escaped entry', async t => {
  const root = await fixture(t, { 'modules/index.js': `import '../outside.js';`, 'outside.js': 'export default 1;' });
  await assert.rejects(loadLocalModuleGraph(join(root, 'modules')), /escapes source directory/);
  await assert.rejects(loadLocalModuleGraph(join(root, 'modules'), '../outside.js'), /escapes source directory/);
  await writeFile(join(root, 'modules/index.js'), `import './linked.js';`);
  await symlink(join(root, 'outside.js'), join(root, 'modules/linked.js'));
  await assert.rejects(loadLocalModuleGraph(join(root, 'modules')), /symlinks are not allowed/);
});

test('route allows exact loaded modules and denies all other network/resources', async () => {
  const assets = new Map([['https://demo.invalid/index.js', 'export default 1;']]);
  const denied = [], calls = [];
  const route = url => ({ request: () => ({ url: () => url }), fulfill: data => calls.push(['fulfilled', data]), abort: () => calls.push(['aborted']) });
  serveControlUIAsset(route('https://demo.invalid/index.js'), assets, url => denied.push(url));
  assert.deepEqual(calls.shift(), ['fulfilled', { contentType: 'text/javascript', body: 'export default 1;' }]);
  for (const url of ['https://demo.invalid/index.js?query', 'https://demo.invalid/unreferenced.js', 'https://demo.invalid/secret.txt', 'https://example.invalid/index.js', 'http://demo.invalid/index.js']) {
    serveControlUIAsset(route(url), assets, url => denied.push(url));
    assert.deepEqual(calls.shift(), ['aborted']);
  }
  assert.equal(denied.length, 5);
});

async function repository(t) {
  const root = await fixture(t, {
    [controlUIModulePath]: `export { value } from './dependency.js';`,
    [controlUIModulePath.replace('index.js', 'dependency.js')]: 'export const value = 1;',
  });
  const git = (...args) => execFileSync('git', ['-C', root, '-c', 'core.hooksPath=/dev/null', '-c', 'user.name=Example', '-c', 'user.email=demo@example.invalid', '-c', 'commit.gpgsign=false', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('init', '--quiet'); git('add', '.'); git('commit', '--quiet', '-m', 'Synthetic module fixture');
  return { root, git };
}

test('records committed dependency identities and refuses source/head changes during a take', async t => {
  const { root, git } = await repository(t);
  const source = await loadControlUISource(root);
  assert.equal(source.revision, git('rev-parse', 'HEAD'));
  assert.equal(source.modules.length, 2);
  assert(source.modules.every(module => module.modulePath.startsWith('openclaw-plugin/dist/control-ui/v1/')));
  assert(!JSON.stringify(source.modules).includes(root));
  await source.assertUnchanged();
  const dependency = join(root, controlUIModulePath.replace('index.js', 'dependency.js'));
  await writeFile(dependency, 'export const value = 2;');
  await assert.rejects(source.assertUnchanged(), /unchanged tracked runtime modules/);
  git('update-index', '--assume-unchanged', controlUIModulePath.replace('index.js', 'dependency.js'));
  await assert.rejects(source.assertUnchanged(), /differs from the declared revision/);
  git('update-index', '--no-assume-unchanged', controlUIModulePath.replace('index.js', 'dependency.js'));
  git('add', '.'); git('commit', '--quiet', '-m', 'Change synthetic dependency');
  await assert.rejects(source.assertUnchanged(), /CLI source changed during capture/);
});

test('untracked imported assets cannot acquire a committed source identity', async t => {
  const { root } = await repository(t);
  await rm(join(root, controlUIModulePath.replace('index.js', 'dependency.js')));
  await assert.rejects(loadControlUISource(root), { code: 'ENOENT' });
  await writeFile(join(root, controlUIModulePath.replace('index.js', 'dependency.js')), `import './untracked.js'; export const value = 1;`);
  await writeFile(join(root, controlUIModulePath.replace('index.js', 'untracked.js')), 'export default 1;');
  await assert.rejects(loadControlUISource(root));
});
