# taba-site

The Astro website for **taba** (formerly wtc) and the getting-started handbook for [Worktree Collections](https://github.com/lcorneliussen/taba).

## Develop

Node.js 22.12+ is required; CI uses Node 24. Install development dependencies even if your environment sets `NODE_ENV=production`:

```sh
npm ci --include=dev
npm run dev
```

Open `http://localhost:4321/`. Astro 7 can auto-background the dev server in agent environments. For a foreground process supervisor, use:

```sh
npm run dev -- --ignore-lock --port 4321
```

Choose a free, collection-specific port when running multiple workspaces. In a WTC-managed collection with the dekit runtime enabled, the shared `.harness/dekit.tasks.yaml` defines the documentation preview. After installing dependencies, run from the collection root:

```sh
wtc svc up wtc-site/web
wtc svc logs wtc-site/web
wtc svc down wtc-site/web
```

The service runs Astro in the foreground on the collection's allocated `WTC_SITE_PORT`, with live reload and an HTTP readiness check. `wtc svc` shows its local URL. Optional tunnels belong in collection-local configuration; add one with `wtc svc tunnel wtc-site/web <provider>`.

## Verify

```sh
npm run check
npm run build
npm run test:links
npm run preview
```

The link check validates every generated HTML page’s internal links, fragments, assets, and GitHub Pages base path, and that every search result points at a generated page and an existing anchor id on it. It does not check external website availability. The interactive homepage also needs browser checks for collection switching, quick-start selection, clipboard behavior, and narrow viewports.

## Content and layout

- `src/pages/index.astro`: homepage and interactive collection example.
- `src/pages/docs/*.md`: handbook pages, with title, description, and upstream source in frontmatter.
- `src/layouts/Docs.astro` and `src/components/DocsNav.astro`: documentation shell and navigation.
- `src/styles/global.css`: shared responsive design and reduced-motion support.
- `src/scripts/home.js`: collection example and quick-start controls.
- `src/lib/search-index.mjs` and `src/components/SiteSearch.astro`: site search. An Astro integration indexes the rendered HTML of every page (`<main id="main">`, one entry per h2/h3 section, each linked to its nearest real id or to the page) into `search-index.json` after each build, and serves the same index live from the dev server. Navigation, scripts, hidden content and anything marked `data-search-skip` (such as the status terminal frames) are left out; redirect pages and 404 are skipped. Docs pages search the docs by default from the sidebar, with a switch to the whole site; every other page has a site-wide search box in the header. `npm run test:search` covers the indexer; with a preview running, `npm run test:search:browser -- http://127.0.0.1:<port>/` checks both placements and scopes, phone width, keyboard, ARIA, no-JS, index failure and anchor landing.

Local-terminal examples follow the upstream CLI getting-started guide and explicitly pin v0.1.51. OpenClaw guidance is separately labeled for the gateway-integrated build; it must not suggest `wtc init` or `wtc new` on a gateway. Reconcile both with their upstream instructions when updating commands.

## Reading status

The interactive [Reading status](src/pages/docs/status.astro) guide uses complete
synthetic snapshots rendered by the CLI, with separate explanations of Git, PR,
review, build and runtime observations. Its examples identify their published
CLI source; they do not upgrade the other release-pinned handbook pages.

Maintenance selects **only the group whose recorded source revision exactly matches
CLI HEAD**. Current groups are v0.2.6 (13 situations, 39 frames) and v0.2.7
(freshness and closed/declined PRs, six frames). Use clean checkouts at those tags
and the existing verified release-evidence inputs (archive, binary and exported
plugin paths/hashes consumed by the recorder):

```sh
for version in 0.2.6 0.2.7; do
  npm run status:capture -- "/path/to/cli-v${version}" src/data/status-frames.json \
    "/path/to/v${version}-release-evidence.json"
  npm run status:verify-native -- --cli-root "/path/to/cli-v${version}" \
    --out "/path/outside-both-repos/native-v${version}" --chrome /path/to/chrome
done
```

Capture preserves other groups' frames and provenance; it does not accept a new
revision or update source, release, parser or fixture fingerprints implicitly.
Unknown revisions, missing or inconsistent provenance, dirty/changed source,
changed group inputs and mismatched release evidence fail. Both commands use the
existing recording-only Go adapter at 100, 60 and 39 columns; neither runs a
collector, action or agent handoff. Temporary binaries stay outside the sources.

The native verifier requires Go, Node, Chrome and the capture tool's existing
Python dependencies (`pyte==0.8.2`, `wcwidth==0.9.4`). Each output directory must be
empty and outside both repositories. Tool bytes are checked against the selected
source revision; an inspected export can use `--capture-tool` and a full
`--tool-revision`. Visible PR associations, hidden archived-row absence, native
text, decoded styles and stable source fingerprints must all pass. Evidence stays
outside Git. These are real renderer outputs with synthetic inputs, not live
collector/provider tests or an interaction-geometry certificate; terminal fonts
can differ.

`npm run test:status` checks every group's fixture/parser/release metadata,
visibility and malformed-input invariants, and builds the actual explorer in an
isolated fixture to assert each rendered source label/link. CI needs no CLI
checkout. For keyboard navigation, deep links, all width choices, mobile layout
and no-JavaScript fallback against an already supervised preview:

```sh
npm run test:status:browser -- "http://127.0.0.1:${WTC_SITE_PORT}/"
```

An optional ignored `public/status-evidence` symlink exposes inspected local
captures in development. Its source is labeled; earlier evidence is not claimed
to match a newer replay. Preserve existing evidence and use a clean Git export
or CI checkout for production builds, which excludes ignored local galleries
without disturbing a running preview. The production link check rejects local
gallery assets and filesystem paths. Normal site build/CI needs no CLI checkout
or capture tool.

## Documentation coverage and release intake

Validate the handbook baseline or prepare an upstream intake report:

```sh
npm run test:coverage
npm run check:coverage
npm run check:coverage -- /path/to/reviewed-cli-checkout
npm run docs:propose -- /path/to/current-cli-checkout main /tmp/docs-review.md
```

The read-only documentation workflow checks the pinned baseline on PRs and prepares a weekly/manual upstream review report. It does not rewrite pages or deploy. Source digests detect change; semantic review remains required.

## GitHub Pages

Production target: **https://taba.sh/**. Astro uses that canonical origin and `/` base. Shared links use `import.meta.env.BASE_URL`. Old `wtc.sh` links redirect with their paths preserved.

PRs check and build without deploying. Pushes to `main` and manual runs on `main` deploy the static artifact. Enable Pages with **GitHub Actions** as its source first.

See [the launch checklist](docs/launch.md) for domain verification, DNS, HTTPS, smoke tests, and rollback. An Actions deployment ignores CNAME files: configure the domain in repository Settings → Pages. Local checks do not configure GitHub or DNS.

## OpenClaw screenshots and recordings

See [the plugin coverage audit and media workflow](docs/openclaw-coverage.md).
Capture the actual upstream plugin renderer using synthetic data, without a
running gateway, forge account or server:

```sh
npm ci --include=dev
npx playwright install chromium
npm run demos:openclaw -- /absolute/path/to/wtc-cli
```

Pass a second argument for a separate output directory. Review the PNGs, WebM,
and provenance before committing them. The manual **OpenClaw demo capture**
workflow produces review artifacts only; it never updates or deploys the site.

For raw push/refresh and catch-up recordings, including chat and sidebar views, see the
[interaction recording guide](docs/recording-openclaw-interactions.md):

```sh
npm run demos:openclaw:interactions -- /absolute/path/to/wtc-cli
```

Open `artifacts/openclaw-interactions/index.html` to watch the clips. These use
the actual renderer with simulated gateway responses, not a live account. The guide
also covers collapsed-bar actions, separate alignment/hierarchy guides and a
paired native TUI replay with lossless text and terminal casts. Run the focused
diagnostic tests with `npm run test:visual`.
