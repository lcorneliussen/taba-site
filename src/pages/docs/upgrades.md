---
layout: ../../layouts/Docs.astro
title: Upgrades and release notes
description: Review the target release before changing a CLI pin or gateway plugin.
source: https://github.com/lcorneliussen/taba/blob/v0.1.51/docs/release-notes.md
---

## Moving to v0.2.5: receiving roots and managed tunnels

[v0.2.5](https://github.com/lcorneliussen/taba/releases/tag/v0.2.5) adds receiving-owned
control roots, named tunnel policy and lifecycle controls, and reported tunnel
access glyphs. Review its [numbered release notes](https://github.com/lcorneliussen/taba/blob/v0.2.5/internal/wtc/release-notes/0.2.5.md)
before changing a pin or gateway plugin. The [configuration guide](../configuration/#receiving-owned-control-roots)
explains receiving permission and the bounded generated-root repair; the
[services guide](../services/#named-tunnels-and-receiving-policy) explains
defaults, overrides, explicit provider inputs and exposure consent. The
[source contract](https://github.com/lcorneliussen/taba/blob/v0.2.5/internal/wtc/defaults/instructions/runtime.md#daily-lifecycle-and-agent-access)
contains the complete provider and lifecycle reference.

Dev Tunnel hosting needs an already installed **Node22 or newer** runtime and
the bundled helper. Other providers, registration status and pure reads do not
require Node; the helper does not fetch packages at runtime. Review the actual
provider inputs before starting a tunnel rather than relying on a global login.

Keep the upgraded CLI and bundled gateway plugin together, and reload open
Control UI tabs after installation. Keep cleanup code and scoped credentials
available until recorded tunnel and callback obligations have cleared. A stop
keeps a stable registration; retirement must also clean up stopped registrations.
Unknown ownership or uncertain cleanup blocks retirement without a force bypass.

Managed obligations use Schema2 manifests. Published v0.2.4 refuses that schema
before runtime teardown and worktree deletion, but its earlier `retire.pre`
hook may already have run. An old client cannot protect a corrupted or deleted
manifest retroactively. The new retirement path also checks the ownership
journal before destructive legacy pre-hooks. Use the upgraded client for cleanup;
do not treat the old-client refusal as protection against every earlier hook.
See [cleanup and uncertain state](../services/#cleanup-and-uncertain-state).

## Moving to v0.2.4

[v0.2.4](https://github.com/lcorneliussen/taba/releases/tag/v0.2.4) adds `taba-*` skills with old-name shims, new harness filenames, and convention findings in `taba doctor`. Upgrade the pinned CLI across the workspace before renaming harness files or overrides. Run `taba skills diff`, preserve patches and review their new bases; `taba doctor --all` and `taba conventions` guide the optional 0.2.x migration. Read the [exact migration order](https://github.com/lcorneliussen/taba/blob/v0.2.4/docs/conventions.md) before moving files. The historical examples below remain versioned.

Gateway administrators must install the matching bundled plugin with `taba openclaw install`, then reload open Control UI tabs. The main gateway skill is `taba`; `wtc` remains its compatibility alias. Plugin IDs and existing configuration keys still use `wtc`. Review the [published gateway upgrade contract](https://github.com/lcorneliussen/taba/blob/v0.2.4/docs/openclaw.md#upgrade); this is distinct from upgrading OpenClaw itself.

## Review the target, not just the installed binary

For the rename's upgrade sequence and timeline, read [wtc is now taba](../../wtc-is-now-taba/). The first taba release, 0.2.0, ships both `taba` and `wtc`; this guide's examples still use `wtc`, which keeps working.

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
