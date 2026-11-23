---
layout: ../../layouts/Docs.astro
title: Upgrades and release notes
description: Review the target release before changing a CLI pin or gateway plugin.
source: https://github.com/lcorneliussen/taba/blob/v0.1.51/docs/release-notes.md
---

## Moving to v0.2.5: receiving roots and managed tunnels

[v0.2.5](https://github.com/lcorneliussen/taba/releases/tag/v0.2.5) adds receiving-owned control roots, named tunnel policy and lifecycle controls, and reported tunnel access glyphs. Read its [numbered release notes](https://github.com/lcorneliussen/taba/blob/v0.2.5/internal/wtc/release-notes/0.2.5.md) before changing a pin or gateway plugin.

- [Configuration guide](../configuration/#receiving-owned-control-roots): receiving permission and bounded generated-root repair.
- [Services guide](../services/#named-tunnels-and-receiving-policy): defaults, overrides, explicit provider inputs and exposure consent.
- [Source contract](https://github.com/lcorneliussen/taba/blob/v0.2.5/internal/wtc/defaults/instructions/runtime.md#daily-lifecycle-and-agent-access): full provider and lifecycle reference.

Dev Tunnel hosting requires pre-installed **Node22 or newer** and the bundled helper. Other providers, registration status and pure reads do not need Node; the helper fetches no packages at runtime. Check provider inputs before starting a tunnel instead of relying on a global login.

Upgrade the CLI and bundled gateway plugin together, then reload open Control UI tabs. Keep cleanup code and scoped credentials until recorded tunnel and callback obligations clear. Stopping keeps a stable registration; retirement must also clean up stopped registrations. Unknown ownership or uncertain cleanup blocks retirement without a force bypass.

Managed obligations use Schema2 manifests. Use the upgraded client for cleanup: published v0.2.4 refuses Schema2 before runtime teardown and worktree deletion, but its `retire.pre` hook may already have run, and an old client cannot retroactively protect a corrupted or deleted manifest. The new retirement path checks the ownership journal before destructive legacy pre-hooks. See [cleanup and uncertain state](../services/#cleanup-and-uncertain-state).

## Moving to v0.2.4

[v0.2.4](https://github.com/lcorneliussen/taba/releases/tag/v0.2.4) adds `taba-*` skills with old-name shims, new harness filenames, and convention findings in `taba doctor`. Upgrade the pinned CLI across the workspace before renaming harness files or overrides. Run `taba skills diff`, preserve patches and review their new bases. Use `taba doctor --all` and `taba conventions` for the optional 0.2.x migration, and read the [exact migration order](https://github.com/lcorneliussen/taba/blob/v0.2.4/docs/conventions.md) before moving files.

Gateway administrators must install the matching bundled plugin with `taba openclaw install` and reload open Control UI tabs. The main gateway skill is `taba`, with `wtc` as its compatibility alias; plugin IDs and existing configuration keys still use `wtc`. See the [published gateway upgrade contract](https://github.com/lcorneliussen/taba/blob/v0.2.4/docs/openclaw.md#upgrade).

## Review the target, not just the installed binary

Release notes are embedded offline in each binary, so an older binary cannot show newer notes. Download the target binary before changing a harness pin, then run:

```sh
wtc release-notes --since 0.1.48
wtc release-notes --list
```

The range excludes the baseline and unreleased changes. Use GitHub Releases for versions predating `release-notes`.

This handbook's examples target **v0.1.51** (a reviewed baseline, not necessarily the latest release) and use `wtc`. Release 0.2.0 (the first taba release) ships both `taba` and `wtc`, so `wtc` keeps working. See [wtc is now taba](../../wtc-is-now-taba/) for the rename sequence and timeline.

## Local harness upgrade

Review all changes since the old pin. Update `.wtc-cli-version` and the compatibility range together, keeping hooks and overrides. Run `wtc skills diff`, regenerate with `wtc env setup`, install tools with mise if used, and re-render skills and MCP configuration. Test changed behavior in a disposable collection before adopting it. Use the shipped `wtc-harness-upgrade` skill for the full procedure.

## OpenClaw gateway upgrade

The CLI and its embedded plugin must match. Gateway administrators replace the CLI, run `wtc openclaw install` to replace and reload the plugin, and reload open Control UI tabs. On image-managed gateways, bump the pinned image inputs and redeploy instead. Verify with `wtc doctor --openclaw`.

This upgrades taba, not OpenClaw. See the [upstream gateway guide](https://github.com/lcorneliussen/taba/blob/v0.1.51/docs/openclaw.md#upgrade) for prerequisites, image setup, and optional forge plugins.

## Find the canonical release notes

The [GitHub release archive](https://github.com/lcorneliussen/taba/releases) and each binary's embedded notes share one source. Historical notes describe their release, not necessarily current behavior.

| Release | What to review |
| --- | --- |
| [0.1.49](https://github.com/lcorneliussen/taba/blob/v0.1.51/internal/wtc/release-notes/0.1.49.md) | Registry-driven project selection, explicit handling of unregistered repositories, collection folder layout |
| [0.1.50](https://github.com/lcorneliussen/taba/blob/v0.1.51/internal/wtc/release-notes/0.1.50.md) | `wtc` projects terminology, PR titles/descriptions and notifications, sandbox catch-up |
| [0.1.51](https://github.com/lcorneliussen/taba/blob/v0.1.51/internal/wtc/release-notes/0.1.51.md) | Project suggestions, optional sent-message decision processing, quieter owner-session startup |

Read the full upgrade range rather than relying on these summaries. For earlier releases, check the [canonical notes archive](https://github.com/lcorneliussen/taba/tree/v0.1.51/internal/wtc/release-notes) or the target binary.
