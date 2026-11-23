// Builds the site search index at build time from the Markdown pages.
// Each titled page with a URL contributes its non-empty introduction and one entry per h2/h3 section,
// so results can deep-link.

const SECTION = /^(#{2,3})\s+(.+?)\s*#*\s*$/;
const FENCE = /^\s*(```|~~~)/;

// Fenced blocks (closed by the same marker) and inline code spans.
const CODE = /^[ \t]*(```|~~~)[^\n]*\n([\s\S]*?)^[ \t]*\1[^\n]*$|`([^`\n]+)`/gm;

/**
 * Reduce Markdown to searchable plain text. Code stays verbatim, because commands and
 * identifiers such as `TABA_CONFIG_ROOT` or `taba-*` are worth finding as written; in prose,
 * `*` and `_` are removed only where they delimit emphasis, so `allow_external` survives.
 */
export function plainText(markdown) {
  const code = [];
  const prose = markdown
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(CODE, (_, _fence, block, span) => `\uE000${code.push(block ?? span) - 1}\uE001`)
    .replace(/^\s*(```|~~~).*$/gm, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^\s*\|?\s*:?-{3,}.*$/gm, ' ')
    .replace(/(^|[^\p{L}\p{N}])[*_]+(?=\S)/gmu, '$1')
    .replace(/(?<=\S)[*_]+(?=$|[^\p{L}\p{N}])/gmu, '')
    .replace(/[|>#]+/g, ' ')
    .replace(/&[a-z]+;/g, ' ');
  return prose
    .replace(/\uE000(\d+)\uE001/g, (_, i) => ` ${code[i]} `)
    .replace(/\s+/g, ' ')
    .replace(/ ([.,;:!?)])/g, '$1')
    .replace(/\( /g, '(')
    .trim();
}

/** Compare heading text across Markdown source and rendered output (quotes, dashes, code). */
const comparable = text => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

/**
 * Split raw Markdown into sections, ignoring heading-like lines inside fences.
 * Source headings are paired with Astro's rendered headings in order; any
 * disagreement fails the build rather than deep-linking a result to the wrong section.
 */
export function splitSections(raw, headings, page = 'page') {
  const anchors = headings.filter(h => h.depth === 2 || h.depth === 3);
  const sections = [{ heading: '', anchor: '', lines: [] }];
  let fenced = false;
  let next = 0;
  for (const line of raw.split('\n')) {
    if (FENCE.test(line)) fenced = !fenced;
    const match = !fenced && line.match(SECTION);
    if (match) {
      const anchor = anchors[next++];
      if (!anchor || anchor.depth !== match[1].length || comparable(anchor.text) !== comparable(plainText(match[2]))) {
        throw new Error(`${page}: search heading "${match[2]}" does not match rendered heading "${anchor?.text ?? '(none)'}"`);
      }
      sections.push({ heading: anchor.text, anchor: anchor.slug, lines: [] });
    } else {
      sections.at(-1).lines.push(line);
    }
  }
  if (next !== anchors.length) throw new Error(`${page}: ${anchors.length - next} rendered heading(s) missing from the search index`);
  return sections
    .map(({ heading, anchor, lines }) => ({ heading, anchor, text: plainText(lines.join('\n')) }))
    .filter(s => s.heading || s.text);
}

/** @param {Record<string, any>} modules eager import.meta.glob of Markdown pages */
export function buildIndex(modules, extra = []) {
  const entries = [];
  for (const mod of Object.values(modules)) {
    const { frontmatter, url } = mod;
    if (!url || !frontmatter?.title) continue;
    const page = { title: frontmatter.title, description: frontmatter.description ?? '' };
    for (const section of splitSections(mod.rawContent(), mod.getHeadings(), url)) {
      entries.push({
        ...page,
        heading: section.heading,
        url: `${url}/`.replace(/\/+$/, '/') + (section.anchor ? `#${section.anchor}` : ''),
        text: section.text,
      });
    }
  }
  return [...entries, ...extra];
}
