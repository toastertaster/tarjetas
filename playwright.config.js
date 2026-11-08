// Rendering tests: tests/visual/. See README ("Rendering tests").
//
// layout.spec.js checks layout rules that must hold everywhere (the header
// doesn't change size with the language, images keep their proportions,
// nothing overflows). screens.spec.js compares screenshots with the approved
// ones in tests/visual/snapshots. Screenshots depend on the fonts installed,
// so they are only compared on Linux, in the same Playwright container that CI
// uses.
import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

// Playwright has no Pixel 11 profile yet. Google's specs: 6.3" 1080 x 2424
// display, which Chrome shows as 412 x 924 CSS pixels at 2.625x; the
// viewport leaves room for Chrome's toolbar, as Playwright's Pixel 7 does.
const PIXEL_11 = {
  ...devices['Pixel 7'],
  userAgent: devices['Pixel 7'].userAgent.replace('Android 14; Pixel 7', 'Android 16; Pixel 11'),
  screen: { width: 412, height: 924 },
  viewport: { width: 412, height: 848 },
  deviceScaleFactor: 2.625,
};

export default defineConfig({
  testDir: 'tests/visual',
  snapshotPathTemplate: '{testDir}/snapshots/{arg}-{projectName}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.001,
      animations: 'disabled',
      caret: 'hide',
      stylePath: 'tests/visual/screenshot.css',
    },
  },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    reducedMotion: 'reduce', // the card fades instead of flipping
    locale: 'en-US',
    timezoneId: 'UTC',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 860 } } },
    // Android phones run Chrome, so they use Chromium; the iPhone uses WebKit.
    { name: 'pixel-7', use: { ...devices['Pixel 7'] } },
    { name: 'pixel-11', use: PIXEL_11 },
    { name: 'galaxy-s24', use: { ...devices['Galaxy S24'] } }, // 360px wide, the most common Android width
    { name: 'iphone-14', use: { ...devices['iPhone 14'] } },
  ],
  webServer: {
    command: `node tests/visual/serve.js ${PORT}`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env.CI,
  },
});
