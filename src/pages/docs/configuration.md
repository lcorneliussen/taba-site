---
layout: ../../layouts/Docs.astro
title: Configuration and secrets
description: Separate tracked project settings, generated environment, and private local values.
source: https://github.com/lcorneliussen/taba/blob/v0.1.51/internal/wtc/defaults/instructions/customize.md
---

## Names in v0.2.4

In [v0.2.4](https://github.com/lcorneliussen/taba/releases/tag/v0.2.4), new harnesses use `taba.toml`, `.taba-version`, and `taba-*` skills. Old-name files and harness overrides stay supported during 0.2.x. When both file spellings exist, the old one wins; supported environment variables prefer `TABA_*`. Keep one intended file and preserve team overrides when migrating.

Run `taba doctor` for this collection or `taba doctor --all` for the workspace (including from its root). Findings state whether each item can migrate now or must wait, without failing doctor during 0.2.x. `taba conventions` lists the installed release's names. See the [compatibility table and migration order](https://github.com/lcorneliussen/taba/blob/v0.2.4/docs/conventions.md). Sections below keep their labeled baselines.

## Receiving-owned control roots

In [v0.2.5](https://github.com/lcorneliussen/taba/releases/tag/v0.2.5), project members default to `<project-root>/.config`; standalone ad-hoc collections default to their own `.config` and do not inherit the creating collection's secret root or external-sharing permission. Declare any other root in the receiving configuration; sharing outside that project or standalone collection also requires `allow_external`. See the [receiving secrets contract](https://github.com/lcorneliussen/taba/blob/v0.2.5/internal/wtc/defaults/instructions/secrets.md#workspace-boundary) for setup and migration.

`TABA_CONFIG_ROOT` and `WTC_CONFIG_ROOT` must match that policy; conflicting nonempty values fail instead of using prefix precedence. Inherited environment, generated files, and other projects' configurations cannot grant access. Root and source-file symlinks must stay inside the approved source.

When changing policy, either declare the exact external source locally or remove stale root assignments. If generated roots still reflect the old policy, preview a single-collection repair:

```sh
taba env setup --repair-generated-roots --dry-run
```

Inspect the preview, then re-run without `--dry-run` (`--all` is not supported). Repair follows receiving policy, ignores stale caller/generated root aliases, refuses conflicting user-local roots and nonliteral generated shell code, and keeps `.env.collection.local`. It rewrites generated roots and clears generated provider identity hints; it never reads secret directories, runs hooks, trusts mise, edits user configuration, or links, relinks, copies, moves, or deletes credentials. Then refresh the invoking shell, run `taba env setup` to regenerate provider hints, and reload existing panes (repair skips live panes).

Retirement refuses to discard a nonempty collection-local `.config` (private data), even with `--force`; preserve it first. Retiring a member collection leaves project configuration and control data intact. These checks prevent ambient root redirection; processes running as the same user still share OS permissions. Provider credential resolution and global credential-store locking are separate. See the [process environment contract](https://github.com/lcorneliussen/taba/blob/v0.2.5/internal/wtc/defaults/instructions/hooks-and-env.md) and [named tunnel guidance](../services/#named-tunnels-and-receiving-policy).

## Bitbucket client selection in v0.2.8

In [v0.2.8](https://github.com/lcorneliussen/taba/releases/tag/v0.2.8), `TABA_BITBUCKET_TRANSPORT` (legacy alias `WTC_BITBUCKET_TRANSPORT`) selects the client for migrated Bitbucket operations (currently only catch-up's read of enlisted PR state). Each operation resolves it in order:

1. Process environment, when set (even if empty).
2. `taba.env` (or legacy `wtc.env`) in the control root, which must be a regular file inside that root.
3. Default: `bb`.

```sh
# $TABA_CONFIG_ROOT/taba.env
TABA_BITBUCKET_TRANSPORT=twg
```

Unset, empty, or `bb` uses `bb`. `twg` requires TWG 1.x at 1.4.4 or later and uses your TWG profile (possibly a different account from `bb`). Any other value fails as unavailable; an unreadable or unsafe defaults file also fails instead of falling back to `bb`. Installing `twg` alone changes nothing, and GitHub operations ignore the setting. `taba doctor` reports the selected client, its source, and whether an installed TWG version is supported (advisory; never fails doctor). See the [v0.2.8 forge operations contract](https://github.com/lcorneliussen/taba/blob/v0.2.8/docs/forges.md#selecting-the-client).

## Example-backed requirements in v0.2.7

Document required configuration in a tracked dotenv example without storing actual values. In [v0.2.7](https://github.com/lcorneliussen/taba/releases/tag/v0.2.7), `doctor`, `config list`, and explicit `secrets list --requirements` share a value-free requirements inventory:

```sh
taba doctor
taba config list --json
taba secrets list --requirements --json
taba config lint --json
taba config list --example web:config/dev.env.example
```

Default discovery reads only Git-tracked root `.env.example` and `.env.local.example`. Add the `# taba:requirements v1` header to opt an example into the declarative schema; unannotated files remain hints. Pass repeatable `--example repo:path` to select other owned dotenv examples instead of the defaults. Example assignments document inputs; they never supply configuration. See the [tagged annotation format and example](https://github.com/lcorneliussen/taba/blob/v0.2.7/docs/configuration-requirements.md) for source precedence, key ownership, conditions, and presence-only file requirements.

`config lint` validates declarations, references, dotenv syntax, and provided owned key names without credentials or actual files. It can run in CI; in a standalone Git checkout, run `taba config lint --example .env.example`. `doctor` checks mandatory readiness, flagging missing, empty, placeholder, malformed, or unverified requirements. Missing optional and inapplicable inputs do not fail readiness; unknown selection stays unknown. Neither command proves authentication or starts services. Choosing a local connection can drop a conditional remote credential requirement without proving the local service is ready.

Inventory output reports names, purpose, scope, applicability, state, and provenance without printing values. Pass `--process-environment` to inspect declared owned names or prefixes from the process environment; standalone lint skips process inputs. Project sources follow receiving control-root policy, collection sources stay in the selected repository, and inspection never creates, links, or migrates configuration.

Dotenv parsing is bounded and literal: no shell expansion, interpolation, multiline assignments, executable checks, or permissions probes. Declarations do not prove dynamic application code uses only declared inputs. Default `secrets list` still reports filenames and link states without reading contents.

## Environment compatibility in v0.1.60

From v0.1.60, taba accepts `TABA_` alongside `WTC_` for supported product settings. Within one source, `TABA_` wins, even when set to an empty value; environment variables still override workspace-file defaults. Generated variables, commands, and paths keep their existing names in this release. See the [compatibility guide](https://github.com/lcorneliussen/taba/blob/v0.1.60/docs/rename-compatibility.md) for supported settings and conflict warnings. Sections below keep their v0.1.51 baseline.

## Tracked inputs, disposable outputs

In local collections, the harness owns `.harness-repos.yml`, `.wtc-cli-version`, and `wtc.toml`; ad-hoc collections use `.wtc/config/`. Generated collection-root files are disposable, not the source of truth. Local hooks and mise pins do not run on an OpenClaw gateway.

Preview changes with `wtc env setup --dry-run` before regenerating with `wtc env setup`, which preserves the port base and hand-authored `.env.collection.local`. Run `wtc env list` to inspect variable names and override sources without printing values.

## Keep credentials local

The workspace control root holds shared, machine-local files outside repositories. `wtc secrets list` shows file paths and link states without reading contents. Preview links with `wtc secrets link --dry-run`: linking requires gitignored targets, keeps displaced files in collection backups, and excludes production-capable paths by default. Do not bypass these safeguards to make setup pass.

Put collection-specific secret variables in `.env.collection.local`, not tracked configuration. They die with the collection. Never paste values into bug reports, screenshots, or committed examples.

## Hooks and overrides

Read `wtc customize` before adding hooks. Harness pre-hooks can stop an action; post-hook failures warn after completion. Application init/teardown hooks follow a separate contract: they should be idempotent, tolerate absent siblings, and warn rather than fail their caller. For runtime resource teardown safety checks, see [Services](../services/).

Run `wtc eject 'skills/wtc-*'` to copy selected defaults without overwriting existing files. Check override and section-patch drift with `wtc skills diff --changes`, and preview generated agent guidance with `wtc skills render --dry-run`. Preserve team policy when upgrading.

## MCP and agent shells

A harness's `.mcp-servers.yml` names servers and credential variables, never values. `wtc mcp render --dry-run` previews collection-local Claude, Cursor, and Codex configuration while preserving settings it does not own.

`wtc agent-env` supplies sibling mise toolchains and configured local bins to agent shells. If a shell finds a system interpreter instead, inspect the rendered guidance and toolchain environment rather than hardcoding another checkout's PATH.
