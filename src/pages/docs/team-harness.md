---
layout: ../../layouts/Docs.astro
title: A harness for your team
description: Put repository registration, tool versions, and project policy under version control.
source: https://github.com/lcorneliussen/taba/blob/v0.1.51/docs/harness-design.md
---

A **harness** is a small, project-owned repository that makes workspace setup reusable across a team without replacing your application repositories. An ad-hoc collection is a good starting point.

## New harnesses in v0.2.4

Run `taba harness init` with your remote and the exact published version to pin. The [v0.2.4 scaffold](https://github.com/lcorneliussen/taba/blob/v0.2.4/docs/commands.md) writes `.taba-version` and `taba.toml` and requires a CLI pin of 0.2.0 or later. A harness with only `.taba-version` seeds new collections with `SCOPE.md` without moving existing scope files.

Old-name files remain supported during 0.2.x. Run `taba doctor --all` and follow the [conventions and migration order](https://github.com/lcorneliussen/taba/blob/v0.2.4/docs/conventions.md) before renaming files or overrides. The scaffold example below keeps its v0.1.51 baseline.

## What belongs where?

| Location | Responsibility |
| --- | --- |
| taba CLI | Collection operations, standard guidance, bootstrap tooling |
| Your harness | Repo registry, CLI pin, tools, policy, hooks |
| Application repositories | Normal development commands, optional adapters |
| A collection | Generated environment, agent files, local overrides |

## Scaffold a minimal harness

Create the minimal scaffold (available from v0.1.39; shown for v0.1.51):

```sh
wtc harness init agent-harness \
  --remote git@github.com:example-org/agent-harness.git \
  --cli-version 0.1.51
```

Replace the remote with your team’s repository URL, and add `--dry-run` to preview the files. The command creates six files and refuses to overwrite existing ones. It **does not** initialize Git, publish a repository, install tools, or run hooks.

## Version it and bootstrap the workspace

Commit the generated harness to your own Git repository and publish it to your remote. Follow the [versioned bootstrap guide](https://github.com/lcorneliussen/taba/blob/v0.1.51/internal/wtc/defaults/bootstrap.md) to create its bare owner and first collection.

Add application repositories to the harness registry, then run `wtc add-repo` or `wtc new` to add their worktrees to a local collection.

## Keep tool versions reproducible

The harness pins `wtc` in `.wtc-cli-version`. `wtc env setup` generates collection-local mise config from that pin and the harness tool settings. Run `mise install` in the collection if you use mise.

Application repositories can keep their own toolchain config. Their normal commands should still work outside taba.

## Adopt only the pieces you need

Hooks, application adapters, and the [reference harness](https://github.com/lcorneliussen/wtc-boilerplate) are optional. Add collection-specific setup only when needed, such as preparing an environment or assigning ports. You do not need to fork a large template to own a small harness.
