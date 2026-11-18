import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdtemp, rm, access } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { scenarios, replayGroups, selectReplay, assertFrameVisibility } from '../src/data/status-scenarios.mjs';
import { terminalRuns } from './record-openclaw-tui.mjs';
import { loadReleaseEvidence } from './record-openclaw.mjs';

export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
export const fixtureDigest = cases => digest(JSON.stringify(cases.map(({ id, snapshot }) => ({ id, snapshot }))));
export async function validateReplay(capture, cases = scenarios) {
  const parser = digest(await readFile(new URL('./record-openclaw-tui.mjs', import.meta.url)));
  for (const group of replayGroups(capture, cases)) {
    if (group.provenance.parserDigest !== parser) throw Error('Terminal parser differs from recorded provenance');
    if (group.provenance.fixtureDigest !== fixtureDigest(group.scenarios)) throw Error('Scenario inputs differ from their recorded group fixture digest');
  }
}
export async function sourceFingerprint(upstream, commandPackage) {
  const files = execFileSync('git', ['-C', upstream, 'ls-files', '--', commandPackage, 'internal', 'go.mod', 'go.sum'], { encoding: 'utf8' }).trim().split('\n').sort();
  const hash = createHash('sha256');
  for (const path of files) hash.update(path).update(await readFile(join(upstream, path)));
  return hash.digest('hex');
}

async function main() {
  const upstream = resolve(process.argv[2] || '../wtc-cli');
  const output = resolve(process.argv[3] || 'src/data/status-frames.json');
  let original, exists = true;
  try { original = await readFile(output, 'utf8'); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    exists = false;
    original = await readFile(new URL('../src/data/status-frames.json', import.meta.url), 'utf8');
  }
  const replay = JSON.parse(original);
  await validateReplay(replay);
  const git = args => execFileSync('git', ['-C', upstream, ...args], { encoding: 'utf8' }).trim();
  const revision = git(['rev-parse', 'HEAD']);
  const group = selectReplay(replay, revision);
  const { provenance } = group;
  const clean = () => !git(['status', '--porcelain', '--untracked-files=all']);
  if (!clean()) throw Error('Capture requires a clean CLI checkout');
  const commandPackage = provenance.commandPackage;
  await access(join(upstream, commandPackage, 'status_recording_test.go'));
  if (await sourceFingerprint(upstream, commandPackage) !== provenance.sourceDigest) throw Error('CLI source fingerprint differs from recorded group');
  if (!process.argv[4]) throw Error('Supply release evidence for this recorded group');
  const release = await loadReleaseEvidence(upstream, process.argv[4]);
  if (JSON.stringify(release) !== JSON.stringify(provenance.release)) throw Error('Release evidence differs from recorded group');
  const temporary = await mkdtemp(join(tmpdir(), 'status-guide-'));
  const go = process.env.GO || 'go';
  const env = { ...process.env, GOENV: 'off', GOWORK: 'off', TERM: 'xterm-256color', TABA_DEV_BUILD: 'off', WTC_DEV_BUILD: 'off' };
  delete env.GOROOT;
  delete env.NO_COLOR;
  const binary = join(temporary, 'status.test');
  try {
    execFileSync(go, ['test', '-tags', 'recording', '-c', '-o', binary, './' + commandPackage], { cwd: upstream, env, stdio: 'pipe' });
    for (const scenario of group.scenarios) {
      const frames = {};
      for (const columns of provenance.columns) {
        const input = join(temporary, 'input.json'), result = join(temporary, 'result.json');
        const request = { columns, rows: provenance.rows, frames: [{ at: 0, phase: scenario.id, snapshot: scenario.snapshot, facts: scenario.snapshot.repos.map(() => ({})), keys: [] }] };
        await writeFile(input, JSON.stringify(request));
        execFileSync(binary, ['-test.run', '^TestStatusRecordingFrames$'], { cwd: upstream, env: { ...env, WTC_RECORDING_INPUT: input, WTC_RECORDING_OUTPUT: result }, stdio: 'pipe' });
        const captured = JSON.parse(await readFile(result, 'utf8'));
        const runs = terminalRuns(captured.frames[0].content), plain = runs.map(run => run.text).join('');
        assertFrameVisibility(scenario, plain);
        if (columns === 100) for (const expected of scenario.expect) {
          if (!plain.includes(expected)) throw Error(`${scenario.id}: native output lost ${expected}`);
        }
        frames[columns] = { runs, plain };
      }
      replay.frames[scenario.id] = frames;
    }
    if (git(['rev-parse', 'HEAD']) !== revision || !clean() || await sourceFingerprint(upstream, commandPackage) !== provenance.sourceDigest) throw Error('CLI source changed during capture');
    if (JSON.stringify(await loadReleaseEvidence(upstream, process.argv[4])) !== JSON.stringify(release)) throw Error('Release inputs changed during native replay');
    await validateReplay(replay);
    if (exists && await readFile(output, 'utf8') !== original) throw Error('Replay changed during capture');
    await writeFile(output, JSON.stringify(replay, null, 2) + '\n', { flag: exists ? 'w' : 'wx' });
    console.log(`Captured only ${group.tag}: ${group.scenarios.length} native scenarios at three widths; other groups preserved`);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
