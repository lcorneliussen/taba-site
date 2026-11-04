import test from 'node:test';
import assert from 'node:assert/strict';
import { publishedRelease } from '../src/data/release.mjs';
import { protectCode } from '../src/lib/protect-code.mjs';
const response = (overrides = {}) => async () => ({ ok: true, json: async () => ({
  draft: false, prerelease: false, tag_name: 'v0.2.3',
  html_url: 'https://github.com/lcorneliussen/taba/releases/tag/v0.2.3', ...overrides,
}) });

test('one published stable tag determines the command and numbered notes', async () => {
  const release = await publishedRelease(response());
  assert.equal(release.live, true);
  assert.equal(release.tag, 'v0.2.3');
  assert.equal(release.command, 'mise use -g github:lcorneliussen/taba@0.2.3');
  assert.equal(release.notes, 'https://github.com/lcorneliussen/taba/releases/tag/v0.2.3');
});

test('unavailable or untrusted release evidence uses the dated verified fallback', async () => {
  const unavailable = await publishedRelease(async () => { throw new Error('offline'); });
  assert.equal(unavailable.live, false);
  assert.equal(unavailable.checked, '2026-10-29');
  for (const fetchRelease of [
    async () => ({ ok: false }), response({ draft: true }), response({ prerelease: true }),
    response({ tag_name: 'v0.2.3-rc.1' }), response({ tag_name: 'dev' }),
    response({ html_url: 'https://example.com/notes' }),
    async () => ({ ok: true, json: async () => { throw new Error('invalid JSON'); } }),
  ]) assert.deepEqual(await publishedRelease(fetchRelease), unavailable);
});

test('code selectors and highlighted examples get the edge exclusion without changing HTML', () => {
  for (const code of [
    'tool install owner/widget@12.34.56',
    'git clone git@example.com:team/widget.git',
    '<span class="token">owner/widget@2.0.0-rc.1</span>',
    '',
  ]) {
    const html = `束 🦊 <p>contact@example.com</p><pre><CODE data-example="a > b">${code}</CODE></pre>`;
    const expected = html.replace(`>${code}</CODE>`, `><!--email_off-->${code}<!--/email_off--></CODE>`);
    assert.equal(protectCode(html), expected);
    assert.equal(protectCode(expected), expected);
  }
});

test('only real code elements are protected, not comments, scripts, styles or escaped examples', () => {
  const untouched = '<!-- <code>comment@example.com</code> --><SCRIPT>const sample = "<code>script@example.com</code>";</SCRIPT>'
    + '<style>code::before { content: "<code>style@example.com</code>"; }</style><p>&lt;code&gt;text@example.com&lt;/code&gt;</p>';
  const html = `${untouched}<code>widget@3.4.5</code><p>between</p><code>git@example.com:team/repo.git</code>`;
  assert.equal(protectCode(html), `${untouched}<code><!--email_off-->widget@3.4.5<!--/email_off--></code><p>between</p><code><!--email_off-->git@example.com:team/repo.git<!--/email_off--></code>`);
});

test('raw-text elements and quoted attribute examples remain byte-for-byte unchanged', () => {
  const html = '<div title="<x> <code>attribute@example.com</code>">Text</div>'
    + '<textarea><code>textarea@example.com</code></textarea>'
    + '<code>owner/widget@9.8.7</code>';
  assert.equal(protectCode(html), html.replace('<code>owner/widget@9.8.7</code>', '<code><!--email_off-->owner/widget@9.8.7<!--/email_off--></code>'));
});
