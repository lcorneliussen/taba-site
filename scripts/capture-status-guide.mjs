import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { scenarios } from '../src/data/status-scenarios.mjs';
import { terminalRuns } from './record-openclaw-tui.mjs';

const upstream = resolve(process.argv[2] || '../wtc-cli');
const output = resolve(process.argv[3] || 'src/data/status-frames.json');
const git = args => execFileSync('git', ['-C', upstream, ...args], { encoding: 'utf8' }).trim();
const revision = git(['rev-parse', 'HEAD']);
if (git(['status', '--porcelain', '--', 'cmd', 'internal', 'go.mod', 'go.sum'])) throw Error('Capture requires clean CLI source inputs');
const temporary = await mkdtemp(join(tmpdir(), 'status-guide-'));
const go = process.env.GO || 'go';
const env = { ...process.env, GOWORK: 'off', NO_COLOR: '', TERM: 'xterm-256color', WTC_DEV_BUILD: 'off' };
const binary = join(temporary, 'status.test');
const frames = {};
try {
  execFileSync(go, ['test', '-tags', 'recording', '-c', '-o', binary, './cmd/wtc'], { cwd: upstream, env, stdio: 'pipe' });
  for (const scenario of scenarios) {
    frames[scenario.id] = {};
    for (const columns of [100, 60, 39]) {
      const input = join(temporary, 'input.json'), result = join(temporary, 'result.json');
      const request = { columns, rows: 18, frames: [{ at: 0, phase: scenario.id, snapshot: scenario.snapshot, facts: scenario.snapshot.repos.map(() => ({})), keys: [] }] };
      await writeFile(input, JSON.stringify(request));
      execFileSync(binary, ['-test.run', '^TestStatusRecordingFrames$'], { cwd: upstream, env: { ...env, WTC_RECORDING_INPUT: input, WTC_RECORDING_OUTPUT: result }, stdio: 'pipe' });
      const captured = JSON.parse(await readFile(result, 'utf8'));
      const runs = terminalRuns(captured.frames[0].content);
      const plain = runs.map(run => run.text).join('');
      if (columns === 100) for (const expected of scenario.expect) {
        if (!plain.includes(expected)) throw Error(`${scenario.id}: native output lost ${expected}`);
      }
      frames[scenario.id][columns] = { runs, plain };
    }
  }
  if (git(['rev-parse', 'HEAD']) !== revision || git(['status', '--porcelain', '--', 'cmd', 'internal', 'go.mod', 'go.sum'])) throw Error('CLI source changed during capture');
  const sourceHash = createHash('sha256');
  for (const path of ['cmd/wtc/status_tui.go', 'cmd/wtc/status_tui_style.go', 'cmd/wtc/status_runtime.go', 'cmd/wtc/status_recording_test.go']) sourceHash.update(path).update(await readFile(join(upstream, path)));
  const fixtureDigest = createHash('sha256').update(JSON.stringify(scenarios.map(({ id, snapshot }) => ({ id, snapshot })))).digest('hex');
  await writeFile(output, JSON.stringify({ sourceRevision: revision, sourceDigest: sourceHash.digest('hex'), fixtureDigest, renderer: 'statusTUIModel.View', synthetic: true, actionsDispatched: false, columns: [100, 60, 39], rows: 18, frames }, null, 2) + '\n');
  console.log(`Captured ${scenarios.length} native scenarios at three widths from ${revision.slice(0, 7)}`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
