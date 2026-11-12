import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { scenarios } from '../src/data/status-scenarios.mjs';

const target = process.argv[2];
if (!target) throw Error('Pass an already running local preview URL; this command starts no server');
const address = new URL('docs/status/', target.endsWith('/') ? target : target + '/');
const browser = await chromium.launch({ headless: true, executablePath: process.env.STATUS_BROWSER_EXECUTABLE });
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
  await page.locator('[data-scenario-select]').selectOption(scenarios[0].id);
  await page.locator('[data-next]').focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(id => document.querySelector('[data-scenario-select]').value === id, scenarios[1].id);
  await page.locator('[data-previous]').focus();
  await page.keyboard.press('Space');
  await page.waitForFunction(id => document.querySelector('[data-scenario-select]').value === id, scenarios[0].id);
  await page.locator('input[name="status-width"][value="100"]').check();
  await page.locator('input[name="status-width"][value="100"]').focus();
  await page.keyboard.press('ArrowRight');
  assert(await page.locator('input[name="status-width"][value="60"]').isChecked());
  await page.goto(address.href + '#example-production-pending');
  await page.waitForFunction(() => document.querySelector('[data-scenario-select]').value === 'production-pending');
  assert.equal(await page.locator('[data-scenario-select]').inputValue(), 'production-pending');
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
  await page.locator('input[name="status-width"][value="100"]').check();
  const terminal = page.locator('[data-situation]:visible [data-width]:visible .terminal-scroll');
  await terminal.focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => { const el = document.querySelector('[data-situation]:not([hidden]) [data-width]:not([hidden]) .terminal-scroll'); return el.scrollLeft > 0; });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches));
  await page.locator('[data-scenario-select]').selectOption('retained-branch');
  assert.equal(await page.locator('[data-situation]:visible .terminal-scroll').first().evaluate(el => el.getAnimations({ subtree: true }).length), 0);
  assert.deepEqual(errors, []);
  const noScript = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const fallback = await noScript.newPage();
  await fallback.goto(address.href);
  assert.equal(await fallback.locator('[data-situation]:visible').count(), scenarios.length);
  assert.equal(await fallback.evaluate(() => document.documentElement.scrollWidth), 390);
  console.log(`PASS: ${scenarios.length * 3} combinations, keyboard navigation, deep links, terminal scrolling, 390px layout, reduced motion and no-JS fallback`);
} finally {
  await browser.close();
}
