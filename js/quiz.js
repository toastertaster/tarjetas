// Question generation, multiple-choice distractors and answer grading.
// Nothing here touches the DOM, so tests can drive it directly.

import { conjugate, accepted, analyze, TENSES, TENSE_BY_ID, LEVELS, PERSONS } from './conjugate.js';

export const MODES = ['mc', 'typed', 'meaning', 'mixed'];
export const REGIONS = ['mx', 'es', 'both'];
export const VOSOTROS = 4;

const lvl = (l) => LEVELS.indexOf(l);

// ---------------------------------------------------------------------------
// Random helpers (rng is a function returning [0, 1), injectable for tests)

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

const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];

function weightedPick(items, weight, rng) {
  const total = items.reduce((sum, x) => sum + weight(x), 0);
  let r = rng() * total;
  for (const x of items) {
    r -= weight(x);
    if (r < 0) return x;
  }
  return items[items.length - 1];
}

function shuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// Conjugation cache

const cache = new Map();
export function tables(entry) {
  let c = cache.get(entry.inf);
  if (!c) {
    c = { table: conjugate(entry).table, regular: conjugate(entry, { regular: true }).table };
    cache.set(entry.inf, c);
  }
  return c;
}

// ---------------------------------------------------------------------------
// Filters

export function verbInRegion(verb, region) {
  if (!verb.regions || region === 'both') return true;
  return verb.regions.includes(region);
}

export function personsFor(entry, tenseId, region) {
  const tense = TENSE_BY_ID[tenseId];
  if (tense.mood === 'nonfinite') return [null];
  const cells = tables(entry).table[tenseId];
  return PERSONS.map((_, p) => p).filter((p) => cells[p] && (p !== VOSOTROS || region !== 'mx'));
}

// The region a question belongs to, for the region badge (null = everywhere).
function questionRegion(verb, person) {
  if (person === VOSOTROS) return 'es';
  if (verb.regions?.length === 1) return verb.regions[0];
  return null;
}

// ---------------------------------------------------------------------------
// Choosing what to ask

// Tenses eligible at a level, weighted toward the level itself.
function chooseTense(scope, level, rng) {
  if (scope.startsWith('tense:')) return scope.slice(6);
  const ok = TENSES.filter((t) => lvl(t.level) <= lvl(level));
  return weightedPick(ok, (t) => (t.level === level ? 3 : 1), rng).id;
}

function chooseVerb(verbs, level, tenseLevel, rng, avoid) {
  const pool = verbs.filter((v) => lvl(v.level) <= lvl(level) && !avoid.has(v.inf));
  const list = pool.length ? pool : verbs.filter((v) => lvl(v.level) <= lvl(level));
  // When the tense is easier than the level, lean on verbs from the level.
  const favor = lvl(tenseLevel) < lvl(level) ? level : null;
  return weightedPick(list, (v) => (favor && v.level === favor ? 3 : 1), rng);
}

/**
 * Build the next question.
 *   verbs    – entries from data/verbs.json
 *   settings – { mode, scope, region }
 *   level    – the CEFR level to ask at (already resolved from "auto")
 *   recent   – infinitives asked recently, avoided when possible
 */
export function makeQuestion({ verbs, settings, level, rng = Math.random, recent = [] }) {
  const region = settings.region;
  const regional = verbs.filter((v) => verbInRegion(v, region));
  let mode = settings.mode;
  if (mode === 'mixed') mode = weightedPick(['mc', 'typed', 'meaning'], (m) => ({ mc: 9, typed: 7, meaning: 4 })[m], rng);
  const avoid = new Set(recent);
  if (mode === 'meaning') return meaningQuestion(regional, level, rng, avoid);

  for (let attempt = 0; attempt < 50; attempt++) {
    const tenseId = chooseTense(settings.scope, level, rng);
    const verb = chooseVerb(regional, level, TENSE_BY_ID[tenseId].level, rng, avoid);
    const persons = personsFor(verb, tenseId, region);
    if (persons.length === 0) continue; // e.g. commands of an impersonal verb
    const person = pick(persons, rng);
    const { table } = tables(verb);
    const answer = table[tenseId][person ?? 0];
    const q = {
      kind: 'conj',
      mode,
      verb,
      tense: tenseId,
      person,
      answer,
      accepted: accepted(answer),
      level: LEVELS[Math.max(lvl(verb.level), lvl(TENSE_BY_ID[tenseId].level))],
      region: questionRegion(verb, person),
      audience: region, // the learner's region setting
    };
    if (mode === 'mc') q.options = conjugationOptions(q, rng);
    return q;
  }
  throw new Error(`no question available for ${settings.scope} at ${level}`);
}

