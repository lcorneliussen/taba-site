---
layout: ../../layouts/Docs.astro
title: Services and previews
description: Run existing development commands with collection-local ports, logs, and optional tunnels.
source: https://github.com/lcorneliussen/taba/blob/v0.1.51/internal/wtc/defaults/instructions/runtime.md
---

## Optional, not a new build system

The experimental runtime uses **dekit 0.10.x** to supervise ordinary foreground commands. Available from v0.1.40, it leaves your standalone development workflow intact. These examples target v0.1.51.

For a local harness, merge into its `wtc.toml` without duplicating existing tables:

```toml
[runtime]
backend = "dekit"

[mise.tools]
"github:pvolok/dekit" = "0.10.0"
```

Run `wtc env setup` and install the pinned tools with mise. Ad-hoc collections use `.wtc/config/wtc.toml`. Under OpenClaw, follow the gateway runtime setup instead of creating a local collection. Test in a disposable collection before adopting the runtime.

## Register a preview

From the application worktree, if its command already consumes `PORT`:

```sh
wtc svc add web --port-env PORT -- npm run dev
wtc svc
wtc svc logs web --tail 100
```

`add` registers **and starts** the service; `--no-start` registers only. The app must listen on the supplied port. If it requires a CLI flag, expand the variable in an explicit shell:

```sh
wtc svc add web --port-env PORT -- sh -c 'exec npm run dev -- --port "$PORT"'
```

Disable self-daemonization: the command must stay in the foreground. Local definitions live in `.wtc/svc/<repo>.yaml` and are not committed. Use `--shared` only to deliberately write the repository’s `.harness/dekit.tasks.yaml`.

## Discovery before first start in v0.1.62

[Published v0.1.62](https://github.com/lcorneliussen/taba/releases/tag/v0.1.62)
includes [service declaration discovery](https://github.com/lcorneliussen/taba/blob/v0.1.62/docs/service-discovery.md),
verified on 2026-10-28. The behavior below applies from v0.1.62; setup and start
examples elsewhere on this page retain their labeled release baselines.

`wtc svc`, `wtc svc status` and the initial status inventory include declarations
before their first render or start. Discovery reads checked-out repositories'
committed `.harness/dekit.tasks.yaml` and collection-local `.wtc/svc/<repo>.yaml`
additions. A repository must be a Git worktree in the collection. New siblings'
tasks appear beside existing runtime observations. Workspace-wide status uses
the same merge even when a collection's manifest is absent or invalid, or its
trusted runtime binary is unavailable; its trusted-binary rule and diagnostics
still apply.

A declared task absent from the runtime manifest is `unconfigured`: it has not
been imported into this collection's runtime configuration. That means neither
failure nor a running service. Names remain qualified by repository, so two
repositories can declare the same task name. Existing observations at the same
path take precedence, preserving failures, live URLs, resource states and tunnel
choices.

Discovery parses declarations without executing task commands, hooks, resource
commands, shell environment files or runtime planning. It does not render
configuration, create runtime state, link secrets, or start, reload or stop a
runner. Existing runtime status queries and health observations still apply to
recorded tasks; a new declaration causes no provider login query or address
probe.

Malformed YAML, invalid task names, duplicate shared/local names or symlinked
definition files/directories inside a checkout produce an `unknown`
configuration diagnostic for that repository. Other repositories and recorded
tasks remain visible; missing task files are normal. Gateway repository links
are supported, with shared files checked inside the resolved checkout and local
additions inside the collection. Inventory does not validate runnable
configuration: environment variables, working directories, runtime options and
environment-derived URLs still need an explicit render/start operation.

## Inspect, restart, stop

```sh
wtc svc restart web
wtc svc down web
wtc svc logs web
wtc svc up web
```

Closing the terminal or agent does **not** stop services. Logs remain available after shutdown. Readiness is a startup probe, not continuous health monitoring. Use repository-qualified names such as `api/web` when names are ambiguous.

Port isolation is not data isolation. Databases and Docker Compose projects need collection-specific identities too. `down` keeps data; teardown and retirement can remove collection-owned resources. Export valuable data and follow the upstream resource ownership contract before using cleanup hooks.

## Share deliberately

A local preview needs no tunnel. With Tailscale installed and authenticated, a private preview can use:

```sh
wtc svc tunnel web tailscale
wtc svc tunnel web --stop
```

Public exposure (`--public`) is a separate choice. Check authentication and exposed application data before sharing. Never put credentials in endpoint URLs or committed task files.

## Remembered tunnel choices in v0.1.61

[Published v0.1.61](https://github.com/lcorneliussen/taba/releases/tag/v0.1.61)
includes collection-local tunnel intent, verified on 2026-10-27. This behavior
applies from v0.1.61; the examples above retain their v0.1.51 baseline. See the
[v0.1.61 runtime contract](https://github.com/lcorneliussen/taba/blob/v0.1.61/internal/wtc/defaults/instructions/runtime.md)
for the released behavior.

After you enable a tunnel with `wtc svc tunnel`, ordinary `wtc svc down web`
stops it without forgetting your choice. `wtc svc up web` and
`wtc svc restart web` restore it after provider checks, including a public
tunnel you previously approved. `restart` still needs a running runner.
`wtc svc tunnel web --stop` records off and keeps the tunnel off across later
service starts, overriding its declaration's autostart default. If stopping
fails, off is still recorded; retry the stop to confirm shutdown.

Choices belong to each collection and service endpoint, so two collections can
choose differently. With no explicit choice, declaration defaults still apply.
Untargeted `up` restores tunnels for autostart or already running services;
untargeted `restart` leaves stopped services off. Startup stops at the first
failure: inspect the error and status, fix the provider or service, then retry.

Changing the tunnel command, provider, destination or exposure, or removing and
reusing its task path, requires a fresh tunnel choice and `--public` when
applicable. Status reports an intended-on tunnel that is not running as a
lifecycle problem, separately from login, reachability and exposure. Ordinary
`down` can therefore show that problem until you start the service again or
explicitly choose tunnel off. JSON keeps `tunnel_intent` and `lifecycle`
separate from the observed runner `state`.
