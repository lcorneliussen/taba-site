// Synchronized renderer replay, not a recording of two live gateways.
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, join, basename, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';

const palette = ['#161920', '#dc6b73', '#98c379', '#e5c07b', '#61afef', '#c678dd', '#56b6c2', '#d4d4d4', '#5c6370', '#e88388', '#b5df91', '#f2d58a', '#83c2f2', '#dda1ed', '#83d6df', '#ffffff'];

// Only SGR styles are interpreted. OSC links and terminal controls cannot become HTML.
export function terminalRuns(content) {
  const runs = [], state = {};
  const pattern = /\x1b\[[0-?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;
  let start = 0;
  for (const token of content.matchAll(pattern)) {
    if (token.index > start) runs.push({ text: content.slice(start, token.index), style: { ...state } });
    if (token[0].startsWith('\x1b[') && token[0].endsWith('m')) {
      const codes = token[0].slice(2, -1).split(';').map(Number);
      for (let i = 0; i < codes.length; i++) {
        const code = codes[i];
        if (code === 0) for (const key of Object.keys(state)) delete state[key];
        else if (code === 1) state.fontWeight = '700';
        else if (code === 2) state.opacity = '.65';
        else if (code === 3) state.fontStyle = 'italic';
        else if (code === 4) state.textDecoration = 'underline';
        else if (code === 22) { delete state.fontWeight; delete state.opacity; }
        else if (code === 24) delete state.textDecoration;
        else if (code === 23) delete state.fontStyle;
        else if (code === 39) delete state.color;
        else if (code === 49) delete state.backgroundColor;
        else if (code >= 30 && code <= 37) state.color = palette[code - 30];
        else if (code >= 40 && code <= 47) state.backgroundColor = palette[code - 40];
        else if (code >= 90 && code <= 97) state.color = palette[code - 90 + 8];
        else if (code >= 100 && code <= 107) state.backgroundColor = palette[code - 100 + 8];
        else if (code === 7 || code === 27) throw Error('Reverse terminal style is not supported');
        else if ((code === 38 || code === 48) && codes[i + 1] === 2) {
          const rgb = codes.slice(i + 2, i + 5);
          if (rgb.length !== 3 || rgb.some(n => !Number.isInteger(n) || n < 0 || n > 255)) throw Error('Invalid terminal RGB style');
          state[code === 38 ? 'color' : 'backgroundColor'] = `rgb(${rgb.join(',')})`; i += 4;
        } else if ((code === 38 || code === 48) && codes[i + 1] === 5) {
          const index = codes[i + 2];
          if (!Number.isInteger(index) || index < 0 || index > 255) throw Error('Invalid indexed terminal color');
          const cube = n => n ? 55 + 40 * n : 0;
          const n = index - 16, color = index < 16 ? palette[index] : index >= 232 ? `rgb(${Array(3).fill(8 + (index - 232) * 10).join(',')})` : `rgb(${[Math.floor(n / 36), Math.floor(n / 6) % 6, n % 6].map(cube).join(',')})`;
          state[code === 38 ? 'color' : 'backgroundColor'] = color; i += 2;
        } else if (code === 38 || code === 48) {
          throw Error('Unsupported extended terminal color');
        }
      }
    }
    start = token.index + token[0].length;
  }
  if (start < content.length) runs.push({ text: content.slice(start), style: { ...state } });
  if (runs.some(run => /\x1b/.test(run.text))) throw Error('Unsupported terminal escape sequence');
  return runs;
}

export function localTerminalFixture(data) {
  const collection = data.collection.label, repos = [], facts = [], prs = [];
  for (const row of data.repos) {
    const pr = row.pullRequest, branch = row.branch ?? '', toPush = row.unpublished ?? row.ahead ?? 0;
    // The equivalent local checkout tracks the published branch once a PR exists.
    // Claw's ahead-of-base count is not silently treated as unpublished commits.
    const ahead = pr ? toPush : row.ahead ?? 0;
    repos.push({ collection, dir: row.repo, repo: row.repo, worktree: `/demo/collections/${collection}/${row.repo}`, slug: `${row.owner}/${row.repo}`, forge: row.forge,
      branch_kind: branch ? 'branch' : 'detached', branch, branch_display: branch || 'at main', tree: row.dirty ? String(row.dirty) : 'clean', changed: row.dirty ?? 0,
      ahead, ahead_ref: pr ? `origin/${branch}` : 'origin/main', ahead_basis: pr ? 'upstream' : 'development-tip', behind: row.behind ?? 0,
      pr: pr ? { number: String(pr.number), url: pr.url, checks: (pr.checks ?? '').toUpperCase(), draft: !!pr.draft, merge: ({ mergeable: 'MERGEABLE', conflicting: 'CONFLICTING' })[pr.mergeable] ?? '', review: pr.review ?? '' } : null });
    facts.push({ Collection: collection, Repo: row.repo, Host: 'local', Branch: branch, Base: 'origin/main', Head: 'synthetic-head', BaseHead: 'synthetic-base', Ahead: ahead, Behind: row.behind ?? 0, Dirty: row.dirty ?? 0, ToPush: toPush,
      PR: pr ? { Number: pr.number, State: pr.state, Draft: !!pr.draft, Checks: pr.checks ?? 'none', Mergeable: pr.mergeable ?? 'unknown', Review: pr.review ?? '' } : null });
    for (const item of [...(row.pullRequests ?? []), ...(pr ? [pr] : [])]) prs.push({ repo: row.repo, number: String(item.number), state: item.state.toUpperCase(), title: item.title ?? 'Synthetic change', display_title: item.title ?? 'Synthetic change', url: item.url, draft: !!item.draft, archived: ['merged', 'closed'].includes(item.state), on_branch: item === pr });
  }
  return { snapshot: { schema: 1, collection, generated_at: 'synthetic recording', repos, prs, runtime: data.services.map(s => ({ ...s, collection, dir: s.repo })) }, facts };
}

export function terminalRecordingRequest(recording, columns, rows) {
  if (!Number.isFinite(recording.startedAt) || !Number.isFinite(recording.duration) || !recording.events.length) throw Error('Missing shared snapshot timeline');
  if (recording.events.some((event, i) => !Number.isFinite(event.at) || (i && event.at < recording.events[i - 1].at))) throw Error('Snapshot timestamps are not monotonic');
  const before = recording.events.filter(event => event.at <= recording.startedAt).at(-1);
  if (!before) throw Error('No initialized terminal snapshot');
  const events = [before, ...recording.events.filter(event => event.at > recording.startedAt)];
  const frames = events.map((event, i) => ({ at: i ? event.at - recording.startedAt : 0, phase: i ? `snapshot-${i}` : 'idle', ...localTerminalFixture(event.snapshot), keys: [] }));
  // A separate native-key preview stops before Enter/dispatch. All commands are refused.
  const initial = localTerminalFixture(before.snapshot);
  for (const [i, keys] of [[], ['n'], ['space'], ['s'], ['j'], ['k'], ['right'], ['esc']].entries()) frames.push({ at: recording.duration + 1 + i, phase: `selection-${i}`, ...initial, keys });
  return { columns, rows, frames };
}

const ffmpeg = args => execFileSync('ffmpeg', ['-v', 'error', ...args], { maxBuffer: 64 * 1024 * 1024 });
const metadata = path => JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', path], { encoding: 'utf8' }));
const safeJSON = value => JSON.stringify(value).replace(/</g, '\\u003c');

async function verifyBrowserPixels(video, png, geometry) {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    await context.route('**/*', route => {
      const url = route.request().url();
      if (url === 'https://terminal-check.invalid/') return route.fulfill({ contentType: 'text/html', body: '<video src="/video.webm" preload="auto"></video><img src="/source.png">' });
      if (url === 'https://terminal-check.invalid/video.webm') return route.fulfill({ contentType: 'video/webm', body: video });
      if (url === 'https://terminal-check.invalid/source.png') return route.fulfill({ contentType: 'image/png', body: png });
      return route.abort();
    });
    const page = await context.newPage(); await page.goto('https://terminal-check.invalid/');
    await page.waitForFunction(() => document.querySelector('video').readyState >= 2 && document.querySelector('img').complete);
    const result = await page.evaluate(({ clawWidth, terminalWidth, terminalHeight }) => {
      const video = document.querySelector('video'), image = document.querySelector('img'), canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
      const source = context.getImageData(0, 0, canvas.width, canvas.height).data;
      context.drawImage(video, clawWidth, video.videoHeight - terminalHeight, terminalWidth, terminalHeight, 0, 0, canvas.width, canvas.height);
      const actual = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let maxChannelDifference = 0;
      for (let i = 0; i < source.length; i++) maxChannelDifference = Math.max(maxChannelDifference, Math.abs(source[i] - actual[i]));
      return { maxChannelDifference, decodedWidth: video.videoWidth, decodedHeight: video.videoHeight };
    }, geometry);
    if (result.maxChannelDifference > 2) throw Error('Browser playback changed terminal pixels: ' + JSON.stringify(result));
    await context.close(); return result;
  } finally { await browser.close(); }
}

async function main() {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { columns: { type: 'string', default: '96' }, rows: { type: 'string', default: '24' }, 'font-size': { type: 'string', default: '16' } } });
  if (positionals.length < 2 || positionals.length > 3) throw Error('Usage: npm run demos:openclaw:buddy -- /path/to/wtc-cli /path/to/take [output] [--columns 96] [--rows 24] [--font-size 16]');
  const upstream = resolve(positionals[0]), take = resolve(positionals[1]), output = resolve(positionals[2] ?? join(take, 'buddy'));
  if (execFileSync('git', ['-C', upstream, 'status', '--porcelain', '--', 'cmd/wtc', 'internal', 'go.mod', 'go.sum'], { encoding: 'utf8' }).trim()) throw Error('Native TUI source must be committed before recording');
  const columns = Number(values.columns), rows = Number(values.rows), fontSize = Number(values['font-size']);
  if (![columns, rows, fontSize].every(Number.isInteger) || columns < 30 || columns > 200 || rows < 10 || rows > 80 || fontSize < 14 || fontSize > 24) throw Error('Invalid native terminal dimensions');
  await mkdir(output, { recursive: true }); if ((await readdir(output)).length) throw Error('Output directory must be empty');
  const claw = join(dirname(take), basename(take) + '.webm'), clawMetadata = metadata(claw), clawInfo = clawMetadata.streams.find(stream => stream.codec_type === 'video');
  const recording = JSON.parse(await readFile(join(take, 'tui-snapshots.json'), 'utf8'));
  recording.duration = Math.max(recording.duration, Number(clawMetadata.format.duration));
  const request = terminalRecordingRequest(recording, columns, rows), input = join(output, 'native-request.json'), result = join(output, 'native-frames.json');
  await writeFile(input, JSON.stringify(request, null, 2));
  const env = { ...process.env, WTC_RECORDING_INPUT: input, WTC_RECORDING_OUTPUT: result }; delete env.GOROOT;
  execFileSync('go', ['test', '-tags', 'recording', './cmd/wtc', '-run', '^TestStatusRecordingFrames$', '-count=1'], { cwd: upstream, env, stdio: ['ignore', 'pipe', 'pipe'] });
  const native = JSON.parse(await readFile(result, 'utf8')), frames = native.frames.filter(frame => !frame.phase.startsWith('selection-')), selection = native.frames.filter(frame => frame.phase.startsWith('selection-'));
  const writeCast = async (name, items, offset = 0) => {
    const header = { version: 2, width: columns, height: rows, title: 'Native wtc status renderer; synthetic shared snapshots', env: { TERM: 'xterm-256color' } };
    const events = items.map(frame => [frame.at - offset, 'o', '\x1b[2J\x1b[H' + frame.content.replace(/\n/g, '\r\n')]);
    await writeFile(join(output, name), [header, ...events].map(item => JSON.stringify(item)).join('\n') + '\n');
  };
  await writeCast('status.cast', frames); await writeCast('selection.cast', selection, selection[0].at);
  const browser = await chromium.launch({ headless: true });
  let terminalWidth, terminalHeight;
  try {
    const context = await browser.newContext({ deviceScaleFactor: 1, viewport: { width: 1600, height: 1000 } });
    await context.route('**/*', route => route.request().url() === 'https://terminal.invalid/' ? route.fulfill({ contentType: 'text/html', body: `<style>body{margin:0;background:#161920;color:#d4d4d4}pre{margin:12px;white-space:pre;font:${fontSize}px/${fontSize * 1.5}px 'SFMono-Regular',Menlo,Consolas,'Liberation Mono',monospace}</style><pre></pre>` }) : route.abort());
    const page = await context.newPage(); await page.goto('https://terminal.invalid/');
    const size = await page.evaluate(({ columns, rows, fontSize }) => { const c = document.createElement('canvas').getContext('2d'); c.font = getComputedStyle(document.querySelector('pre')).font; return { width: Math.ceil(c.measureText('M').width * columns + 24), height: rows * fontSize * 1.5 + 24 }; }, { columns, rows, fontSize });
    terminalWidth = size.width + size.width % 2; terminalHeight = size.height + size.height % 2;
    await page.setViewportSize({ width: terminalWidth, height: terminalHeight });
    const render = async frame => {
      await page.evaluate(runs => { const pre = document.querySelector('pre'); pre.replaceChildren(...runs.map(run => { const span = document.createElement('span'); span.textContent = run.text; Object.assign(span.style, run.style); return span; })); }, terminalRuns(frame.content));
      const dimensions = await page.locator('pre').evaluate(node => ({ fits: node.scrollWidth <= node.clientWidth + 1, width: node.clientWidth, needed: node.scrollWidth, heightFits: node.getBoundingClientRect().bottom <= innerHeight - 11 }));
      if (!dimensions.fits || !dimensions.heightFits) throw Error('Native terminal rows would wrap or be clipped: ' + JSON.stringify(dimensions));
      await page.screenshot({ path: join(output, frame.phase + '.png') });
    };
    for (const frame of native.frames) await render(frame);
    await context.close();
  } finally { await browser.close(); }
  const lines = frames.map((frame, i) => `file '${frame.phase}.png'\noption framerate 1000\nduration ${Math.max(.001, (frames[i + 1]?.at ?? recording.duration) - frame.at).toFixed(6)}`).join('\n') + `\nfile '${frames.at(-1).phase}.png'\noption framerate 1000\n`;
  await writeFile(join(output, 'terminal-timeline.txt'), lines);
  const terminalVideo = join(output, 'terminal-lossless.webm');
  ffmpeg(['-y', '-f', 'concat', '-safe', '0', '-i', join(output, 'terminal-timeline.txt'), '-fps_mode', 'vfr', '-c:v', 'libvpx-vp9', '-lossless', '1', '-pix_fmt', 'gbrp', '-colorspace', 'rgb', '-color_range', 'pc', '-threads', '2', terminalVideo]);
  // Verify exact RGB preservation, not merely a low encoder quality setting.
  const sourcePixels = ffmpeg(['-i', join(output, 'idle.png'), '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-']);
  const decodedPixels = ffmpeg(['-i', terminalVideo, '-frames:v', '1', '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-']);
  if (!sourcePixels.equals(decodedPixels)) throw Error('Terminal video did not preserve the source RGB pixels');
  const height = Math.max(clawInfo.height, terminalHeight), buddy = join(output, 'buddy-lossless.webm');
  ffmpeg(['-y', '-i', claw, '-i', terminalVideo, '-filter_complex', `[0:v]format=gbrp,pad=iw:${height}:0:${height}-ih:color=0x161920[a];[1:v]format=gbrp,pad=iw:${height}:0:${height}-ih:color=0x161920[b];[a][b]hstack=inputs=2:shortest=1`, '-fps_mode', 'vfr', '-c:v', 'libvpx-vp9', '-lossless', '1', '-pix_fmt', 'gbrp', '-colorspace', 'rgb', '-color_range', 'pc', '-threads', '2', buddy]);
  const pairedPixels = ffmpeg(['-i', buddy, '-vf', `crop=${terminalWidth}:${terminalHeight}:${clawInfo.width}:${height - terminalHeight}`, '-frames:v', '1', '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-']);
  if (!sourcePixels.equals(pairedPixels)) throw Error('Paired video changed or rescaled terminal pixels');
  const buddyInfo = metadata(buddy);
  if (buddyInfo.streams[0].width !== clawInfo.width + terminalWidth || buddyInfo.streams[0].height !== height || Number(buddyInfo.format.duration) < Number(metadata(claw).format.duration) - .002) throw Error('Paired video dimensions or duration changed');
  ffmpeg(['-y', '-i', buddy, '-c:v', 'libx264', '-threads', '2', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-fps_mode', 'vfr', '-enc_time_base', '1:1000', join(output, 'buddy-compatible.mp4')]);
  for (const path of [terminalVideo, buddy, join(output, 'buddy-compatible.mp4')]) ffmpeg(['-i', path, '-fps_mode', 'passthrough', '-enc_time_base', '1:1000', '-f', 'null', '-']);
  const browserPlayback = await verifyBrowserPixels(await readFile(buddy), await readFile(join(output, 'idle.png')), { clawWidth: clawInfo.width, terminalWidth, terminalHeight });
  const replay = native.frames.map(frame => ({ ...frame, runs: terminalRuns(frame.content) }));
  await writeFile(join(output, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Claw and native TUI renderer replay</title><style>body{font:15px system-ui;background:#101318;color:#ddd;margin:24px}a{color:#ff9090}video{display:block;max-width:none;width:auto}pre{background:#161920;padding:12px;width:max-content;min-width:${terminalWidth - 24}px;min-height:${terminalHeight - 24}px;font:${fontSize}px/${fontSize * 1.5}px 'SFMono-Regular',Menlo,Consolas,'Liberation Mono',monospace}.scroller{overflow:auto}button{padding:8px;margin-right:8px}</style><h1>Same snapshot timeline, two renderers</h1><p>Claw recording paired with the actual Go TUI renderer. Synthetic snapshots; synchronized post-composition, not two live gateway sessions. Native pixels, no video rescaling. Use the lossless video or terminal replay for crisp text; the MP4 is a compatibility copy.</p><div class="scroller"><video controls src="buddy-lossless.webm"></video></div><p><a href="buddy-compatible.mp4">Compatibility MP4</a> · <a href="status.cast">Native ANSI/cast</a> · <a href="selection.cast">Selection-only cast</a> · <a href="manifest.json">Provenance</a></p><p>The terminal's n / Space / s / j / k / right / Esc selection preview stops before Enter; no work or agent handoff is dispatched.</p><div id="buttons"></div><div class="scroller"><pre id="terminal"></pre></div><script>const frames=${safeJSON(replay)};const pane=document.querySelector('#terminal');function show(frame){pane.replaceChildren(...frame.runs.map(run=>{const span=document.createElement('span');span.textContent=run.text;Object.assign(span.style,run.style);return span}));}for(const frame of frames){const b=document.createElement('button');b.textContent=frame.phase;b.onclick=()=>show(frame);document.querySelector('#buttons').append(b)}show(frames[0]);</script>`);
  await writeFile(join(output, 'manifest.json'), JSON.stringify({ kind: 'Actual Go TUI renderer and native-key selection preview; synthetic equivalent local checkout', sourceRevision: execFileSync('git', ['-C', upstream, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), columns, rows, fontSize, terminalWidth, terminalHeight, clawWidth: clawInfo.width, noRescaling: true, terminalRGBPreserved: true, pairedTerminalRGBPreserved: true, browserPlayback, terminalCodec: 'VP9 lossless RGB / full chroma', nativeDispatch: false, rawCast: 'status.cast', selectionCast: 'selection.cast', duration: recording.duration }, null, 2));
  console.log('Buddy replay: ' + join(output, 'index.html'));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
