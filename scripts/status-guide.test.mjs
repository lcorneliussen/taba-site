import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { scenarios } from '../src/data/status-scenarios.mjs';

const capture = JSON.parse(await readFile(new URL('../src/data/status-frames.json', import.meta.url), 'utf8'));
test('native replay matches authored snapshot inputs and bounded source metadata', () => {
  const digest = createHash('sha256').update(JSON.stringify(scenarios.map(({ id, snapshot }) => ({ id, snapshot })))).digest('hex');
  assert.equal(capture.fixtureDigest, digest, 'Snapshot inputs changed: regenerate the native replay');
  assert.match(capture.sourceRevision, /^[a-f0-9]{40}$/);
  assert.match(capture.sourceDigest, /^[a-f0-9]{64}$/);
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
