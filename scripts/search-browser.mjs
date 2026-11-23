import assert from 'node:assert/strict';
import { chromium } from 'playwright';

// Browser checks for docs search: phone width, keyboard, ARIA, no-JS, index failure and anchors.
const target = process.argv[2];
if (!target) throw Error('Pass an already running local preview URL; this command starts no server');
const site = target.endsWith('/') ? target : target + '/';
const url = path => new URL(path, site).href;
const browser = await chromium.launch({ headless: true, executablePath: process.env.SEARCH_BROWSER_EXECUTABLE });
const phone = { viewport: { width: 375, height: 740 }, isMobile: true, hasTouch: true };
const desktop = { viewport: { width: 1200, height: 900 } };

async function open(options, path = 'docs/collections/') {
  const context = await browser.newContext(options);
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url(path));
  return { context, page, errors };
}
const input = page => page.locator('#site-search-input');
const options = page => page.locator('#site-search-results [role=option]');
async function search(page, query) {
  await input(page).fill(query);
  await page.waitForFunction(() => document.querySelector('#site-search-results').hidden === false
    || document.querySelector('.site-search-status').classList.contains('site-search-message'));
}
async function noHorizontalScroll(page) {
  const [scroll, width] = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  assert(scroll <= width, `horizontal scroll: ${scroll} > ${width}`);
}

try {
  // Without JavaScript the search box is not offered; navigation still is.
  {
    const { context, page } = await open({ ...phone, javaScriptEnabled: false });
    assert.equal(await page.locator('.site-search').isVisible(), false);
    assert(await page.getByText('Browse the handbook').isVisible());
    await context.close();
  }

  // Phone width: ARIA wiring, results within the viewport, keyboard selection and anchor landing.
  {
    const { context, page, errors } = await open(phone);
    const box = input(page);
    assert(await box.isVisible());
    assert.equal(await box.getAttribute('role'), 'combobox');
    assert.equal(await box.getAttribute('aria-expanded'), 'false');
    const listId = await box.getAttribute('aria-controls');
    assert.equal(await page.locator(`#${listId}`).getAttribute('role'), 'listbox');
    assert.equal(await page.locator(`label[for="site-search-input"]`).textContent(), 'Search the docs');

    await box.focus();
    await search(page, 'add-repo');
    const count = await options(page).count();
    assert(count > 1 && count <= 8, `expected several results, got ${count}`);
    assert.equal(await box.getAttribute('aria-expanded'), 'true');
    assert.equal(await page.locator('.site-search-status').textContent(), `${count} results`);
    assert.equal(await box.getAttribute('aria-activedescendant'), 'site-search-0');
    assert.equal(await page.locator('[role=option][aria-selected=true]').count(), 1);
    const list = await page.locator('#site-search-results').boundingBox();
    assert(list.x >= 0 && list.x + list.width <= 375, `results overflow the phone viewport: ${JSON.stringify(list)}`);
    await noHorizontalScroll(page);

    await page.keyboard.press('ArrowDown');
    assert.equal(await box.getAttribute('aria-activedescendant'), 'site-search-1');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    assert.equal(await box.getAttribute('aria-activedescendant'), `site-search-${count - 1}`);
    await page.keyboard.press('Escape');
    assert.equal(await box.getAttribute('aria-expanded'), 'false');
    assert(await page.locator('#site-search-results').isHidden());
    assert.equal(await box.getAttribute('aria-activedescendant'), null);

    // Enter opens the selected result on another page and lands on its heading.
    await search(page, 'secrets example-backed');
    const href = await page.locator('#site-search-0 a').getAttribute('href');
    const heading = (await page.locator('#site-search-0 .site-search-where').textContent()).split('›').at(-1).trim();
    assert(href.includes('#'), `expected a section link, got ${href}`);
    await Promise.all([page.waitForURL(url(href)), page.keyboard.press('Enter')]);
    const id = decodeURIComponent(new URL(page.url()).hash.slice(1));
    assert.equal((await page.locator(`[id="${id}"]`).textContent()).trim(), heading);
    assert.deepEqual(errors, []);
    await context.close();
  }

  // Desktop: "/" focuses, highlighting never shows escaped entities, empty state, same-page anchors.
  {
    const { context, page, errors } = await open(desktop);
    await page.keyboard.press('/');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'site-search-input');
    for (const query of ['39', '60', '62', 'don']) {
      await search(page, query);
      assert.doesNotMatch(await page.locator('#site-search-results').textContent(), /&#?\w+;/, `entity text for "${query}"`);
    }
    await search(page, 'zzqxwv');
    assert.equal(await page.locator('.site-search-message').textContent(), 'No matches in the docs.');
    assert(await page.locator('#site-search-results').isHidden());
    assert.equal(await input(page).getAttribute('aria-expanded'), 'false');

    await search(page, 'grow a task without starting over');
    const href = await page.locator('#site-search-0 a').getAttribute('href');
    assert.equal(new URL(href, page.url()).pathname, new URL(page.url()).pathname, 'expected a same-page result');
    await page.locator('#site-search-0 a').click();
    await page.waitForURL(url(href));
    assert(await page.locator('#site-search-results').isHidden(), 'results stay open after a same-page jump');
    assert(await page.locator(`[id="${new URL(page.url()).hash.slice(1)}"]`).isVisible());
    await page.keyboard.press('Escape');
    assert.deepEqual(errors, []);
    await context.close();
  }

  // An unavailable index is reported, then retried on the next query.
  {
    const { context, page, errors } = await open(desktop);
    await page.route('**/search-index.json', route => route.fulfill({ status: 503, body: 'unavailable' }));
    await input(page).focus();
    await search(page, 'status');
    assert.match(await page.locator('.site-search-message').textContent(), /unavailable/);
    assert.equal(await options(page).count(), 0);
    await page.unroute('**/search-index.json');
    await input(page).fill('status checks');
    await page.waitForFunction(() => document.querySelectorAll('#site-search-results [role=option]').length > 0, null, { timeout: 5000 })
      .catch(() => assert.fail('search did not recover after the index became available'));
    assert.equal(await page.locator('.site-search-message').count(), 0);
    assert.deepEqual(errors, []);
    await context.close();
  }
  // Characters whose lowercase form is longer ("İ") must not shift highlights onto the wrong text.
  {
    const { context, page, errors } = await open(desktop);
    const entry = { title: 'İİİ guide', description: '', heading: 'Setup', url: '/docs/collections/', text: 'İİİİ before the target word' };
    await page.route('**/search-index.json', route => route.fulfill({ json: [entry] }));
    await input(page).focus();
    await search(page, 'target');
    assert.deepEqual(await page.locator('#site-search-results mark').allTextContents(), ['target']);
    await search(page, 'guide');
    assert.deepEqual(await page.locator('#site-search-results mark').allTextContents(), ['guide']);
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log('Search browser checks passed: no-JS, phone width, ARIA, keyboard, anchors, highlighting, empty and error states');
} finally {
  await browser.close();
}
