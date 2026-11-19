import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import config from '../astro.config.mjs';

const root = resolve('dist');
const origin = new URL(config.site).origin;
const base = `${config.base.replace(/\/$/, '')}/`;
const errors = [];
if (origin !== 'https://taba.sh' || base !== '/') {
  errors.push('Production must use https://taba.sh with a root base');
}
let checked = 0;
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory()
    ? walk(resolve(dir, entry.name)) : resolve(dir, entry.name)))).flat();
}
const outputFiles = await walk(root);
for (const file of outputFiles) {
  const path = relative(root, file);
  if (path.split(/[\\/]/).includes('status-evidence')) errors.push('Production contains a local evidence gallery');
  if (/\.(?:html|js|css|json|map|txt|svg)$/.test(file)) {
    const text = await readFile(file, 'utf8');
    if (text.includes(process.cwd()) || /(?:file:\/\/\/|\/Users\/[^/]+\/|\/private\/(?:var|tmp)\/)/.test(text)) errors.push(path + ': production contains a local filesystem path');
  }
}
const files = outputFiles.filter(file => file.endsWith('.html'));
for (const file of files) {
  const html = await readFile(file, 'utf8');
  const pagePath = relative(root, file).replace(/index\.html$/, '');
  const page = new URL(base + pagePath, origin);
  const canonical = html.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/);
  if (canonical?.[1] !== page.href) {
    errors.push(`${pagePath}: incorrect or missing canonical URL`);
  }
  if (/\b(?:href|src)="\/wtc-site(?:\/|")/.test(html)) {
    errors.push(`${pagePath}: obsolete project-site path`);
  }
  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const url = new URL(match[1].replaceAll('&amp;', '&'), page);
    if (url.origin !== origin || !['http:', 'https:'].includes(url.protocol)) continue;
    checked++;
    if (!url.pathname.startsWith(base)) {
      errors.push(`${pagePath}: path escapes Pages base: ${url.pathname}`);
      continue;
    }
    let target = resolve(root, decodeURIComponent(url.pathname.slice(base.length)));
    if (target !== root && !target.startsWith(`${root}/`)) {
      errors.push(`${pagePath}: path escapes output: ${url.pathname}`);
      continue;
    }
    try {
      if ((await stat(target)).isDirectory()) target = resolve(target, 'index.html');
      const body = await readFile(target, 'utf8');
      if (url.hash && target.endsWith('.html')) {
        const id = decodeURIComponent(url.hash.slice(1));
        if (!body.includes(`id="${id}"`)) errors.push(`${pagePath}: missing anchor ${url.pathname}${url.hash}`);
      }
    } catch { errors.push(`${pagePath}: missing target ${url.pathname}`); }
  }
}
// Every search result must land on a real page and heading.
let searchTargets = 0;
try {
  const index = JSON.parse(await readFile(resolve(root, 'search-index.json'), 'utf8'));
  for (const entry of index) {
    const url = new URL(entry.url, origin);
    searchTargets++;
    try {
      const body = await readFile(resolve(root, decodeURIComponent(url.pathname.slice(base.length)), 'index.html'), 'utf8');
      if (url.hash && !body.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`)) errors.push(`search-index.json: missing anchor ${entry.url}`);
    } catch { errors.push(`search-index.json: missing target ${entry.url}`); }
  }
  if (!searchTargets) errors.push('search-index.json: empty search index');
} catch { errors.push('search-index.json: missing or unreadable search index'); }
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Verified ${checked} internal links and assets across ${files.length} pages under ${base}, and ${searchTargets} search targets`);
}
