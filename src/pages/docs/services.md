---
layout: ../../layouts/Docs.astro
title: Services and previews
description: Run existing development commands with collection-local ports, logs, and optional tunnels.
source: https://github.com/lcorneliussen/taba/blob/v0.1.51/internal/wtc/defaults/instructions/runtime.md
---

## Optional, not a new build system

Supervise foreground commands with the experimental **dekit 0.10.x** runtime; your standalone workflow stays intact (from v0.1.40; examples target v0.1.51).

For a local harness, merge into `wtc.toml` without duplicate tables:

```toml
[runtime]
backend = "dekit"

[mise.tools]
"github:pvolok/dekit" = "0.10.0"
```

Run `wtc env setup`, then install pinned tools with mise. Ad-hoc collections use `.wtc/config/wtc.toml`; under OpenClaw, follow gateway runtime setup instead of creating a local collection. Try it in a disposable collection first.

## Register a preview

From the application worktree, if the command consumes `PORT`:

```sh
wtc svc add web --port-env PORT -- npm run dev
wtc svc
wtc svc logs web --tail 100
```

`add` registers **and starts** the service (`--no-start` registers only). The app must listen on the supplied port; for a CLI flag, expand `PORT` in a shell:

```sh
wtc svc add web --port-env PORT -- sh -c 'exec npm run dev -- --port "$PORT"'
```

Keep the command in the foreground (no self-daemonization). Local definitions stay uncommitted in `.wtc/svc/<repo>.yaml`; pass `--shared` only to write the repository's `.harness/dekit.tasks.yaml`.

## Discovery before first start in v0.1.62

