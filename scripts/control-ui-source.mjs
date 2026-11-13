import { readFile, realpath } from 'node:fs/promises';
import { resolve, relative, dirname, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import ts from 'typescript';

export const controlUIModulePath = 'openclaw-plugin/dist/control-ui/v1/index.js';
const origin = 'https://demo.invalid/';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

// Follow the same local entry/preview/lexer contract as the upstream
// control-ui-fixture-assets helper, including future relative module imports.
// Parse imports rather than executing source or matching strings in comments.
function imports(source) {
  const file = ts.createSourceFile('module.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  if (file.parseDiagnostics.length) throw Error('Invalid capture module syntax');
  const result = [];
  const add = node => {
    if (!node || !ts.isStringLiteralLike(node)) throw Error('Capture requires literal local module imports');
    result.push(node.text);
  };
  const visit = node => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier) add(node.moduleSpecifier);
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      add(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return result;
}

export async function loadLocalModuleGraph(directory, entry = 'index.js') {
  const root = await realpath(directory);
  const assets = new Map(), modules = [];
  async function visit(name) {
    if (!/\.(?:m?js)$/.test(name) || /[\\%?#\x00-\x20]/.test(name)) throw Error('Unsupported capture module path');
    const path = resolve(root, name), within = relative(root, path);
    if (within === '..' || within.startsWith('..' + sep) || resolve(root, within) !== path) throw Error('Capture module escapes source directory');
    const canonical = await realpath(path);
    if (canonical !== path) throw Error('Capture module symlinks are not allowed');
    const url = new URL(within.split(sep).join('/'), origin).href;
    if (assets.has(url)) return;
    const bytes = await readFile(path);
    const source = bytes.toString('utf8');
    assets.set(url, source);
    modules.push({ path: within.split(sep).join('/'), sha256: digest(bytes) });
    for (const specifier of imports(source)) {
      if (!specifier.startsWith('./') && !specifier.startsWith('../')) throw Error('Capture requires relative local module imports');
      // Reject URL spelling that browsers normalize differently from disk paths.
      if (/[\\%?#\x00-\x20]/.test(specifier)) throw Error('Unsupported capture module path');
      await visit(relative(root, resolve(dirname(path), specifier)));
    }
  }
  await visit(entry);
  modules.sort((a, b) => a.path.localeCompare(b.path));
  return { assets, modules };
}

export async function loadControlUISource(upstream) {
  const root = resolve(upstream);
  const git = args => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const revision = git(['rev-parse', 'HEAD']);
  const graph = await loadLocalModuleGraph(resolve(root, dirname(controlUIModulePath)));
  const modules = graph.modules.map(({ path, sha256 }) => ({ modulePath: `${dirname(controlUIModulePath)}/${path}`, sha256 }));
  const paths = modules.map(module => module.modulePath);
  git(['ls-files', '--error-unmatch', '--', ...paths]);
  if (git(['status', '--porcelain', '--untracked-files=all', '--', ...paths])) throw Error('Capture requires unchanged tracked runtime modules');
  for (const module of modules) {
    const committed = execFileSync('git', ['-C', root, 'cat-file', 'blob', `${revision}:${module.modulePath}`], { stdio: ['ignore', 'pipe', 'pipe'] });
    if (digest(committed) !== module.sha256) throw Error('Capture module differs from the declared revision');
  }
  if (git(['rev-parse', 'HEAD']) !== revision) throw Error('CLI source changed while loading capture modules');
  return {
    ...graph, modules, revision, modulePath: controlUIModulePath,
    entry: graph.assets.get(new URL('index.js', origin).href),
    async assertUnchanged() {
      const current = await loadControlUISource(root);
      if (revision !== current.revision || JSON.stringify(modules) !== JSON.stringify(current.modules)) throw Error('CLI source changed during capture');
    },
  };
}

// The caller handles its exact synthetic document separately. Everything else
// is denied unless it is a loaded local runtime module at this exact URL.
export function serveControlUIAsset(route, assets, denied = () => {}) {
  const url = route.request().url();
  const body = assets.get(url);
  if (body === undefined) { denied(url); return route.abort(); }
  return route.fulfill({ contentType: 'text/javascript', body });
}
