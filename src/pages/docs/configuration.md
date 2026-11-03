---
layout: ../../layouts/Docs.astro
title: Configuration and secrets
description: Separate tracked project settings, generated environment, and private local values.
source: https://github.com/lcorneliussen/taba/blob/v0.1.51/internal/wtc/defaults/instructions/customize.md
---

## Environment compatibility in v0.1.60

Starting with v0.1.60, WTC accepts the `TABA_` prefix alongside `WTC_` for supported
product settings. Within one source, the new spelling wins, including an
explicit empty value; environment settings still take precedence over
workspace-file defaults. Generated variables, commands and paths keep their
current names in this increment. See the
[compatibility guide](https://github.com/lcorneliussen/taba/blob/v0.1.60/docs/rename-compatibility.md)
for the supported settings and conflict warnings. The guidance below retains
its v0.1.51 baseline.

## Tracked inputs, disposable outputs

For local collections, a harness owns `.harness-repos.yml`, `.wtc-cli-version`, and `wtc.toml`. Ad-hoc collections use `.wtc/config/` for configuration. Generated collection-root files are not the source of truth. These local hooks and mise pins do not run on an OpenClaw gateway.

Run `wtc env setup --dry-run` before regenerating with `wtc env setup`. This preserves the port base and the hand-authored `.env.collection.local`. Use `wtc env list` to inspect variable names and override sources without printing values.

## Keep credentials local

The workspace control root holds shared, machine-local files outside repositories. `wtc secrets list` shows file paths and link states without reading secret contents. Preview changes with `wtc secrets link --dry-run`; linking requires gitignored targets, preserves displaced files in collection backups, and excludes production-capable paths by default. Do not bypass those protections to make setup pass.

Collection-specific secret variables belong in `.env.collection.local`, not tracked configuration. They die with the collection. Do not paste values into bug reports, screenshots, or committed examples.

## Hooks and overrides

Read `wtc customize` before adding hooks. Harness pre-hooks may stop an action; post-hook failures warn after it completes. Application init/teardown hooks are a different contract: they should be idempotent, tolerate absent siblings, and warn rather than fail their caller. Runtime resource teardown has additional safety checks: see [Services](../services/).

Use `wtc eject 'skills/wtc-*'` to copy selected defaults without overwriting existing files. `wtc skills diff --changes` reports override and section-patch drift; `wtc skills render --dry-run` previews generated agent guidance. Preserve team policy when upgrading.

## MCP and agent shells

A harness's `.mcp-servers.yml` names servers and credential variables, never credential values. `wtc mcp render --dry-run` previews collection-local Claude, Cursor, and Codex configuration. The renderer preserves settings it does not own.

`wtc agent-env` supplies sibling mise toolchains and configured local bins to agent shells. If a shell finds a system interpreter instead, inspect the rendered guidance and toolchain environment rather than hardcoding another checkout's PATH.
