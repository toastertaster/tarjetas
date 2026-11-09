// Vocabulary questions: Spanish → English, English → Spanish, and (with
// Region = Both) Mexico ↔ Spain equivalents. Data format: CONTENT.md.

import { LEVELS } from './conjugate.js';
import { shuffle, upToLevel } from './random.js';

const lvl = (l) => LEVELS.indexOf(l);
export const OTHER_REGION = { mx: 'es', es: 'mx' };

export const isRegional = (item) => typeof item.es === 'object';

/** The Spanish form an item takes in a region, with accepted alternatives. */
export function formsFor(item, region) {
  const r = region === 'es' ? 'es' : 'mx';
  const form = isRegional(item) ? item.es[r] : item.es;
  const alts = Array.isArray(item.alts) ? item.alts : (item.alts?.[r] ?? []);
  return { form, alts };
}

// Every Spanish spelling of an item, in any region.
const allSpanish = (item) => [...new Set(['mx', 'es'].flatMap((r) => { const f = formsFor(item, r); return [f.form, ...f.alts]; }))];

const ARTICLE = /^(el|la|los|las|un|una|unos|unas) /;
const ARTICLE_GENDER = { el: 'm', los: 'm', un: 'm', unos: 'm', la: 'f', las: 'f', una: 'f', unas: 'f' };

export function splitArticle(s) {
  const m = s.match(ARTICLE);
  return m ? { article: m[1], core: s.slice(m[0].length) } : { article: null, core: s };
}

/** 'm', 'f' or null (not a noun). `gender` in the data overrides the article (el agua). */
export function genderOf(item, form) {
  if (item.gender) return item.gender;
  const { article } = splitArticle(form);
  return article ? ARTICLE_GENDER[article] : null;
}

const senses = (gloss) =>
  gloss
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .split(/[;,]/)
    .map((s) => s.replace(/[!?¡¿.]/g, '').replace(/^\s*(to|the|a|an)\s+/, '').trim())
    .filter(Boolean);

export function sensesOverlap(a, b) {
  const sa = new Set(senses(a));
  return senses(b).some((s) => sa.has(s));
}

// ---------------------------------------------------------------------------
// Building questions

/**
 * A vocabulary question for one item.
 *   dir    – 'es-en' | 'en-es' | 'regional' (Spanish of one region → the other)
 *   region – 'mx' | 'es': whose Spanish is asked for (or shown, for es-en)
 */
export function vocabQuestionFor({ item, dir, region, mode, items, rng }) {
  const shown = formsFor(item, region);
  let answer;
  let from = null;
  if (dir === 'es-en') {
    answer = { form: item.en, alts: [], tags: [] };
  } else if (dir === 'regional') {
    from = formsFor(item, OTHER_REGION[region]).form;
    answer = { ...shown, tags: [] };
  } else {
    answer = { ...shown, tags: [] };
  }
  const q = {
    kind: 'vocab',
    mode: dir === 'es-en' ? 'mc' : mode,
    dir,
    item,
    vocabRegion: region,
    from, // the other region's word, for regional questions
    prompt: dir === 'es-en' ? shown.form : dir === 'regional' ? from : item.en,
    answer,
    accepted: [answer.form, ...answer.alts],
    level: item.level,
    topic: item.topic,
    region: isRegional(item) ? region : null,
    key: `vocab|${item.id}|${dir}|${region}`,
    spec: { kind: 'vocab', id: item.id, dir, region },
  };
  if (q.mode === 'mc') q.options = vocabOptions(q, items, rng);
  return q;
}

