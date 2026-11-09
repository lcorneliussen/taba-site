---
layout: ../../layouts/Docs.astro
title: Working with collections
description: Keep the workspace aligned with the task, from the first repository to cleanup.
source: https://github.com/lcorneliussen/taba/blob/v0.1.51/docs/commands.md
---

## One folder, related worktrees

A collection gathers independent repositories without combining their Git histories. An API change, a frontend change, and a shared-library change can live side by side while retaining separate commits and pull requests.

```text
workspace/
├── fix-login/
│   ├── api/
│   ├── web/
│   └── shared/
└── new-checkout/
    ├── api/
    └── web/
```

Open the folder for the task you are working on. In a harness-backed collection, the project harness is another worktree in that folder.

## Grow a task without starting over

From a collection, bring in a previously registered repository by name:

```sh
wtc add-repo shared
wtc status
```

For an unregistered repository, use its clone URL or an existing checkout instead. WTC remembers repositories added to ad-hoc collections in a per-user registry.

## Create another task

In a local terminal, create a sibling collection:

```sh
wtc new new-checkout api web
cd ../new-checkout
```

Each collection has its own worktrees, generated environment, and port assignments. Project-specific setup remains the responsibility of your project configuration and hooks. WTC does not replace the application’s build system.

> Under OpenClaw, ask the agent to create a named managed collection instead of running `wtc new`. See [the gateway workflow](../openclaw/).

## See where things stand

```sh
wtc status
```

Status brings local changes and pull request information together. In a terminal it can open an interactive view. Use `wtc status --json` when you need machine-readable output.

Commit changes and open pull requests in the repositories involved in your task. In OpenClaw, publishing goes through the managed owner session or the Collection panel.

## Retire the workspace

When the work is complete, review status and retire the collection:

```sh
wtc status
wtc retire .
```

Retirement checks for local work before removing worktrees. For an ad-hoc collection, the collection folder is removed too. Shared repository owners, the per-user registry, and remote branches remain available.

Read the upstream command reference for the full retirement checks before your first cleanup.
