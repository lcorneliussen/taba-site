import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { scenarios } from '../src/data/status-scenarios.mjs';

const target = process.argv[2];
if (!target) throw Error('Pass an already running local preview URL; this command starts no server');
const address = new URL('docs/status/', target.endsWith('/') ? target : target + '/');
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(address.href);
  await page.locator('[data-controls]').waitFor({ state: 'visible' });
  for (const scenario of scenarios) {
    await page.locator('[data-scenario-select]').selectOption(scenario.id);
    for (const width of [100, 60, 39]) {
      await page.locator(`input[name="status-width"][value="${width}"]`).check();
      const section = page.locator('[data-situation]:visible');
      assert.equal(await section.getAttribute('data-situation'), scenario.id);
      assert.equal(await section.locator('[data-width]:visible').count(), 1);
      assert.equal(await section.locator('[data-width]:visible').getAttribute('data-width'), String(width));
    }
  }
  await page.locator('[data-scenario-select]').selectOption(scenarios[0].id);
  assert(await page.locator('[data-previous]').isDisabled());
  await page.locator('[data-next]').click();
  assert.equal(await page.locator('[data-scenario-select]').inputValue(), scenarios[1].id);
  await page.locator('[data-previous]').click();
  assert.equal(await page.locator('[data-scenario-select]').inputValue(), scenarios[0].id);
  await page.locator('[data-scenario-select]').selectOption(scenarios.at(-1).id);
  assert(await page.locator('[data-next]').isDisabled());
  await page.goto(address.href + '#example-production-pending');
  assert.equal(await page.locator('[data-scenario-select]').inputValue(), 'production-pending');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
  assert.deepEqual(errors, []);
  const noScript = await browser.newContext({ javaScriptEnabled: false });
  const fallback = await noScript.newPage();
  await fallback.goto(address.href);
  assert.equal(await fallback.locator('[data-situation]:visible').count(), scenarios.length);
  console.log(`PASS: ${scenarios.length * 3} combinations, navigation, deep links, 390px layout and no-JS fallback`);
} finally {
  await browser.close();
}
