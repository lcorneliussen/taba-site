---
layout: ../../layouts/Docs.astro
title: Command reference
description: Everyday taba commands for local and OpenClaw workflows.
source: https://github.com/lcorneliussen/taba/blob/v0.1.51/docs/commands.md
---

Run `wtc --help`, a command's `--help`, or open the linked upstream references for full options. Available commands depend on the installed version; unlabeled sections match `v0.1.51`, and versioned subsections apply from their named release.

See [Reading status](../status/) for status output details: Git differences, PR checks and reviews, shared-branch builds, follow-up after merge, missing facts, and compact layouts (each labeled with its own source baseline).

## Local collections

| Command | Use it to |
| --- | --- |
| `wtc init` | Turn an empty folder into an ad-hoc collection |
| `wtc add-repo <repo>` | Add a URL, checkout, or registered repository |
| `wtc new <slug> [repo ...]` | Start a sibling task with fresh worktrees |
| `wtc status` | Inspect repositories, local changes, and PRs |
| `wtc status --json` | Output status as JSON |
| `wtc retire .` | Check for local work, then remove the collection |

Worktrees start detached. Create a branch before committing.

### Collection-local development bases in v0.2.6

| Command | Use it to |
| --- | --- |
| `taba repo base set <repo> <branch> --reason '<reason>'` | Set a local development base on the target collection without moving existing work |
| `taba repo base show <repo>` | Inspect the effective ref, source, and reason |
| `taba repo base clear <repo>` | Restore the registry default, or clear an exact retained orphan key |
| `taba new <slug> <repo> --repo-base <repo>=origin/beta --base-reason '<reason>'` | Choose the new collection's base before checkout creation |