// ---------------------------------------------------------------------------
// Multiple-choice distractors for conjugation questions

const RELATED = {
  pres: ['subj_pres', 'pret', 'impf', 'fut'],
  pret: ['impf', 'pres', 'subj_impf', 'cond'],
  impf: ['pret', 'cond', 'subj_impf', 'pres'],
  fut: ['cond', 'pres', 'subj_fut'],
  cond: ['fut', 'impf', 'subj_impf'],
  pres_perf: ['pluperf', 'subj_perf', 'pret'],
  pluperf: ['pres_perf', 'subj_pluperf', 'cond_perf'],
  fut_perf: ['cond_perf', 'pres_perf', 'fut'],
  cond_perf: ['fut_perf', 'subj_pluperf', 'pluperf'],
  past_ant: ['pluperf', 'pret', 'subj_pluperf'],
  subj_pres: ['pres', 'subj_impf', 'imp_aff'],
  subj_impf: ['subj_pres', 'impf', 'pret', 'cond'],
  subj_perf: ['pres_perf', 'subj_pluperf', 'subj_pres'],
  subj_pluperf: ['pluperf', 'subj_perf', 'cond_perf'],
  subj_fut: ['subj_impf', 'fut', 'subj_pres'],
  subj_fut_perf: ['subj_pluperf', 'fut_perf', 'subj_perf'],
  imp_aff: ['pres', 'subj_pres', 'fut', 'impf'],
  imp_neg: ['pres', 'imp_aff'], // offered with "no": no hablas, no habla
  gerund: ['participle'],
  participle: ['gerund'],
};

// Every wrong-but-plausible form for a conjugation question, each with the
// reason it is wrong (used to explain a wrong pick).
export function distractorPool(q) {
  const { table, regular } = tables(q.verb);
  const p = q.person ?? 0;
  const cell = (t, person) => table[t]?.[person] ?? null;
  const pool = [];
  const reg = regular[q.tense]?.[p];
  if (reg) pool.push({ form: reg.form, why: { kind: 'regular' } });
  if (q.person !== null) {
    for (let other = 0; other < 6; other++) {
      // learners of Mexican Spanish never see vosotros forms
      if (other === p || (other === VOSOTROS && q.audience === 'mx')) continue;
      const f = cell(q.tense, other);
      if (f) pool.push({ form: f.form, why: { kind: 'person', person: other } });
    }
  }
  for (const t of RELATED[q.tense]) {
    const nonfinite = TENSE_BY_ID[t].mood === 'nonfinite';
    const f = cell(t, nonfinite ? 0 : p);
    if (!f) continue;
    if (q.tense === 'imp_neg') pool.push({ form: `no ${f.form}`, why: { kind: 'negated', tense: t, person: p } });
    else pool.push({ form: f.form, why: { kind: 'tense', tense: t, person: nonfinite ? null : p } });
  }
  // Fallbacks for cells with few relatives (non-finite forms, impersonal verbs)
  if (q.person === null) {
    const v = analyze(q.verb);
    if (q.tense === 'gerund') {
      pool.push({ form: v.stem + (v.cls === 'ar' ? 'iendo' : 'ando'), why: { kind: 'ending' } });
    } else {
      pool.push({ form: v.stem + (v.cls === 'ar' ? 'ido' : 'ado'), why: { kind: 'ending' } });
    }
    for (const t of ['pres', 'pret', 'impf']) {
      const f = cell(t, 2);
      if (f) pool.push({ form: f.form, why: { kind: 'tense', tense: t, person: 2 } });
    }
  }
  for (const t of ['pres', 'pret', 'impf', 'fut', 'cond', 'subj_pres', 'subj_impf']) {
    const f = cell(t, p);
    if (!f) continue;
    if (q.tense === 'imp_neg') pool.push({ form: `no ${f.form}`, why: { kind: 'negated', tense: t, person: p } });
    else pool.push({ form: f.form, why: { kind: 'tense', tense: t, person: q.person === null ? 2 : p } });
  }
  const correct = new Set(q.accepted);
  const seen = new Set();
  return pool.filter((d) => {
    if (correct.has(d.form) || seen.has(d.form)) return false;
    seen.add(d.form);
    return true;
  });
}

