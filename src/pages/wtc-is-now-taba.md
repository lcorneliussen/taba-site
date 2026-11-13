---
layout: ../layouts/Announcement.astro
title: wtc is now taba
description: A name you can say. A bundle of repos. More room for the whole task.
updated: '2026-11-09'
---

We're giving wtc a new name: **taba**. It brings the repositories of a task together, so you can work across them with your editor, your agents, and the tools you already use.

> **taba 0.2.0 is out.** Since 9 November 2026, releases ship a `taba` command next to `wtc`, from the [lcorneliussen/taba](https://github.com/lcorneliussen/taba) repository. `wtc` keeps working, and existing collections, harnesses, pins, files and variables need no changes. The new file, variable and skill names are still ahead, in the planned `0.3.0` phase. See the [0.2.0 release notes](https://github.com/lcorneliussen/taba/releases/tag/v0.2.0).

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
| Harness pin | `.wtc-cli-version` | `.taba-version` | Planned for 0.3.0 |
| Harness configuration | `wtc.toml` | `taba.toml` | Planned for 0.3.0 |
| Generated collection data | `.wtc/` | `.taba/` | Planned for 0.3.0 |
| Collection scope | `WTC-SCOPE.md` | `SCOPE.md` | Planned for 0.3.0 |
| Environment variables | `WTC_*` | `TABA_*` | Both emitted since 0.2.0 |
| Agent skills | `wtc-*` | `taba-*` | Planned for 0.3.0 |

The collection environment files, `.env.collection` and `.env.collection.local`, keep their names.

## The timeline

> **The stages are being revised.** The rename now moves through stages within 0.2.x before 0.3.0 and 0.4.0 retire the old names. See [Rename conventions](../docs/conventions/) for the current stages, each old name and how to migrate it, and [#375](https://github.com/lcorneliussen/taba/issues/375) for the plan. The table below and the 0.3.0 and 1.0 targets elsewhere on this page predate that revision; where they differ, the conventions page is current.

Future stages are **release targets, not announced release dates**. The [rename plan](https://github.com/lcorneliussen/taba/issues/200) tracks the work and any changes to the schedule.

| Stage | Timing | What to expect |
| --- | --- | --- |
| Website | Live by 26 October 2026 | `taba.sh` serves the site. `wtc.sh` redirects, preserving page paths. |
| Preparation | `0.1.x` releases | Compatibility groundwork under the existing name. |
| First taba release | Released 9 November 2026: `0.2.0` | Both commands ship. Reads accept old and new names; file writes keep the old names. Environment files emit both variable prefixes. |
| New names by default | Target: `0.3.0`, at least two weeks after `0.2.0` | Migrate configuration and generated files, adopt `taba-*` skills, and migrate the OpenClaw plugin. |
| Compatibility removal | Target: `1.0`; date and exact window still to be confirmed | Remove the old command, variables, file-name fallbacks, and skill redirects after advance notice and migration checks. |

The current proposal mentions **four minor releases / three months after the new-name migration** as the minimum window; the exact rule has not been finalized. We'll publish the confirmed window and removal release before asking people to move off the old names. No calendar deadline has been announced.

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

### 2. When 0.3 ships: migrate the names

Start in one collection with a clean harness worktree:

```sh
# Planned: only after 0.3.0 has been published
taba upgrade --version 0.3.0 --dry-run
taba upgrade --version 0.3.0
```

After installing the target release, run its collection migration:

```sh
# Planned migration command in the upgraded collection
taba catch-up
```

The migration is planned to rename generated local files and update the mise tool key. Review the version upgrade and naming changes together. Tracked harness changes, including `.taba-version` and `taba.toml`, stay as a diff for you to test and commit through your normal process. Preserve your project hooks, local settings, and skill customizations.

Update your scripts to `taba` and `TABA_*`, and rename harness skill overrides from `wtc-*` to `taba-*`. Use `taba skills diff` to review remaining overrides. After the migration change has merged, use `taba upgrade --rollout` and check its report.

In the planned transition, new environment-variable names take precedence when both prefixes are set. Generated environment files emit both prefixes so hooks can migrate gradually. Old skill names become redirects during the window.

### 3. Before compatibility is removed: check what's left

The removal release is planned to include migration checks through `taba doctor`, and to refuse a harness upgrade while old names remain. Use those checks and the removal release's notes to finish the migration before upgrading.

Don't plan a direct jump from `0.1.x` or `0.2.x` to the removal release. Move through the migration-capable `0.3.x` series first. You can keep a pinned release while scheduling that work; installing a newer release elsewhere does not automatically upgrade every harness.

## Standalone installs and OpenClaw

**No team harness?** `wtc upgrade` is a harness command. Update standalone installations through the method you used to install them, such as mise or a downloaded release archive. From 0.2.0, install with `brew install lcorneliussen/taba/taba`, `mise use -g github:lcorneliussen/taba@0.2.0`, or a `taba_<version>_<os>_<arch>.tar.gz` release archive; each provides both `taba` and `wtc`. Existing ad-hoc collections keep working unchanged. No fresh workspace is needed just because the product has a new name.

**Using OpenClaw?** Ask the gateway administrator to upgrade the CLI and its matching embedded plugin together, or to rebuild and redeploy the pinned gateway image. The plugin rename is planned for the `0.3.0` phase, with a doctor-assisted config migration. Don't rename the plugin entry by hand ahead of that release. See the [gateway upgrade guide](../docs/upgrades/#openclaw-gateway-upgrade).

## Follow the transition

We update this page as each phase ships. For the detailed plan and implementation status, see the [rename tracking issue](https://github.com/lcorneliussen/taba/issues/200) and its phase issues: [preparation](https://github.com/lcorneliussen/taba/issues/201), [first taba release](https://github.com/lcorneliussen/taba/issues/202), [new names](https://github.com/lcorneliussen/taba/issues/203), and [compatibility removal](https://github.com/lcorneliussen/taba/issues/204).

Everyone deserves monorepos. Even those who don't have them.