/** Pick an item and direction for the current settings. */
export function vocabQuestion({ items, settings, level, mode, rng, avoid, topic = null }) {
  const list = upToLevel(
    items.filter((i) => !topic || i.topic === topic),
    level,
  );
  const fresh = list.filter((i) => !avoid.has(i.id));
  const from = fresh.length ? fresh : list;
  const both = settings.region === 'both';
  // Favor the level itself, and with Region = Both the words that differ.
  const weight = (i) => (i.level === level ? 3 : 1) * (both && isRegional(i) ? 2 : 1);
  const total = from.reduce((s, i) => s + weight(i), 0);
  let r = rng() * total;
  let item = from[from.length - 1];
  for (const i of from) {
    r -= weight(i);
    if (r < 0) {
      item = i;
      break;
    }
  }
  const region = both ? (rng() < 0.5 ? 'mx' : 'es') : settings.region;
  let dir;
  if (both && isRegional(item) && rng() < 0.5) dir = 'regional';
  else if (mode === 'typed') dir = 'en-es';
  else dir = rng() < 0.5 ? 'es-en' : 'en-es';
  return vocabQuestionFor({ item, dir, region, mode, items, rng });
}

function vocabOptions(q, items, rng) {
  const { item, dir, vocabRegion: region } = q;
  const isNoun = genderOf(item, q.answer.form) !== null;
  const correct = new Set(q.accepted);
  const promptSpanish = dir === 'es-en' ? q.prompt : null;
  const text = (other) => (dir === 'es-en' ? other.en : formsFor(other, region).form);
  const candidates = items.filter((other) => {
    if (other.id === item.id || sensesOverlap(other.en, item.en)) return false;
    if (dir === 'regional' && !isRegional(other)) return false;
    // a word with the same Spanish spelling would make two answers right (la llave = key / faucet)
    if (promptSpanish && allSpanish(other).includes(promptSpanish)) return false;
    if (correct.has(text(other))) return false;
    return true;
  });
  // Prefer the same topic and the same kind of word (noun vs. not)
  const score = (o) =>
    (o.topic === item.topic ? 2 : 0) +
    ((genderOf(o, formsFor(o, region).form) !== null) === isNoun ? 1 : 0) +
    (Math.abs(lvl(o.level) - lvl(item.level)) <= 1 ? 1 : 0) +
    rng();
  const ranked = candidates.map((o) => [score(o), o]).sort((a, b) => b[0] - a[0]).map(([, o]) => o);
  const chosen = [];
  for (const o of ranked) {
    if (chosen.some((c) => sensesOverlap(c.en, o.en) || text(c) === text(o))) continue;
    chosen.push(o);
    if (chosen.length === 3) break;
  }
  return shuffle(
    [
      { text: q.answer.form, correct: true },
      ...chosen.map((o) => ({ text: text(o), correct: false, why: { kind: 'vocab', item: o, region } })),
    ],
    rng,
  );
}

// ---------------------------------------------------------------------------
// Grading typed answers

/**
 * Grade a typed Spanish answer. Articles are optional, but a wrong article is
 * a gender mistake. Returns { result, expected?, why?, typed }.
 *   normalize/plain – the shared helpers from quiz.js
 */
export function gradeVocab(q, input, { strict = false, normalize, plain }) {
  const s = normalize(input);
  const accepted = q.accepted.map((a) => [a, normalize(a)]);
  if (accepted.some(([, a]) => a === s)) return { result: 'correct', typed: s };
  const { article, core } = splitArticle(s);
  for (const [orig, a] of accepted) {
    const parts = splitArticle(a);
    const sameCore = parts.core === core;
    const nearCore = !strict && plain(parts.core) === plain(core);
    if (!sameCore && !nearCore) continue;
    if (article && parts.article && ARTICLE_GENDER[article] !== genderOf(q.item, orig)) {
      return { result: 'wrong', typed: s, why: { kind: 'gender', expected: orig, gender: genderOf(q.item, orig) } };
    }
    if (!sameCore) return { result: 'accent', expected: orig, typed: s };
    // right word; the article was left out (fine) or was the indefinite one
    return { result: 'correct', typed: s, expected: parts.article ? orig : undefined };
  }
  if (isRegional(q.item) && q.dir !== 'es-en') {
    const other = OTHER_REGION[q.vocabRegion];
    const theirs = formsFor(q.item, other);
    const matches = [theirs.form, ...theirs.alts].some((f) => {
      const c = splitArticle(normalize(f)).core;
      return c === core || plain(c) === plain(core);
    });
    if (matches) return { result: 'wrong', typed: s, why: { kind: 'other-region', region: other, form: theirs.form } };
  }
  return { result: 'wrong', typed: s };
}
