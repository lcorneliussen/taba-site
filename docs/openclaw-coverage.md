# OpenClaw plugin coverage and visual demos

Audited 2026-10-26 against CLI commit
[`9da4ba3057b00f1292f53b65f44bab58e1243029`](https://github.com/lcorneliussen/wtc-cli/tree/9da4ba3057b00f1292f53b65f44bab58e1243029).
The handbook's general reviewed baseline remains v0.1.51
(`18652cbec6899bee283c16fb4f5e946013a65470`). A file on main is not proof
of a published release. Newer plugin material is explicitly labeled and linked
to the audited commit; this is not a full baseline upgrade.

## Assessment

**Good conceptual/agent workflow coverage; previously weak visual and everyday
Control UI guidance.** The dedicated OpenClaw page already taught hidden owners,
plans versus execution, adding repositories, project selection, publication,
catch-up, sandbox git and previews. The homepage's OpenClaw quick-start option,
command map, upgrades and services pages make the integration discoverable.
It did not show the plugin or teach what its dense controls mean.

| Capability / evidence in CLI | Before | Disposition in this change |
| --- | --- | --- |
| `docs/openclaw.md`: conversation, hidden owners, project boundaries | Good | Retain |
| Control UI card and panel; `openclaw-plugin/dist/control-ui/v1/index.js` | Named but not demonstrated | Real-renderer screenshots, short video, column/action legend |
| Personal publish connection and two-step confirmation | Partial | Explicit connection path, confirm step and distinction from shared CLI identity |
| Installation, doctor, mismatched CLI/plugin, composer selection | Scattered across upgrades and upstream | Add a short setup/diagnosis path; keep admin details upstream |
| Current parallel work and sub-session controls | Old `--worker` recommendation | Distinguish v0.1.51 from audited current guidance, explain integration/discard controls |
| PR notifications and configuration in `openclaw.plugin.json` | Basic event mention | Add wake/queue/off and polling summary |
| Service controls, portals, tunnels | Separate service guide | Add visual orientation and gateway-versus-laptop URL distinction |
| Project suggestions and decision-model data flow | Already covered | Retain; model configuration remains upstream |
| Sandbox access, forge support, contributor verification, hardened git | Partial / specialist | Keep detailed contracts upstream; do not turn learning page into admin manual |
| End-to-end clone, push, catch-up, service lifecycle demos | Absent | Still absent: fixture demo intentionally does not claim backend coverage |

## Drift that remains

The source-disposition checker reports **10 changed and 13 new inputs** at the
audited commit relative to the handbook baseline. New numbered notes include
0.1.52–0.1.57 and 0.1.59, plus two unreleased fragments. The next full release
intake should review services/tunnels, merged-branch lifecycle and other command
changes before advancing pins and hashes. Do not mark these reviewed just because
this page now has media.

The existing coverage inventory watches docs/defaults/release notes, **not
plugin source or its config schema**. It measures source disposition, not
semantic feature completeness. Media provenance records the renderer revision
and SHA-256, but does not automatically detect later UI changes. A future
freshness report should include plugin UI/schema changes as review inputs.

## What is captured

`npm run demos:openclaw -- /absolute/path/to/wtc-cli [output-directory]`:

1. Reads the unchanged upstream browser module and records its git revision/hash.
2. Mounts its exported card and panel in Chromium using the host interface from
   upstream's `openclaw-plugin/test/control-ui.test.mjs`.
3. Supplies generic synthetic repositories, PRs, a service and account state.
4. Captures desktop card/panel PNGs, a narrow panel PNG, and a short WebM of
   expanding the card and opening the panel.
5. Checks expected UI content, browser errors, and narrow-page overflow. All
   network requests except two in-memory fixture resources are rejected.

No server, gateway, tokens, real chat history, actual repository mutation or
publication is involved. The plugin code is not copied into the deployed site;
only the generated media is shipped. The surrounding shell/theme/composer and
host responses are synthetic, and every visual is labeled accordingly. These
are not screenshots of the full OpenClaw application. No backend integration or
real publishing flow is verified by this capture.

The handbook uses a lazy screenshot, a collapsed video with native controls,
`preload="none"`, no autoplay/loop, descriptive alt text and a text transcript.
No narration or audio is included. WebM is sufficient for this first slice; add
an MP4 source if the supported-browser matrix requires it. Captures are about
550 KB total in this revision, rather than large animated GIFs.

## Reproduction and review

Install development dependencies and Chromium using the README commands. The
pinned Playwright version and browser version are in `provenance.json`; output
pixels/video bytes may still vary by OS/fonts. Reproduce against the recorded
CLI commit for comparable output. To review a newer UI, use that checkout and
review both media and prose before updating provenance.

The manual `openclaw-demos.yml` workflow checks out the recorded revision and
uploads artifacts. It has read-only repository permissions and no schedule,
commits, PR creation or deployment. It is not available on the hosted default
branch until this change lands. Hosted Actions execution was not tested here.

Before publication, inspect all frames for private information, readability,
clipping and factual claims. Backend demonstrations require a dedicated disposable
OpenClaw gateway, synthetic repositories and a scripted reset—not a recording of
a team's active conversation. Candidate next clips: project suggestion → add
repository; change → publish confirmation (no real public push); failed CI →
agent follow-up; service start → preview. Keep each independently reproducible.

## Existing CLI demos

For raw push/refresh and individual/batch catch-up clips, see the separate
[interaction recording guide](recording-openclaw-interactions.md). Those clips
extend renderer demonstrations with scripted responses and assertions; they do
not turn the historical captures above into end-to-end gateway evidence.

Upstream `docs/demos/record.py` already records real terminal commands in fresh
synthetic repositories to asciicast and transcripts; optional `agg` makes GIFs.
`record_runtime.py` adds runtime/cleanup scenarios and needs dekit. They are
useful for local-terminal pages, but are **not** recordings of the OpenClaw
plugin. Reuse those procedures for live command demos. The interaction guide
also provides a paired renderer replay: the recording-only Go adapter renders
the same synthetic snapshot timeline using the native status TUI, with native-key
selection previews that stop before dispatch. Lossless RGB video, PNGs and casts
keep terminal text sharp; this is not two live gateway captures.

## Verification for this change

- Astro check: 13 files, no errors, warnings or hints; static build: 13 pages.
- Internal links/assets: 385 checked successfully.
- Coverage tests: 7 passed; offline structural check and exact v0.1.51 source
  snapshot check passed. Current-source drift is expected and remains unaccepted.
- Recorder: desktop card → panel interaction, expected content, browser error
  checks and 390px viewport check passed; screenshots visually inspected.
- Built handbook: screenshot loaded, WebM played in Chromium (8.2 seconds), and
  390px page width check passed. External links and other browser engines were
  not tested.
- Capture workflow YAML parsed and manual/read-only settings checked; hosted
  workflow execution and live gateway/backend behavior were not verified.
