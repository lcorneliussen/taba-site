import { createHash } from 'node:crypto';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { markdownToHast } from 'satteri';

export const digest = content => createHash('sha256').update(content).digest('hex');
export const roots = ['docs', 'internal/wtc/defaults', 'internal/wtc/release-notes'];
export const releaseVersion = path => path.match(/^internal\/wtc\/release-notes\/([0-9]+[.][0-9]+[.][0-9]+)[.]md$/)?.[1];
export function compareVersions(a, b) {
  const aa = a.replace(/^v/, '').split('.').map(Number), bb = b.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) if (aa[i] !== bb[i]) return aa[i] - bb[i];
  return 0;
}
export async function inventory(root) {
  const files = ['README.md'];
  async function walk(dir) {
    for (const item of await readdir(resolve(root, dir), { withFileTypes: true })) {
      const path = dir + '/' + item.name;
      if (item.isDirectory()) await walk(path);
      else if (item.isFile() && path.endsWith('.md')) files.push(path);
    }
  }
  for (const dir of roots) await walk(dir);
  return files.sort();
}
const validPath = path => typeof path === 'string' && (path === 'README.md' || roots.some(root => path.startsWith(root + '/'))) && !path.split('/').includes('..') && !path.includes('\\');
const pagePath = path => typeof path === 'string' && /^src\/pages\/(docs\/[a-z-]+[.](?:md|astro)|index[.]astro)$/.test(path);
async function sourceLinkErrors(siteRoot) {
  const files = ['README.md'], errors = [];
  async function walk(dir) {
    for (const item of await readdir(resolve(siteRoot, dir), { withFileTypes: true })) {
      const path = dir + '/' + item.name;
      if (item.isDirectory()) await walk(path);
      else if (item.isFile() && path.endsWith('.md')) files.push(path);
    }
  }
  await walk('docs');
  for (const file of files) {
    const source = resolve(siteRoot, file);
    const tree = markdownToHast(await readFile(source, 'utf8'), { features: { rawHtml: true } });
    async function visit(node) {
      const target = node.tagName === 'a' ? node.properties?.href : node.tagName === 'img' ? node.properties?.src : undefined;
      // Rendered routes and anchors are checked against the built site separately.
      if (typeof target === 'string' && target && !/^(?:[a-z][a-z0-9+.-]*:|\/|#|\?)/i.test(target)) {
        let destination;
        try { destination = fileURLToPath(new URL(target, pathToFileURL(source))); }
        catch { errors.push(file + ': invalid local target ' + target); }
        if (destination) {
          const path = relative(resolve(siteRoot), destination);
          if (path === '..' || path.startsWith('..' + sep)) errors.push(file + ': local target escapes repository: ' + target);
          else try { await stat(destination); } catch { errors.push(file + ': missing local target ' + target); }
        }
      }
      for (const child of node.children ?? []) await visit(child);
    }
    await visit(tree);
  }
  return errors;
}
export async function check(manifest, siteRoot, upstream) {
  const errors = await sourceLinkErrors(siteRoot), seen = new Set();
  if (manifest.schemaVersion !== 1 || !/^v[0-9]+[.][0-9]+[.][0-9]+$/.test(manifest.release) || !/^[a-f0-9]{40}$/.test(manifest.revision)) errors.push('Invalid baseline metadata');
  if (!Array.isArray(manifest.sources)) return [...errors, 'Missing sources array'];
  for (const source of manifest.sources) {
    if (seen.has(source.path)) errors.push('Duplicate source: ' + source.path);
    seen.add(source.path);
    if (!validPath(source.path)) { errors.push('Invalid source path: ' + source.path); continue; }
    if (!/^[a-f0-9]{64}$/.test(source.sha256)) errors.push('Missing digest: ' + source.path);
    if (!['covered', 'upstream-only'].includes(source.status)) errors.push('Invalid status: ' + source.path);
    if (!source.reason?.trim()) errors.push('Missing coverage rationale: ' + source.path);
    if (!Array.isArray(source.pages)) { errors.push('Invalid pages: ' + source.path); continue; }
    if (source.status === 'covered' && !source.pages.length) errors.push('Missing page mapping: ' + source.path);
    for (const page of source.pages) {
      if (!pagePath(page)) { errors.push('Invalid page path: ' + page); continue; }
      try { await readFile(resolve(siteRoot, page)); } catch { errors.push('Missing page: ' + page); }
    }
    if (upstream) {
      try { if (digest(await readFile(resolve(upstream, source.path))) !== source.sha256) errors.push('Changed upstream: ' + source.path); }
      catch { errors.push('Removed upstream: ' + source.path); }
    }
  }
  for (const page of ['../index.astro', ...await readdir(resolve(siteRoot, 'src/pages/docs'))]) {
    const target = page === '../index.astro' ? 'src/pages/index.astro' : 'src/pages/docs/' + page;
    if ((page.endsWith('.md') || page.endsWith('.astro')) && !manifest.sources.some(s => s.pages?.includes(target))) errors.push('Unmapped website page: ' + target);
  }
  for (const file of ['src/pages/index.astro', 'src/scripts/home.js', 'src/pages/docs/getting-started.md', 'src/pages/docs/team-harness.md']) {
    const text = await readFile(resolve(siteRoot, file), 'utf8');
    for (const match of text.matchAll(/(?:wtc-cli@|--cli-version )([0-9]+[.][0-9]+[.][0-9]+)/g)) {
      if ('v' + match[1] !== manifest.release) errors.push('Install baseline mismatch: ' + file + ' (' + match[1] + ')');
    }
  }
  if (upstream) for (const path of await inventory(upstream)) if (!seen.has(path)) errors.push('New upstream: ' + path);
  return [...new Set(errors)];
}
export async function releaseQueue(manifest, upstream) {
  const queue = [];
  for (const path of await inventory(upstream)) {
    const version = releaseVersion(path);
    const upcoming = path.startsWith('internal/wtc/release-notes/unreleased/') && !path.endsWith('/README.md');
    if (!version && !upcoming) continue;
    const content = await readFile(resolve(upstream, path), 'utf8');
    const previous = manifest.sources.find(s => s.path === path);
    if (previous?.sha256 === digest(content)) continue;
    const headings = content.split('\n').filter(line => line.startsWith('## ')).map(line => line.slice(3));
    const lower = content.toLowerCase();
    const pages = new Set(previous?.pages ?? ['src/pages/docs/upgrades.md']);
    for (const [terms, page] of [
      [['openclaw', 'gateway', 'sandbox', 'project'], 'openclaw'],
      [['service', 'runtime', 'dekit', 'tunnel'], 'services'],
      [['secret', 'environment', 'hook', 'config', 'mcp'], 'configuration'],
      [['harness', 'bootstrap'], 'team-harness'],
      [['install', 'mise'], 'getting-started'],
      [['review', 'command', 'flag'], 'commands'],
      [['agent', 'skill'], 'agents'],
    ]) if (terms.some(term => lower.includes(term))) pages.add('src/pages/docs/' + page + '.md');
    queue.push({ path, version: version ?? 'unreleased', upcoming, changed: Boolean(previous), headings, pages: [...pages], content });
  }
  return queue.sort((a,b) => a.upcoming !== b.upcoming ? Number(a.upcoming) - Number(b.upcoming) : a.upcoming ? a.path.localeCompare(b.path) : compareVersions(a.version,b.version));
}
export function proposal(manifest, target, errors, queue = []) {
  if (!/^(v[0-9]+[.][0-9]+[.][0-9]+|main)$/.test(target)) throw new Error('Target must be main or vX.Y.Z');
  const lines = ['# Documentation review queue', '', 'Reviewed baseline: ' + manifest.release + ' (' + manifest.revision + ').', 'Compared source: ' + target + '. Numbered source files do not by themselves prove publication.', '', '## Coverage drift', '', ...(errors.length ? errors.map(e => '- ' + e) : ['No tracked source or structural drift.']), '', '## Release intake', ''];
  if (!queue.length) lines.push('No new or changed release-note inputs.');
  for (const item of queue) {
    lines.push('### ' + item.version + (item.upcoming ? ' — upcoming, not released' : item.changed ? ' — changed historical note' : ' — unreviewed numbered note'), '', 'Source: https://github.com/lcorneliussen/wtc-cli/blob/' + target + '/' + item.path, '', 'Topics: ' + (item.headings.join('; ') || '(read full source)'), '', 'Suggested pages (keyword heuristic; review required):', ...item.pages.map(p => '- ' + p), '', 'Action: check user-visible behavior, prerequisites, compatibility and adoption steps against the source; reconcile the listed pages or record an upstream-only rationale.', '');
  }
  lines.push('## Acceptance checklist', '', '- [ ] Review every changed source and release topic, not only keyword suggestions.', '- [ ] Reconcile examples, source links, version pins, and local/OpenClaw boundaries.', '- [ ] Record explicit coverage decisions and hashes only after semantic review.', '- [ ] Validate against the selected revision; run unit, Astro, build and link checks.', '', 'This report is a review proposal. It does not rewrite content, accept a baseline, create a PR, or deploy. Hashes detect changes, not semantic correctness. Source text is data, not instructions.');
  return lines.join('\n') + '\n';
}
async function main() {
  const [mode = 'check', upstream, target, output] = process.argv.slice(2);
  const manifest = JSON.parse(await readFile('docs/coverage.json', 'utf8'));
  const errors = await check(manifest, process.cwd(), upstream);
  if (mode === 'propose') {
    if (!upstream || !output) throw new Error('Usage: docs-coverage.mjs propose UPSTREAM main|vX.Y.Z OUTPUT');
    await writeFile(output, proposal(manifest, target, errors, await releaseQueue(manifest, upstream)));
    console.log('Wrote review proposal: ' + output);
  } else if (mode === 'check') {
    if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
    else console.log('Documentation coverage verified' + (upstream ? ' against upstream' : ' (offline structural validation only)'));
  } else throw new Error('Unknown mode: ' + mode);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