Pass `--collection <directory>` to `repo base` to choose the target collection. Overrides store local intent only: no Git operations, no shared registry edits, and no inheritance into new collections. New PR preparation defaults to the effective base; existing PRs keep their actual destination (inspect mismatches). TEST follows the effective development base; PROD stays registry-owned. See [v0.2.6](https://github.com/lcorneliussen/taba/releases/tag/v0.2.6), [base setup and exact orphan recovery](../collections/#choose-a-repositorys-development-base-in-v026), and the [tagged contract](https://github.com/lcorneliussen/taba/blob/v0.2.6/docs/repository-bases.md).

### Configuration requirements in v0.2.7

| Command | Use it to |
| --- | --- |
| `taba config list --json` | Inspect declared requirements and effective presence without values |
| `taba secrets list --requirements --json` | Show the same requirements inventory (default `secrets list` shows link state only) |
| `taba config lint --json` | Validate schemas and provided owned key names without credentials |
| `taba doctor --example web:config/dev.env.example` | Check readiness against a selected owned example |

See [configuration and secrets](../configuration/#example-backed-requirements-in-v027) for tracked-example opt-in, source ownership, explicit process inspection, and limits, and the [v0.2.7 requirements contract](https://github.com/lcorneliussen/taba/blob/v0.2.7/docs/configuration-requirements.md) for full options and annotation syntax.

### Bitbucket review and catch-up in v0.2.8

| Command | Use it to |
| --- | --- |
| `taba review post <bundle-dir>` | Post a Bitbucket review; reads the comment id from the `bb` JSON envelope |
| `taba review status` | Check whether a current posted review (including `#comment-<n>` links) opens `review ready` |
| `TABA_BITBUCKET_TRANSPORT=twg taba catch-up` | Read enlisted Bitbucket PR state via TWG instead of `bb` (catch-up only) |
| `taba doctor` | Inspect the advisory `bitbucket-client` row: selected client, source, and TWG support |

In [v0.2.8](https://github.com/lcorneliussen/taba/releases/tag/v0.2.8), a missing, conflicting, or malformed comment id keeps the review pending. TWG applies only to catch-up's enlisted PR read; status, review, and other Bitbucket operations keep their current clients. TWG failures report unavailable and never fall back to `bb`. See [configuration](../configuration/#bitbucket-client-selection-in-v028) for the per-machine default and the [v0.2.8 forge operations contract](https://github.com/lcorneliussen/taba/blob/v0.2.8/docs/forges.md).

### Retirement assessment in v0.1.62

`wtc status` reports a retirement assessment per selected collection, separating known preservation or unfinished-work blockers from unknown evidence and recording observation timestamps (older cached snapshots may omit it). Inspect without retiring:

```sh
wtc status --local --json
wtc retire --dry-run
wtc retire example-task --dry-run --json
```

- **Dry run**: defaults to the current collection, freshly reads Git heads, source coverage, and local metadata, and proposes follow-up work. It ignores cached verdicts, skips full status refreshes, writes no files (report, cache, registry, or source), and runs no hooks, branch returns, fetches, archive changes, resource stops, or deletions. Normal `wtc status` keeps its existing refresh and snapshot behavior.
- **Verdicts and blockers**: returns `blocked` or `unknown`, never `ready`. Blockers include dirty or locally unpreserved work, unconsumed handoffs, preservation backups, and already-observed open PRs, pending delivery, or active runtime facts. Git checks use cached remote refs without fetching (not proof of server preservation). Archive provenance, current forge/delivery facts, and live resources need separate verification; missing facts cannot clear unknown coverage, and cached assessments are never execution permits.
- **Optional `--transcript`**: dry-run-only bounded reader for explicitly supplied Claude JSONL. Labels matching assistant text an **untrusted hint**, does not discover or verify provider archives, and keeps raw hints out of status caches. Sanitize output before sharing (may include sensitive paths and conversation text).
- **Real retirement**: still requires an explicit collection name and fresh preflight. `--force` cannot suppress dry-run blockers, and assessment adds no automatic cleanup, confirmation policy, or extra execution enforcement.

Input limits and provenance: [v0.1.62](https://github.com/lcorneliussen/taba/releases/tag/v0.1.62) and the [retirement assessment contract](https://github.com/lcorneliussen/taba/blob/v0.1.62/docs/retirement.md).

### Next actions in v0.1.60

The status table and live view include next actions. Press `n` in the live view, select a repository, and press Enter to run an approval-free catch-up, open a pull request, or ask the collection's idle agent for the named skill. If no agent is idle, the terminal shows the instruction to give it. The view rechecks status before acting; refreshing alone runs no actions. See the [v0.1.60 command contract](https://github.com/lcorneliussen/taba/blob/v0.1.60/docs/commands.md).

### Running CLI version in v0.1.62

The live header shows `wtc status`, the collection and refresh timing, and the running CLI version as a muted suffix. It appears before the first refresh finishes and during refresh failures; narrow terminals may clip it to keep the title and timing visible. Stable versions link to their release notes via native terminal hyperlinks (modifier-click in supporting terminals); dev, prerelease, and unknown versions have no link.

This reports the running process independently of the harness pin or a newer installed binary. Local JSON schema 1 adds optional `cli_version`, and Markdown and one-shot tables also show the snapshot producer. `--cached` keeps that producer's version, while the live TUI always shows its own; older snapshots without the field report an unknown producer. See [CLI #261](https://github.com/lcorneliussen/taba/pull/261), [v0.1.62](https://github.com/lcorneliussen/taba/releases/tag/v0.1.62), and the [v0.1.62 status-version contract](https://github.com/lcorneliussen/taba/blob/v0.1.62/docs/status-version.md).

### Ahead counts and squash landing in v0.1.62

Ahead/behind values are raw commit counts, not changed-file counts or proof of unpushed work. `ahead_ref` names the comparison ref, `ahead_basis` distinguishes `upstream` from the `development-tip` fallback, and a missing configured upstream shows `[gone]`.

For an enlisted merged PR still associated with its branch, inspect `landing`:

| Observation | Meaning and next inspection |
| --- | --- |
| `landed` — **fully landed; catch-up** | Full historical landing is established; residual ahead counts remain visible. |
| `follow-up` — **follow-up; inspect unlanded work** | Full landing is not established, the recorded merge is reachable, and HEAD has commits after the PR's recorded head. Compact STATE shows `⚠ extra`. |
| `unknown` — **landing unknown; inspect branch** | Forge facts or local objects do not establish landing or descent from the recorded PR head. Inspect the retained branch. |

`landing` describes historical landing, not equality with today's tip. Follow-up commits do not prove their content is absent from later squashes; the observed PR head belongs to the matching PR and merge (not guaranteed immutable pre-merge evidence); missing facts stay `unknown`. These observations change no next-action authority, automatic return, retirement, landing, or ref-preservation guards. Safe `git branch -d` may retain a squash ref, and residual counts alone prove neither data loss nor permission for forced cleanup. See [v0.1.62](https://github.com/lcorneliussen/taba/releases/tag/v0.1.62) and [ahead and landing diagnostics](https://github.com/lcorneliussen/taba/blob/v0.1.62/docs/squash-status.md).

## Team setup and guidance

| Command | Use it to |
| --- | --- |
| `wtc harness init <folder> --remote <url> --cli-version <version>` | Scaffold a project-owned harness |
| `wtc env setup` | Generate collection-local environment configuration |
| `wtc env list` | Browse environment names and source scopes |
| `wtc secrets list` | Inspect secret link states without revealing values |
| `wtc customize` | Read the installed customization guide |
| `wtc docs` | Read embedded guidance |

## Services and diagnostics

| Command | Use it to |
| --- | --- |
| `wtc svc` | Inspect services, tunnels, and resources |
| `wtc svc add web --port-env PORT -- npm run dev` | Register and start a foreground command that reads PORT |
| `wtc svc logs web` | Read logs, including after shutdown |
| `wtc svc down web` | Stop a service while retaining logs and data |
| `wtc doctor` | Check configuration and dependencies |
| `taba doctor --all` / `taba conventions` (v0.2.4) | Report workspace naming migrations / list supported conventions; [published reference](https://github.com/lcorneliussen/taba/blob/v0.2.4/docs/conventions.md) |
| `wtc release-notes --since <old-pin>` | Review changes before upgrading |

See [Services and previews](../services/) for opt-in runtime prerequisites and [Troubleshooting](../troubleshooting/) for common failures.

## OpenClaw-managed collections

For the gateway-integrated build, follow the [OpenClaw guide](../openclaw/) instead of local `init` or `new` instructions.

| Command | Use it to |
| --- | --- |
| `wtc host` | Confirm the host mode |
| `wtc add-repo <repo> --worktree <name>` | Generate a managed-worktree tool plan |
| `wtc status <name>` | Inspect a named collection |
| `wtc publish --title "..."` | Check publication and generate the owner's plan |
| `wtc catch-up` | Merge the destination branch without pushing |
| `wtc svc` | Inspect the collection's services |

Plans are not executed automatically: the designated actor must run the returned tool intents. Publish from the repository's owner session or the Collection panel.

## Advanced workflows

| Command family | Where to go next |
| --- | --- |
| `wtc commands --json` | List installed commands as JSON |
| `wtc projects`, `wtc openclaw install` | [OpenClaw projects](../openclaw/) and [gateway upgrades](../upgrades/) |
| `wtc skills render`, `wtc skills diff`, `wtc eject` | [Configuration and overrides](../configuration/) |
| `wtc mcp render`, `wtc agent-env`, `wtc secrets link` | [Configuration and secrets](../configuration/) |
| `wtc pr path/list/enlist/unlist` | Collection-local PR tracking, not forge labels |
| `wtc registry refresh` | Regenerate the bare-owner map and report registry mismatches |
| `wtc open`, `wtc browse` | Optional herdr and Neovim interfaces; not required for collections |
| `wtc dev install/status/uninstall` | Upstream CLI contributor builds; not an end-user upgrade path |
| `wtc checkouts` | Structured checkout facts for the OpenClaw collection plugin |

### Verified enlisted identities in v0.1.62

PR enlistment, status enrichment, and enlisted branch matching verify aliases by origin, not directory prefix:

- **Registered `widget`**: `ext.widget` aliases `widget` only if its checkout origin matches the registry's forge, owner/workspace, and repository. SSH and HTTPS match; GitHub owner/repository case is ignored, while local names stay case-sensitive. New enlistments record the registry name.
- **Unmanaged `ext.widget`**: `widget` is accepted only when a supported forge origin has repository basename `widget`. New rows record `ext.widget`.
- **Prefix and root limits**: An unrelated `ext.notes` pointing at `widget` gets no `notes` alias, and prefixes are not stripped repeatedly. Inference uses only Git roots inside the collection, never an enclosing origin or outside directory link. Exact-name linked checkouts keep their association and origin fallback when the registry lacks forge identity.
- **Ambiguity and missing remotes**: If a spelling matches different repositories or multiple worktrees, enlistment reports ambiguity and status does not guess a forge or branch; use distinct directory names to clear collisions. If the registry lacks a forge remote and only `ext.widget` is checked out, configure the remote before using `widget` (`ext.widget` still works). Unknown names stay unresolved.
- **Existing rows and unlisting**: No migration is needed. Verified alias updates keep their spelling, merge markers, and merge metadata; re-enlisting the same PR adds no alias duplicate; reconcile conflicting duplicates. Unlisting removes verified alias duplicates, while ambiguous spellings remove only exact-key rows.

These rules are PR bookkeeping only (no worktree rename, registry/catch-up selector change, or new landing or branch-deletion policy); older cached observations use exact-name matching. See [v0.1.62](https://github.com/lcorneliussen/taba/releases/tag/v0.1.62) and the [repository identity rules](https://github.com/lcorneliussen/taba/blob/v0.1.62/docs/enlisted-repository-identity.md).

### Review pane in v0.1.61

Add an on-demand review viewer to a local herdr collection (unsupported in v0.1.60):

```sh
wtc open --add review
```

The viewer displays committed changes (not working-tree edits) for the newest applicable review bundle's pinned commit range, or the current PR's exact commit range if no bundle applies. Commit objects must exist locally: the command never fetches or checks out code, and errors on missing objects or ambiguous candidates.

It uses Hunk if installed, otherwise Git diff in secure less, and installs neither. Wide layouts place it in the right column above status; narrow layouts place it on the tools tab alongside browse and shell. Layout switches preserve live viewers. Default workspaces keep only agent and status, and `--full` adds only browse and shell.

Running viewers are reused. After exit, `--add review` restarts the viewer with a freshly resolved range; plain `wtc open` leaves the idle pane at its prompt. `wtc open --trim` closes an unfocused review pane only after it exits to a shell prompt, leaving focused and running panes open. See [v0.1.61](https://github.com/lcorneliussen/taba/releases/tag/v0.1.61) and the [review pane contract](https://github.com/lcorneliussen/taba/blob/v0.1.61/docs/review-pane.md).

### Review without publishing

`wtc review start <repo>#<n>` creates a local review-only collection for someone else's PR. Pushes are disabled, and `review resolve` and `review ready` refuse to run there. A new `review bundle` refreshes the author's current head, stopping instead of discarding local commits.

Other `wtc review` subcommands are `activity`, `status`, `bundle`, `run`, `post`, `resolve`, and `ready`. Inspect the bundle and generated comments before sharing: posting, resolving threads, and promoting a draft are separate actions.

#### Progress-post recovery in v0.1.62

If the initial progress comment from `wtc review run <bundle> --post` fails, independent concerns and the lead still finish locally. The command reports the error immediately, stops further posting attempts, exits with status 1 after the local run, and saves completed findings, summary, verdict, diagnostics, and execution errors in the bundle. A local passing verdict is neither posted nor trusted; the trusted ready gate still applies.

Check the remote comment before retrying, as an uncertain create may have succeeded. A saved `comment.id` updates in place; `comment.create-pending` blocks duplicate creates until reconciled. Save a verified existing comment ID to update it, or remove the marker only after confirming no comment was created (keep it if unconfirmed). Automatic recovery of an unknown created ID and full Bitbucket writable-contract certification remain separate work. See [v0.1.62](https://github.com/lcorneliussen/taba/releases/tag/v0.1.62) and the [v0.1.62 recovery contract](https://github.com/lcorneliussen/taba/blob/v0.1.62/docs/review-progress-errors.md).

#### Review audience defaults in v0.1.61

Bundles default to public mode for public or unknown repository visibility, another forge namespace, or an unknown harness namespace. Only a confirmed private target in the harness namespace defaults to private mode. (In v0.1.60, bundles defaulted to private mode; pass `--public` for public or unknown targets.)

Public mode reads concerns from the target repository's review base commit or CLI defaults, uses embedded prompts, and excludes harness overlays, other repository snapshots, related patches, and private review rounds. Pass `--public` to force isolation or `--private` to include harness context for local analysis. Progress and verdict comments show the mode; posting a private bundle requires fresh private visibility, which `--force` cannot bypass.

Upstream projects normally run their own gates, so a consuming harness should not impose internal rules on upstream contributions. Inspect generated prose in public mode too. Available in [v0.1.61](https://github.com/lcorneliussen/taba/releases/tag/v0.1.61) and v0.1.62; see the [v0.1.61 audience contract](https://github.com/lcorneliussen/taba/blob/v0.1.61/docs/review-audiences.md).

See the [complete upstream command reference](https://github.com/lcorneliussen/taba/blob/v0.1.51/docs/commands.md) for all advanced workflows.
