import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inspectVisualMeasurements, recordingCrop, visualGuideSvg, visualAuditReport } from './openclaw-visual-audit.mjs';

const measurements = more => ({ groups: [], opticalPairs: [], rows: [], hierarchy: [], ...more });
test('semantic rails reject near alignment rather than accepting a stable wrong layout', () => {
  const audit = inspectVisualMeasurements(measurements({ groups: [{ name: 'name rail', members: [{ value: 48 }, { value: 62 }] }] }));
  assert.match(audit.errors[0], /14.00px/);
});
test('optical alignment uses the declared cap middle, not the element box centre', () => {
  assert.equal(inspectVisualMeasurements(measurements({ opticalPairs: [{ name: 'forge', capDelta: 3, xDelta: 0 }] })).errors.length, 1);
  assert.equal(inspectVisualMeasurements(measurements({ opticalPairs: [{ name: 'forge', capDelta: .25, xDelta: 2 }] })).errors.length, 0);
});
test('hierarchy reports density and clipped labels without turning taste into a verdict', () => {
  const audit = inspectVisualMeasurements(measurements({ rows: [{ name: 'web', width: 300, height: 96, emptyFactBand: false }], hierarchy: [{ role: 'action', text: 'Catch up 3 repos', clipped: true }] }));
  assert.equal(audit.errors.length, 0); assert.equal(audit.warnings.length, 2);
});
test('empty fact lanes need a real reservation', () => {
  assert.equal(inspectVisualMeasurements(measurements({ rows: [{ name: 'api', width: 300, height: 64, emptyFactBand: true }] })).errors.length, 1);
});
test('one fixed spatial crop contains every expansion without changing the timeline', () => {
  assert.deepEqual(recordingCrop([680, 332, 532], 320, 900), { x: 0, y: 324, width: 320, height: 576 });
  assert.deepEqual(recordingCrop([4, 1], 391, 901), { x: 0, y: 0, width: 390, height: 900 });
  assert.throws(() => recordingCrop([], 320, 900));
  assert.throws(() => recordingCrop([NaN], 320, 900));
});
test('guides remain a separate vector artifact and reject external screenshot references', () => {
  const audit = measurements({ groups: [{ axis: 'x', spread: 0, members: [{ value: 48, y: 100, bottom: 120 }] }] });
  assert.match(visualGuideSvg(audit, 'data:image/png;base64,AAAA', { width: 320, height: 900 }, recordingCrop([100], 320, 900)), /viewBox="0 92 320 808"/);
  assert.throws(() => visualGuideSvg(audit, 'https://example.invalid/image.png', { width: 320, height: 900 }, recordingCrop([100], 320, 900)));
});

test('independent grouping can expose services perceived beneath the last repository', async () => {
  const { compareVisualSections } = await import('./openclaw-visual-audit.mjs');
  const bounds = (y,height) => ({x:0,y,width:300,height});
  const audit = {image:{width:320,height:500,sha256:'a'.repeat(64)},sections:[
    {id:'collection',label:'Collection',parent:null,bounds:bounds(0,400)},
    {id:'repos',label:'Repositories',parent:'collection',bounds:bounds(40,220)},
    {id:'docs',label:'docs',parent:'repos',bounds:bounds(200,60)},
    {id:'services',label:'Collection services',parent:'collection',bounds:bounds(270,80)},
  ]};
  const observation = {imageSha256:'a'.repeat(64),canvas:{width:320,height:500},groups:[
    {id:'card',parent:null,bounds:bounds(0,400)},
    {id:'list',parent:'card',bounds:bounds(40,310)},
    {id:'last-block',parent:'list',bounds:bounds(200,150)},
    {id:'preview',parent:'last-block',bounds:bounds(270,80)},
  ]};
  const result=compareVisualSections(audit,observation);
  assert.ok(result.mismatches.some(item=>item.first==='docs'&&item.second==='services'&&item.observed==='nested groups'));
  observation.groups[3].parent='card';
  assert.equal(compareVisualSections(audit,observation).mismatches.some(item=>item.first==='docs'&&item.second==='services'),false);
  assert.equal(compareVisualSections(audit,null).state,'not-assessed');
});

