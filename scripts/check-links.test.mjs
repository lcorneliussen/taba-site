import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const checker = fileURLToPath(new URL('./check-links.mjs', import.meta.url));
const page = '<link rel="canonical" href="https://taba.sh/"><main id="usage">A native terminal guide</main><a href="/#usage">Read the guide</a>';
async function check(files) {
  const temporary = await mkdtemp(join(tmpdir(), 'site-output-'));
  try {
    for (const [name, content] of Object.entries({ 'index.html': page, ...files })) {
      const path = join(temporary, 'dist', name);
      await mkdir(join(path, '..'), { recursive: true });
      await writeFile(path, content);
    }
    return spawnSync(process.execPath, [checker], { cwd: temporary, encoding: 'utf8' });
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
test('normal public output and its internal anchor pass', async () => {
  const result = await check({ 'assets/public.js': 'console.log("ready")' });
  assert.equal(result.status, 0, result.stderr);
});
test('an unlinked local evidence gallery still fails production validation', async () => {
  const result = await check({ 'status-evidence/report.json': '{"synthetic":true}' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /local evidence gallery/);
});
test('synthetic local filesystem paths in output assets fail', async () => {
  for (const path of ['file:///tmp/synthetic/source', '/Users/example/project/source', '/private/tmp/synthetic/source']) {
    const result = await check({ 'assets/example.js': JSON.stringify({ source: path }) });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /local filesystem path/);
  }
});
test('the existing missing-link guard remains active', async () => {
  const result = await check({ 'index.html': page + '<a href="/missing/">Missing</a>' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /missing target/);
});
