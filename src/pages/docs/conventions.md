---
layout: ../../layouts/Docs.astro
title: Rename conventions
description: Every wtc name a project may still use, its taba name, what 0.2.x supports, and how to migrate.
source: https://github.com/lcorneliussen/taba/blob/main/docs/conventions.md
---

Migrate old wtc names to taba across harness and collection files, user directories, skill names, environment variables, and scripts calling `wtc`. Future taba releases drop wtc names: 0.2.x still supports them, then later releases are planned to stop with upgrade instructions and finally ignore them ([the stages of the rename](../../wtc-is-now-taba/#the-timeline)).

> **Requires taba 0.2.4 or later** for `taba-*` skills ([#351](https://github.com/lcorneliussen/taba/issues/351)) and these checks ([#375](https://github.com/lcorneliussen/taba/issues/375)). On 0.2.0 to 0.2.3, `taba doctor` does not report conventions, `harness init` and `skills render` still write old names, and a harness skill override renamed to `taba-<name>` stops applying.

## Check a project

```sh
taba doctor            # this collection, its harness, and your user directories
taba doctor --all      # every collection in the workspace; also from the workspace root
taba conventions       # this list, from the installed release
```

In 0.2.4 to 0.2.6, `taba doctor` checks the harness, the collection, and your user directories, and counts old names in each harness file. It prints each matching convention once with its migration step and locations: *migrate* means move it now; *waiting* means no taba name exists yet ("Old name only" below) or taba moves it itself. Findings never fail `doctor` in 0.2.x, and `--json` returns the same findings.

**Not released yet** ([taba#397](https://github.com/lcorneliussen/taba/pull/397), in review): checking tracked repository docs, scripts, configuration, and CI (excluding source code, changelogs, and release notes), line numbers per file, and *review* for files that only mention wtc in prose (where a sentence explaining the rename can stay). Until then, check repository files by hand.

## Migrate

Ask an agent in one of your collections:

> Run `taba doctor --all` and finish the migration to taba. Follow the step `doctor` gives for each finding, in the order below, and open a harness PR for the harness changes.

Work through the changes in this order:

1. **Upgrade the harness to 0.2.4 or later** and roll it out so every collection's pinned CLI reads both names.
2. **Harness files:** rename `wtc.toml` and `.wtc-cli-version` together, plus `wtc-*` skill folders and their base digests, in one harness change. Review, commit, merge, and roll it out.
3. **Harness references:** replace `WTC_*` with `TABA_*`, `wtc` with `taba`, and old skill names such as `/wtc-start` in hooks, scripts, skills, and instructions.
4. **Each collection:** rename `WTC-SCOPE.md` and update `.env.collection.local`.
5. **Your machine:** rename `wtc.env` in the control root and the user directories once no wtc 0.1.x client uses them.
6. Run `taba doctor --all` until only *waiting* items remain, then check repository files by hand.

## The conventions

These tables mirror the CLI; run `taba conventions` for your installed release. The "In 0.2.x" column shows what 0.2.x reads:
- *Both names; the old one wins if both exist:* taba reads either name but never combines them. Keep only one.
- *Both names; the new one wins:* environment variables; generated files set both prefixes.
- *Old name only:* no taba name yet (`taba doctor` reports *waiting*).
- *New name written:* taba already writes the new name.
- *Both ship:* both commands are installed and do the same.

### Harness

| Old | New | In 0.2.x | Written by | `doctor` | Migrate |
|---|---|---|---|---|---|
| `wtc.toml` | `taba.toml` | Both names; the old one wins if both exist | you | yes | `git mv wtc.toml taba.toml` in the harness, then commit and merge. `taba harness init` already writes `taba.toml`. |
| `.wtc-cli-version` | `.taba-version` | Both names; the old one wins if both exist | you | yes | `git mv .wtc-cli-version .taba-version` with `taba.toml`. A harness with only `.taba-version` seeds new collections with `SCOPE.md`. |
| `overlays/skills/<name>/.wtc-base.sha256` | `.taba-base.sha256` | Both names; the old one wins if both exist | you | yes | `git mv` each digest file to `.taba-base.sha256` in the same folder. |
| `skills/wtc-<name>`, `overlays/skills/wtc-<name>` | `taba-<name>` | Both names; the old one wins if both exist | you | yes | Rename each folder to `taba-<name>` and update its `name:`; section patches and base digest move with it. Until then, the old override wins and `taba-<name>` points to it. |
| `hooks/wtc/` | `hooks/taba/` (planned) | Old name only | you | yes | No new name yet (#375). Keep `hooks/wtc/`. |
| `overlays/browse/wtc-browse.lua` | `taba-browse.lua` (planned) | Old name only | you | yes | No new name yet (#375). Keep the old file name. |
| `WTC_*` variables, `wtc …` commands and `wtc-*` skill names in harness files | `TABA_*`, `taba …` and `taba-*` | Variables: both, the new one wins. Commands: both ship. Skill names: the old ones are shims | you | yes | Replace `WTC_X` with `TABA_X`, `wtc` with `taba`, and old skill names such as `/wtc-start` with `/taba-start` in hooks, scripts, skills, and instructions. Other wtc mentions (such as "a wtc collection" or a `wtc-cli` link) usually become taba too; a sentence explaining the rename can stay. Generated environments set both prefixes and ship both commands in 0.2.x. No `TABA_` form yet for: `WTC_GATEWAY_GIT`, `WTC_RETIRE_*`, `WTC_REVIEW_STATS_FILE`, `WTC_AGENT_ENV`, and `WTC_DEV_*` (except `WTC_DEV_BUILD`). |

### Collection

| Old | New | In 0.2.x | Written by | `doctor` | Migrate |
|---|---|---|---|---|---|
| `WTC-SCOPE.md` | `SCOPE.md` | Both names; the old one wins if both exist | you | yes | `mv WTC-SCOPE.md SCOPE.md` at the collection root (local file, nothing to commit). Update anything in the harness that still reads `WTC-SCOPE.md`. |
| `WTC_*` in `.env.collection.local` | `TABA_*` | Both names; the new one wins | you | yes | Rename the variables in `.env.collection.local`. |
| `github:lcorneliussen/wtc-cli` in mise configuration | `github:lcorneliussen/taba` | New name written | you | yes | Run `taba env setup` to regenerate `mise.toml`. In `taba.toml` `[mise.tools]`, rename the key by hand. |
| `.wtc/`, `.wtc-prs`, `.wtc-status.*`, `.wtc-catch-up.*`, `.wtc-reviews/`, `.wtc-review-posted/`, `.wtc-status-watchers/`, `.wtc-review-mode`, `.wtc-dev-mode.json`, `.last-wtc-status.yml` | `.taba…` spellings | Both names; the old one wins if both exist | taba | yes | Nothing to do: taba still writes these names and moves them itself once writes follow the harness (#375). |
| rendered `wtc-*` skills in `.claude/skills` and `.agents/skills` | `taba-*` | New name written | taba | no | Nothing to do: `taba skills render` writes `taba-*` and keeps short `wtc-*` shims pointing to them. |

### User and control root

| Old | New | In 0.2.x | Written by | `doctor` | Migrate |
|---|---|---|---|---|---|
| `$WTC_CONFIG_ROOT/wtc.env` | `taba.env` | Both names; the old one wins if both exist | you | yes | `mv wtc.env taba.env` in the control root. Every 0.2.x release reads it. |
| `$XDG_CONFIG_HOME/wtc` | `$XDG_CONFIG_HOME/taba` | Both names; the old one wins if both exist | you | yes | `mv ~/.config/wtc ~/.config/taba` (or under `$XDG_CONFIG_HOME`) once no wtc 0.1.x client uses it. |
| `$XDG_DATA_HOME/wtc` | `$XDG_DATA_HOME/taba` | Both names; the old one wins if both exist | you | yes | `mv ~/.local/share/wtc ~/.local/share/taba` (or under `$XDG_DATA_HOME`) once no wtc 0.1.x client uses it. |

### Repositories

| Old | New | In 0.2.x | Written by | `doctor` | Migrate |
|---|---|---|---|---|---|
| `WTC_*` variables, `wtc …` commands, `wtc-*` skill names and other mentions of wtc in a repository's docs, scripts, configuration and CI | `TABA_*`, `taba …`, `taba-*` and taba | Variables: both, the new one wins. Commands: both ship. Skill names: the old ones are shims | you | not released ([taba#397](https://github.com/lcorneliussen/taba/pull/397)) | Replace them by hand (keep sentences explaining the rename) and merge through normal review. Released `doctor` (0.2.4 to 0.2.6) skips repository files; see Check a project above for [taba#397](https://github.com/lcorneliussen/taba/pull/397). |
| `x-wtc` in `.harness/dekit.tasks.yaml` | `x-taba` (planned) | Old name only | you | yes | No new name yet (#375). Keep `x-wtc`. |

### Command

| Old | New | In 0.2.x | Written by | `doctor` | Migrate |
|---|---|---|---|---|---|
| `wtc` command | `taba` | Both ship | taba | no | Call `taba` in scripts; the harness-references check covers harness files. |

### OpenClaw

| Old | New | In 0.2.x | Written by | `doctor` | Migrate |
|---|---|---|---|---|---|
| plugin id `wtc`, package `openclaw-plugin-wtc`, config `plugins.entries.wtc`, gateway state under `wtc/` | `taba` | Old name only | taba | no | Nothing to do yet; `taba doctor --openclaw` will move the gateway config when the plugin is renamed (#375). |

### Internal names

| Old | New | In 0.2.x | Written by | `doctor` | Migrate |
|---|---|---|---|---|---|
| git refs `refs/wtc-catch-up/…`, `wtc-pr-<n>` remotes, review markers `wtc-review v1`, locks `.wtc-runtime.lock`, `.wtc-status-watchers.lock`, `.wtc-prs.lock`, MCP and generated-file markers, temporary files | taba spellings | Old name only | taba | no | Nothing to do: taba reads and moves these itself. Locks keep their names while any supported client uses them. |
