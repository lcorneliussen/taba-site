import { parseFragment } from 'parse5';

const open = '<!--email_off-->';
const close = '<!--/email_off-->';

export function protectCode(html) {
  const insertions = [];
  function visit(node) {
    const location = node.sourceCodeLocation;
    if (node.tagName === 'code' && location?.startTag && location.endTag) {
      const start = location.startTag.endOffset;
      const end = location.endTag.startOffset;
      const content = html.slice(start, end);
      if (!content.startsWith(open) || !content.endsWith(close)) {
        // Cloudflare's exclusion keeps version pins and SSH URLs literal.
        // https://developers.cloudflare.com/waf/tools/scrape-shield/email-address-obfuscation/
        insertions.push([end, close], [start, open]);
      }
      return;
    }
    for (const child of node.childNodes ?? []) visit(child);
    if (node.content) visit(node.content);
  }
  visit(parseFragment(html, { sourceCodeLocationInfo: true }));
  for (const [offset, comment] of insertions.sort((a, b) => b[0] - a[0])) {
    html = html.slice(0, offset) + comment + html.slice(offset);
  }
  return html;
}
