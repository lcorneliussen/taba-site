---
layout: ../../layouts/Docs.astro
title: Under OpenClaw
description: Work across repositories from one conversation, with worktrees and publishing managed by the gateway.
source: https://github.com/lcorneliussen/taba/blob/v0.1.51/internal/wtc/defaults/instructions/openclaw.md
---

> The current tunnel guidance and walkthrough visuals follow [v0.2.5](https://github.com/lcorneliussen/taba/releases/tag/v0.2.5); older workflow sections retain their stated baselines. Confirm your installed behavior with `taba docs instructions/openclaw.md`.

## What the plugin adds

The plugin puts the whole task beside your conversation: a compact **collection
card above the message box**, and a **Collection panel** opened with **⤢**.
You can see changes across repositories without visiting each owner's session.

<figure>
  <img src="../../media/openclaw/collection-card.png" alt="Expanded collection card with repository changes, reported endpoint access glyphs, ready services and a stopped service with one retained registration and one unregistered named entry" width="1120" height="760" loading="lazy" />
  <figcaption>Synthetic host, theme and data: public, account and unknown endpoint access, an active named tunnel, a stopped registration and an unregistered entry. No backend operations.</figcaption>
</figure>

| Column or control | What it tells you or does |
| --- | --- |
| **±N / ±** | Ask the conversation to review and commit intended changes for one repository / all eligible repositories; publication is separate |
| **↑** | Commits waiting to push; click to start the publication confirmation flow |
| **↓** | Commits behind the base; click to catch up |
| **PR** | Open the repository's pull request |
| **C / M / R** | CI checks, mergeability, and review status; hover for details |
| **▶ / ■ / ↻** | Start, stop, or restart a service |
| **+** beside a service | Choose a portal or tunnel; availability depends on gateway configuration |
| **⤢** | Open the Collection panel, including task context, PR details and Add repository |

A service's local port belongs to the gateway, not necessarily your laptop.
Use an appropriate portal or tunnel to share it; not every endpoint is public.
The card and panel refresh while open. **Customize UI → Built-in** switches
back to the standard composer if you do not want the collection card.

<details>
  <summary>Watch the card-to-panel walkthrough (about 9 seconds)</summary>
  <video controls preload="none" poster="../../media/openclaw/collection-card.png" width="1120" height="760" aria-label="Collection card to panel walkthrough">
    <source src="../../media/openclaw/collection-tour.webm" type="video/webm" />
    <a href="../../media/openclaw/collection-tour.webm">Download the walkthrough</a>.
  </video>
  <p>Transcript: the card expands to show api and web, repository changes and a pull request. Ready preview endpoints report public, account and unknown access. A ready server has an active named link; a stopped standby service shows a retained registration and an unregistered entry with lifecycle controls. Selecting ⤢ opens the Collection panel. Synthetic host, theme and data; no audio or backend operations. No tunnel lifecycle controls are clicked.</p>
</details>

[View the Collection panel screenshot](../../media/openclaw/collection-panel.png).
The visuals use the renderer at
[published v0.2.5 source](https://github.com/lcorneliussen/taba/tree/v0.2.5/openclaw-plugin),
separately pinned from this handbook's historical v0.1.51 baseline. Gateway styling and your installed
version may differ. These examples demonstrate the UI, not backend operations.

## Reported access and named tunnels

The [tunnel controls contract](https://github.com/lcorneliussen/taba/blob/v0.2.5/docs/openclaw.md#the-collection-in-the-control-ui)
uses neutral endpoint links with access glyphs: an open lock for reported public
access, a closed lock for reported tailnet/account/protected access, and a
question mark when access is unknown. Health errors are separate. A lock,
provider name or HTTPS URL is not independent proof of private enforcement.
The walkthrough shows these reported endpoint glyphs beside named entries.
Named entries render their own state and lifecycle controls, without access glyphs.

Configured named entries distinguish registration from active serving and offer
start, register, stop, unregister and reconcile through the same CLI policy and
ownership journal. Start/register approval names the exact current desired
definition hash. Changing that definition requires renewed approval; stopping
retains stable registration and records start-off for the collection.

The service **+** offers an existing gateway portal and provider setup guidance.
Setup explains receiving-local configuration and explicit credentials or an
authorized socket; it does not install, log in, allocate resources, send an
agent task or grant writes to project defaults. Microsoft Dev Tunnel hosting
requires an existing Node22+ runtime and the bundled helper; other providers and
pure reads do not. A portal's own open/close route is separate from named-provider
policy. Follow [Services and previews](../services/#named-tunnels-and-receiving-policy)
for consent, lifecycle and cleanup limits. Status reads do not query providers
or run hooks, and an uncertain outcome needs inspection rather than a blind retry.

## Set up or diagnose the integration

On the gateway host, install the desired CLI release and its matching plugin:

```sh
wtc openclaw install
wtc doctor --openclaw
```

The install command changes the gateway's plugin configuration and reloads the
plugin; it is an administrator setup step, not something to run for each task.
The main agent skill is **taba**, with **wtc** as a compatibility alias. Existing skill settings and plugin/configuration IDs retain their `wtc` keys.

The plugin ships inside the CLI. After upgrading the CLI, install its plugin
again and reload open Control UI tabs. `openclaw plugins update` does not update
this path-installed plugin. Image-managed gateways should rebuild their image
instead of installing into a running container.

The gateway needs Git and `gh`; agents need the collection instructions in their
workspace `AGENTS.md`. For prerequisites, image setup and sandbox configuration,
follow the [upstream setup guide](https://github.com/lcorneliussen/taba/blob/24b0702c56e820314836e10b53c7df32030e6f4d/docs/openclaw.md#install).
For personal publishing, connect **Settings → Profile → GitHub connections →
For me**. The first **↑** prepares a push; **confirm ↑** identifies the account
and confirms it. The shared account used by an agent's CLI is not your personal
publishing connection. Bitbucket requires its separate integration and login.

If the card is missing, confirm the conversation has a collection, run the
doctor, check that the plugin's composer is selected, and reload the browser
after installation. If the panel reports a CLI/plugin version mismatch,
reinstall the plugin bundled with the intended CLI version.

## One conversation, many repositories

Ask your agent to add repositories to a named collection. Each repository gets a managed worktree on `openclaw/<name>`, held by a hidden owner session. The driving conversation works through the collection folder’s repository links.

You do not need a separate visible conversation for every repository.

## Add a repository

The agent starts with:

```sh
wtc add-repo your-org/api --worktree fix-login
```

WTC checks the request and prints a JSON **plan**. A tool intent must be carried out using its exact arguments and the named actor. Printing the plan alone does not create the worktree.

If the gateway has not cloned the repository, add it through **Add repository** in the Collection panel, then try again.

Never use `wtc init` or `wtc new` under OpenClaw. The gateway must own the worktrees it manages and publishes.

## Confirm the collection

```sh
wtc status fix-login
```

Status shows the collection folder, repositories, branches, pull requests, and services. Work from the repository links in that folder. A pull request in a different collection does not belong to the current collection just because the conversation previously worked there.

## Projects and parallel workers

A **wtc project** is a named set of repositories backed by a harness. Run `wtc projects` to match the task to a project before adding repositories. Names resolve through its registry; WTC adds the harness worktree too. Read its `AGENTS.md` before editing.

A conversation works in one project. Use `--project <name>` when asked to choose; `--project none` selects an ad-hoc collection. An unregistered repository requires a choice: add it ad hoc with `--ad-hoc`, register it first, or start another collection. If it belongs to another project, use a new conversation for that project unless explicitly adding it ad hoc.

The card may suggest a project before a collection exists. Unsent drafts are word-matched locally. Sent messages can use an optional decision model; with the configured OpenAI Decisions integration, the sent message goes to OpenAI. See the upstream gateway guide before enabling it.

### Parallel work: check your installed version

The v0.1.51 baseline described `--worker` collections. In the
[current reviewed source](https://github.com/lcorneliussen/taba/blob/24b0702c56e820314836e10b53c7df32030e6f4d/docs/openclaw.md#parallel-work-and-sub-sessions),
that option is deprecated: a separate implementation task belongs in its own
conversation and collection. Read-only reviewers can use the existing checkout.
Use `wtc docs instructions/openclaw.md` for your installed release's procedure.

If a child already has a worktree, the current card and panel show it as a
**sub-session** beneath its repository. Its **↑** merges into the collection's
checkout, **↓** catches it up from that checkout, and **✕** discards it after
confirmation. These controls are not a separate publishing flow. Review the
changes before integrating or discarding them. Branch integration uses
`wtc catch-up --from <branch>` in the collection's repository worktree.

## Publish through the owner

The agent runs `wtc publish --title "..." --body-file pr-description.md` to check readiness and record the proposed PR title and description locally; it does not commit or push. You push with **↑** for the repository in the collection card, using your account after confirmation. Only when explicitly asked to publish does the agent have the repository’s owner session carry out the publication plan.

WTC checks for unmanaged worktrees, unfinished merges, rewritten published history, and pending credential-like files. Read the pending file list before publishing: the gateway publishes all pending work in that worktree.

Committing saves intended changes locally. Pushing sends commits to the branch
on the forge; its open PR includes those commits automatically. If no PR exists,
publication creates a draft PR. Its title and description are separate from
the commits and may need revising when the scope changes.

For GitHub, the gateway can commit pending files while preparing publication.
Bitbucket publishes existing commits, leaving uncommitted files local. People
merge. Do not run `git push` yourself in a GitHub-managed worktree.

### Publication and tracking in v0.2.4

The [published plugin](https://github.com/lcorneliussen/taba/blob/v0.2.4/docs/openclaw-publication.md) names whether a push created a draft PR or updated an existing PR. A URL-only result does not claim a new PR was created. Proposed PR text has a formatted, collapsible preview and an unchanged **Source** view. Raw HTML stays literal; images become links, so previewing text does not fetch remote images.

Successful publication records the PR and captured branch in collection tracking. **Tracking pending** means that metadata still needs attention: refresh retries tracking without publishing again. If a receipt could not be saved, retain the returned PR URL and ask the owning conversation to inspect tracking. An ambiguous publisher response needs inspection before retrying a push.

**Review PR text** asks the conversation to compare the title and description with the full current diff, preserving useful human edits. It proposes changes; it does not edit remote PR text or request a code review.

### Local changes and pending requests in v0.2.4

The [fact controls](https://github.com/lcorneliussen/taba/blob/v0.2.4/docs/openclaw-fact-actions.md) keep their cells in place while hovered, pending or briefly showing success. A commit handoff stays pending until progress is observed; partial commits leave unresolved work visible. Pending cells open the Action log. After an unconfirmed result, inspect the owning conversation before using **I checked: request has finished**. Acknowledgement releases the browser reservation; it does not cancel work, verify a commit, or retry it. **Ask agent for help** sends a diagnostic request without retrying.

Group **Catch up** highlights its eligible rows on hover or focus. Gateway base catch-up preserves staged, unstaged and untracked edits in a pinned recovery copy, then restores staging. An unfinished operation, unsafe incoming path or unverified restoration blocks continuation. Keep the retained backup and follow the [published recovery procedure](https://github.com/lcorneliussen/taba/blob/v0.2.4/docs/openclaw.md#gateway-catch-up-with-local-changes); do not blindly retry or discard it.

## Catch up without rewriting history

Run `wtc catch-up` from the repository’s worktree to merge its destination branch. It does not rebase or push. Review conflicts and resolve them before publishing again.

Do not rebase or amend commits that have already been published. Pull request news can wake the driving conversation on GitHub checks, reviews, conflicts, or merges. After a merge, catch up and verify the result; a status event alone is not proof of shipment.

Administrators can choose immediate turns (`pullRequestEvents: wake`, the
default), delivery on the next turn (`queue`), or no events (`off`). The default
background poll is five minutes. These PR notifications currently cover GitHub.

In a sandbox, in-place catch-up requires the gateway’s read-only git service. With it, resolve a conflicted merge and run `wtc catch-up --continue`; without it, catch up from the repository owner outside the sandbox. Never put forge credentials into the sandbox.

### Next actions in v0.1.60

Starting with v0.1.60, WTC adds a **Next actions** section to the collection card and
panel. It names the next step, its reason, and who needs to approve it. A
click rechecks status before running catch-up or asking the conversation for
the appropriate skill. Push keeps the personal-account confirmation flow;
merge opens the pull request for you to merge.

**Commit changes** asks the conversation to review and commit pending files
before you publish them. The expanded card shows the latest result in full;
a refused publication is an error rather than a muted status message.

After a completed GitHub branch returns to the tip, its pull request moves
into the pull request list. Another publication round still needs a fresh
managed worktree and owner; returning to the tip does not rebind the old
owner. See the [v0.1.60 gateway contract](https://github.com/lcorneliussen/taba/blob/v0.1.60/docs/openclaw.md)
for details. The handbook baseline remains v0.1.51; newer plugin guidance and
visuals above are linked to their reviewed source version.

## Keep a preview with the collection

From a repository in the collection, register its normal foreground development command:

```sh
wtc svc add web --port-env PORT -- npm run dev
wtc svc
```

The command must listen on the port supplied by `PORT`; wrap the existing launch command if it needs a CLI port flag. Service status appears with the collection. Tunnels are a separate opt-in action. See [Services and previews](../services/) for prerequisites, ports, and shutdown.

<div id="upcoming-compact-next-steps"></div>

## Compact next steps (v0.1.62)

These controls are included in [v0.1.62](https://github.com/lcorneliussen/taba/releases/tag/v0.1.62).
See the [released compact-controls contract](https://github.com/lcorneliussen/taba/blob/v0.1.62/docs/openclaw.md#select-next-actions).
The screenshots above use their separately labeled v0.2.5 source.

The card keeps dense repository rows without visible column headers. At normal
widths the name, branch, changes, PR and next action occupy separate fixed
columns; the top action aligns above the row actions. Small
outlined actions have clear hover/focus feedback. The top-bar action remains
available when collapsed to one line; **⋯** opens alternatives and mixed
selections. Catch-up runs locally on the first click. On an observed open PR,
**Update PR** / **Push** prepares publication with your personal confirmation.
The local collection CLI already pushes merges to open or draft PR branches.

A baseline row consistently says **at main** (or its configured base). Hover
text distinguishes an untouched task branch from detached HEAD; it does not
imply that the checkout owns the main branch.

Each row shows its current PR. Other active PRs are muted number links;
completed PRs appear as a **3 archived PRs** button that opens the full collection PR list
in the taba sidebar. The conversation card keeps that full list out of the way.
During a batch, rows show one phase and the top bar shows progress. A completion
control such as **Caught up 2** opens the detailed sidebar **Action log**. The log
is shared by views of that collection in the current browser session; it does
not persist across reloads. In the Collection sidebar, action controls have their
own row below the collection details. Services precede Action log, and both use
the same section-heading emphasis.

For mixed selections, choose per repository or use **Select suggested**, then
**Run selected**. **Done choosing** restores the compact view; dispatch also
closes the chooser when it finishes. Dispatch rechecks exact selected
targets; new repositories do not join a captured selection. Clean catch-up runs
deterministically. If a fetch reveals merge conflicts, the current resolution
step is rechecked before handing it to the named catch-up skill. Other author
tasks are grouped into one handoff; acceptance remains pending completion.

Publication keeps its own per-repository personal confirmation. **Cancel queued**
stops remaining dispatches and does not undo active work. Unchanged handoffs stay
disabled in that view until facts change; check the conversation before using
**Allow retry**. Reloading does not automatically resume a batch.

**Check PR progress** asks the conversation to inspect current reviews and merge
requirements. Independent gateway review execution is a disabled alternative
until the shared review adapter is available. Local status can hand off the
existing independent-review skill. Automatic follow-through and shared review
slots are later work.

In the status TUI, press `n`, Space to select, Right for an alternative, and `s`
for visible suggestions. Enter runs catch-up and local steps directly; publication selections show a
preview first.
Use `c` to cancel queued dispatches, or `x` to permit an explicit retry after
checking the author conversation.

The status TUI keeps the status columns and shows a compact
next-step hint. Press `n` to choose actions, then Enter for one repository or
Space/`s` followed by Enter for a selection. Local commands run in wtc; judgment
steps go to the owning collection's single idle author pane labelled `agent`.
The receipt names its collection, agent and pane. A focused reviewer or shell
is never used instead; busy or ambiguous destinations show **Not sent** with an
instruction to hand over. Multiple-author destination selection is future work.
