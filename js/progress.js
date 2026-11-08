// Settings, the automatic level and session score, persisted in localStorage.

import { LEVELS } from './conjugate.js';
import { emptyReview, recordAnswer } from './review.js';

export const STORAGE_KEY = 'tarjetas.v1';
export const AUTO_START = 'A2';
export const AUTO_WINDOW = 20; // answers looked at before changing level
export const AUTO_UP = 0.85; // average score to move up
export const AUTO_DOWN = 0.6; // average score below which we move down

export const DEFAULT_SETTINGS = {
  mode: 'mc',
  scope: 'verbs',
  level: 'auto',
  region: 'mx',
  lang: 'en',
  strict: false,
};

/**
 * Feed one score (1, 0.5 or 0) into the automatic level. Returns the new
 * auto state and 'up', 'down' or null.
 */
export function updateAuto(auto, score) {
  const window = [...auto.window, score].slice(-AUTO_WINDOW);
  if (window.length === AUTO_WINDOW) {
    const avg = window.reduce((a, b) => a + b, 0) / window.length;
    const i = LEVELS.indexOf(auto.level);
    if (avg >= AUTO_UP && i < LEVELS.length - 1) return { state: { level: LEVELS[i + 1], window: [] }, change: 'up' };
    if (avg < AUTO_DOWN && i > 0) return { state: { level: LEVELS[i - 1], window: [] }, change: 'down' };
  }
  return { state: { level: auto.level, window }, change: null };
}

// Settings saved by older versions of the app.
function migrate(settings) {
  const s = { ...settings };
  // "Verb meanings" moved from Mode to Scope.
  if (s.mode === 'meaning') {
    s.mode = 'mc';
    s.scope = 'meanings';
  }
  return s;
}

// Practice scopes that are deliberately hard don't move the automatic level.
const countsForAuto = (scope) => scope !== 'review' && !scope.startsWith('cat:');

export class Progress {
  constructor(storage = null) {
    this.storage = storage;
    let saved = {};
    try {
      saved = JSON.parse(storage?.getItem(STORAGE_KEY) ?? '{}') ?? {};
    } catch {
      saved = {};
    }
    this.settings = migrate({ ...DEFAULT_SETTINGS, ...saved.settings });
    this.auto = saved.auto && LEVELS.includes(saved.auto.level) ? saved.auto : { level: AUTO_START, window: [] };
    this.review = saved.review?.cats && Array.isArray(saved.review.deck) ? saved.review : emptyReview();
    this.session = { answered: 0, correct: 0, streak: 0 };
  }

  save() {
    try {
      const data = { settings: this.settings, auto: this.auto, review: this.review };
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // storage full or disabled: progress just won't persist
    }
  }

  resetReview() {
    this.review = emptyReview();
    this.save();
  }

  set(key, value) {
    this.settings[key] = value;
    this.save();
  }

  // The level questions are asked at.
  get level() {
    return this.settings.level === 'auto' ? this.auto.level : this.settings.level;
  }

  /**
   * Record one answer to question `q` (optional in tests). Returns 'up' /
   * 'down' when the auto level changes.
   */
  record(score, q = null) {
    this.session.answered += 1;
    if (score > 0) {
      this.session.correct += 1;
      this.session.streak += 1;
    } else {
      this.session.streak = 0;
    }
    if (q) this.review = recordAnswer(this.review, q, score > 0);
    let change = null;
    if (this.settings.level === 'auto' && countsForAuto(this.settings.scope)) {
      const r = updateAuto(this.auto, score);
      this.auto = r.state;
      change = r.change;
    }
    this.save();
    return change;
  }
}
