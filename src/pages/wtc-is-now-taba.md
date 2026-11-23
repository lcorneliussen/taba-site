---
layout: ../layouts/Announcement.astro
title: wtc is now taba
description: A name you can say. A bundle of repos. More room for the whole task.
updated: '2026-11-09'
---

We're giving wtc a new name: **taba**. It brings a task's repositories into one workspace for your editor, agents, and existing tools.

> **taba 0.2.0 is out.** Since 9 November 2026, releases from [lcorneliussen/taba](https://github.com/lcorneliussen/taba) ship a `taba` command alongside `wtc`. `wtc` keeps working, and existing collections, harnesses, pins, files, and variables need no changes. New file and skill names arrive during 0.2.x ([the timeline](#the-timeline)); see the [0.2.0 release notes](https://github.com/lcorneliussen/taba/releases/tag/v0.2.0).

## Why taba?

**wtc** describes the mechanism: worktree collections. We wanted a name that's easier to say and remember, and reflects what collections give you.

In Japanese, **束** (*taba*) means a bundle, as in **花束** (*hanataba*), a bouquet. A taba of repos: separate things brought together for a purpose.

The goal is unchanged: **make room for the whole task.** Your API, frontend, and shared library stay in separate repositories and still work together in one workspace.

## What changes, and what stays familiar?

Your workspace is still a **collection**. Each repository keeps its own Git worktree, branches, and history. Your build commands, editor, and agent stay yours, and you don't need to recreate existing worktrees.

The product, website, command, and CLI repository are now **taba**. Files, environment variables, and agent skills transition across 0.2.x while the old names keep working:

| Surface | Old name | New name | Status |
| --- | --- | --- | --- |
| Command | `wtc` | `taba`, with a temporary `wtc` alias | Both ship since 0.2.0 |
| Website | `wtc.sh` links | `taba.sh`; old links redirect with their paths preserved | Live |
| CLI repository / mise tool | `lcorneliussen/wtc-cli` | `lcorneliussen/taba` | Since 0.2.0; the old name redirects |
| Harness pin | `.wtc-cli-version` | `.taba-version` | Both read in 0.2.x |
| Harness configuration | `wtc.toml` | `taba.toml` | Both read in 0.2.x |
| Generated collection data | `.wtc/` | `.taba/` | Both read in 0.2.x; taba moves it (planned) |
| Collection scope | `WTC-SCOPE.md` | `SCOPE.md` | Both read in 0.2.x |
| Environment variables | `WTC_*` | `TABA_*` | Both emitted since 0.2.0 |
| Agent skills | `wtc-*` | `taba-*` | Since 0.2.4; `wtc-*` names redirect |

`.env.collection` and `.env.collection.local` keep their names. See [Rename conventions](../docs/conventions/) for every name, 0.2.x support, and migration steps.

## The timeline

Projects move through these stages at their own pace. Future stages are **release targets, not announced release dates**. See [#375](https://github.com/lcorneliussen/taba/issues/375) for the plan and the [rename plan](https://github.com/lcorneliussen/taba/issues/200) for tracking.

| Stage | Release | What holds |
| --- | --- | --- |
| 1 | wtc `0.1.x` | Only wtc names. |
| 2 | taba `0.2.x`, with wtc names | Released 9 November 2026 with `0.2.0`. Both names work; nothing has to change. |
| 3 | taba `0.2.x`, all wtc names migrated | `taba doctor` reports nothing left to migrate in the harness, collections, and user directories (since `0.2.4`); check repository files by hand for now. See [Rename conventions](../docs/conventions/). |
| 4 | taba `0.2.x`, with the project flag | The harness `taba.toml` turns off wtc names for the project, and `taba doctor` fails while any remain (planned). |
| 5 | taba `0.3.x` | taba detects wtc names and stops with upgrade instructions instead of using them (planned). |
| 6 | taba `0.4.x` | No wtc logic remains; leftover wtc names are ignored (planned). |

The website moved first: `taba.sh` serves it, and `wtc.sh` links redirect with their paths preserved.

## What should I do today?

Upgrade to `0.2.0` when ready, then use `taba` or `wtc`. You don't need to rename folders or update scripts.

Follow the [installation guide](../docs/getting-started/) and [upgrade guide](../docs/upgrades/), and verify shipped versions on [GitHub Releases](https://github.com/lcorneliussen/taba/releases) rather than relying on the timeline targets above.

## Upgrading a team harness

Step 1 is available now; later steps are planned. Check the published release notes before each step, and substitute a recommended patch release from the same series for the target versions shown below.

### 1. Now: upgrade the CLI to 0.2

From a collection containing your harness, preview and apply the upgrade:

```sh
wtc upgrade --version 0.2.0 --dry-run
wtc upgrade --version 0.2.0
```

This updates the harness pin and compatibility range, regenerates the environment and mise configuration, installs the target when mise is available, and prints the release notes. It leaves an uncommitted diff for review.

Review, test, commit, and merge the harness change, then roll it out:

```sh
# After the harness change has merged
wtc upgrade --rollout
```

The rollout updates eligible clean collections with idle agents and reports any that need their owner; handle those exceptions manually.

After step 1, both `taba` and `wtc` work, files keep their old names, and generated environments set both `WTC_*` and `TABA_*` so you can update scripts gradually. If your installed release lacks `upgrade`, first update via your existing installer to a `0.1.x` release that includes it.

### 2. During 0.2.x: migrate the names

Upgrade the harness to `0.2.4` or later using step 1, then ask an agent in one of your collections:

> Run `taba doctor --all` and finish the migration to taba.

`taba doctor` lists each wtc convention it finds and how to migrate it; [Rename conventions](../docs/conventions/) gives the full list and recommended order. Harness changes stay an uncommitted diff to review and merge, then roll out with `taba upgrade --rollout`.

### 3. Before 0.3: turn off the wtc names

A planned flag in the harness `taba.toml` will turn off wtc names for the project so `taba doctor` fails while any remain. From `0.3.x`, taba stops with upgrade instructions on wtc names; `0.4.x` ignores them.

Don't jump directly from `0.1.x` or early `0.2.x` to `0.3.x`; migrate on `0.2.x` first. Harnesses stay on their pinned release while you schedule that work, even if you install a newer release elsewhere.

## Standalone installs and OpenClaw

**No team harness?** `wtc upgrade` is a harness command. Update standalone installs the way you installed them, such as mise or a downloaded release archive. From 0.2.0, install with `brew install lcorneliussen/taba/taba`, `mise use -g github:lcorneliussen/taba@0.2.0`, or a `taba_<version>_<os>_<arch>.tar.gz` release archive; each provides both `taba` and `wtc`. Existing ad-hoc collections keep working unchanged.

**Using OpenClaw?** Ask the gateway administrator to upgrade the CLI and its matching embedded plugin together, or rebuild and redeploy the pinned gateway image. A plugin rename with doctor-assisted config migration is planned; don't rename the plugin entry by hand ahead of that release. See the [gateway upgrade guide](../docs/upgrades/#openclaw-gateway-upgrade).

## Follow the transition

We update this page as each phase ships. Follow progress on the [rename tracking issue](https://github.com/lcorneliussen/taba/issues/200) and its phase issues: [preparation](https://github.com/lcorneliussen/taba/issues/201), [first taba release](https://github.com/lcorneliussen/taba/issues/202), [new names](https://github.com/lcorneliussen/taba/issues/203), and [compatibility removal](https://github.com/lcorneliussen/taba/issues/204).

Everyone deserves monorepos. Even those who don't have them.
