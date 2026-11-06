---
layout: ../../layouts/Docs.astro
title: Command reference
description: A compact map of everyday WTC commands, with a clear boundary between local and OpenClaw workflows.
source: https://github.com/lcorneliussen/wtc-cli/blob/v0.1.51/docs/commands.md
---

For complete options, use `wtc --help`, a command’s `--help`, or the upstream reference linked below. Available commands depend on the installed version.

For a complete representation walkthrough, see [Reading status](../status/):
Git differences, PR checks and reviews, shared-branch builds, follow-up after
merge, missing facts and compact layouts. That guide explicitly labels its
development-source examples; the release baselines below remain unchanged.

## Local collections

| Command | Use it to |
| --- | --- |
| `wtc init` | Turn an empty folder into an ad-hoc collection |
| `wtc add-repo <repo>` | Add a URL, checkout, or registered repository |
| `wtc new <slug> [repo ...]` | Start a sibling task with fresh worktrees |
| `wtc status` | Inspect repositories, local changes, and PRs |
| `wtc status --json` | Read status in machine-readable form |
| `wtc retire .` | Check for local work, then remove the collection |

Worktrees start detached. Create a branch before committing.

### Retirement assessment in v0.1.62

[Published v0.1.62](https://github.com/lcorneliussen/wtc-cli/releases/tag/v0.1.62)
includes the [retirement assessment](https://github.com/lcorneliussen/wtc-cli/blob/v0.1.62/docs/retirement.md),
verified on 2026-10-28. The behavior below applies from v0.1.62; the execution
example in the table above retains its older baseline.

Status shows a retirement assessment for each selected collection, separating
known preservation or unfinished-work blockers from unknown evidence. It records
when facts were observed; older cached snapshots may have no assessment. For
fresh detail, inspect without retiring anything:

```sh
wtc status --local --json
wtc retire --dry-run
wtc retire example-task --dry-run --json
```

The dry run defaults to the current collection and freshly reads Git heads,
source coverage and local metadata, with proposed follow-up work. It does not
reuse a cached verdict or run a full status refresh. Dirty or locally
unpreserved work, an unconsumed handoff, and preservation backups can block
retirement. Git comparisons use cached remote refs without fetching; those
refs do not prove preservation on the server.

The assessment reports `blocked` for known blockers, otherwise `unknown`.
It does not report `ready`: archive provenance, current forge/delivery facts
and live resources still need separate verification. Already observed open
PRs, pending delivery or active runtime facts can add blockers; missing facts
cannot clear unknown coverage. A cached assessment is never an execution permit.

Dry-run collection writes no report, cache, registry or source files and runs
no hooks, branch return, fetch, archive changes, resource stops or deletion.
Normal status keeps its existing refresh and snapshot behavior. Optional
`--transcript` input is dry-run-only: the bounded reader accepts explicitly
supplied Claude JSONL, labels matching assistant text an **untrusted hint**,
and does not discover or verify provider archives. Raw hints stay out of status
caches. Output can contain sensitive paths and conversation text; sanitize it
before sharing. See the pinned contract for input limits and provenance.

Real retirement still requires an explicit collection name and its existing
fresh preflight. `--force` cannot suppress dry-run blockers. The assessment adds
no automatic cleanup or confirmation policy and does not strengthen execution
enforcement. Verify preservation, delivery, resources and archive provenance
before a separate cleanup decision.

### Next actions in v0.1.60

Starting with v0.1.60, WTC adds next actions to the status table and live view. Press
`n` in the live view, select a repository, and press Enter to run a catch-up
that needs no approval, open a pull request, or ask the collection's idle
agent for the named skill. When no idle agent is available, the terminal
shows the instruction to give it. The view rechecks status before acting;
refreshing alone does not run actions.

See the [upstream command contract](https://github.com/lcorneliussen/wtc-cli/blob/v0.1.60/docs/commands.md)
for the v0.1.60 behavior. Other examples on this page retain their labeled
v0.1.51 baseline.

### Running CLI version in v0.1.62

The running-version display from [CLI #261](https://github.com/lcorneliussen/wtc-cli/pull/261)
is available in [published v0.1.62](https://github.com/lcorneliussen/wtc-cli/releases/tag/v0.1.62),
verified on 2026-10-28. Other examples on this page retain their labeled release
baselines.

The live header keeps `wtc status` together, followed by the collection and
refresh timing, then the running CLI version as a muted suffix. The suffix is
available before the first refresh finishes and during refresh failures. Narrow
terminals may clip it to preserve the primary title and timing. Stable versions
link to their matching release notes through a native terminal hyperlink
(modifier-click in supporting terminals). Dev, prerelease and unknown versions
do not invent release links.

The version identifies the running process, independently of the harness pin or
a newer installed binary. Local JSON adds the optional `cli_version` field to
schema 1; Markdown and one-shot tables show the snapshot producer too.
`--cached` preserves that producer's version, while the live TUI always shows
its own running version. Older snapshots without the field have an unknown
producer. See the [v0.1.62 status-version contract](https://github.com/lcorneliussen/wtc-cli/blob/v0.1.62/docs/status-version.md)
for the complete behavior and limits.

### Ahead counts and squash landing in v0.1.62

[Published v0.1.62](https://github.com/lcorneliussen/wtc-cli/releases/tag/v0.1.62)
adds [ahead and landing diagnostics](https://github.com/lcorneliussen/wtc-cli/blob/v0.1.62/docs/squash-status.md).
Ahead/behind remain raw commit counts, rather than changed-file counts or proof
of unpushed work. `ahead_ref` names the actual comparison ref; `ahead_basis`
distinguishes `upstream` from the `development-tip` fallback. A configured
upstream that Git reports missing displays `[gone]`.

For an enlisted merged PR still associated with its branch, inspect `landing`:

| Observation | Meaning and next inspection |
| --- | --- |
| `landed` — **fully landed; catch-up** | Evidence establishes full historical landing; residual ahead counts remain visible. |
| `follow-up` — **follow-up; inspect unlanded work** | Full landing is not established, the recorded merge is reachable, and HEAD has commits after that PR's recorded head. The compact STATE cell shows `⚠ extra`. |
| `unknown` — **landing unknown; inspect branch** | Forge facts or local objects do not establish landing or descent from the recorded PR head. Inspect the retained branch. |

These describe historical landing, rather than equality with today's tip.
Follow-up commits do not prove their content is absent from every later squash.
The observed PR head belongs to the matching PR and merge; it is not promised
immutable pre-merge evidence. Missing facts stay unknown. These observations
change no next-action authority, automatic return, retirement, landing or ref
preservation guards. Safe `git branch -d` may retain a squash ref. Residual
counts alone establish neither data loss nor permission for forced cleanup.

## Team setup and guidance

| Command | Use it to |
| --- | --- |
| `wtc harness init <folder> --remote <url> --cli-version <version>` | Scaffold a small, project-owned harness |
| `wtc env setup` | Generate collection-local environment configuration |
| `wtc env list` | Browse environment names and source scopes |
| `wtc secrets list` | Inspect secret link states without revealing values |
| `wtc customize` | Read the installed customization guide |
| `wtc docs` | Explore embedded guidance |

## Services and diagnostics

| Command | Use it to |
| --- | --- |
| `wtc svc` | Inspect services, tunnels, and resources |
| `wtc svc add web --port-env PORT -- npm run dev` | Register and start an existing foreground command that consumes PORT |
| `wtc svc logs web` | Read logs, including after shutdown |
| `wtc svc down web` | Stop a service while retaining logs and data |
| `wtc doctor` | Check configuration and dependencies |
| `wtc release-notes --since <old-pin>` | Review changes before upgrading |

Read [Services and previews](../services/) for the opt-in runtime prerequisites and [Troubleshooting](../troubleshooting/) for common failures.

## OpenClaw-managed collections

These commands describe the gateway-integrated build. Use the [OpenClaw guide](../openclaw/) rather than local `init` or `new` instructions.

| Command | Use it to |
| --- | --- |
| `wtc host` | Confirm the host mode |
| `wtc add-repo <repo> --worktree <name>` | Generate a managed-worktree tool plan |
| `wtc status <name>` | Inspect a named collection |
| `wtc publish --title "..."` | Check publication and generate the owner’s plan |
| `wtc catch-up` | Merge the destination branch without pushing |
| `wtc svc` | Inspect the collection’s services |

Plans are not completed actions. The designated actor must execute the returned tool intents. For publication, use the repository’s owner session or the Collection panel.

## Advanced workflows

The handbook summarizes these surfaces rather than duplicating every flag. Use the pinned upstream reference and installed help for the complete contract.

| Command family | Where to go next |
| --- | --- |
| `wtc commands --json` | Machine-readable installed command surface |
| `wtc projects`, `wtc openclaw install` | [OpenClaw projects](../openclaw/) and [gateway upgrades](../upgrades/) |
| `wtc skills render`, `wtc skills diff`, `wtc eject` | [Configuration and overrides](../configuration/) |
| `wtc mcp render`, `wtc agent-env`, `wtc secrets link` | [Configuration and secrets](../configuration/) |
| `wtc pr path/list/enlist/unlist` | Collection-local PR tracking, not forge labels |
| `wtc registry refresh` | Regenerate the bare-owner map and report registry mismatches |
| `wtc open`, `wtc browse` | Optional herdr and Neovim interfaces; not required for collections |
| `wtc dev install/status/uninstall` | Upstream CLI contributor builds; not an end-user upgrade path |
| `wtc checkouts` | Structured checkout facts for the OpenClaw collection plugin |

### Verified enlisted identities in v0.1.62

[Published v0.1.62](https://github.com/lcorneliussen/wtc-cli/releases/tag/v0.1.62)
includes the [repository identity rules](https://github.com/lcorneliussen/wtc-cli/blob/v0.1.62/docs/enlisted-repository-identity.md),
verified on 2026-10-28. They align PR enlistment, status enrichment and enlisted
branch matching.

For a registered `widget`, `ext.widget` is an alias only when its checkout
origin matches the registry's forge, owner/workspace and repository. SSH and
HTTPS spellings are equivalent; GitHub owner/repository case is ignored, while
local names remain case-sensitive. New enlistments use the registry name.
For an unmanaged `ext.widget`, `widget` is accepted only when a supported forge
origin has repository basename `widget`; new rows use `ext.widget`.

A prefix alone proves nothing: an unrelated `ext.notes` whose origin names
`widget` gains no `notes` alias, and prefixes are not stripped repeatedly.
Inference uses Git roots inside this collection, without borrowing an enclosing
origin or an outside directory link. Exact-name linked checkouts retain their
existing association and origin fallback when the registry lacks forge identity.

If a spelling identifies different repositories or multiple worktrees, enlistment
reports ambiguity and status does not guess a forge or branch association. Use
distinct directory names to remove collisions. With no forge remote in the
registry and only `ext.widget` checked out, configure the registry remote before
using `widget`; the exact `ext.widget` spelling still identifies its checkout.
Unknown names stay unresolved.

Existing rows need no migration: verified alias updates retain their spelling,
merge markers and merge metadata, and re-enlisting the same PR adds no alias
duplicate. Conflicting duplicate rows need reconciliation. Unlisting can remove
verified alias duplicates; an ambiguous spelling removes only its exact-key rows.
This is PR bookkeeping, with no worktree rename, registry/catch-up selector
change, or new landing or branch-deletion policy. Older cached observations use
exact-name matching without guessing aliases.

### Review pane in v0.1.61

The [review pane](https://github.com/lcorneliussen/wtc-cli/blob/v0.1.61/docs/review-pane.md) is available in [published v0.1.61](https://github.com/lcorneliussen/wtc-cli/releases/tag/v0.1.61), verified on 2026-10-27. The behavior below applies from v0.1.61; v0.1.60 does not support `--add review`. Other examples on this page retain their labeled baselines.

For local collections using herdr, add a review viewer on demand:

```sh
wtc open --add review
```

It opens the pinned commit range from the newest applicable review bundle, or the current PR's exact commit range when no bundle applies. It shows committed changes rather than working-tree edits. The commit objects must already be available locally; opening the viewer never fetches or checks out code. Missing objects and ambiguous candidates produce an error.

The pane uses Hunk when installed, otherwise Git diff in secure less. It requires Hunk or less and installs neither automatically. Review can coexist with browse and shell: in wide layouts it sits in the right column above status; in narrow layouts it sits on the tools tab. Switching layouts preserves live viewers. Default workspaces still have only agent and status, and `--full` still adds browse and shell only.

A running viewer is reused. After it exits, `--add review` restarts it with a freshly resolved range; plain `wtc open` leaves the idle pane at its prompt. `wtc open --trim` closes an unfocused review pane only after the viewer has exited to a shell prompt. Focused and running panes stay open.

### Review without publishing

`wtc review start <repo>#<n>` creates a local review-only collection for someone else's pull request. Pushes from that worktree are disabled; `review resolve` and `review ready` refuse there. A new `review bundle` refreshes the author's current head but stops rather than discard a local commit.

The review family also includes `activity`, `status`, `bundle`, `run`, `post`, `resolve`, and `ready`. Inspect the exact bundle and generated comments before sharing them. Posting, resolving threads, and promoting a draft are separate actions.

#### Progress-post recovery in v0.1.62

[Published v0.1.62](https://github.com/lcorneliussen/wtc-cli/releases/tag/v0.1.62)
keeps independent concerns and the lead running locally if the initial progress
comment from `wtc review run <bundle> --post` fails. The command reports the
posting error immediately, returns exit status 1 after the local run, and keeps
completed findings, summary, verdict and diagnostics in the bundle. Execution
errors are retained too. A local passing verdict is not a posted or trusted
review; the trusted ready gate still applies.

That invocation makes no further posting attempts after the progress error.
Inspect the remote comment before explicitly retrying: an uncertain create may
have succeeded. A saved `comment.id` is updated rather than replaced; a
`comment.create-pending` marker blocks duplicate creates until the outcome is
reconciled. Save a verified existing comment ID for an update; remove the marker
only after verifying that no comment was created. An unconfirmed outcome must
keep it. See the [v0.1.62 recovery contract](https://github.com/lcorneliussen/wtc-cli/blob/v0.1.62/docs/review-progress-errors.md)
for the exact procedure. Automatic recovery of an unknown created ID and full
Bitbucket writable-contract certification remain separate work.

#### Review audience defaults in v0.1.61

The [review audience defaults](https://github.com/lcorneliussen/wtc-cli/blob/v0.1.61/docs/review-audiences.md)
are available from [published v0.1.61](https://github.com/lcorneliussen/wtc-cli/releases/tag/v0.1.61)
and are also included in v0.1.62, verified on 2026-10-28. In published v0.1.60,
bundles default to private mode: explicitly pass `--public` for public or unknown
targets.

From v0.1.61, the default is public mode for public or unknown repository visibility, another forge namespace, or an unknown harness namespace. Only a confirmed private target in the harness namespace defaults to private mode.

Public mode takes concerns from the target repository's review base commit, or CLI defaults, and uses embedded prompts. It excludes harness overlays, other repository snapshots, related patches, and private review rounds. `--public` forces isolation; `--private` explicitly includes harness context for local analysis. Progress and verdict comments show the mode, and posting a private bundle requires fresh private visibility. `--force` cannot bypass that check.

Normally the upstream project runs its own gate. A consuming harness should not impose its internal rules on an upstream contribution. Public mode still requires inspection of generated prose. See the [v0.1.61 audience contract](https://github.com/lcorneliussen/wtc-cli/blob/v0.1.61/docs/review-audiences.md) for details.

See the [complete upstream command reference](https://github.com/lcorneliussen/wtc-cli/blob/v0.1.51/docs/commands.md) for these advanced workflows.
