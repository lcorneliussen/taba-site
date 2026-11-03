---
layout: ../../layouts/Docs.astro
title: A harness for your team
description: Put repository registration, tool versions, and project policy under version control.
source: https://github.com/lcorneliussen/taba/blob/v0.1.51/docs/harness-design.md
---

An ad-hoc collection is a good starting point. A **harness** makes the workspace setup reusable across a team. It is a small, project-owned repository, not a replacement for your application repositories.

## What belongs where?

| Location | Responsibility |
| --- | --- |
| WTC CLI | Collection operations, standard guidance, bootstrap tooling |
| Your harness | Repo registry, CLI pin, tools, policy, and hooks |
| Application repositories | Normal development commands and optional adapters |
| A collection | Generated environment, agent files, and local overrides |

## Scaffold a minimal harness

The minimal scaffold is available from v0.1.39. This example uses the documented v0.1.51 release:

```sh
wtc harness init agent-harness \
  --remote git@github.com:example-org/agent-harness.git \
  --cli-version 0.1.51
```

Replace the example remote with your team’s repository URL. Add `--dry-run` to preview the files first.

The command creates six files and refuses to overwrite existing files. It **does not** initialize Git, publish a repository, install tools, or run hooks.

## Version it and bootstrap the workspace

Commit the generated harness in your own Git repository and publish it to the remote you selected. Then follow the [versioned bootstrap guide](https://github.com/lcorneliussen/taba/blob/v0.1.51/internal/wtc/defaults/bootstrap.md) to create its bare owner and first collection.

Add application repositories to the harness registry. Use `wtc add-repo` or `wtc new` to bring their worktrees into a local collection.

## Keep tool versions reproducible

The harness pins WTC in `.wtc-cli-version`. `wtc env setup` generates collection-local mise configuration from that pin and the harness’s tool settings. Run `mise install` in the collection when using mise.

Application repositories can keep their own toolchain configuration. Their normal commands should still work outside WTC.

## Adopt only the pieces you need

Hooks and application adapters are optional. Add collection-specific setup when it solves a real need, such as preparing an environment or assigning ports.

The [reference harness](https://github.com/lcorneliussen/wtc-boilerplate) is an optional starter. You do not need to fork a large template to own a small harness.
