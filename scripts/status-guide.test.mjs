import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm, access, mkdir, writeFile, symlink, cp, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'astro';
import { parse } from 'parse5';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { validateReplay, fixtureDigest } from './capture-status-guide.mjs';
import { scenarios, replayGroups, selectReplay, assertFrameVisibility } from '../src/data/status-scenarios.mjs';

const capture = JSON.parse(await readFile(new URL('../src/data/status-frames.json', import.meta.url), 'utf8'));
test('native replay matches authored snapshot inputs and bounded source metadata', async () => {
  await validateReplay(capture);
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
    for (const frame of Object.values(frames)) {
      assert.equal(frame.runs.map(run => run.text).join(''), frame.plain);
      assert(!/[\x00-\x08\x0b-\x1f\x7f]/.test(frame.plain));
      assert(frame.plain.includes('taba/wtc status'));
      assertFrameVisibility(scenario, frame.plain);
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


test('local development and transient discovery preserve their separate meanings', () => {
  const local = scenarios.find(scenario => scenario.id === 'local-development-base');
  const row = local.snapshot.repos[0];
  assert.equal(row.development_base.effective_ref, 'origin/beta');
  assert.equal(row.development_base.registry_ref, 'origin/main');
  assert.equal(row.tip.branch, 'beta');
  assert.equal(row.prod.branch, 'main');
  assert(capture.frames[local.id][100].plain.includes('T✓#106'));
  assert(capture.frames[local.id][100].plain.includes('P✓#105'));
  const discovered = scenarios.find(scenario => scenario.id === 'discovered-pr').snapshot.prs[0];
  assert.equal(discovered.not_enlisted, true);
  assert.equal(discovered.enlist_command, 'taba pr enlist widget 23');
  assert(capture.frames['discovered-pr'][100].plain.includes('not enlisted'));
  assert.equal(capture.release.revision, capture.sourceRevision);
  assert.equal(capture.release.binaryModuleVersion, capture.release.tag + (capture.release.binaryVcsModified ? '+dirty' : ''));
  assert(!JSON.stringify(capture.release).includes('Path'));
});


function assertRelease(release, revision) {
  assert.match(release.tag, /^v\d+\.\d+\.\d+$/);
  assert.match(revision, /^[a-f0-9]{40}$/);
  assert.equal(release.revision, revision);
  assert.match(release.archiveSha256, /^[a-f0-9]{64}$/);
  assert.match(release.binarySha256, /^[a-f0-9]{64}$/);
  assert.equal(typeof release.binaryVcsModified, 'boolean');
  assert.equal(release.binaryModuleVersion, release.tag + (release.binaryVcsModified ? '+dirty' : ''));
  assert(release.embeddedFiles.length > 0);
  assert.equal(new Set(release.embeddedFiles.map(file => file.path)).size, release.embeddedFiles.length);
  for (const file of release.embeddedFiles) assert.match(file.sha256, /^[a-f0-9]{64}$/);
}

test('independently versioned media and native replays retain verified release identities', async () => {
  const media = JSON.parse(await readFile(new URL('../public/media/openclaw/provenance.json', import.meta.url), 'utf8'));
  assertRelease(media.release, media.revision);
  assertRelease(capture.release, capture.sourceRevision);
  for (const provenance of Object.values(capture.replays)) {
    assertRelease(provenance.release, provenance.sourceRevision);
    assert.equal(provenance.release.binaryVcsModified, false);
    const embedded = new Map(provenance.release.embeddedFiles.map(file => ['openclaw-plugin/' + file.path, file.sha256]));
    for (const module of media.modules) assert.equal(module.sha256, embedded.get(module.modulePath), 'Retained media renderer no longer matches this replay release');
  }
  const embedded = new Map(media.release.embeddedFiles.map(file => ['openclaw-plugin/' + file.path, file.sha256]));
  for (const module of media.modules) assert.equal(module.sha256, embedded.get(module.modulePath));
});

test('affected frame provenance covers exactly its inputs without relabeling retained examples', () => {
  assert.deepEqual(Object.keys(capture.frameSources).sort(), ['closed-pr', 'freshness']);
  for (const [tag, provenance] of Object.entries(capture.replays)) {
    assert.equal(tag, provenance.release.tag);
    assert.deepEqual(provenance.columns, [100, 60, 39]);
    assert.match(provenance.sourceDigest, /^[a-f0-9]{64}$/);
    assert.equal(provenance.parserDigest, capture.parserDigest);
    const selected = scenarios.filter(scenario => capture.frameSources[scenario.id] === tag);
    const digest = createHash('sha256').update(JSON.stringify(selected.map(({id, snapshot}) => ({id, snapshot})))).digest('hex');
    assert.equal(provenance.fixtureDigest, digest);
  }
  for (const tag of Object.values(capture.frameSources)) assert(capture.replays[tag]);
});

test('freshness retains compact age, unknown-time and landing distinctions at every width', () => {
  for (const width of capture.columns) {
    const plain = capture.frames.freshness[width].plain;
    assert.match(plain, /s:\d+d/);
    assert.match(plain, /d:\d+d/);
    assert(plain.includes('never'));
    assert(plain.includes('merged'));
    assert(plain.includes('landing unknown; inspect branch'));
  }
});

test('closed and declined rows remain distinct from merged completion and hidden archives', () => {
  for (const width of capture.columns) {
    const frame = capture.frames['closed-pr'][width];
    assert(frame.plain.includes('closed'));
    assert(frame.plain.includes('declined'));
    assert(frame.plain.includes('archived'));
    assert(frame.plain.includes('PR CLOSED'));
    assert(!frame.plain.includes('#23'), 'Archived PR must be hidden until explicitly expanded');
    assert(!frame.plain.includes('built'), 'Unmerged closure must not invent a successful build');
  }
});


test('group selection partitions all examples by exact recorded revision', () => {
  const groups = replayGroups(capture);
  assert.equal(groups.length, 2);
  assert.equal(new Set(groups.flatMap(g => g.scenarios.map(s => s.id))).size, scenarios.length);
  for (const group of groups) {
    assert.equal(selectReplay(capture, group.provenance.sourceRevision).tag, group.tag);
    assert.equal(group.provenance.fixtureDigest, fixtureDigest(group.scenarios));
  }
  assert.throws(() => selectReplay(capture, '0'.repeat(40)), /exactly one/);
});

test('missing, ambiguous and inconsistent provenance cannot select or label examples', async () => {
  const mutations = [
    c => { delete c.release; },
    c => { delete c.frameSources; },
    c => { delete c.replays; },
    c => { delete c.replays['v0.2.7']; },
    c => { c.frameSources.freshness = 'v9.9.9'; },
    c => { c.frameSources.unknown = 'v0.2.7'; },
    c => { c.replays['v0.2.7'].sourceRevision = c.sourceRevision; c.replays['v0.2.7'].release.revision = c.sourceRevision; },
    c => { c.replays['v0.2.7'].release.tag = 'v0.2.8'; },
    c => { c.replays['v0.2.7'].commandPackage = 'cmd/other'; },
    c => { delete c.replays['v0.2.7'].sourceDigest; },
    c => { c.replays['v0.2.7'].release.archiveSha256 = ''; },
    c => { c.replays['v0.2.7'].release.archiveName = 'taba_0.2.6_darwin_arm64.tar.gz'; },
    c => { c.release.embeddedFiles[0].path = '../escape'; },
    c => { c.replays['v0.2.7'].parserDigest = '0'.repeat(64); },
    c => { c.replays['v0.2.7'].fixtureDigest = '0'.repeat(64); },
    c => { delete c.frameSources.freshness; },
    c => { delete c.frames.freshness; },
  ];
  for (const mutate of mutations) {
    const broken = structuredClone(capture); mutate(broken);
    await assert.rejects(validateReplay(broken));
  }
});

test('visibility assertions reject both a missing visible PR and a leaked archived PR', () => {
  const scenario = scenarios.find(s => s.id === 'closed-pr');
  const plain = capture.frames['closed-pr'][100].plain;
  assert.throws(() => assertFrameVisibility(scenario, plain.replace(/^#7.*$/m, '')), /visibility/);
  assert.throws(() => assertFrameVisibility(scenario, plain + '\n#23 toolkit closed'), /visibility/);
});

test('the actual rendered explorer labels and links every example to its own source', async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'status-component-')));
  try {
    await mkdir(join(root, 'src/pages'), { recursive: true });
    await symlink(new URL('../node_modules', import.meta.url).pathname, join(root, 'node_modules'), 'dir');
    for (const file of ['components/StatusExplorer.astro', 'data/status-scenarios.mjs', 'data/status-frames.json']) {
      await mkdir(join(root, 'src', file, '..'), { recursive: true });
      await cp(new URL('../src/' + file, import.meta.url), join(root, 'src', file));
    }
    await writeFile(join(root, 'src/pages/index.astro'), '---\nimport StatusExplorer from "../components/StatusExplorer.astro";\n---\n<StatusExplorer />');
    await build({ root: pathToFileURL(root + '/'), logLevel: 'silent' });
    const document = parse(await readFile(join(root, 'dist/index.html'), 'utf8'));
    const all = node => [node, ...(node.childNodes ?? []).flatMap(all)];
    const attr = (node, name) => node.attrs?.find(a => a.name === name)?.value;
    const text = node => all(node).filter(n => n.nodeName === '#text').map(n => n.value).join('');
    const sections = all(document).filter(node => attr(node, 'data-situation'));
    assert.equal(sections.length, scenarios.length);
    for (const section of sections) {
      const id = attr(section, 'data-situation');
      const tag = capture.frameSources[id];
      const provenance = tag === undefined ? capture : capture.replays[tag];
      const group = all(section).find(node => attr(node, 'class') === 'situation-group');
      const links = all(group).filter(node => node.tagName === 'a');
      assert.equal(links.length, 1);
      assert.equal(text(links[0]), provenance.release.tag + ' source');
      assert.equal(attr(links[0], 'href'), 'https://github.com/lcorneliussen/taba/tree/' + provenance.sourceRevision);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
