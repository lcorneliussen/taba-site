import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { indexDirectory, indexPage, indexSite, pagePath } from '../src/lib/search-index.mjs';

const page = (main, head = '') => `<!doctype html><html><head><title>T — taba docs</title><meta name="description" content="About it.">${head}</head>
<body><header><nav><a href="/docs/a/">Nav link</a></nav></header><main id="main">${main}</main><footer>Footer text</footer></body></html>`;

test('a page becomes an introduction plus one entry per h2/h3, linked to heading ids', () => {
  const entries = indexPage(page(`<h1>Guide<span class="brand-dot">.</span></h1><p>Lead text.</p>
    <h2 id="first">First <code>step</code></h2><p>Body one.</p>
    <h3 id="deeper">Deeper</h3><p>Body two.</p><h4>Minor</h4><p>Still two.</p>`), '/docs/guide/');
  assert.deepEqual(entries.map(e => [e.heading, e.url, e.text]), [
    ['', '/docs/guide/', 'Lead text.'],
    ['First step', '/docs/guide/#first', 'Body one.'],
    ['Deeper', '/docs/guide/#deeper', 'Body two. Minor Still two.'],
  ]);
  assert(entries.every(e => e.title === 'Guide' && e.description === 'About it.' && e.scope === 'docs'));
});

test('headings without an id link to the nearest enclosing id, or to the page', () => {
  const entries = indexPage(page(`<section id="how"><h2>How</h2><article><h3>Card</h3><p>Card text.</p></article></section>
    <div><h2>Loose</h2><p>Loose text.</p></div>`), '/');
  assert.deepEqual(entries.map(e => [e.title, e.heading, e.url, e.scope]), [
    ['Home', 'How', '/#how', 'site'],
    ['Home', 'Card', '/#how', 'site'],
    ['Home', 'Loose', '/', 'site'],
  ]);
});

test('navigation, controls, hidden and marked content are not indexed; code and identifiers are', () => {
  const [entry] = indexPage(page(`<h1>P</h1><p>Set <code>TABA_CONFIG_ROOT</code> and allow_external; skills are <code>taba-*</code>.</p>
    <pre><code>export WTC_CONFIG_ROOT=x | grep a_b</code></pre>
    <nav>inner nav</nav><aside>aside</aside><script>var secret</script><style>.x{}</style><svg><text>svg</text></svg>
    <button>Copy</button><form><input value="v"><label>form label</label></form><select><option>opt</option></select>
    <p hidden>hidden</p><span aria-hidden="true">decor</span><div data-search-skip>terminal frame</div>
    <div class="site-search">search box</div><p>line<br>break</p>`), '/p/');
  for (const kept of ['TABA_CONFIG_ROOT', 'allow_external', 'taba-*', 'WTC_CONFIG_ROOT=x | grep a_b', 'line break']) assert(entry.text.includes(kept), `missing ${kept} in ${entry.text}`);
  for (const dropped of ['nav', 'aside', 'secret', '.x', 'svg', 'Copy', 'form label', 'opt', 'hidden', 'decor', 'terminal frame', 'search box', 'Nav link', 'Footer']) {
    assert(!entry.text.includes(dropped), `indexed ${dropped}: ${entry.text}`);
  }
});

test('redirect pages and pages without a main region are not indexed', () => {
  assert.deepEqual(indexPage(page('<h1>X</h1><p>Y</p>', '<meta http-equiv="refresh" content="0; url=/">'), '/old/'), []);
  assert.deepEqual(indexPage('<html><body><p>No main</p></body></html>', '/x/'), []);
});

test('built files map to page URLs; 404 and non-HTML files are skipped', () => {
  assert.equal(pagePath('/out/index.html', '/out'), '/');
  assert.equal(pagePath('/out/docs/a/index.html', '/out'), '/docs/a/');
  assert.equal(pagePath('/out/404.html', '/out'), undefined);
  assert.equal(pagePath('/out/search-index.json', '/out'), undefined);
});

test('a build directory is indexed page by page', async () => {
  const root = await mkdtemp(join(tmpdir(), 'search-index-'));
  try {
    await mkdir(join(root, 'docs', 'a'), { recursive: true });
    await writeFile(join(root, 'index.html'), page('<h1>Welcome</h1><p>Home text.</p>'));
    await writeFile(join(root, 'docs', 'a', 'index.html'), page('<h1>A</h1><h2 id="s">S</h2><p>Doc text.</p>'));
    await writeFile(join(root, '404.html'), page('<h1>Missing</h1>'));
    const entries = await indexDirectory(root);
    // Pages in URL order; a page whose introduction is empty contributes only its sections.
    assert.deepEqual(entries.map(e => [e.url, e.scope]), [['/', 'site'], ['/docs/a/#s', 'docs']]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('a running site is indexed by following its internal page links', async () => {
  const pages = {
    '/': page('<h1>Welcome</h1><p><a href="/docs/a/">A</a> <a href="https://example.test/">out</a> <a href="/logo.svg">logo</a> <a href="/docs/a/#s">again</a></p>'),
    '/docs/a/': page('<h1>A</h1><h2 id="s">S</h2><p>Doc text <a href="/">home</a>.</p>'),
  };
  const server = createServer((request, response) => {
    const html = pages[request.url];
    response.writeHead(html ? 200 : 404, { 'Content-Type': html ? 'text/html' : 'text/plain' });
    response.end(html ?? 'missing');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const entries = await indexSite(`http://127.0.0.1:${server.address().port}`);
    assert.deepEqual(entries.map(e => e.url), ['/', '/docs/a/#s']);
  } finally {
    server.close();
  }
});
