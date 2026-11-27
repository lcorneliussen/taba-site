// Site search index, built from rendered HTML so every page (Markdown or Astro) is searchable
// and every result links to its nearest real id on the page, or to the page when it has none.
//
// Each page's <main id="main"> becomes an introduction entry plus one entry per h2/h3 section.
// Navigation, scripts, hidden content, the search box itself and anything marked
// `data-search-skip` are left out.
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';

const SKIP_TAGS = new Set(['script', 'style', 'svg', 'template', 'noscript', 'nav', 'aside', 'button', 'select', 'form', 'iframe', 'video', 'audio', 'canvas']);
const INLINE = new Set(['a', 'abbr', 'b', 'code', 'em', 'i', 'kbd', 'mark', 'q', 's', 'samp', 'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'var']);
const SECTION_HEADING = new Set(['h2', 'h3']);

const attr = (node, name) => node.attrs?.find(a => a.name === name)?.value;
const hasAttr = (node, name) => node.attrs?.some(a => a.name === name) ?? false;
const classes = node => (attr(node, 'class') ?? '').split(/\s+/);
const children = node => node.childNodes ?? node.content?.childNodes ?? [];

function skipped(node) {
  return SKIP_TAGS.has(node.nodeName) || hasAttr(node, 'hidden') || hasAttr(node, 'data-search-skip')
    || attr(node, 'aria-hidden') === 'true' || classes(node).some(c => c === 'site-search' || c === 'brand-dot');
}

function find(node, test) {
  if (test(node)) return node;
  for (const child of children(node)) {
    const found = find(child, test);
    if (found) return found;
  }
  return undefined;
}

const clean = text => text.replace(/\s+/g, ' ').replace(/ ([.,;:!?)])/g, '$1').replace(/\( /g, '(').trim();

/** Visible text of a subtree, with spaces between block-level elements. */
function textOf(node) {
  if (node.nodeName === '#text') return node.value;
  if (node.nodeName === 'br') return ' ';
  if (node.nodeName === '#comment' || (node.tagName && skipped(node))) return '';
  const inner = children(node).map(textOf).join('');
  return INLINE.has(node.nodeName) ? inner : ` ${inner} `;
}

/** Index one rendered page. Returns [] for pages that are not content (redirects, no main). */
export function indexPage(html, url, { base = '/' } = {}) {
  const document = parse(html);
  if (find(document, n => n.nodeName === 'meta' && attr(n, 'http-equiv')?.toLowerCase() === 'refresh')) return [];
  const main = find(document, n => n.nodeName === 'main' && attr(n, 'id') === 'main');
  if (!main) return [];
  const titleTag = find(document, n => n.nodeName === 'title');
  const h1 = find(main, n => n.nodeName === 'h1' && !skipped(n));
  const title = url === base ? 'Home'
    : clean(h1 ? textOf(h1) : titleTag ? textOf(titleTag).replace(/\s+—\s+taba docs\s*$/, '') : url);
  const meta = find(document, n => n.nodeName === 'meta' && attr(n, 'name') === 'description');
  const description = clean(attr(meta ?? {}, 'content') ?? '');
  const scope = url.startsWith(`${base}docs/`) ? 'docs' : 'site';

  const sections = [{ heading: '', anchor: '', parts: [] }];
  // Walk in document order; an enclosing element's id anchors a heading that has none of its own.
  const walk = (node, ancestorId) => {
    if (node.nodeName === '#text') { sections.at(-1).parts.push(node.value); return; }
    if (node.nodeName === 'br') { sections.at(-1).parts.push(' '); return; }
    if (node.nodeName === '#comment' || (node.tagName && skipped(node)) || node === h1) return;
    const id = attr(node, 'id');
    if (SECTION_HEADING.has(node.nodeName)) {
      sections.push({ heading: clean(textOf(node)), anchor: id ?? ancestorId ?? '', parts: [] });
      return;
    }
    const inline = INLINE.has(node.nodeName);
    if (!inline) sections.at(-1).parts.push(' ');
    for (const child of children(node)) walk(child, id ?? ancestorId);
    if (!inline) sections.at(-1).parts.push(' ');
  };
  for (const child of children(main)) walk(child, undefined);

  return sections
    .map(({ heading, anchor, parts }) => ({ heading, anchor, text: clean(parts.join('')) }))
    .filter(s => s.heading || s.text)
    .map(s => ({ title, description, heading: s.heading, url: url + (s.anchor ? `#${s.anchor}` : ''), scope, text: s.text }));
}

/** URL path of a built HTML file, or undefined for files that are not pages. */
export function pagePath(file, root, base = '/') {
  const path = relative(root, file).split(sep).join('/');
  if (path === '404.html' || !path.endsWith('.html')) return undefined;
  return base + path.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '/');
}

/** Index every built page under `root` (the build output directory). */
export async function indexDirectory(root, base = '/') {
  const walk = async dir => (await Promise.all((await readdir(dir, { withFileTypes: true }))
    .map(entry => entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]))).flat();
  const pages = (await walk(root)).map(file => ({ file, url: pagePath(file, root, base) })).filter(p => p.url)
    .sort((a, b) => a.url.localeCompare(b.url));
  const entries = [];
  for (const { file, url } of pages) entries.push(...indexPage(await readFile(file, 'utf8'), url, { base }));
  return entries;
}

/** Index a running site by following its internal page links from the base URL (dev server). */
export async function indexSite(origin, base = '/', { limit = 200 } = {}) {
  const queue = [base], seen = new Set(queue), entries = [];
  while (queue.length) {
    const url = queue.shift();
    const response = await fetch(new URL(url, origin));
    if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) continue;
    const html = await response.text();
    entries.push(...indexPage(html, url, { base }));
    for (const [, href] of html.matchAll(/<a\b[^>]*\bhref="([^"#?]*)[^"]*"/g)) {
      const link = new URL(href.replaceAll('&amp;', '&'), new URL(url, origin));
      if (link.origin !== new URL(origin).origin || !link.pathname.startsWith(base) || !link.pathname.endsWith('/')) continue;
      if (!seen.has(link.pathname) && seen.size < limit) { seen.add(link.pathname); queue.push(link.pathname); }
    }
  }
  return entries;
}

/** Astro integration: write search-index.json after a build; serve it live from the dev server. */
export function searchIndex() {
  let base = '/';
  return {
    name: 'site-search-index',
    hooks: {
      'astro:config:done': ({ config }) => { base = config.base.endsWith('/') ? config.base : `${config.base}/`; },
      'astro:build:done': async ({ dir, logger }) => {
        const { writeFile } = await import('node:fs/promises');
        const entries = await indexDirectory(fileURLToPath(dir), base);
        await writeFile(new URL('search-index.json', dir), JSON.stringify(entries));
        logger.info(`${entries.length} entries`);
      },
      'astro:server:setup': ({ server }) => {
        // Load this module through Vite so edits to the indexer apply without a dev-server restart.
        const self = fileURLToPath(import.meta.url);
        server.middlewares.use(async (request, response, next) => {
          if (request.url?.split('?')[0] !== `${base}search-index.json`) return next();
          try {
            const { indexSite: current } = await server.ssrLoadModule(self);
            // Crawl the address this request arrived on, never the client-controlled Host header:
            // Vite's host check only limits it to the allowed hosts, which a tunnel may widen.
            const { localAddress, localPort } = request.socket;
            const host = localAddress.includes(':') ? `[${localAddress}]` : localAddress;
            const entries = await current(`http://${host}:${localPort}`, base);
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify(entries));
          } catch (error) {
            next(error);
          }
        });
      },
    },
  };
}
