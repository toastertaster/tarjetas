// Shared setup for the rendering tests: open the app with known settings and
// repeatable questions, and move between cards.
import { expect } from '@playwright/test';

export const face = (page) => page.locator('.face:not([inert])');

/**
 * Open the app with saved settings (and optionally a review history) and a
 * seeded Math.random, so the same cards come up on every run.
 *
 * Speech is replaced by a silent stand-in with the same two Spanish voices in
 * every browser (which voices exist differs by machine); what would have been
 * read aloud is kept in window.spoken.
 */
export async function openApp(page, { settings = {}, review = null, seed = 1 } = {}) {
  await page.addInitScript(
    ({ settings, review, seed }) => {
      let s = seed >>> 0;
      Math.random = () => {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      const voices = [
        { name: 'Test (México)', lang: 'es-MX' },
        { name: 'Test (España)', lang: 'es-ES' },
      ];
      window.spoken = [];
      window.SpeechSynthesisUtterance = class {
        constructor(text) {
          this.text = text;
        }
      };
      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        value: {
          getVoices: () => voices,
          speak: (u) => window.spoken.push({ text: u.text, lang: u.lang, rate: u.rate }),
          cancel: () => {},
        },
      });
      // Only before the first load, so reloads keep what the test did.
      if (!sessionStorage.getItem('tarjetas.test')) {
        sessionStorage.setItem('tarjetas.test', '1');
        localStorage.setItem('tarjetas.v1', JSON.stringify({ settings, ...(review ? { review } : {}) }));
      }
    },
    { settings, review, seed },
  );
  await page.goto('/');
  await cardReady(page);
}

export async function cardReady(page) {
  await expect(face(page).locator('.option, input[type=text]').first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

/** Show the answer (and every option's meaning) without scoring the card. */
export async function showAnswer(page) {
  await face(page).locator('.answer-btn').click();
  await expect(page.locator('#feedback')).toBeVisible();
}

/** Skip straight to the next card. */
export async function skip(page) {
  await page.keyboard.press('Escape');
  await cardReady(page);
}

export async function next(page) {
  await page.keyboard.press('Enter');
  await expect(page.locator('#feedback')).toBeHidden();
  await cardReady(page);
}

/** Skip cards until one matches `test(page)`. */
export async function cardWhere(page, test, tries = 40) {
  for (let i = 0; i < tries; i++) {
    if (await test(page)) return;
    await skip(page);
  }
  throw new Error('no matching card');
}

/** Pick wrong options until a card is missed (a right pick moves on to the next card). */
export async function miss(page) {
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('1');
    const missed = await page
      .locator('#feedback')
      .waitFor({ state: 'visible', timeout: 400 })
      .then(() => true, () => false);
    if (missed) return;
    await cardReady(page);
    await page.waitForTimeout(800); // the right answer flips to the next card
  }
  throw new Error('never missed');
}

/** Open the ⚙ settings on phones (on desktop they are always shown). */
export async function showSettings(page) {
  const toggle = page.locator('#settings-toggle');
  if ((await toggle.isVisible()) && (await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
}

export async function choose(page, select, value) {
  await showSettings(page);
  await page.selectOption(select, value);
  await cardReady(page);
}
