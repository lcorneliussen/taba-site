---
layout: ../../layouts/Docs.astro
title: Getting started
description: Install wtc, bring two repositories together, and start your first task. No harness or agent required.
source: https://github.com/lcorneliussen/taba/blob/v0.1.51/docs/getting-started.md
---

A **worktree collection** is a folder with a Git worktree for each repository in a task. Your build tools and dev commands stay the same.

> Running inside OpenClaw? Use the [OpenClaw guide](../openclaw/) instead. The gateway manages worktrees there; local `init` and `new` do not apply.

## 1. Install the CLI

Requires **Git** on macOS or Linux. Download a binary from [GitHub Releases](https://github.com/lcorneliussen/taba/releases), put it on `PATH`, and verify with `wtc --version`. For the published stable release and install command, see [Install wtc](../../#install).

Or install this guide’s pinned **v0.1.51 handbook baseline** with [mise](https://mise.jdx.dev/):

```sh
mise use -g github:lcorneliussen/taba@0.1.51
wtc --version
```

Mise, an agent CLI, and a special editor are all optional.

## 2. Make a home for the task

Start in an empty folder:

```sh
mkdir fix-login
cd fix-login
wtc init
```

This creates an **ad-hoc collection** with its local repository registry in `.wtc/config/repos.yml`. No shared harness is needed to get started.

## 3. Bring in your repositories

Pass a Git clone URL or existing checkout; replace the examples with repositories you can access:

```sh
wtc add-repo git@github.com:example-org/api.git
wtc add-repo ~/code/web
```

`wtc add-repo` asks which branch to base new worktrees and pull requests on, suggesting the remote’s default. Pass `--target main` to set it non-interactively when `main` is the target.

Each worktree starts **detached at its target branch**, regardless of what branch an existing checkout has open.

## 4. Look around, then make a branch

```sh
wtc status
cd api
git switch -c fix-login
```

Create a branch in each repository you change before committing. Open the collection folder in your editor or agent to work across repositories. Run each project’s build, test, and dev commands inside its worktree.

## 5. Keep the next task separate

From the collection folder, create a sibling collection from registered repositories:

```sh
wtc new new-checkout api web
cd ../new-checkout
wtc status
```

The previous collection stays in place. Each task has its own worktrees and environment.

**Next:** [collection lifecycle](../collections/), [the commands](../commands/), or a [team-owned harness](../team-harness/).