function conjugationOptions(q, rng) {
  const pool = distractorPool(q);
  const chosen = [];
  const take = (pred) => {
    const candidates = pool.filter((d) => pred(d) && !chosen.includes(d));
    if (candidates.length) chosen.push(pick(candidates, rng));
  };
  // A mix of kinds: the regularized form when it's a trap, then a wrong
  // person and a related tense, then anything else.
  take((d) => d.why.kind === 'regular');
  take((d) => d.why.kind === 'person');
  take((d) => ['tense', 'negated'].includes(d.why.kind) && RELATED[q.tense].includes(d.why.tense));
  while (chosen.length < 3) {
    const before = chosen.length;
    take(() => true);
    if (chosen.length === before) break;
  }
  const options = [{ text: q.answer.form, correct: true }, ...chosen.slice(0, 3).map((d) => ({ text: d.form, correct: false, why: d.why }))];
  return shuffle(options, rng);
}

// ---------------------------------------------------------------------------
// Meaning questions (Spanish ↔ English)

const senses = (gloss) =>
  gloss
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .split(/[;,]/)
    .map((s) => s.replace(/^\s*to\s+/, '').trim())
    .filter(Boolean);

export function glossesOverlap(a, b) {
  const sa = new Set(senses(a));
  return senses(b).some((s) => sa.has(s));
}

function meaningQuestion(verbs, level, rng, avoid) {
  const pool = verbs.filter((v) => lvl(v.level) <= lvl(level));
  const fresh = pool.filter((v) => !avoid.has(v.inf));
  const verb = weightedPick(fresh.length ? fresh : pool, (v) => (v.level === level ? 3 : 1), rng);
  const direction = rng() < 0.5 ? 'es-en' : 'en-es';
  const near = verbs.filter(
    (v) => v.inf !== verb.inf && Math.abs(lvl(v.level) - lvl(verb.level)) <= 1 && !glossesOverlap(v.en, verb.en),
  );
  const chosen = [];
  for (const v of shuffle(near, rng)) {
    if (chosen.every((c) => !glossesOverlap(c.en, v.en))) chosen.push(v);
    if (chosen.length === 3) break;
  }
  const text = (v) => (direction === 'es-en' ? v.en : v.inf);
  const options = shuffle(
    [{ text: text(verb), correct: true }, ...chosen.map((v) => ({ text: text(v), correct: false, why: { kind: 'meaning', verb: v } }))],
    rng,
  );
  return {
    kind: 'meaning',
    mode: 'mc',
    direction,
    verb,
    options,
    answer: { form: text(verb), alts: [], tags: [] },
    accepted: [text(verb)],
    level: verb.level,
    region: verb.regions?.length === 1 ? verb.regions[0] : null,
  };
}

// ---------------------------------------------------------------------------
// Grading typed answers

const SUBJECT = /^(yo|t[uú]|[eé]l|ella|usted|ud\.?|nosotros|nosotras|vosotros|vosotras|ellos|ellas|ustedes|uds\.?)\s+/;

export function normalizeAnswer(s) {
  return s
    .toLowerCase()
    .replace(/[¡!¿?.,;:"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Remove every diacritic, including the tilde of ñ and the dieresis of ü.
export const plain = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Find where else in the verb's table a written form appears.
export function locateForm(entry, form) {
  const { table } = tables(entry);
  for (const t of TENSES) {
    const cells = table[t.id];
    for (let p = 0; p < cells.length; p++) {
      if (cells[p] && accepted(cells[p]).includes(form)) {
        return { tense: t.id, person: t.mood === 'nonfinite' ? null : p };
      }
    }
  }
  return null;
}

/**
 * Grade a typed answer. Returns { result, why? } where result is
 *   'correct' – exact match
 *   'accent'  – right apart from accents/tildes (counts as correct unless strict)
 *   'wrong'
 * `why` describes a wrong answer that is another form of the same verb.
 */
export function gradeTyped(q, input, { strict = false } = {}) {
  let s = normalizeAnswer(input).replace(SUBJECT, '');
  if (q.tense === 'imp_neg' && !s.startsWith('no ')) s = `no ${s}`;
  if (q.accepted.includes(s)) return { result: 'correct' };
  const elsewhere = s ? locateForm(q.verb, s) : null;
  if (!strict && !elsewhere) {
    const match = q.accepted.find((a) => plain(a) === plain(s));
    if (match) return { result: 'accent', expected: match };
  }
  if (elsewhere) {
    const accentOnly = q.accepted.some((a) => plain(a) === plain(s));
    return { result: 'wrong', why: { kind: accentOnly ? 'accent-matters' : 'typed-form', ...elsewhere }, typed: s };
  }
  return { result: 'wrong', typed: s };
}

// Score used for auto-level and stats: hints halve the credit.
export function scoreFor(result, usedHint) {
  if (result === 'correct' || result === 'accent') return usedHint ? 0.5 : 1;
  return 0;
}
