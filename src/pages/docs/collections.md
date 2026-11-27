---
layout: ../../layouts/Docs.astro
title: Working with collections
description: Create collections, add repositories, override base branches, check status, and retire workspaces.
source: https://github.com/lcorneliussen/taba/blob/v0.1.51/docs/commands.md
---

## One folder, related worktrees

A collection puts independent repositories in one folder without combining their Git histories. API, frontend, and shared-library changes sit side by side with separate commits and pull requests.

```text
workspace/
├── fix-login/
│   ├── api/
│   ├── web/
│   └── shared/
└── new-checkout/
    ├── api/
    └── web/
```

Open the folder for your task. In a harness-backed collection, the project harness is another worktree in that folder.

## Grow a task without starting over

From a collection, add a registered repository by name:

```sh
wtc add-repo shared
wtc status
```

For an unregistered repository, pass its clone URL or an existing checkout. In ad-hoc collections, taba saves added repositories in a per-user registry.

## Create another task

In a local terminal, create a sibling collection:

```sh
wtc new new-checkout api web
cd ../new-checkout
```

Each collection has its own worktrees, generated environment, and port assignments. Project configuration and hooks handle project-specific setup. taba does not replace the application’s build system.

> Under OpenClaw, ask the agent to create a named managed collection instead of running `wtc new`. See [the gateway workflow](../openclaw/).

## Choose a repository’s development base in v0.2.6

Override a repository’s development branch for one collection without changing the shared registry ([v0.2.6](https://github.com/lcorneliussen/taba/releases/tag/v0.2.6)):

```sh
taba repo base set widget origin/beta --reason 'Staging work'
taba repo base show widget
taba repo base clear widget
```

Use `--collection <directory>` to select the receiving collection. Setting a base records intent only: it does not fetch, switch, reset, merge, or push existing work. Defaults for creation, status, catch-up, browse, and review check the receiving collection’s override, then the registry default, then `origin/main`. Operations fail if a required branch ref is missing.

Set bases when creating a collection:

```sh
taba new staging widget --repo-base widget=origin/beta --base-reason 'Staging work'
```

Repeat `--repo-base` for selected repositories. New collections do not inherit the caller’s local overrides. `add-repo` uses the receiving collection’s setting. Existing explicit branches and exact PR checkouts keep their checkout rules.

Overrides stay in the receiving collection’s `.wtc/repo-bases.toml`; do not commit them or copy them into the registry. Removing or renaming a repository can leave an orphaned old key:

- Run `show` for recovery: clear that exact old key, or explicitly set the current canonical repository.
- Aliases do not transfer ownership. Clearing an exact stored orphan takes priority over a newer alias; target the newer repository by its canonical name.
- Clear a related old key before clearing the new canonical override.
- Fix malformed or unsafe state locally without discarding unrelated settings.

An existing PR’s destination stays authoritative for comparison and catch-up. Base overrides do not retarget PRs, change production refs, or authorize merges, deployments, or branch deletion. Gateway publication destinations stay separately authorized. See the [complete v0.2.6 base contract](https://github.com/lcorneliussen/taba/blob/v0.2.6/docs/repository-bases.md).

## See where things stand

Check local changes and pull requests across the collection:

```sh
wtc status
```

In a terminal, it can open an interactive view. Use `wtc status --json` for machine-readable output.

Commit changes and open pull requests in the repositories involved. Under OpenClaw, publish through the managed owner session or the Collection panel.

## Retire the workspace

When work is done, check status and retire the collection:

```sh
wtc status
wtc retire .
```

`wtc retire` checks for local work before removing worktrees. For ad-hoc collections, it removes the collection folder too. Shared repository owners, the per-user registry, and remote branches remain available.

Read the upstream command reference for the full retirement checks before your first cleanup.
