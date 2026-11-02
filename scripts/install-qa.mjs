import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const url = process.argv[2];
const fallback = process.argv.includes('--fallback');
if (!url) throw new Error('Usage: node scripts/install-qa.mjs <preview-url> [--fallback]');
async function checkCode(page) {
  assert.equal(await page.locator('code').evaluateAll(codes => codes.every(code =>
    code.firstChild?.nodeType === Node.COMMENT_NODE && code.firstChild.textContent === 'email_off'
    && code.lastChild?.nodeType === Node.COMMENT_NODE && code.lastChild.textContent === '/email_off'
    && !code.querySelector('[data-cfemail], a[href*="/cdn-cgi/l/email-protection"]')
  )), true, 'Code must retain the edge exclusion and contain no obfuscated text');
}
const browser = await chromium.launch({ headless: true });
for (const [width, height] of [[1440,900],[1280,720],[390,844],[320,640]]) {
  const context = await browser.newContext({ viewport: {width,height}, permissions: ['clipboard-read','clipboard-write'] });
  const page = await context.newPage();
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  await checkCode(page);
  const command = await page.locator('#install-command').innerText();
  const notes = page.locator('.install-heading a');
  const version = command.split('@').at(-1);
  assert.match(version, /^\d+\.\d+\.\d+$/);
  assert.equal(await notes.getAttribute('href'), `https://github.com/lcorneliussen/wtc-cli/releases/tag/v${version}`);
  assert.match(await notes.innerText(), new RegExp(`v${version.replaceAll('.', '\\.')}`));
  const checked = page.locator('.release-check');
  const date = await checked.locator('time').getAttribute('datetime');
  assert.match(date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(await checked.locator('time').innerText(), date);
  assert.match(await checked.innerText(), /^(Checked|Last verified) \d{4}-\d{2}-\d{2}$/);
  if (fallback) {
    assert.match(await notes.innerText(), /^Last verified /);
    assert.equal(await checked.innerText(), `Last verified ${date}`);
  }
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  const bounds = await page.locator('.install-command').boundingBox();
  assert(bounds.y + bounds.height <= height, `${width}: install below fold ${JSON.stringify(bounds)}`);
  const copy = page.getByRole('button', { name: 'Copy CLI installation command' });
  await copy.focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), command);
  assert.equal(await page.locator('#install-status').innerText(), 'Installation command copied.');
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', {value: {writeText: async () => { throw new Error('denied'); }}}));
  await copy.click();
  assert.equal(await page.evaluate(() => getSelection().toString()), command);
  assert.match(await page.locator('#install-status').innerText(), /copy it manually/);
  assert.equal(await copy.innerText(), 'Copy ⧉');
  console.log(`${width}x${height}: command bottom ${Math.round(bounds.y+bounds.height)}, links/copy/manual selection/no overflow pass`);
  await context.close();
}
const context = await browser.newContext({ javaScriptEnabled: false, viewport: {width:390,height:844} });
const page = await context.newPage();
await page.goto(url);
await checkCode(page);
assert.equal(await page.locator('#copy-install').isVisible(), false);
assert.match(await page.locator('#install-command').innerText(), /@\d+\.\d+\.\d+$/);
assert(await page.locator('.install-heading a').isVisible());
console.log('No-JS: command/numbered notes visible, copy hidden');
await page.goto(new URL('why-taba/', url).href);
await checkCode(page);
const storyCommand = await page.locator('#story-install-commands').innerText();
assert.match(storyCommand, /github:lcorneliussen\/wtc-cli@\d+\.\d+\.\d+\nwtc --version/);
assert.equal(await page.locator('[data-story-copy="story-install-commands"]').isVisible(), false);
console.log('No-JS: historical story command remains literal and readable');
await context.close();
const storyContext = await browser.newContext({ permissions: ['clipboard-read','clipboard-write'] });
const storyPage = await storyContext.newPage();
await storyPage.goto(new URL('why-taba/', url).href);
await checkCode(storyPage);
await storyPage.locator('[data-story-copy="story-install-commands"]').click();
assert.equal(await storyPage.evaluate(() => navigator.clipboard.readText()), storyCommand);
console.log('Story clipboard: exact literal command copied');
await browser.close();
