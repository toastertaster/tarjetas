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
    { name: 'phone-chromium', use: { ...devices['Pixel 7'] } },
    { name: 'phone-webkit', use: { ...devices['iPhone 14'] } },
  ],
  webServer: {
    command: `node tests/visual/serve.js ${PORT}`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: !process.env.CI,
  },
});
