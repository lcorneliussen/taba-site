# wtc-site

The Astro website for **taba** (formerly wtc) and the getting-started handbook for [Worktree Collections](https://github.com/lcorneliussen/wtc-cli).

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

The link check validates every generated HTML page’s internal links, fragments, assets, and GitHub Pages base path. It does not check external website availability. The interactive homepage also needs browser checks for collection switching, quick-start selection, clipboard behavior, and narrow viewports.

## Content and layout

- `src/pages/index.astro`: homepage and interactive collection example.
- `src/pages/docs/*.md`: handbook pages, with title, description, and upstream source in frontmatter.
- `src/layouts/Docs.astro` and `src/components/DocsNav.astro`: documentation shell and navigation.
- `src/styles/global.css`: shared responsive design and reduced-motion support.
- `src/scripts/home.js`: collection example and quick-start controls.

Local-terminal examples follow the upstream CLI getting-started guide and explicitly pin v0.1.51. OpenClaw guidance is separately labeled for the gateway-integrated build; it must not suggest `wtc init` or `wtc new` on a gateway. Reconcile both with their upstream instructions when updating commands.

## Documentation coverage and release intake

The interactive [Reading status](src/pages/docs/status.astro) guide uses complete
synthetic snapshots rendered by the CLI, with separate explanations of Git, PR,
review, build and runtime observations. Its development-source boundary is
explicit; it does not upgrade the release-pinned handbook baseline.

To regenerate its selectable terminal examples from a clean CLI source checkout:

```sh
npm run status:capture -- ../wtc-cli
```

The source must include the status presentation described by the guide. The
capture records its exact revision and source digest, checks the scenario's
expected representations, and uses the existing recording-only Go adapter at
100, 60 and 39 columns. It executes no collector, action or agent handoff. Go
test binaries stay in a temporary directory; the site's text replay data is
`src/data/status-frames.json`. Inspect all situations and widths in the local
preview after regeneration. Unreleased examples stay labeled as development.

`npm run test:status` checks the committed replay against a digest of its
authored snapshot inputs, all wide expectations, and compact identity/state
invariants; CI runs it without a CLI checkout. The source digest records the
bounded renderer files, not a complete compiler-input audit. To repeat the
interaction checks against an already running supervised preview:

```sh
npm run test:status:browser -- "http://127.0.0.1:${WTC_SITE_PORT}/"
```

This checks all scenario/width choices, navigation, direct links, mobile overflow
and the no-JavaScript fallback. It starts no server or application action.

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
