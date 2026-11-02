# Recording OpenClaw interactions

Use this workflow for short, repeatable interaction clips for the site or a UX
review. It clicks the actual upstream plugin controls in Chromium and supplies
synthetic gateway responses. It needs no server, gateway credentials or forge
account. All network requests except the in-memory fixture resources are blocked.

These are renderer demonstrations. They do not verify a live gateway, real
publication, backend timing or the cause of a previously reported incident.
For the existing card/panel screenshot tour, use
[the original media workflow](openclaw-coverage.md#what-is-captured).

## Record a take

From the site checkout:

Install FFmpeg (`ffmpeg` on PATH) before recording. Chromium screencast is used
for capture, and FFmpeg encodes the timestamped frames as WebM.

```sh
npm ci --include=dev
npx playwright install chromium
npm run demos:openclaw:interactions -- /absolute/path/to/wtc-cli
```

The upstream checkout supplies
`openclaw-plugin/dist/control-ui/v1/index.js`. That file must be unchanged in
git; the recorder captures its commit and SHA-256. Use the release or revision
you intend to document. A passing recording of newer source does not advance
the site's reviewed or published baseline.

The default output is the ignored `artifacts/openclaw-interactions/` directory.
Open `index.html` there to watch the six silent, raw WebM clips (four for the sidebar). The video
contains only the product view, without a title card, captions, cursor marker or
request-trace overlay. Each clip has a separate request trace, named phase captures and a final PNG.
`manifest.json` records the source revision/hash, Playwright/browser versions,
scenario, assertions and measured base-layout coordinates. Takes fail if the
header, repository grid, Services or composer shifts by more than one CSS pixel
during preparation, progress, completion or refresh. It also measures text baselines
in the header, repository and service rows, including monospace values and button
labels, using the first visible glyph range and its font ascent without changing
the DOM, and rejects a spread over 0.25 CSS pixels. Glyph-only controls center
independently. The recorder checks the expected UI outcomes and loads
each finalized video to verify metadata and the first frame, and fully decodes it.
The raw viewport PNGs and measurement coordinates are retained. `crop` in the
manifest maps those coordinates to the cropped video. The poster uses the actual
first cropped video frame.

Use a new, empty directory for every take; the recorder refuses to overwrite
existing output. To record just one scenario:

```sh
npm run demos:openclaw:interactions -- /absolute/path/to/wtc-cli artifacts/push-take-2 push
```

The scenario argument is optional; `all` explicitly selects all applicable scenarios. Run with
`--help` for usage. Choose a presentation and width:

```sh
# Raw collection card and composer, with no recording wrapper.
npm run demos:openclaw:interactions -- /path/to/wtc-cli artifacts/raw all --view card

# Card above a synthetic chat on mobile.
npm run demos:openclaw:interactions -- /path/to/wtc-cli artifacts/mobile all --view chat --width 390

# Chat/card and sidebar together on desktop.
npm run demos:openclaw:interactions -- /path/to/wtc-cli artifacts/split all --view split --width 1440

# Sidebar by itself; this also works at mobile widths.
npm run demos:openclaw:interactions -- /path/to/wtc-cli artifacts/sidebar all --view sidebar --width 390
```

`card` is the default. Supported widths are 320–2560 pixels; `split` requires
at least 900. Use `--sidebar-width 320` to test a narrow panel in a wide split
view (320–800 pixels, with at least 320 pixels left for the chat). The surrounding chat is synthetic, not a recording of a live
conversation. Its composer is anchored at the viewport bottom: temporary action
controls grow above the stable card, while sidebar details grow below Services. The gallery and manifest retain the simulation label outside the
raw video. Inspect at 320/390, 640/760 and 1120/1440 pixels when changing layout;
also check a narrow sidebar beside a wide chat. Include running, success,
failure details, selection, confirmation and collapsed states in design review.

| Scenario | Interaction and expected result |
| --- | --- |
| `push` | Bitbucket preparation → personal confirmation → simulated publication → refresh. A draft PR appears and the unpublished count clears. |
| `stale` | Same push, then a deliberately injected stale count alongside the new PR. The arrow returns; a manual refresh clears it. The old response is held until manual refresh. This models a response, not a verified backend bug. |
| `individual` | Click three repository behind-count controls quickly. All requests complete; inspect their individual progress and results. |
| `collapsed-push` | Start from the one-line card bar, prepare publication and explicitly confirm above the bar. The repository/service details stay collapsed. |
| `collapsed-catch-up` | Start a collection catch-up from the one-line bar and retain it through progress and completion. |
| `batch` | Click the collection's catch-up shortcut once. Observe sequential processing and three completion results. The sidebar and split views show the log without changing views. |

The fixture starts with its initial collection data and expanded state ready.
Capture starts after the initialized idle view is measured. Chromium screencast
supplies lossless PNG frames and their original timestamps; FFmpeg encodes them
without a trimming pass. Navigation before capture is excluded, so this demonstrates
interactions rather than page-load performance. Per-take capture frames, timestamps
and the encoding timeline remain available for inspection. Encoding uses a
millisecond time base and fails if any captured frame disappears or its timestamp
drifts by more than 2ms. The
decoded first frame must retain at least 70% of the idle reference text pixels
in each base region, allowing a 48-level channel difference for lossy encoding;
a missing card, repository list or composer fails the take. The manifest records
the measured matches, and the gallery poster uses the idle frame.
Later responses retain their scripted delays to make progress visible; these are
not performance measurements. The interaction timeline is not trimmed. A single spatial crop, derived from
visible bounds throughout the take, removes unused space above the content.
The crop stays fixed while controls expand; it never follows or hides movement. Pointer moves go
directly to their targets: sweeping an invisible recorded pointer over unrelated
controls creates brief hover flashes that look like product flicker. The fixture
uses neutral host-theme surfaces, small controls and primary confirmation colors. Assertions intentionally fail if the relevant controls or behavior
change. Inspect the new source contract before updating fixtures or selectors;
do not weaken an assertion merely to produce a video.

## Review and export

Watch every raw clip for readable text, clear state changes, clipping and
unexpected private content. Review the request trace against the
visible result. A sent agent handoff is not completed work; a successful RPC is
not proof that the underlying operation succeeded.

WebM works directly in the generated gallery. For an MP4 export, install
`ffmpeg` separately and run from the take directory:

```sh
for video in ./*.webm; do
  ffmpeg -i "$video" -c:v libx264 -crf 23 -pix_fmt yuv420p \
    -movflags +faststart -an "${video%.webm}.mp4"
done
```

Decode exports fully before sharing, for example
`ffmpeg -v error -i 01-push-create-pr.mp4 -f null -`.
### Check every frame when something flickers

Extract frames and their actual timestamps, then compare the affected region
before, during and after every change. Do not infer a phase from guessed seconds:
use the named phase PNGs and request trace to identify the outcome.

```sh
mkdir frames
ffmpeg -i take.mp4 -fps_mode passthrough frames/%06d.png
ffprobe -v error -select_streams v:0 -show_frames \
  -show_entries frame=best_effort_timestamp_time -of csv take.mp4 > frame-times.csv
```

Inspect one-frame reversals as well as the large changes. Separate intended
hover/focus feedback, initial loading and temporary-panel expansion from a
product redraw. Check every text baseline, unchanged cell/control bounds and
shared-view busy state. Record the frame number, timestamp, changed region and
cause in review evidence. Keep any diagnostic guides outside the raw video.

Keep the gallery, videos and traces together when sending a take for review.
Generated takes stay outside git by default. Publishing selected media under
`public/media/` is a separate edit: retain provenance, label simulated responses,
add a text alternative, use native playback controls without autoplay, and run
the site's normal build and link checks. This recorder never deploys the site.

## Add another interaction

Extend `scripts/record-openclaw-interactions.mjs` with:

1. A scenario ID, a concrete title and generic fixture repositories/accounts.
2. Only the host responses needed by that scenario, including failure cases.
3. Real control clicks with pauses that make progress visible. Keep explanation
   outside the raw video, in its title, trace and review notes.
4. Assertions on the resulting state and the dispatched requests. Keep network
   blocking and unexpected-request/browser-error failures enabled.
5. A row in the scenario table above describing what the clip establishes.

The shell is shared with the screenshot tour in `scripts/demos/openclaw.html`.
The recorder checks its injection boundaries and fails if they drift. The plugin
module itself is read unchanged from upstream; no copy is deployed with the site.

For a true end-to-end recording, prepare a separate disposable gateway and
synthetic repositories with a reset procedure. Record the tested versions and
verify the backend outcome independently. Do not substitute an active team's
chat, account, credentials or repositories for that fixture.

## Alignment and hierarchy guides

The recorder uses Playwright DOM geometry plus Canvas font metrics. It measures
semantic groups rather than imposing one grid on every element. Every phase
links to a separate `.guides.svg`; no guide enters a raw video. Pink lines show
shared name and count-arrow rails, blue lines text baselines, green lines cap-height
optical middles and dashed amber lines the measured icon ink middles. SVG ink
bounds are used for header/forge icons. Text and icons therefore have separate
checks. Header trailing padding is checked too.

The JSON includes font size, weight, contrast against the painted background,
filled surfaces, label truncation and pixels per repository. Empty fact bands
without a reservation fail. Density and prominence warnings are review evidence,
not an automated verdict on taste. Review headings, grouping and the dominant
controls with the unannotated image alongside the guides. Long branch names have
an explicit expansion affordance, so their intentional ellipsis is distinguished
from an unexpectedly clipped action label.

Run the focused diagnostic tests with `npm run test:visual`. The small reusable
implementation is `scripts/openclaw-visual-audit.mjs`. Its negative checks reject
a stable but wrong name rail, an icon centred on the wrong reference and an empty
fact lane. Reference APIs: [Playwright screenshots](https://playwright.dev/docs/screenshots)
and [Canvas TextMetrics](https://developer.mozilla.org/en-US/docs/Web/API/TextMetrics).

## Paired Claw and TUI evidence

After recording a take, pair it with the actual Go terminal renderer:

```sh
npm run demos:openclaw:buddy -- /path/to/wtc-cli artifacts/mobile/04-collection-catch-up
```

This requires Go and the source's recording-only test adapter. The recorder saves
the exact synthetic collection snapshots and their timestamps. The adapter uses
`statusTUIModel.View` and the local-host action planner to render the equivalent
local checkout, then synchronizes that replay beside the Claw video. It is
post-composition from shared facts, not two live gateway sessions. In particular,
ahead of the development tip is not assumed to mean unpublished: after publication
the equivalent local fixture tracks the remote branch.

The terminal uses 96 columns, 24 rows and a 16px monospace font by default. Set
`--columns`, `--rows` or `--font-size` explicitly for another native size. Videos
are never rescaled; the gallery scrolls horizontally instead. `terminal-lossless.webm`
and `buddy-lossless.webm` use lossless RGB/full-chroma VP9. The terminal's decoded
first frame must match the PNG's RGB bytes exactly. The MP4 is a compatibility
copy. PNGs and native `.cast` files retain the sharp source; use the HTML terminal
replay or a cast player to choose a larger font without scaling video pixels.

The selection-only preview exercises existing native keys: `n`, Space, `s`,
`j/k`, Right and Esc. It stops before Enter, refuses any command returned by the
model and never calls the collector, a forge, Git or an agent.

## Existing terminal actions

The current TUI has a keyboard Next actions view: `n` opens it, arrows or
`j/k` move, Space selects, `s` selects suggestions, Right chooses an alternative,
and Enter runs or reviews the selection. The recording stops before Enter.
Direct table actions remain separate; their preparation belongs with the
[upstream interaction contract](https://github.com/lcorneliussen/wtc-cli/blob/269-explicit-action-feedback/docs/openclaw.md#alignment-and-compact-views).

## Compare perceived sections with the intended structure

Font and alignment measurements alone do not test whether a service block reads
as a child of the last repository. The recorder now saves `phase.visual.json`
beside every phase PNG. It includes intended presentation regions (collection
controls, repositories and their rows, collection services, action log and
composer), their parent relationships, and the screenshot dimensions/SHA-256.
These regions are measured from the DOM; they are not independent perception.
Split-view metadata includes both surfaces; sidebar region IDs and parents use a
`sidebar:` prefix to keep the two presentation trees distinct.

For an independent check, give a reviewer **only the unannotated phase PNG**.
Ask them to identify visual groups, bounds, parent relationships and ambiguities
from spacing, indentation, typography, separators and surfaces. Do not supply the
DOM, intended region labels or this model until their observations are saved.
A useful neutral prompt is: “Group this screenshot from pixels alone. Return
JSON with canvas dimensions, groups containing id/label/parent/bounds/confidence/
evidence, and an ambiguities list. Do not assume a correct underlying model.”

Save that JSON with `imageSha256` copied from the phase metadata after the blind
review. Coordinates refer to the original full PNG, not a resized preview or the
video crop. Generate a standalone comparison from the site root:

```sh
node scripts/openclaw-visual-audit.mjs \
  artifacts/take/04-collection-catch-up/idle.visual.json \
  artifacts/take/04-collection-catch-up/idle.png \
  observations.json hierarchy-report.html
```

The report overlays **cyan dashed intended regions** and **magenta perceived
regions**, with separate toggles. It proposes geometric correspondences and flags
unrelated model regions perceived as merged or nested—for example, services under
the last repository. Unmatched regions and the reviewer's ambiguities stay
visible. Compare the region labels and reasoning too: interpreting bulk actions
as sorting can be wrong even when the geometric relationships match. Zero
relationship warnings is not a semantic or taste pass.

The expected tree describes presentation grouping, not every domain ownership
relation. Services is a collection-level visual section; a service row can still
name its owning repository. Without independent observations, the report says
**Not independently assessed**. Wrong-image annotations and cyclic parent trees
are rejected. These guides stay outside raw screenshots and video.
