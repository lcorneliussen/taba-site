---
layout: ../../layouts/Docs.astro
title: Working with agents
description: Give an agent the repositories and project context for a task without changing how your projects build.
source: https://github.com/lcorneliussen/taba/blob/v0.1.51/internal/wtc/defaults/instructions/skills.md
---

## Agent skills in v0.2.4

In [v0.2.4](https://github.com/lcorneliussen/taba/releases/tag/v0.2.4), rendered skills use `taba-*`: start with `/taba-start`. Old `wtc-*` names remain compatibility shims during 0.2.x. A harness override under an old name still wins: rename its folder and `name:` together when migrating. Section patches and base digests move with the override; review reported base drift before accepting.

`taba open` starts `taba status --tui` and `taba browse` for collections pinned at 0.2.0 or later. Older pins keep the `wtc` commands shown below. See [published conventions](https://github.com/lcorneliussen/taba/blob/v0.2.4/docs/conventions.md) for migration order.

## Start at the collection

Open your agent or editor in the collection folder, not an unrelated checkout. That puts the task's repositories in one workspace.

taba supplies standard collection guidance. A project-owned harness adds repository registration, policy, configuration, and hooks. Application repositories keep their normal development commands.

## Orient before editing

Run `wtc status` to confirm the active collection and worktrees. Where the skill is installed, `/wtc-start` orients the agent.

Ask the agent to identify affected repositories and work in their collection worktrees. Add another repository if the task grows.

Example prompt:

> Work on the sign-in error in this collection. Check the API response and frontend handling, make the change in both repositories if needed, and run their relevant checks.

## Keep the project in charge

Use normal build and test commands. taba organizes the workspace; your project owns its framework, tests, and merge decisions.

Agents are optional; an editor and terminal work too. `wtc open` provides a herdr workspace with agent, browse, shell, and status panes when those tools are installed.

## Agents under OpenClaw

In OpenClaw's managed workflow, one conversation can drive several repositories while hidden owner sessions hold the worktrees. Worktree creation and publication follow taba-generated tool plans.

Read [Under OpenClaw](../openclaw/) before creating or publishing worktrees on a gateway.
