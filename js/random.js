// Random choices shared by every kind of question. `rng` is a function
// returning [0, 1), injectable so tests are repeatable.

import { LEVELS } from './conjugate.js';

const lvl = (l) => LEVELS.indexOf(l);

export function seededRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];

export function weightedPick(items, weight, rng) {
  const total = items.reduce((sum, x) => sum + weight(x), 0);
  let r = rng() * total;
  for (const x of items) {
    r -= weight(x);
    if (r < 0) return x;
  }
  return items[items.length - 1];
}

export function shuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Pick an item for a level: items above the level are skipped (unless
 * nothing else is left), items at the level are favored, and recently asked
 * subjects (`avoid`, matched with `subject`) are skipped when possible.
 * `weight` adds a further preference.
 */
export function pickAtLevel(items, { level, levelOf = (x) => x.level, subject = (x) => x.id, avoid = new Set(), weight = () => 1, rng }) {
  const pool = items.filter((x) => lvl(levelOf(x)) <= lvl(level));
  const list = pool.length ? pool : items;
  const fresh = list.filter((x) => !avoid.has(subject(x)));
  return weightedPick(fresh.length ? fresh : list, (x) => (levelOf(x) === level ? 3 : 1) * weight(x), rng);
}
