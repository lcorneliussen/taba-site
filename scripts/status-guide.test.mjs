import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { scenarios } from '../src/data/status-scenarios.mjs';

const capture = JSON.parse(await readFile(new URL('../src/data/status-frames.json', import.meta.url), 'utf8'));
test('native replay matches authored snapshot inputs and bounded source metadata', () => {
  const digest = createHash('sha256').update(JSON.stringify(scenarios.map(({ id, snapshot }) => ({ id, snapshot })))).digest('hex');
  assert.equal(capture.fixtureDigest, digest, 'Snapshot inputs changed: regenerate the native replay');
  assert.match(capture.sourceRevision, /^[a-f0-9]{40}$/);
  assert.match(capture.sourceDigest, /^[a-f0-9]{64}$/);
  assert.equal(capture.commandPackage, 'cmd/taba');
  assert.match(capture.parserDigest, /^[a-f0-9]{64}$/);
  assert(!/\/(?:Users|home|private)\//.test(JSON.stringify(capture)), 'Replay metadata must not expose local paths');
  assert.equal(capture.renderer, 'statusTUIModel.View');
  assert.equal(capture.actionsDispatched, false);
  assert.equal(capture.synthetic, true);
  assert.deepEqual(Object.keys(capture.frames).sort(), scenarios.map(scenario => scenario.id).sort());
});
for (const scenario of scenarios) {
  test(`${scenario.id}: all widths retain PR identity and usable terminal text`, () => {
    const frames = capture.frames[scenario.id];
    assert.deepEqual(Object.keys(frames).sort(), ['100', '39', '60']);
    for (const [width, frame] of Object.entries(frames)) {
      assert.equal(frame.runs.map(run => run.text).join(''), frame.plain);
      assert(!/[\x00-\x08\x0b-\x1f\x7f]/.test(frame.plain));
      assert(frame.plain.includes('taba/wtc status'));
      for (const row of scenario.snapshot.prs) assert(frame.plain.includes('#' + row.number), `${width} columns lost PR identity`);
      for (const run of frame.runs) for (const name of Object.keys(run.style)) assert(['color', 'backgroundColor', 'fontWeight', 'fontStyle', 'textDecoration', 'opacity'].includes(name));
    }
    for (const expected of scenario.expect) assert(frames[100].plain.includes(expected), `Wide representation lost ${expected}`);
  });
}
test('compact frames retain distinguishing state and closed-branch warnings', () => {
  for (const width of [60, 39]) {
    const plain = id => capture.frames[id][width].plain;
    for (const mark of ['#12345', '✗', '◇']) assert(plain('pr-conflict').includes(mark));
    assert(plain('pr-conflict').includes('✓ ✗ ✓'));
    assert(plain('built').includes('✓ built'));
    assert(plain('production-pending').includes('● prod'));
    assert(plain('unavailable').includes('unknown'));
    assert(plain('closed-pr').includes('PR CLOSED'));
    assert(plain('runtime').includes('SERVICES'));
  }
});
test('native frames distinguish one-tier builds and retained merged observations', () => {
  const built = capture.frames.built[100].plain;
  assert(built.includes('PROD') && built.includes('P✓#105'));
  assert(!/\bTEST\b/.test(built));
  const retained = capture.frames['retained-branch'][100].plain.split('\n').find(line => line.startsWith('#48'));
  assert.match(retained, /⚠ catch-up.*✓ +· +✓/);
  const followed = capture.frames['merged-waiting'][100].plain.split('\n').find(line => line.startsWith('#48'));
  assert.match(followed, /→ test.*· +· +·/);
});

test('parser provenance matches the executable terminal decoder', async () => {
  const parser = await readFile(new URL('./record-openclaw-tui.mjs', import.meta.url));
  assert.equal(capture.parserDigest, createHash('sha256').update(parser).digest('hex'));
});
test('known merged identity stays separate from unknown branch landing at every width', () => {
  for (const width of capture.columns) {
    const plain = capture.frames['retained-branch'][width].plain;
    const row = plain.split('\n').find(line => /^#7 +/.test(line));
    assert(row?.includes('merged'), `${width}: known merge became unknown`);
    assert(plain.includes('landing unknown; inspect branch'), `${width}: landing hint was clipped`);
  }
});
test('wide PR signal headings align with their observations across mixed-digit identifiers', () => {
  const lines = capture.frames['review-distinctions'][100].plain.split('\n');
  const header = lines[lines.findIndex(line => line.trim() === 'PRs') + 1];
  const columns = ['CHECKS', 'MERGE', 'REVIEWS'].map(label => header.indexOf(label));
  assert(columns.every(column => column >= 0));
  for (const [number, expected] of [['7', ['✓', '✓', '✗']], ['48', ['✓', '✓', '✎']], ['12345', ['✓', '✓', '∅']]]) {
    const row = lines.find(line => line.startsWith('#' + number + ' '));
    assert(row, `Missing full PR identifier #${number}`);
    assert.deepEqual(columns.map(column => row[column]), expected);
  }
});

test('native verification fails explicitly when its external capture tool is missing', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'status-missing-tool-'));
  try {
    const output = join(temporary, 'output');
    const result = spawnSync('python3', ['-B', 'scripts/verify-native-status.py', '--cli-root', temporary, '--capture-tool', join(temporary, 'missing.py'), '--out', output, '--chrome', 'unused'], { encoding: 'utf8' });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Supply the native-evidence tool/);
    await assert.rejects(access(output));
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