test('perceived-section annotations reject a different screenshot and cyclic parentage', async () => {
  const { compareVisualSections } = await import('./openclaw-visual-audit.mjs');
  const audit={image:{width:320,height:500,sha256:'a'.repeat(64)},sections:[]};
  const observed={imageSha256:'b'.repeat(64),canvas:{width:320,height:500},groups:[]};
  assert.throws(()=>compareVisualSections(audit,observed),/same screenshot/);
  observed.imageSha256=audit.image.sha256;observed.groups=[{id:'loop',parent:'loop',bounds:{x:0,y:0,width:20,height:20}}];
  assert.throws(()=>compareVisualSections(audit,observed),/cyclic/);
});

test('report escapes imported typography and uses an unlabeled matched group id', () => {
  const audit = inspectVisualMeasurements(measurements({
    sections: [{id:'services',parent:null,bounds:{x:0,y:0,width:20,height:20}}],
    hierarchy: [{role:'heading',text:'Services',fontSize:'<img src=x onerror=alert(1)>',fontWeight:'<script>bad()</script>',contrastRatio:4.5}],
  }));
  audit.image={width:20,height:20,sha256:'a'.repeat(64)};
  const observed={imageSha256:audit.image.sha256,canvas:{width:20,height:20},groups:[{id:'service-block',parent:null,bounds:{x:0,y:0,width:20,height:20}}]};
  const report=visualAuditReport(audit,'',observed);
  assert.ok(!report.includes('<img src=x'));
  assert.ok(!report.includes('<script>bad()'));
  assert.match(report,/&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(report,/<td>service-block<\/td><td>1\.00<\/td>/);
  assert.match(visualAuditReport(audit,''),/Not independently assessed\./);
});

test('report rejects malformed imported diagnostic lists before rendering', () => {
  const audit=inspectVisualMeasurements(measurements({sections:[]}));
  assert.throws(()=>visualAuditReport({...audit,warnings:{length:'<img src=x onerror=alert(1)>'}},''),/diagnostics must be arrays/);
  assert.throws(()=>visualAuditReport({...audit,errors:'bad'},''),/diagnostics must be arrays/);
});

test('comparison CLI binds PNG bytes and dimensions and refuses existing output', async () => {
  const {mkdtemp,writeFile,readFile,rm}=await import('node:fs/promises');
  const {tmpdir}=await import('node:os');
  const {join}=await import('node:path');
  const {createHash}=await import('node:crypto');
  const {spawnSync}=await import('node:child_process');
  const {fileURLToPath}=await import('node:url');
  const dir=await mkdtemp(join(tmpdir(),'visual-comparison-'));
  try {
    const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aT3sAAAAASUVORK5CYII=','base64');
    const audit=inspectVisualMeasurements(measurements({sections:[]}));
    audit.image={width:1,height:1,sha256:createHash('sha256').update(png).digest('hex')};
    const observed={imageSha256:audit.image.sha256,canvas:{width:1,height:1},groups:[]};
    await Promise.all([writeFile(join(dir,'phase.png'),png),writeFile(join(dir,'audit.json'),JSON.stringify(audit)),writeFile(join(dir,'observed.json'),JSON.stringify(observed))]);
    const run=()=>spawnSync(process.execPath,[fileURLToPath(new URL('./openclaw-visual-audit.mjs',import.meta.url)),join(dir,'audit.json'),join(dir,'phase.png'),join(dir,'observed.json'),join(dir,'report.html')],{encoding:'utf8'});
    assert.equal(run().status,0);
    const report=await readFile(join(dir,'report.html'),'utf8');
    for(const id of ['model','perceived','depth','section-labels'])assert.ok(report.includes(`id="${id}"`));
    assert.match(run().stderr,/EEXIST/);
    assert.equal(await readFile(join(dir,'report.html'),'utf8'),report);
    await writeFile(join(dir,'phase.png'),Buffer.concat([png,Buffer.from('different')]));
    assert.match(run().stderr,/different screenshot/);
    await writeFile(join(dir,'phase.png'),png);
    audit.image.width=2;await writeFile(join(dir,'audit.json'),JSON.stringify(audit));
    assert.match(run().stderr,/PNG dimensions/);
  } finally { await rm(dir,{recursive:true,force:true}); }
});
