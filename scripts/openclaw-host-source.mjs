import { readFile, realpath } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const fontFiles = ['instrument-sans.css', 'instrument-sans-OFL.txt',
  'instrument-sans-latin.woff2', 'instrument-sans-latin-ext.woff2',
  'instrument-sans-italic-latin.woff2', 'instrument-sans-italic-latin-ext.woff2'];
const contractFiles = ['package.json', 'ui/src/styles/base.css', 'ui/src/app/typography.ts',
  'ui/src/plugins/control-ui-view.runtime.ts', 'ui/src/plugins/control-ui-view.ts',
  'ui/src/styles/chat/composer-progress.css', ...fontFiles.map(name => `ui/public/fonts/${name}`)];

// Read public host source as data, never import its runtime or contact a gateway.
export async function loadOpenClawHostSource(directory) {
  const root = await realpath(directory);
  const git = args => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const revision = git(['rev-parse', 'HEAD']);
  const files = new Map(), modules = [];
  for (const path of contractFiles) {
    const local = resolve(root, path);
    if (await realpath(local) !== local) throw Error('Host source symlinks are not allowed');
    const bytes = await readFile(local);
    const committed = execFileSync('git', ['-C', root, 'cat-file', 'blob', `${revision}:${path}`], { stdio: ['ignore', 'pipe', 'pipe'] });
    if (!bytes.equals(committed)) throw Error('Capture requires unchanged tracked host source');
    files.set(path, bytes);
    modules.push({ path, sha256: sha256(bytes) });
  }
  const { name, version } = JSON.parse(files.get('package.json'));
  if (name !== 'openclaw' || !/^2026\.10\.2$/.test(version)) throw Error('Host fixture contract currently requires OpenClaw 2026.10.2 source');
  const assets = new Map();
  assets.set('https://demo.invalid/host/base.css', { contentType: 'text/css', body: files.get('ui/src/styles/base.css') });
  for (const name of fontFiles.filter(name => !name.endsWith('.txt'))) {
    assets.set(`https://demo.invalid/host/fonts/${name}`, {
      contentType: name.endsWith('.css') ? 'text/css' : 'font/woff2', body: files.get(`ui/public/fonts/${name}`),
    });
  }
  const provenance = { repository: 'https://github.com/openclaw/openclaw', revision, version,
    theme: 'claw', typeface: 'Instrument Sans', modules,
    scope: 'Host global styles and typeface; synthetic mount and gateway responses, not the running host' };
  const assertUnchanged = async () => {
    if (git(['rev-parse', 'HEAD']) !== revision) throw Error('Host source changed during capture');
    for (const [path, bytes] of files) {
      const local = resolve(root, path);
      if (await realpath(local) !== local || !(await readFile(local)).equals(bytes)) throw Error('Host source changed during capture');
    }
  };
  await assertUnchanged();
  return { assets, provenance, assertUnchanged };
}

export const hostStyles = '<link rel="stylesheet" href="/host/base.css"><link rel="stylesheet" href="/host/fonts/instrument-sans.css">';

