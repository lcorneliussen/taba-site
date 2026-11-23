import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIndex, plainText, splitSections } from '../src/lib/search-index.mjs';

const heading = (depth, text, slug) => ({ depth, text, slug });

test('plain text keeps link labels and code, drops Markdown syntax', () => {
  assert.equal(plainText('Run **`taba add-repo shared`** — see [the guide](../x/).'), 'Run taba add-repo shared — see the guide.');
  assert.equal(plainText('| a | b |\n|---|---|\n| c | d |'), 'a b c d');
});

test('sections pair source headings with rendered anchors, ignoring fenced lines', () => {
  const raw = 'Intro text.\n\n## First `step`\n\nBody one.\n\n```sh\n## not a heading\n```\n\n### Don\'t stop\n\nBody two.\n\n#### Deep\n\nStill two.';
  const sections = splitSections(raw, [
    heading(2, 'First step', 'first-step'),
    heading(3, 'Don’t stop', 'dont-stop'),
    heading(4, 'Deep', 'deep'),
  ]);
  assert.deepEqual(sections.map(s => [s.heading, s.anchor]), [['', ''], ['First step', 'first-step'], ['Don’t stop', 'dont-stop']]);
  assert.match(sections[1].text, /not a heading/);
  assert.match(sections[2].text, /Deep Still two/);
});

test('a heading that disagrees with the rendered page fails the build', () => {
  assert.throws(() => splitSections('## One\n\n## Two', [heading(2, 'One', 'one'), heading(2, 'Three', 'three')], 'docs/x'), /docs\/x: search heading "Two"/);
  assert.throws(() => splitSections('## One', [heading(2, 'One', 'one'), heading(2, 'Two', 'two')], 'docs/x'), /missing from the search index/);
  assert.throws(() => splitSections('### One', [heading(2, 'One', 'one')]), /does not match/);
});

test('index entries deep-link each section and skip pages without a title', () => {
  const page = (url, title, raw, headings) => ({ url, frontmatter: { title, description: 'd' }, rawContent: () => raw, getHeadings: () => headings });
  const index = buildIndex({
    a: page('/docs/a', 'A', 'Lead.\n\n## Part', [heading(2, 'Part', 'part')]),
    b: page('/docs/b', undefined, '## X', [heading(2, 'X', 'x')]),
  }, [{ title: 'Extra', description: '', heading: '', url: '/extra/', text: 'e' }]);
  assert.deepEqual(index.map(e => e.url), ['/docs/a/', '/docs/a/#part', '/extra/']);
});
