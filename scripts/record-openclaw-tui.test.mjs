import { test } from 'node:test';
import assert from 'node:assert/strict';
import { terminalRuns, localTerminalFixture, terminalRecordingRequest } from './record-openclaw-tui.mjs';

const snapshot = extra => ({ collection: { label: 'add-search' }, services: [], repos: [{ repo: 'web', owner: 'example-org', forge: 'bitbucket', branch: 'feature/search', ahead: 3, behind: 0, unpublished: 3, dirty: 0, ...extra }] });
test('ANSI colors reset and hyperlinks never become HTML or a network action', () => {
  const runs = terminalRuns('\x1b[31mred\x1b[0m plain \x1b]8;;https://example.invalid\x1b\\<script>\x1b]8;;\x1b\\');
  assert.equal(runs[0].style.color, '#dc6b73'); assert.deepEqual(runs[1].style, {});
  assert.equal(runs.map(run => run.text).join(''), 'red plain <script>');
  assert.throws(() => terminalRuns('\x1b[38;2;999;0;0mtest'));
  assert.equal(terminalRuns('\x1b[38;5;33mblue')[0].style.color, 'rgb(0,135,255)');
  assert.throws(() => terminalRuns('\x1b[38;5;999mtest'));
  assert.equal(terminalRuns('\x1b[90;100mgray')[0].style.color, '#5c6370');
  assert.equal(terminalRuns('\x1b[38;5;8mgray')[0].style.color, '#5c6370');
  assert.equal(terminalRuns('\x1b[90;100mgray')[0].style.backgroundColor, '#5c6370');
  assert.throws(() => terminalRuns('\x1b[7mreverse'));
});
test('a published PR maps to the equivalent local upstream without confusing ahead-of-base with unpublished commits', () => {
  const before = localTerminalFixture(snapshot()), after = localTerminalFixture(snapshot({ unpublished: 0, pullRequest: { number: 8, state: 'open', draft: true, url: 'https://example.invalid/pr/8' } }));
  assert.equal(before.snapshot.repos[0].ahead, 3); assert.equal(after.snapshot.repos[0].ahead, 0);
  assert.equal(after.snapshot.repos[0].ahead_basis, 'upstream'); assert.equal(after.facts[0].ToPush, 0); assert.equal(after.facts[0].Host, 'local');
});
test('shared event timestamps survive, and the separate native selection preview cannot dispatch', () => {
  const request = terminalRecordingRequest({ startedAt: 100, duration: 10, events: [{ at: 99, snapshot: snapshot() }, { at: 104.2, snapshot: snapshot({ unpublished: 0 }) }] }, 96, 24);
  assert.equal(request.frames[0].at, 0); assert.ok(Math.abs(request.frames[1].at - 4.2) < .0001);
  assert.ok(request.frames.filter(frame => frame.phase.startsWith('selection-')).length > 0);
  assert.ok(request.frames.every(frame => !frame.keys.includes('enter')));
  assert.ok(['space','k'].every(key=>request.frames.some(frame=>frame.keys.includes(key))));
  assert.throws(() => terminalRecordingRequest({ startedAt: 100, duration: 10, events: [{ at: 101, snapshot: snapshot() }] }, 96, 24));
});
