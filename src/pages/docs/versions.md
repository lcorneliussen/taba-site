---
layout: ../../layouts/Docs.astro
title: Taba versions and release channels
description: Find the version a project selects, try an edge build or release candidate locally, and return to the project pin.
---

## Check which version you are using

Run these from the collection you want to test:

```sh
taba --version
taba dev status
TABA_DEV_BUILD=off taba --version
```

The first command shows what a new invocation selects. The second shows any
collection dev build and the checkout it follows. The third bypasses that dev
build for one invocation. An already-running status pane still uses the version
shown in its own header.

The committed project pin lives in `.taba-version` or `.wtc-cli-version` in the
Taba project repository, usually checked out as `harness/`. Collections can have
different revisions of that repository. The collection's generated `mise.toml`
selects the tool for new invocations. Run the checks above in the target
collection to confirm its selection.

## Try the latest published RC in one collection

Run this from the target project's collection. It needs GitHub CLI and mise.
Check the selected tag before testing. The newest RC can be older than the
current stable release if there is no active candidate. Review the release notes
before testing commands that change the collection.

```sh
rc_version="$(
  gh api --paginate repos/lcorneliussen/taba/releases --jq '
    .[] | select(.prerelease and (.draft | not))
    | select(.tag_name | test("^v[0-9]+\\.[0-9]+\\.[0-9]+-rc\\.[0-9]+$"))
    | [.published_at, (.tag_name | ltrimstr("v"))] | @tsv
  ' | sort -r | head -n 1 | cut -f 2
)"
if [ -n "$rc_version" ]; then
  gh release view "v$rc_version" --repo lcorneliussen/taba
  mise exec "github:lcorneliussen/taba@$rc_version" -- env TABA_DEV_BUILD=off WTC_DEV_BUILD=off taba --version
else
  printf '%s\n' 'No published Taba release candidate found.'
fi
```

After confirming the version, start a separate status session with that same
candidate:

```sh
mise exec "github:lcorneliussen/taba@${rc_version:?Select a published RC first}" -- env TABA_DEV_BUILD=off WTC_DEV_BUILD=off taba status --tui
```

This selects the candidate for the command and its children. It leaves the
committed pin and existing panes alone. Quit the test session and start status
normally to return to the collection's usual selection. If source following
is enabled and you want to run the installed pin, use
`TABA_DEV_BUILD=off taba status --tui`.

Confirm the RC version in the new pane's header before recording test results.

## Try an edge build in one collection

Edge builds package an exact green commit from `main`. Choose a published tag
containing `-edge.` from [GitHub Releases](https://github.com/lcorneliussen/taba/releases).
Copy the exact tag to `edge_version`; edge tags have no leading `v`. If no edge
tag is listed, there is no published edge build available.

From the collection you want to test, confirm the selected binary and launch
a separate status session:

```sh
mise exec "github:lcorneliussen/taba@${edge_version:?Set a published edge tag}" -- \
  env TABA_DEV_BUILD=off WTC_DEV_BUILD=off taba --version
mise exec "github:lcorneliussen/taba@$edge_version" -- \
  env TABA_DEV_BUILD=off WTC_DEV_BUILD=off taba status --tui
```

To keep testing that version in the collection, add its exact tag under
`[tools]` in the collection root's `mise.local.toml`. Preserve any other entries
in the file. Use the Taba tool key from the generated `mise.toml`.

```toml
[tools]
"github:lcorneliussen/taba" = "<published edge tag>"
```

Run `mise trust mise.local.toml`, `mise install`, and
`taba agent-env --write`. Verify the executable with `taba --version`.
If source following is active, use both bypass variables as above or turn it
off with `taba dev mode off`. Restart the status pane to use the new selection.

To return to the project pin, remove the edge entry, run
`taba agent-env --write`, and restart the pane. This selection is local to the
collection. See the [edge build reference](https://github.com/lcorneliussen/taba/blob/f8d88c75c99d5e59aa2bcc18a56583f1e9a6dacd/docs/edge-builds.md)
for provenance verification and maintainer publishing instructions.

## Use a local source build

If the CLI source is checked out in the collection, `taba dev install` builds it
once. To follow a specific checkout, use `taba dev mode on --source <checkout>`.
Source following rebuilds when the selected checkout changes. Catch up that
checkout separately when you want a newer revision. Verify the selected commit
with `taba dev status` and start a new status pane if the existing one still
shows the old build.

Use `taba dev mode off` to turn off local source selection persistently. Use
`TABA_DEV_BUILD=off` to bypass it for a single command. See the
[tagged dev-mode implementation](https://github.com/lcorneliussen/taba/blob/v0.2.11/cmd/taba/dev.go)
for the source-selection and bypass rules.

## Adopt a stable release

Use `taba upgrade` when you intend to change the project pin. Review the
harness change and the release notes. After the pin change merges, use
`taba upgrade --rollout` to adopt it across eligible collections. See
[Upgrades and release notes](../upgrades/) for the upgrade workflow and
[GitHub Releases](https://github.com/lcorneliussen/taba/releases) for published
builds and notes.
