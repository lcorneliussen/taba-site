---
layout: ../../layouts/Docs.astro
title: Getting started
description: Install wtc, bring two repositories together, and start your first task. No harness or agent required.
source: https://github.com/lcorneliussen/taba/blob/v0.1.51/docs/getting-started.md
---

A **worktree collection** is a folder containing the repositories you need for one task. Each repository has its own Git worktree. Your build tools and development commands stay the same.

> Running inside OpenClaw? Use the [OpenClaw guide](../openclaw/) instead. The gateway manages worktrees there; the local `init` and `new` commands below do not apply.

## 1. Install the CLI

You need **Git** and a macOS or Linux development environment. Download a binary for your platform from [GitHub Releases](https://github.com/lcorneliussen/taba/releases), put it on your `PATH`, and verify it with `wtc --version`.

For the published stable release and its installation command, see [Install wtc](../../#install).

To reproduce the **v0.1.51 handbook baseline** with [mise](https://mise.jdx.dev/):

```sh
mise use -g github:lcorneliussen/taba@0.1.51
wtc --version
```

This guide pins a documented version, not a claim about the latest release. Mise, an agent CLI, and a special editor are all optional.

## 2. Make a home for the task

Start in an empty folder:

```sh
mkdir fix-login
cd fix-login
wtc init
```

The folder is now an **ad-hoc collection**. Its local repository registry lives in `.wtc/config/repos.yml`. You do not need a shared harness to get started.

## 3. Bring in your repositories

Use a Git clone URL or an existing checkout. Replace these examples with repositories you can access:

```sh
wtc add-repo git@github.com:example-org/api.git
wtc add-repo ~/code/web
```

WTC asks which branch new worktrees and pull requests should be based on, suggesting the remote’s default. Use `--target main` to answer non-interactively when `main` is the correct target for your repository.

Each worktree starts **detached at its target branch**, not at whatever branch an existing checkout happens to have open.

## 4. Look around, then make a branch

```sh
wtc status
cd api
git switch -c fix-login
```

Create a branch in each repository you change before committing. Open the collection folder in your editor or agent to work across repositories. Run the project’s usual build, test, and development commands inside its worktree.

## 5. Keep the next task separate

From the collection folder, create a sibling collection using repositories you have already registered:

```sh
wtc new new-checkout api web
cd ../new-checkout
wtc status
```

The previous collection stays in place. Each task has its own worktrees and environment.

**Next:** learn the [collection lifecycle](../collections/), explore [the commands](../commands/), or introduce a [team-owned harness](../team-harness/).
