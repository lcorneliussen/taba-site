---
layout: ../layouts/Announcement.astro
title: wtc is now taba
description: A name you can say. A bundle of repos. More room for the whole task.
updated: '2026-11-09'
---

We're giving wtc a new name: **taba**. It brings the repositories of a task together, so you can work across them with your editor, your agents, and the tools you already use.

> **taba 0.2.0 is out.** Since 9 November 2026, releases ship a `taba` command next to `wtc`, from the [lcorneliussen/taba](https://github.com/lcorneliussen/taba) repository. `wtc` keeps working, and existing collections, harnesses, pins, files and variables need no changes. The new file and skill names arrive during 0.2.x; see [the timeline](#the-timeline). See the [0.2.0 release notes](https://github.com/lcorneliussen/taba/releases/tag/v0.2.0).

## Why taba?

**wtc** describes the mechanism: worktree collections. We wanted a product name that's easier to say and remember, and that captures what those collections give you.

In Japanese, **束** (*taba*) means a bundle. You may recognize it in **花束** (*hanataba*), a bouquet. A taba of repos: separate things brought together for a purpose.

The idea remains simple: **make room for the whole task.** Your API, frontend, and shared library can live in separate repositories and still feel at home in one workspace.

## What changes, and what stays familiar?

The product and website are now **taba**, and so are the command and the CLI repository. Configuration names and agent skills follow in stages.

Your workspace is still a **collection**. Each repository keeps its own Git worktree, branches, and history. Your build commands, editor, and choice of agent stay yours. Existing worktrees do not need to be recreated for the rename.

During the compatibility window, the old `wtc` command ships alongside `taba`. Environment variables, file names, and skill names get a transition period too.

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
| Agent skills | `wtc-*` | `taba-*` | From the release after 0.2.3; `wtc-*` names redirect |

The collection environment files, `.env.collection` and `.env.collection.local`, keep their names. [Rename conventions](../docs/conventions/) lists every name, what 0.2.x supports and how to migrate it.

## The timeline

A project moves through these stages at its own pace. Future stages are **release targets, not announced release dates**. [#375](https://github.com/lcorneliussen/taba/issues/375) holds the plan, and the [rename plan](https://github.com/lcorneliussen/taba/issues/200) tracks the work.

| Stage | Release | What holds |
| --- | --- | --- |
| 1 | wtc `0.1.x` | Only the wtc names. |
| 2 | taba `0.2.x`, with wtc names | Released 9 November 2026 with `0.2.0`. Both names work, and nothing has to change. |
| 3 | taba `0.2.x`, all wtc names migrated | `taba doctor` reports nothing left to migrate. Available from the release after `0.2.3`; see [Rename conventions](../docs/conventions/). |
| 4 | taba `0.2.x`, with the project flag | The harness's `taba.toml` turns off the wtc names for the project, and `taba doctor` fails while any remain (planned). |
| 5 | taba `0.3.x` | taba detects wtc names and stops with upgrade instructions instead of using them (planned). |
| 6 | taba `0.4.x` | No wtc logic is left, and leftover wtc names are ignored (planned). |

The website moved first: `taba.sh` serves it, and `wtc.sh` links redirect with their paths preserved.

## What should I do today?

Upgrade to `0.2.0` when it suits you, then use `taba` or `wtc`, whichever you like. Neither the upgrade nor the new name requires renaming folders or replacing commands in scripts.

Use the [installation guide](../docs/getting-started/) and [upgrade guide](../docs/upgrades/) for released versions. Check [GitHub Releases](https://github.com/lcorneliussen/taba/releases) when choosing an upgrade; a target version in this page's timeline is not proof that it has shipped.

## Upgrading a team harness

The migration runs in steps. Step 1 is available now; the later steps are planned. Check the published release notes before each step. The examples use the initial target versions; use a published patch release from the same series when the release notes recommend it.

### 1. Now: upgrade the CLI to 0.2

From one collection containing your harness, preview the upgrade and then apply it:

```sh
wtc upgrade --version 0.2.0 --dry-run
wtc upgrade --version 0.2.0
```

This updates the harness pin and compatibility range, regenerates the environment and mise configuration, installs the target when mise is available, and prints the release notes. It leaves a diff for review; it does not commit it.

Review, test, commit, and merge the harness change through your normal process. Then roll it out:

```sh
# After the harness change has merged
wtc upgrade --rollout
```

The rollout updates eligible clean collections with idle agents and reports those that need their owner. Plan to handle the reported exceptions; it does not move every collection regardless of its state.

At this stage, both `taba` and `wtc` work, and files keep their old names. Generated environments set both `WTC_*` and `TABA_*` variables. You can update scripts gradually. If your installed release has no `upgrade` command, first use your existing installer to move to a released `0.1.x` version that includes it.

### 2. During 0.2.x: migrate the names

Upgrade the harness to the release after `0.2.3`, or later, the same way as in step 1. Then ask an agent in one of your collections:

> Run `taba doctor --all` and finish the migration to taba.

`taba doctor` names each wtc convention it finds and how to move it. [Rename conventions](../docs/conventions/) lists them all, with the recommended order. Harness changes stay a diff for you to review and merge; roll them out with `taba upgrade --rollout`.

### 3. Before 0.3: turn off the wtc names

A planned flag in the harness's `taba.toml` will turn off the wtc names for the project, so `taba doctor` fails while any remain. From `0.3.x`, taba stops with upgrade instructions when it finds wtc names, and `0.4.x` ignores them.

Don't plan a direct jump from `0.1.x` or early `0.2.x` to `0.3.x`. Migrate on `0.2.x` first. You can keep a pinned release while scheduling that work; installing a newer release elsewhere does not automatically upgrade every harness.

## Standalone installs and OpenClaw

**No team harness?** `wtc upgrade` is a harness command. Update standalone installations through the method you used to install them, such as mise or a downloaded release archive. From 0.2.0, install with `brew install lcorneliussen/taba/taba`, `mise use -g github:lcorneliussen/taba@0.2.0`, or a `taba_<version>_<os>_<arch>.tar.gz` release archive; each provides both `taba` and `wtc`. Existing ad-hoc collections keep working unchanged. No fresh workspace is needed just because the product has a new name.

**Using OpenClaw?** Ask the gateway administrator to upgrade the CLI and its matching embedded plugin together, or to rebuild and redeploy the pinned gateway image. The plugin rename is planned, with a doctor-assisted config migration. Don't rename the plugin entry by hand ahead of that release. See the [gateway upgrade guide](../docs/upgrades/#openclaw-gateway-upgrade).

## Follow the transition

We update this page as each phase ships. For the detailed plan and implementation status, see the [rename tracking issue](https://github.com/lcorneliussen/taba/issues/200) and its phase issues: [preparation](https://github.com/lcorneliussen/taba/issues/201), [first taba release](https://github.com/lcorneliussen/taba/issues/202), [new names](https://github.com/lcorneliussen/taba/issues/203), and [compatibility removal](https://github.com/lcorneliussen/taba/issues/204).

Everyone deserves monorepos. Even those who don't have them.