In [v0.1.62](https://github.com/lcorneliussen/taba/releases/tag/v0.1.62) (verified 2026-10-28; [service declaration discovery](https://github.com/lcorneliussen/taba/blob/v0.1.62/docs/service-discovery.md)), `wtc svc`, `wtc svc status` and initial status inventory list declarations before first render or start. Other examples keep their labeled baselines.

Discovery reads committed `.harness/dekit.tasks.yaml` and collection-local `.wtc/svc/<repo>.yaml` from Git worktrees in the collection; new siblings' tasks appear beside existing runtime observations. Gateway repository links check shared files in the resolved checkout and local additions in the collection. Workspace-wide status runs the same merge when a manifest is absent or invalid or the trusted runtime binary is unavailable; trusted-binary rules and diagnostics still apply.

- **State:** Tasks outside the runtime manifest report `unconfigured` (unimported: neither failed nor running). Repository-qualified names let two repositories share a task name. Existing observations at the same path win, preserving failures, live URLs, resource states and tunnel choices.
- **Read-only:** Discovery executes no task/resource commands, hooks, shell env files or runtime planning, and never renders config, creates runtime state, links secrets, or starts, reloads or stops a runner. Recorded tasks keep runtime status and health queries; new declarations trigger no provider login query or address probe.
- **Diagnostics:** Malformed YAML, invalid task names, duplicate shared/local names or symlinked definition files/directories inside a checkout produce an `unknown` configuration diagnostic for that repository without hiding others (missing task files are normal). Inventory does not validate runnable config: env vars, working directories, runtime options and env-derived URLs still need explicit render/start.

## Inspect, restart, stop

```sh
wtc svc restart web
wtc svc down web
wtc svc logs web
wtc svc up web
```

Closing the terminal or agent does **not** stop services; logs stay available after shutdown. Readiness is a startup probe, not ongoing health monitoring. Qualify ambiguous names by repository (`api/web`).

Port isolation is not data isolation: give databases and Docker Compose projects collection-specific identities. `down` keeps data; teardown and retirement can remove collection-owned resources. Export valuable data and follow the upstream resource ownership contract before using cleanup hooks.

## Named tunnels and receiving policy

In [v0.2.5](https://github.com/lcorneliussen/taba/releases/tag/v0.2.5), named tunnels load policy from the receiving collection's `.config/tunnels.toml` over defaults in the receiving project root's `.config/tunnels.toml` (credential-root overrides do not move these paths). Entries identify a registered repository, service and tunnel name. A collection entry replaces the whole default; `enabled = false` alone disables it, and removing it restores inheritance. Multiple names can expose one service; unmatched definitions are shown without being provisioned. Schema, provider inputs and commands live in the [canonical runtime contract](https://github.com/lcorneliussen/taba/blob/v0.2.5/internal/wtc/defaults/instructions/runtime.md#daily-lifecycle-and-agent-access).

Configure and disable write collection overrides; native operators can pass `--project` from a member collection to edit receiving project defaults. Collection UI authority never grants project writes or arbitrary definition-file selection, and snapshot-only contexts stay read-only. Provider setup guidance never installs a client, logs in or starts a tunnel.

### Collection-env targets in v0.2.8

In [v0.2.8](https://github.com/lcorneliussen/taba/releases/tag/v0.2.8), `taba svc tunnel --name` and `start_with_service` resolve `x-wtc.port_env` and `x-wtc.url_env` from collection env (like `taba svc up`), alongside literal `x-wtc.url`. Versions v0.2.5 through v0.2.7 accepted only literal `x-wtc.url` and failed with "needs an explicit local URL/port". Unresolved targets name the missing variable or declaration. See the [v0.2.8 runtime contract](https://github.com/lcorneliussen/taba/blob/v0.2.8/internal/wtc/defaults/instructions/runtime.md) for `x-wtc` keys.

### Explicit inputs and exposure consent

Built-in providers require explicit scoped credential files, executables or an authorized daemon socket; they never discover logins, keychains or profiles, or fetch packages at runtime. File paths stay inside the approved receiving credential root, and a file's presence does not prove management, hosting or cleanup permission. See [Configuration and secrets](../configuration/#receiving-owned-control-roots).

- **Cloudflare:** Exact account/zone, hostname, capabilities and an absolute cloudflared executable.
- **Ngrok:** Bundled Go SDK, explicit domain and hosting capability; existing domains are borrowed unless reservation is requested.
- **Microsoft Dev Tunnel:** Shipped helper and an existing **Node22 or newer** runtime selected by absolute path (other providers, registration status and pure reads need no Node). Backends require an explicit IPv4/localhost HTTP port with no backend path.
- **Tailscale:** Explicitly authorized socket, expected node identity and listener/path. Never discovers profiles, enables Funnel, resets the daemon or widens unrelated listeners. Start and reconcile observe only that exact scope; pure status does no daemon I/O. Conditional writes keep unrelated handlers, though the configuration ETag cannot make an external profile switch atomic with the operation.

`--public` approves potential public exposure for the current effective definition (target, provider inputs, receiving scope, hook code, reload targets). Provider name, HTTPS or a declared protected/account policy does not prove private access. Only fresh observed tailnet evidence can establish Tailscale access; otherwise potential-public approval is required. Definition changes require renewed approval and cleanup of retained old obligations. UI start/register approval binds to the current definition hash. Explicit inputs and minimal child environments are not an OS sandbox.

### Registration, running sessions and app configuration

For a configured named entry, lifecycle commands separate registration from an active session:

```sh
taba svc tunnel web --name preview --action register --public
taba svc tunnel web --name preview --public
taba svc tunnel web --name preview --stop
taba svc tunnel web --name preview --action unregister
taba svc tunnel web --name preview --action reconcile
```

These commands have side effects: inspect the exact definition and grant consent first. Stop records start-off for this collection while keeping stable registration. Service down stops sessions without clearing desired selection; up and restart restore selected or `start_with_service` entries only with current approval. Registration and active URLs stay separate, and registered-but-stopped entries stay out of active host/origin publications.

Persistent modes emit registered, started, stopped and unregistered events; temporary modes emit started/stopped only. Event commands get typed JSON with identity, stable operation/event IDs, previous/current addresses and active snapshots. Consumers read `tunnel-publications/current.json` once, then both immutable host and origin files from that revision (hostnames deduplicated; origins keep scheme and port). Declared app reloads run after events and publication without restarting the tunnel. Follow the upstream contract rather than rewriting tracked app config or duplicating the event schema.

### Cleanup and uncertain state

Status and discovery read desired and recorded tunnel state only: no provider, daemon or account queries, credential reads, hooks, repair or allocation. Recorded active addresses are not ongoing readiness or access-policy checks.

- **Pending and reconcile:** `pending` and `lifecycle` retain interrupted operations. Reconcile acts on supported exact evidence and never replays unknown remote effects or arbitrary callbacks; ambiguity stays pending for manual restoration or confirmation.
- **Receipts and callbacks:** Cleanup tracks exact owned resource and callback receipts (including stopped registrations) and preserves borrowed resources and unrelated listeners. Missing, expired or insufficient capabilities keep cleanup records; credential rotation cannot turn another account's 404 into proof of deletion. Failed callbacks keep the original pending event; arbitrary callbacks are not exactly once. Restore changed cleanup code before retiring and keep credentials available until obligations clear.
- **Processes and retirement:** A crashed foreground host or uncertain child identity leaves the session pending; stopping a process never proves remote-resource or callback cleanup. Process identity is checked before signalling, but numeric-PID fallback on Linux or macOS leaves a non-atomic read/signal window and cannot exclude every PID-reuse race. Retirement checks the ownership journal even without a manifest, validates cleanup before destructive legacy pre-hooks, and blocks on unknown or uncertain cleanup (no force bypass). Only verified tool-owned non-secret collection policy can be removed; sole credentials, unknown or edited files and project control data stay intact. Review the [old-client pre-hook limit](../upgrades/#moving-to-v025-receiving-roots-and-managed-tunnels) before running an older binary against managed state.

## Share deliberately (v0.1.51 example)

Local previews need no tunnel. This v0.1.51 example relied on an installed, authenticated Tailscale client; for named tunnels, supply explicit inputs and consent above instead of relying on login:

```sh
wtc svc tunnel web tailscale
wtc svc tunnel web --stop
```

Public exposure (`--public`) is a separate choice. Check authentication and exposed application data before sharing; never put credentials in endpoint URLs or committed task files.

## Remembered tunnel choices in v0.1.61

In [v0.1.61](https://github.com/lcorneliussen/taba/releases/tag/v0.1.61) (verified 2026-10-27; [v0.1.61 runtime contract](https://github.com/lcorneliussen/taba/blob/v0.1.61/internal/wtc/defaults/instructions/runtime.md)), collections remember tunnel intent per service endpoint. The examples above keep their v0.1.51 baseline.

- **Lifecycle:** After `wtc svc tunnel` enables a tunnel, `wtc svc down web` stops it without forgetting your choice. `wtc svc up web` and `wtc svc restart web` restore it after provider checks, including previously approved public tunnels (`restart` still needs a running runner). `wtc svc tunnel web --stop` records off and keeps the tunnel off across later starts, overriding autostart defaults; even if stopping fails, off is recorded, so retry to confirm shutdown.
- **Scope and startup:** Choices apply per collection and service endpoint; unset endpoints use declaration defaults. Untargeted `up` restores tunnels for autostart or running services; untargeted `restart` leaves stopped services off. Startup stops at the first failure: inspect error and status, fix the provider or service, then retry.
- **Invalidation and status:** Changing the tunnel command, provider, destination or exposure, or removing and reusing its task path, requires a fresh choice (and `--public` if applicable). Status reports an intended-on, non-running tunnel as a lifecycle problem, separate from login, reachability and exposure; `down` can show this until you start the service again or turn the tunnel off. JSON separates `tunnel_intent` and `lifecycle` from observed runner `state`.
