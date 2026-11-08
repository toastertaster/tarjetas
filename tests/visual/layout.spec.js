// Layout rules that must hold in every browser and screen size. Unlike the
// screenshots, these don't depend on fonts, so they run anywhere.
import { test, expect } from '@playwright/test';
import { openApp, face, skip, showAnswer, next, cardWhere, choose, showSettings } from './helpers.js';

const headerHeight = (page) => page.locator('#topbar').evaluate((el) => el.getBoundingClientRect().height);

async function setLanguage(page, lang) {
  await showSettings(page);
  await page.click(`.lang button[data-lang=${lang}]`);
  await expect(page.locator('html')).toHaveAttribute('lang', lang);
}

test('the header keeps its size when the language changes', async ({ page, isMobile }) => {
  await openApp(page);
  if (isMobile) {
    // collapsed
    const collapsed = await headerHeight(page);
    await setLanguage(page, 'es');
    await page.click('#settings-toggle');
    expect(await headerHeight(page)).toBe(collapsed);
    // open
    await showSettings(page);
    const open = await headerHeight(page);
    await setLanguage(page, 'en');
    expect(await headerHeight(page)).toBe(open);
    return;
  }
  // every desktop width, since wrapping depends on it
  for (let width = 780; width <= 1500; width += 40) {
    await page.setViewportSize({ width, height: 860 });
    await setLanguage(page, 'en');
    const en = await headerHeight(page);
    await setLanguage(page, 'es');
    expect(await headerHeight(page), `header at ${width}px`).toBe(en);
  }
});

// Every visible image is drawn with the proportions it declares (its width and
// height attributes, or its own size).
async function expectImagesInProportion(page, where) {
  // measure the resting layout, not a card halfway through its fade or flip
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
  const bad = await page.evaluate(() =>
    [...document.images]
      .filter((img) => img.offsetParent && img.complete)
      .map((img) => {
        const box = img.getBoundingClientRect();
        const w = Number(img.getAttribute('width')) || img.naturalWidth;
        const h = Number(img.getAttribute('height')) || img.naturalHeight;
        return { src: img.getAttribute('src'), drawn: box.width / box.height, declared: w / h };
      })
      .filter((i) => Math.abs(i.drawn / i.declared - 1) > 0.06),
  );
  expect(bad, `distorted images ${where}`).toEqual([]);
}

async function expectNoOverflow(page, where) {
  const overflow = await page.evaluate(() => {
    const out = [];
    if (document.documentElement.scrollWidth > window.innerWidth) out.push(`page is ${document.documentElement.scrollWidth}px wide`);
    const card = document.querySelector('.face:not([inert])');
    if (card && !card.closest('[hidden]')) {
      const box = card.getBoundingClientRect();
      for (const el of card.querySelectorAll('*')) {
        const r = el.getBoundingClientRect();
        if (r.width && (r.right > box.right + 1 || r.left < box.left - 1)) out.push(`${el.tagName}.${el.className} sticks out of the card`);
      }
    }
    return out;
  });
  expect(overflow, `overflow ${where}`).toEqual([]);
}

const STATES = [
  ['a conjugation card', { scope: 'verbs' }],
  ['a vocabulary card with a region flag', { scope: 'vocab', region: 'both' }, (p) => face(p).locator('.chip img').count()],
  ['an idiom', { scope: 'idioms', region: 'both' }],
  ['a conversation card', { scope: 'conversation' }],
  ['a grammar card', { scope: 'grammar' }],
  ['a sentence card', { scope: 'sentences' }],
  ['a recognize card', { scope: 'recognize' }],
  ['a listening card', { scope: 'listening' }],
  ['a typed answer', { scope: 'verbs', mode: 'typed' }],
  ['a conjugation in Spain, with vosotros in its table', { scope: 'tense:pres', region: 'es' }],
];

for (const [name, settings, want] of STATES) {
  test(`${name}: images in proportion, nothing overflows, every option explained after a miss`, async ({ page }) => {
    await openApp(page, { settings });
    if (want) await cardWhere(page, async (p) => (await want(p)) > 0);
    await expectImagesInProportion(page, `on ${name}`);
    await expectNoOverflow(page, `on ${name}`);
    // the hint button's longest label ("More help") still fits beside the others
    await face(page).locator('.hint-btn').click();
    await expect(face(page).locator('.hint-box')).toBeVisible();
    await expectNoOverflow(page, `with a hint on ${name}`);
    await showAnswer(page);
    const options = face(page).locator('.option');
    const n = await options.count();
    if (n && settings.scope !== 'grammar') {
      // each option says what it means (or that the form doesn't exist)
      await expect(face(page).locator('.option .meaning')).toHaveCount(n);
      for (const text of await face(page).locator('.option .meaning').allInnerTexts()) expect(text.trim().length).toBeGreaterThan(2);
    }
    await expectNoOverflow(page, `after missing ${name}`);
    await expectImagesInProportion(page, `after missing ${name}`);
  });
}

