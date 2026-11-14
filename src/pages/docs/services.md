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

## Named tunnels and receiving policy

[v0.2.5](https://github.com/lcorneliussen/taba/releases/tag/v0.2.5) adds named
tunnels with desired policy in the receiving collection's
`.config/tunnels.toml`, over defaults in the receiving project root's
`.config/tunnels.toml`. These paths do not move with a credential-root override.
An entry identifies a registered repository, service and tunnel name. A
collection entry replaces the whole matching default; an entry containing only
`enabled = false` disables it. Removing that override restores inheritance.
Several names can expose one service, while unmatched definitions are shown
without provisioning them. See the
[canonical runtime contract](https://github.com/lcorneliussen/taba/blob/v0.2.5/internal/wtc/defaults/instructions/runtime.md#daily-lifecycle-and-agent-access)
for the schema, provider inputs and complete command reference.

Configure and disable write collection overrides. A native operator can
explicitly choose `--project` for receiving project defaults from an actual
member collection. Collection UI authority does not grant project writes or
arbitrary definition-file selection. Snapshot-only contexts remain read-only.
Provider setup guidance does not install a client, log in or start a tunnel.

### Explicit inputs and exposure consent

Built-in providers use explicitly supplied scoped credential files, executables
or an authorized daemon socket. They do not discover a login, keychain or
profile, or fetch packages at runtime. File references stay inside the approved
receiving credential root; a file's existence does not prove the provider grants
the required management, hosting or cleanup permission. See
[Configuration and secrets](../configuration/#receiving-owned-control-roots).

Provider requirements differ. Named Cloudflare tunnels need exact account/zone
and hostname inputs, capabilities and an absolute cloudflared executable.
Ngrok uses its bundled Go SDK and an explicit domain and hosting capability;
an existing domain is borrowed unless reservation is explicitly requested.
Microsoft Dev Tunnel hosting uses the shipped helper and an existing
**Node22 or newer** runtime, selected by an absolute path. Other providers,
registration status and pure reads need no Node. Dev Tunnel backends require an
explicit IPv4/localhost HTTP port without a backend path.

Tailscale needs an explicitly authorized socket, expected node identity and
listener/path. It does not discover profiles, enable Funnel, reset the daemon
or widen unrelated listeners. Start and reconcile observe that exact scope;
pure status performs no daemon I/O. Conditional writes preserve unrelated
handlers, but the configuration ETag cannot make an external profile switch
atomic with the operation.

`--public` approves potential public exposure for the current effective
definition, including its target, provider inputs, receiving scope, hook code
and reload targets. A provider name, HTTPS or a declared protected/account
policy does not prove enforced private access. Fresh observed tailnet evidence
can establish Tailscale access; otherwise potential-public approval is required.
Changing the definition requires renewed approval and cleanup of retained old
obligations. UI start/register approval identifies the exact current definition
hash. Explicit inputs and minimal child environments do not create an OS sandbox.

### Registration, running sessions and app configuration

For an already configured named entry, the lifecycle commands distinguish
registration from an active session:

```sh
taba svc tunnel web --name preview --action register --public
taba svc tunnel web --name preview --public
taba svc tunnel web --name preview --stop
taba svc tunnel web --name preview --action unregister
taba svc tunnel web --name preview --action reconcile
```

These are effectful commands: inspect the exact definition and grant its
required consent first. Stop records start-off for this collection and retains
stable registration. Ordinary service down stops sessions without erasing
desired selection; up/restart restore selected or `start_with_service` entries
only with current approval. A registration URL is separate from an active URL;
registered-but-stopped entries are absent from active host/origin publications.

Persistent modes expose registered, started, stopped and unregistered events;
temporary modes expose started/stopped only. Event commands receive typed JSON
with identity, stable operation/event IDs, previous/current addresses and active
snapshots. Consumers read `tunnel-publications/current.json` once, then use both
immutable host and origin files from that revision. Hostnames are deduplicated;
origins retain scheme and port. Declared app reloads follow events and active-data
publication without restarting the tunnel. Use the upstream contract rather
than rewriting tracked application configuration or duplicating the event schema.

### Cleanup and uncertain state

Status and discovery read desired and recorded tunnel state without provider,
daemon or account queries, credential reads, hooks, repair or allocation. A
recorded active address is not a continuing readiness or access-policy check.
`pending` and `lifecycle` retain interrupted operations. Reconcile uses supported
exact evidence; it does not blindly replay an unknown remote effect or arbitrary
callback. Some ambiguity needs manual restoration or confirmation and stays pending.

Cleanup retains exact owned resource and callback receipts, including stopped
registrations. Borrowed resources and unrelated listeners are preserved.
Missing, expired or insufficient capabilities retain cleanup information;
credential rotation cannot make another account's 404 proof of deletion.
Callback failures retain the original pending event; arbitrary callback effects
are not exactly once. Restore changed cleanup code before retiring and keep its
credentials available until obligations clear.

A crashed foreground host or uncertain child identity keeps its session pending.
Stopping a process does not establish remote-resource or callback cleanup.
Process identity is checked before signalling, but a numeric-PID fallback on
Linux or macOS leaves a non-atomic read/signal interval; it cannot exclude every
PID-reuse race. New retirement checks the ownership journal even without a
manifest and validates cleanup before destructive legacy pre-hooks. Unknown or
uncertain cleanup blocks retirement without a force bypass. Only exact verified
tool-owned non-secret collection policy can be removed; sole credentials,
unknown or edited files and project control data are preserved. Review the
[old-client pre-hook limit](../upgrades/#moving-to-v025-receiving-roots-and-managed-tunnels)
before using an older binary against managed state.

## Share deliberately (v0.1.51 example)

A local preview needs no tunnel. This historical v0.1.51 example used an installed,
authenticated Tailscale client. For named tunnels, use the explicit inputs and
consent described above rather than assuming that login is sufficient:

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
