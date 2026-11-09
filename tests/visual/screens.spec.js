// Screenshots of the main screens, compared with the approved images in
// tests/visual/snapshots. A difference means the page renders differently:
// check the report, and if the change is intended, approve the new images
// (README, "Rendering tests").
//
// Fonts differ between operating systems, so the images are made and
// compared in the Linux Playwright container used by CI. Set SNAPSHOTS=1 to
// run them elsewhere anyway (against images made on that machine).
import { test, expect } from '@playwright/test';
import { openApp, face, showAnswer, cardWhere, miss, showSettings } from './helpers.js';

test.skip(process.platform !== 'linux' && !process.env.SNAPSHOTS, 'screenshots are compared on Linux (see README)');

const shot = (page, name) => expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true });

test('conjugation card', async ({ page }) => {
  await openApp(page);
  await shot(page, 'conjugation');
});

test('conjugation card in Spanish', async ({ page }) => {
  await openApp(page, { settings: { lang: 'es' } });
  await shot(page, 'conjugation-es');
});

test('missed conjugation: the answer, the explanation and every option explained', async ({ page }) => {
  await openApp(page, { seed: 3 });
  await miss(page);
  await shot(page, 'conjugation-missed');
});

test('vocabulary card with a region flag', async ({ page }) => {
  await openApp(page, { settings: { scope: 'vocab', region: 'both' } });
  await cardWhere(page, async (p) => (await face(p).locator('.chip img').count()) > 0);
  await shot(page, 'vocab-region');
});

test('sentence card, answer shown', async ({ page }) => {
  await openApp(page, { settings: { scope: 'sentences' } });
  await shot(page, 'sentence');
  await showAnswer(page);
  await shot(page, 'sentence-answer');
});

test('verb meaning card with its hint', async ({ page }) => {
  await openApp(page, { settings: { scope: 'meanings' } });
  await cardWhere(page, async (p) => (await face(p).locator('.verb[lang=es]').count()) > 0);
  await page.keyboard.press('h');
  await expect(face(page).locator('.hint-box a')).toHaveCount(1);
  await shot(page, 'meaning-hint');
});

test('vocabulary card with its hint: the word in a real sentence', async ({ page }) => {
  await openApp(page, { settings: { scope: 'vocab' } });
  await cardWhere(page, async (p) => {
    if (!(await face(p).locator('.verb[lang=es]').count())) return false;
    await p.keyboard.press('h');
    await expect(face(p).locator('.hint-box')).toBeVisible();
    return (await face(p).locator('.hint-box a').count()) > 0;
  });
  await shot(page, 'vocab-hint');
});

test('recognize card, answer shown with the whole tense', async ({ page }) => {
  await openApp(page, { settings: { scope: 'recognize' } });
  await showAnswer(page);
  await shot(page, 'recognize-answer');
});

test('listening card with its hint', async ({ page }) => {
  await openApp(page, { settings: { scope: 'listening' } });
  await page.keyboard.press('h');
  await expect(face(page).locator('.hint-box')).toBeVisible();
  await shot(page, 'listening-hint');
});

test('idiom card', async ({ page }) => {
  await openApp(page, { settings: { scope: 'idioms' } });
  await shot(page, 'idiom');
});

test('grammar card', async ({ page }) => {
  await openApp(page, { settings: { scope: 'grammar' } });
  await shot(page, 'grammar');
});

test('typed answer card', async ({ page }) => {
  await openApp(page, { settings: { mode: 'typed' } });
  await shot(page, 'typed');
});

const REVIEW = {
  cats: {
    'pret-strong': {
      seen: 4,
      missed: 2,
      recent: [0, 1, 0, 1],
      examples: [
        { kind: 'conj', inf: 'hacer', tense: 'pret', person: 2, answer: 'hizo' },
        { kind: 'conj', inf: 'tener', tense: 'pret', person: 0, answer: 'tuve' },
      ],
    },
    'grammar:ser-estar': {
      seen: 3,
      missed: 2,
      recent: [0, 0, 1],
      examples: [{ kind: 'grammar', prompt: 'Madrid ___ en el centro de España.', answer: 'está' }],
    },
  },
  deck: [{ key: 'conj|tener|pret|0', spec: { kind: 'conj', inf: 'tener', tense: 'pret', person: 0 }, streak: 0 }],
};

test('review page', async ({ page }) => {
  await openApp(page, { review: REVIEW });
  await page.click('#review-btn');
  await expect(page.locator('.review-item')).toHaveCount(2);
  await shot(page, 'review');
});

test('settings opened on a phone', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'settings are always shown on desktop');
  await openApp(page);
  await showSettings(page);
  // Only the header. The card under it is in "conjugation card", and below
  // the open settings its rows land on fractional pixels that CI machines
  // round differently, so a whole-page image fails for no visible change.
  await expect(page.locator('#topbar')).toHaveScreenshot('settings-open.png');
});