test('the review page fits the screen', async ({ page }) => {
  await openApp(page);
  for (let i = 0; i < 3; i++) {
    await showAnswer(page);
    await next(page);
  }
  await page.click('#review-btn');
  await expect(page.locator('#review-view')).toBeVisible();
  await expectNoOverflow(page, 'on the review page');
  await expectImagesInProportion(page, 'on the review page');
});

test('Skip moves straight on without scoring; Show answer explains without scoring', async ({ page }) => {
  await openApp(page);
  const score = await page.locator('#score').innerText();
  const first = await face(page).locator('.verb').innerText();
  await skip(page);
  await expect(page.locator('#feedback')).toBeHidden();
  await expect(face(page).locator('.verb')).not.toHaveText(first);
  await showAnswer(page);
  await expect(page.locator('#feedback h2')).toHaveText(/not scored/);
  await expect(face(page)).not.toHaveClass(/is-wrong/);
  expect(await page.locator('#score').innerText()).toBe(score);
});

test('a verb meaning hint shows the verb in a real sentence', async ({ page }) => {
  await openApp(page, { settings: { scope: 'meanings' } });
  await cardWhere(page, async (p) => (await face(p).locator('.verb[lang=es]').count()) > 0);
  await page.keyboard.press('h');
  const hint = face(page).locator('.hint-box');
  await expect(hint).toContainText(/in a sentence/);
  await expect(hint.locator('a[href*="tatoeba.org"]')).toHaveCount(1);
  await expect(hint.locator('[lang=es] b')).not.toHaveCount(0);
  await expectNoOverflow(page, 'with a meaning hint');
});

test('a missed conjugation shows its whole tense, the answer highlighted', async ({ page }) => {
  await openApp(page, { settings: { scope: 'tense:pret', region: 'mx' } });
  await showAnswer(page);
  const table = page.locator('#feedback .conj-table');
  // no vosotros in Mexico
  await expect(table.locator('.cell:not(.empty) .who')).toHaveText(['yo', 'tú', 'él / ella / usted', 'nosotros', 'ellos / ellas / ustedes']);
  const answer = await page.locator('#feedback .answer b').innerText();
  await expect(table.locator('.cell.hl b')).toHaveText([answer]);
});

test('S reads the card aloud in the accent of the region, and a listening card plays by itself', async ({ page }) => {
  await openApp(page, { settings: { scope: 'meanings', region: 'es' } });
  await cardWhere(page, async (p) => (await face(p).locator('.verb[lang=es]').count()) > 0);
  const word = await face(page).locator('.verb').innerText();
  await page.keyboard.press('s');
  expect(await page.evaluate(() => window.spoken)).toEqual([{ text: word, lang: 'es-ES', rate: 0.9 }]);
  // once the page has been used, the next listening card starts on its own
  await choose(page, '#scope', 'listening');
  await skip(page);
  const sentence = await face(page).locator('.listen-box .speak-btn').first().getAttribute('data-say');
  await expect.poll(() => page.evaluate(() => window.spoken.at(-1))).toEqual({ text: sentence, lang: 'es-ES', rate: 0.9 });
  await face(page).locator('.listen-box .speak-btn[data-slow]').click();
  expect(await page.evaluate(() => window.spoken.at(-1).rate)).toBe(0.6);
  // the sentence isn't written on the card until the hint
  await expect(face(page)).not.toContainText(sentence);
  await page.keyboard.press('h');
  await expect(face(page).locator('.hint-box')).toContainText(sentence);
});

test('switching scopes keeps the page within the screen', async ({ page }) => {
  await openApp(page);
  for (const scope of ['meanings', 'topic:food', 'situation:restaurant', 'grammar:por-para', 'tense:subj_impf', 'recognize', 'listening']) {
    await choose(page, '#scope', scope);
    await expectNoOverflow(page, `with scope ${scope}`);
  }
});
