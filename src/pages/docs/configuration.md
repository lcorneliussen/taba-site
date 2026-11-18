---
layout: ../../layouts/Docs.astro
title: Configuration and secrets
description: Separate tracked project settings, generated environment, and private local values.
source: https://github.com/lcorneliussen/taba/blob/v0.1.51/internal/wtc/defaults/instructions/customize.md
---

## Names in v0.2.4

In [v0.2.4](https://github.com/lcorneliussen/taba/releases/tag/v0.2.4), a new harness uses `taba.toml` and `.taba-version`; rendered skills use `taba-*`. Existing old-name files and harness overrides remain supported during 0.2.x. Where both file spellings exist, the old one wins; supported environment variables instead prefer `TABA_*`. Keep one intended file, and preserve team overrides when migrating.

Use `taba doctor` for this collection or `taba doctor --all` for the workspace, including from its root. Each finding explains whether it can migrate now or must wait; findings do not fail doctor during 0.2.x. `taba conventions` lists the installed release's names. Follow the [published compatibility table and migration order](https://github.com/lcorneliussen/taba/blob/v0.2.4/docs/conventions.md); historical sections below retain their labeled older baselines.

## Receiving-owned control roots

In [v0.2.5](https://github.com/lcorneliussen/taba/releases/tag/v0.2.5),
a project member defaults to `<project-root>/.config`; a standalone ad-hoc
collection defaults to its own `.config`. A standalone collection does not
inherit the creating collection's secret root or permission to share an external
one. A different root needs a declaration in the receiving configuration;
sharing outside that project or standalone collection also needs its explicit
`allow_external` opt-in. Follow the
[receiving secrets contract](https://github.com/lcorneliussen/taba/blob/v0.2.5/internal/wtc/defaults/instructions/secrets.md#workspace-boundary)
for the configuration and migration procedure.

`TABA_CONFIG_ROOT` and `WTC_CONFIG_ROOT` must agree with that receiving policy.
Conflicting nonempty values are refused rather than resolved by prefix
precedence. An inherited environment, generated file or another project's
configuration cannot grant access. Root and source-file symlinks must stay
inside the approved source.

When changing policy, first decide whether to retain the exact external source
and declare it locally, or remove stale root assignments. If generated roots
still reflect the old policy, preview the single-collection repair:

```sh
taba env setup --repair-generated-roots --dry-run
```

After inspecting the preview, repeat without `--dry-run`. Repair takes authority
from receiving policy, ignores stale caller/generated root aliases, refuses
conflicting user-local roots and nonliteral generated shell code, and preserves
`.env.collection.local`. It updates generated roots and removes generated
provider identity hints without reading secret directories, running hooks,
trusting mise or linking credentials. It cannot be combined with `--all`.
Refresh the invoking shell, then run ordinary `taba env setup` to regenerate
provider hints. Existing panes must reload their environment; repair does not
update live panes or user configuration, or copy, move, delete or relink credentials.

Nonempty collection-local `.config` is private data: retirement refuses to
discard it even with `--force`. Preserve it explicitly before retiring. Project
configuration and control data remain when a member collection is retired.
These checks prevent ambient root redirection; processes running as the same
user still share OS permissions. Provider credential resolution and global
credential-store locking are separate concerns. See the
[process environment contract](https://github.com/lcorneliussen/taba/blob/v0.2.5/internal/wtc/defaults/instructions/hooks-and-env.md)
and [named tunnel guidance](../services/#named-tunnels-and-receiving-policy).

## Example-backed requirements in v0.2.7

Use a tracked canonical dotenv example to describe configuration without storing
actual values in it. In [v0.2.7](https://github.com/lcorneliussen/taba/releases/tag/v0.2.7),
`doctor`, `config list` and explicit `secrets list --requirements` share a
value-free requirements inventory:

```sh
taba doctor
taba config list --json
taba secrets list --requirements --json
taba config lint --json
taba config list --example web:config/dev.env.example
```

Default discovery considers only Git-tracked root `.env.example` and
`.env.local.example` files. The `# taba:requirements v1` header opts an example
into the declarative schema; unannotated examples remain hints. Use repeatable
`--example repo:path` to select other owned dotenv examples instead. See the
[tagged annotation format and example](https://github.com/lcorneliussen/taba/blob/v0.2.7/docs/configuration-requirements.md)
for source precedence, key ownership, conditions and presence-only file requirements.
Example assignments document inputs; they never supply actual configuration.

`config lint` checks declarations, references, dotenv syntax and provided owned
key names without requiring credentials or actual files. It can run in CI; in a
standalone Git checkout, use `taba config lint --example .env.example`.
`doctor` instead diagnoses mandatory readiness, including missing, empty,
placeholder, malformed or unverified requirements. Optional missing and
inapplicable inputs do not fail readiness; unknown selection stays unknown.
Neither command proves authentication or starts a service. Choosing a local
connection can remove a conditional remote credential requirement without
proving the local service is ready.

Inventory output reports names, purpose, scope, applicability, state and
provenance without printing actual values. Process input inspection requires
explicit `--process-environment` and is limited to declared owned names or
prefixes; standalone lint does not inspect process inputs. Project sources stay
inside the receiving control-root policy; collection sources stay in the selected
repository. Inspection does not create, link or migrate configuration.

Supported dotenv input is bounded and literal: no shell expansion, interpolation,
multiline assignments, executable checks or permissions probes. This does not
prove that dynamic application code uses only declared inputs. The default
`secrets list` still reports filenames and link states without inspecting contents.

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
