import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Progress, updateAuto, AUTO_WINDOW, AUTO_START, STORAGE_KEY } from '../js/progress.js';

class MemoryStorage {
  constructor() {
    this.data = {};
  }
  getItem(k) {
    return this.data[k] ?? null;
  }
  setItem(k, v) {
    this.data[k] = v;
  }
}

const feed = (auto, scores) => {
  let change = null;
  for (const s of scores) ({ state: auto, change } = updateAuto(auto, s));
  return { auto, change };
};

test('auto level moves up after a strong run', () => {
  const { auto, change } = feed({ level: 'A2', window: [] }, Array(AUTO_WINDOW).fill(1));
  assert.equal(change, 'up');
  assert.equal(auto.level, 'B1');
  assert.deepEqual(auto.window, []);
});

test('auto level moves down after a weak run', () => {
  const { auto, change } = feed({ level: 'B1', window: [] }, Array(AUTO_WINDOW).fill(0));
  assert.equal(change, 'down');
  assert.equal(auto.level, 'A2');
});

test('auto level holds steady in between and needs a full window', () => {
  const mixed = Array.from({ length: AUTO_WINDOW }, (_, i) => (i % 4 === 0 ? 0 : 1)); // 75%
  assert.equal(feed({ level: 'B1', window: [] }, mixed).auto.level, 'B1');
  assert.equal(feed({ level: 'B1', window: [] }, Array(AUTO_WINDOW - 1).fill(1)).change, null);
});

test('hints count half: all-hinted answers do not move you up', () => {
  assert.equal(feed({ level: 'B1', window: [] }, Array(AUTO_WINDOW).fill(0.5)).change, 'down');
});

test('auto level stops at the ends', () => {
  assert.equal(feed({ level: 'C2', window: [] }, Array(AUTO_WINDOW).fill(1)).auto.level, 'C2');
  assert.equal(feed({ level: 'A1', window: [] }, Array(AUTO_WINDOW).fill(0)).auto.level, 'A1');
});

test('settings and auto level persist; the session score does not', () => {
  const storage = new MemoryStorage();
  const p = new Progress(storage);
  assert.equal(p.level, AUTO_START);
  p.set('region', 'es');
  for (let i = 0; i < AUTO_WINDOW; i++) p.record(1);
  assert.equal(p.session.streak, AUTO_WINDOW);
  const again = new Progress(storage);
  assert.equal(again.settings.region, 'es');
  assert.equal(again.level, 'B1');
  assert.equal(again.session.answered, 0);
  again.set('level', 'C1');
  assert.equal(again.level, 'C1');
});

test('old "Verb meanings" mode moves to the Scope setting', () => {
  const storage = new MemoryStorage();
  storage.setItem(STORAGE_KEY, JSON.stringify({ settings: { mode: 'meaning', scope: 'tense:pret' } }));
  const p = new Progress(storage);
  assert.equal(p.settings.mode, 'mc');
  assert.equal(p.settings.scope, 'meanings');
});

test('practicing mistakes does not move the automatic level', () => {
  const p = new Progress(new MemoryStorage());
  p.set('scope', 'review');
  for (let i = 0; i < AUTO_WINDOW; i++) p.record(0);
  assert.equal(p.level, AUTO_START);
  p.set('scope', 'cat:pret-strong');
  for (let i = 0; i < AUTO_WINDOW; i++) p.record(0);
  assert.equal(p.level, AUTO_START);
});

test('review history persists and can be cleared', () => {
  const storage = new MemoryStorage();
  const p = new Progress(storage);
  const q = { kind: 'meaning', verb: { inf: 'poder', en: 'to be able to' }, key: 'meaning|poder|es-en', spec: { kind: 'meaning', inf: 'poder', direction: 'es-en' } };
  p.record(0, q);
  assert.equal(new Progress(storage).review.deck.length, 1);
  p.resetReview();
  assert.equal(new Progress(storage).review.deck.length, 0);
});

test('corrupt storage falls back to defaults', () => {
  const storage = new MemoryStorage();
  storage.setItem(STORAGE_KEY, '{not json');
  assert.equal(new Progress(storage).settings.region, 'mx');
});
