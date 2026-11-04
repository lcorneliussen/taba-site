---
layout: ../../layouts/Docs.astro
title: Upgrades and release notes
description: Review the target release before changing a CLI pin or gateway plugin.
source: https://github.com/lcorneliussen/taba/blob/v0.1.51/docs/release-notes.md
---

## Review the target, not just the installed binary

For the rename's planned upgrade sequence and timeline, read [wtc is now taba](../../wtc-is-now-taba/). The CLI transition has not shipped yet; this guide covers released WTC versions.

This handbook's examples target **v0.1.51**. That is a reviewed baseline, not a promise that it is the latest release.

Release notes are embedded, offline documents. Download the target binary before changing a harness pin, then use it to run:

```sh
wtc release-notes --since 0.1.48
wtc release-notes --list
```

The range excludes the baseline and unreleased changes. An older installed binary cannot fetch future notes. Use GitHub Releases for versions predating the release-notes command.

## Local harness upgrade

Review all changes since the old pin. Update `.wtc-cli-version` and the compatibility range together, preserving hooks and overrides. Run `wtc skills diff`, regenerate with `wtc env setup`, install tools with mise when used, then re-render skills and MCP configuration. Test changed behavior in a disposable collection before adoption. The shipped `wtc-harness-upgrade` skill provides the full procedure.

## OpenClaw gateway upgrade

The CLI and its embedded plugin must match. A gateway administrator replaces the CLI, runs `wtc openclaw install` to replace and reload its plugin, and reloads open Control UI tabs. Image-managed gateways should bump the pinned image inputs and redeploy instead of installing by hand. Use `wtc doctor --openclaw` afterward.

See the [upstream gateway guide](https://github.com/lcorneliussen/taba/blob/v0.1.51/docs/openclaw.md#upgrade) for prerequisites, image setup, and optional forge plugins. This upgrades WTC, not OpenClaw itself.

## Find the canonical release notes

The [GitHub release archive](https://github.com/lcorneliussen/taba/releases) and the numbered notes embedded in each binary share the same canonical source. Historical notes describe their release, not necessarily current behavior.

| Release | What to review |
| --- | --- |
| [0.1.49](https://github.com/lcorneliussen/taba/blob/v0.1.51/internal/wtc/release-notes/0.1.49.md) | Registry-driven project selection, explicit handling of unregistered repositories, collection folder layout |
| [0.1.50](https://github.com/lcorneliussen/taba/blob/v0.1.51/internal/wtc/release-notes/0.1.50.md) | Wtc projects terminology, PR titles/descriptions and notifications, sandbox catch-up |
| [0.1.51](https://github.com/lcorneliussen/taba/blob/v0.1.51/internal/wtc/release-notes/0.1.51.md) | Project suggestions, optional sent-message decision processing, quieter owner-session startup |

These are discovery summaries, not substitutes for the full upgrade range. For earlier history, use the [canonical notes archive](https://github.com/lcorneliussen/taba/tree/v0.1.51/internal/wtc/release-notes) or the target binary.
