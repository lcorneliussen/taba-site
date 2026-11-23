# taba-site — agent instructions

This repository is public. It is the Astro site and getting-started handbook
for **taba** (formerly wtc). `README.md` covers develop, verify, layout and the
Reading status maintenance procedure; read it before touching those areas.

## Facts come from the CLI

What the site says about commands, flags, install and behaviour must match the
CLI repository's `docs/` at the version the page cites (frontmatter `source:`
or an inline release link). Read them there; do not write from memory. If the
CLI docs are wrong, fix them in the CLI repository, not only here.

Pages pinned to a release (for example v0.1.51) describe that release. Do not
silently modernise their commands; a version upgrade of a page is its own
change.

## Writing

Readers are developers deciding whether to adopt taba, or following a page step
by step. Write for them:

- **Lead with what the reader does or gets.** First sentence of a section
  answers "what is this for". Cut warm-up sentences.
- **Short, concrete, active.** One idea per sentence. Name the command, file or
  pane rather than "the tooling" or "this capability".
- **No filler or marketing.** No "seamless", "powerful", "robust", "simply",
  "just", "leverage", "unlock", "it's worth noting", "in other words". No
  triads for rhythm, no closing summaries that repeat the section.
- **Say a caveat once, where it applies.** Do not stack disclaimers ("optional",
  "not a claim about…", "does not dictate…") at the top of a page.
- **Keep release history out of task pages.** "As of v0.2.4…" belongs in
  Upgrades or release notes; a task page states current behaviour for its
  pinned version and links out.
- **Names:** the product is **taba**; `wtc` appears only as a command name or
  in historical context. Write `taba`, never "TABA" or "WTC" as a word.
- **Em dashes sparingly.** Prefer a full stop or a colon.
- **Keep the author's voice** on first-person pages (`why-taba.md`,
  announcements): tighten, but do not neutralise opinions or rewrite the story.

## When editing copy, do not change

- frontmatter keys other than `title`, `description` and `lede`;
- code blocks, command lines, file paths, URLs and version numbers;
- heading text without updating every link to its anchor (search and
  `npm run test:links` fail on mismatches);
- HTML structure, classes, ids and component props in `.astro` files.

## Verify before committing

```sh
npm ci --include=dev
npm run check && npm run build && npm run test:links && npm run test:search
```

Interactive homepage changes also need the browser checks listed in `README.md`.
