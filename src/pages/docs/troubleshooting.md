---
layout: ../../layouts/Docs.astro
title: Troubleshooting
description: Diagnose host, workspace, and runtime issues without discarding work.
source: https://github.com/lcorneliussen/taba/blob/v0.1.51/docs/commands.md
---

## First checks

Run these in the intended collection:

```sh
wtc --version
wtc host
wtc status
wtc doctor
```

Under OpenClaw, `wtc status <name>` inspects a named collection. `wtc doctor` checks configuration and dependencies, not application correctness.

## Missing command or different behavior

Check `wtc <command> --help` and the installed version. This site’s quick start targets v0.1.51. A harness may pin another version in `.wtc-cli-version`. Before upgrading, read `wtc release-notes --since <old-pin>` with the target binary and test in a disposable collection.

Embedded instructions (`wtc docs`) match the installed binary. Use `wtc docs setup.md` to choose local, harness, or OpenClaw setup.

## Detached worktree

Local worktrees start detached at the configured target. Create a task branch with `git switch -c <task-name>` before committing. Managed OpenClaw worktrees already have `openclaw/<name>` branches. Do not replace their setup with `wtc init` or `wtc new`.

## A JSON plan did not create a worktree

Under OpenClaw, the agent must run the printed tool intents with exact arguments. Add an unavailable repository in the Collection panel, or select a harness if taba asks. See [Under OpenClaw](../openclaw/).

## Service readiness failure

Check `wtc svc` and `wtc svc logs <service>`. Confirm the runtime is enabled, dekit is installed, the command stays in the foreground, and the app uses its allocated port. After changing other environment variables, stop and start the runtime to reload the runner environment. See [Services and previews](../services/).

## Publication or retirement refused

Resolve unfinished merges and inspect pending files. Never publish credentials. Do not rebase or amend published managed history; merge to catch up.

Local work, an unconfirmed runner stop, or failed resource cleanup blocks retirement. Preserve worktrees and cleanup receipts, fix the reported cause, and retry. Do not manually delete a collection to bypass failed teardown.

## Report a bug

File bugs in the [CLI issue tracker](https://github.com/lcorneliussen/taba/issues) with taba version, host mode, OS, command, expected result, and a minimal reproduction. Redact credentials, private repository names, environment values, and application logs before sharing.
