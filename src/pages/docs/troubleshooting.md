---
layout: ../../layouts/Docs.astro
title: Troubleshooting
description: Diagnose host, workspace, and runtime issues without discarding work.
source: https://github.com/lcorneliussen/taba/blob/v0.1.51/docs/commands.md
---

## First checks

```sh
wtc --version
wtc host
wtc status
wtc doctor
```

Run these in the intended collection. Under OpenClaw, `wtc status <name>` inspects a named collection. Doctor checks configuration and dependencies, not application correctness.

## Missing command or different behavior

Check `wtc <command> --help` and the installed version. This site’s quick start targets v0.1.51; a harness may pin another version in `.wtc-cli-version`. Read `wtc release-notes --since <old-pin>` with the target binary before upgrading, then test in a disposable collection.

Embedded instructions (`wtc docs`) match the installed binary. `wtc docs setup.md` helps choose between local, harness, and OpenClaw setup.

## Detached worktree

Local worktrees start detached at the configured target. Create a task branch with `git switch -c <task-name>` before committing. Managed OpenClaw worktrees already have `openclaw/<name>` branches: do not replace their setup with `wtc init` or `wtc new`.

## A JSON plan did not create a worktree

Under OpenClaw, the agent must execute the printed tool intents with their exact arguments. Add an unavailable repository through the Collection panel, or select a harness if WTC asks. See [Under OpenClaw](../openclaw/).

## Service readiness failure

Read `wtc svc` and `wtc svc logs <service>`. Confirm the runtime is enabled, dekit is installed, the command stays in the foreground, and the app uses its allocated port. After changing other environment variables, stop and start the runtime to reload the runner environment. See [Services and previews](../services/).

## Publication or retirement refused

Resolve unfinished merges and inspect pending files; never publish credentials. Do not rebase or amend published managed history. Catch up by merging.

Retirement can be blocked by local work, an unconfirmed runner stop, or failed resource cleanup. Preserve worktrees and cleanup receipts, fix the reported cause, and retry. Do not manually delete a collection to bypass failed teardown.

## Report a bug

Include WTC version, host mode, OS, command, expected result, and a minimal reproduction in the [CLI issue tracker](https://github.com/lcorneliussen/taba/issues). Redact credentials, private repository names, environment values, and application logs before sharing.
