// Builds the site search index at build time from the Markdown pages.
// Each page becomes one entry per h2/h3 section so results can deep-link.

const SECTION = /^(#{2,3})\s+(.+?)\s*#*\s*$/;
const FENCE = /^\s*(```|~~~)/;

/** Reduce Markdown to searchable plain text. Code stays: commands are worth finding. */
export function plainText(markdown) {
  return markdown
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/^\s*(```|~~~).*$/gm, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^\s*\|?\s*:?-{3,}.*$/gm, ' ')
    .replace(/[*_`|>#]+/g, ' ')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Split raw Markdown into sections, ignoring heading-like lines inside fences. */
export function splitSections(raw, headings) {
  const anchors = headings.filter(h => h.depth === 2 || h.depth === 3);
  const sections = [{ heading: '', anchor: '', lines: [] }];
  let fenced = false;
  let next = 0;
  for (const line of raw.split('\n')) {
    if (FENCE.test(line)) fenced = !fenced;
    const match = !fenced && line.match(SECTION);
    if (match) {
      const anchor = anchors[next++];
      sections.push({ heading: plainText(match[2]), anchor: anchor?.slug ?? '', lines: [] });
    } else {
      sections.at(-1).lines.push(line);
    }
  }
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
    for (const section of splitSections(mod.rawContent(), mod.getHeadings())) {
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
