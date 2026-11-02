import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {extname, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const artifact = process.argv[2] === '--dist';
const url = artifact ? 'https://why-taba.invalid/why-taba/' : process.argv[2] || 'http://127.0.0.1:4321/why-taba/';
const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const activity = JSON.parse(readFileSync(new URL('../src/data/story-activity.json', import.meta.url)));
const weeklyInputs = JSON.parse(readFileSync(new URL('../src/data/story-activity-weeks.json', import.meta.url))).weeks;
for (const phase of activity.phases) {
  const weeks = weeklyInputs.filter(week => week.weekStart >= phase.start &&
    new Date(`${week.weekStart}T00:00:00Z`).getTime() + 6 * 86400000 <= new Date(`${phase.end}T00:00:00Z`).getTime());
  assert.equal(weeks.length, phase.completeWeeks);
  const counts = weeks.map(week => week.mergedPRs).sort((a, b) => a - b);
  const middle = Math.floor(counts.length / 2);
  assert.equal(counts.length % 2 ? counts[middle] : (counts[middle - 1] + counts[middle]) / 2, phase.medianMergedPRs);
}
const phases = new Map(activity.phases.map(phase => [phase.section, phase]));
const browser = await chromium.launch();
const results = [];

try {
  for (const [width, motion] of [[320, 'reduce'], [1440, 'reduce'], [1440, 'no-preference']]) {
    const page = await browser.newPage({viewport: {width, height: 900}, reducedMotion: motion});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    if (artifact) await page.route('https://why-taba.invalid/**', async route => {
      const pathname = decodeURIComponent(new URL(route.request().url()).pathname);
      const path = resolve(dist, `.${pathname}${pathname.endsWith('/') ? 'index.html' : ''}`);
      assert.ok(path.startsWith(dist.endsWith(sep) ? dist : `${dist}${sep}`));
      const types = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png'};
      try { await route.fulfill({body: readFileSync(path), contentType: types[extname(path)] || 'application/octet-stream'}); }
      catch { await route.fulfill({status: 404, body: 'Not found'}); }
    });
    await page.route('https://platform.twitter.com/widgets.js', route => route.abort());
    await page.goto(url);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => location.hash), '', 'Top of story must not gain a chapter hash');
    assert.equal(await page.evaluate(() => scrollY), 0);

    const ids = await page.locator('.problem:not([hidden])').evaluateAll(elements => elements.map(element => element.id));
    assert.deepEqual([...ids].sort(), [...phases.keys()].sort(), 'Every visible chapter needs matching metrics');
    assert.equal(await page.locator('.story-metrics').count(), ids.length);
    assert.equal(await page.locator('#ide-workflows .metric-unit').count(), 0, 'Baseline must have no multiplier');
    assert.equal(activity.checkoutTotal, activity.worktreeTotal + activity.ordinaryCheckoutTotal);
    assert.ok(activity.phases.every(phase => phase.checkouts <= activity.checkoutTotal));

    const trigger = page.locator('[data-workspace-preview]');
    await trigger.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const before = await page.evaluate(() => scrollY);
    await trigger.click();
    await page.waitForFunction(() => document.querySelector('#herdr-workspace-preview')?.open);
    await page.waitForTimeout(100);
    await page.locator('[data-workspace-close]').click();
    await page.waitForFunction(() => !document.querySelector('#herdr-workspace-preview')?.open);
    await page.waitForTimeout(250);
    const after = await page.evaluate(() => scrollY);
    assert.ok(Math.abs(after - before) <= 2, `Closing preview moved reading position by ${after - before}px`);
    assert.notEqual(await page.evaluate(() => document.documentElement.style.overflow), 'hidden');

    await page.reload();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    const restored = await page.evaluate(() => scrollY);
    const navigation = await page.evaluate(() => ({savedY: history.state?.whyTabaReadingY, type: performance.getEntriesByType('navigation')[0]?.type}));
    assert.ok(Math.abs(restored - after) <= 2, `Reload moved reading position by ${restored - after}px: ${JSON.stringify({width, motion, after, restored, ...navigation})}`);

    await page.goto('about:blank');
    await page.goto(`${url}#variants`);
    await page.waitForFunction(() => document.querySelector('#variants .metric-readout')?.textContent === '61×');
    assert.deepEqual(await page.locator('#variants .metric-detail').allTextContents(), ['91.5/week', '649']);
    await page.goto(`${url}#herdr-workspace`);
    await page.waitForFunction(() => document.querySelector('#herdr-workspace-preview')?.open);
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#herdr-workspace-preview')?.open);
    await page.waitForTimeout(150);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#herdr-workspace-preview')?.open);
    assert.notEqual(await page.evaluate(() => document.documentElement.style.overflow), 'hidden', 'Escape after preview reload must unlock scrolling');
    assert.deepEqual(errors, [], 'Story must not raise browser runtime errors');
    results.push({width, motion, chapters: ids.length, previewRestored: true, reloadRestored: true, deepLink: true});
    await page.close();
  }
  console.log(JSON.stringify({story: 'why-taba', artifact, anonymousWeeks: weeklyInputs.length, verifiedMedians: activity.phases.length, results}));
} finally {
  await browser.close();
}
