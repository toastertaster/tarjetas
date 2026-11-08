// Question generation, multiple-choice distractors and answer grading.
// Nothing here touches the DOM, so tests can drive it directly.
//
// The Mode setting says how to answer (multiple choice / typed / mixed); the
// Scope setting says what is asked:
//   verbs | tense:<id>  – conjugation, all tenses or one
//   meanings            – what verbs mean (Spanish ↔ English)
//   vocab | topic:<id>  – vocabulary, all topics or one
//   sentences           – verb forms in real sentences from Tatoeba
//   idioms              – idioms and expressions
//   conversation | situation:<id> – the right reply, all situations or one
//   grammar | grammar:<set>       – grammar choices (ser/estar, por/para…)
//   cat:<category>      – conjugations that exercise one review category
//   review              – the learner's own mistakes
// Every question has a `key` (what exactly was asked) and a `spec` that
// rebuilds it, so mistakes can be tracked and asked again.

import { conjugate, accepted, analyze, TENSES, TENSE_BY_ID, LEVELS, PERSONS, REFLEXIVE_PRONOUNS } from './conjugate.js';
import { vocabQuestion, vocabQuestionFor, gradeVocab } from './vocab.js';
import {
  emptyPhrases,
  idiomQuestion,
  idiomQuestionFor,
  conversationQuestion,
  conversationQuestionFor,
  grammarQuestion,
  grammarQuestionFor,
} from './phrases.js';
import { conjCategories } from './review.js';
import { pick, weightedPick, shuffle, pickAtLevel } from './random.js';

export { seededRng } from './random.js';

export const MODES = ['mc', 'typed', 'mixed'];
export const REGIONS = ['mx', 'es', 'both'];
export const VOSOTROS = 4;

/** Thrown when the chosen scope has nothing to ask (e.g. an empty mistakes deck). */
export class NoQuestion extends Error {
  constructor(reason) {
    super(`no question available: ${reason}`);
    this.reason = reason;
  }
}

const lvl = (l) => LEVELS.indexOf(l);

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
 *   vocab    – { topics, items } from the vocabulary packs
 *   phrases  – idioms, conversation and grammar (see emptyPhrases in phrases.js)
 *   sentences – Tatoeba sentences (loaded only when needed)
 *   settings – { mode, scope, region }
 *   level    – the CEFR level to ask at (already resolved from "auto")
 *   recent   – subjects (infinitives, item ids) asked recently, avoided when possible
 *   deck     – the mistakes deck, for scope "review"
 */
export function makeQuestion({
  verbs,
  vocab = { items: [] },
  phrases = emptyPhrases(),
  sentences = [],
  settings,
  level,
  rng = Math.random,
  recent = [],
  deck = [],
}) {
  const region = settings.region;
  const scope = settings.scope;
  const mode = settings.mode === 'mixed' ? (rng() < 0.55 ? 'mc' : 'typed') : settings.mode;
  const avoid = new Set(recent);
  const regional = verbs.filter((v) => verbInRegion(v, region));
  const found = (q) => {
    if (!q) throw new NoQuestion(`${scope} in region ${region}`);
    return q;
  };
  if (scope === 'review') return reviewQuestion({ deck, verbs, vocab, phrases, sentences, region, mode, rng, avoid });
  if (scope === 'meanings') return meaningQuestion(regional, level, mode, rng, avoid);
  if (scope === 'vocab' || scope.startsWith('topic:')) {
    const topic = scope.startsWith('topic:') ? scope.slice(6) : null;
    if (!vocab.items.length) throw new NoQuestion('no vocabulary loaded');
    return vocabQuestion({ items: vocab.items, settings, level, mode, rng, avoid, topic });
  }
  if (scope === 'sentences') return found(sentenceQuestion({ sentences, verbs, region, level, mode, rng, avoid }));
  if (scope === 'idioms') return found(idiomQuestion({ idioms: phrases.idioms, region, level, rng, avoid }));
  if (scope === 'conversation' || scope.startsWith('situation:')) {
    const situation = scope.startsWith('situation:') ? scope.slice(10) : null;
    return found(conversationQuestion({ conversation: phrases.conversation, situation, region, level, rng, avoid }));
  }
  if (scope === 'grammar' || scope.startsWith('grammar:')) {
    const set = scope.startsWith('grammar:') ? scope.slice(8) : null;
    return found(grammarQuestion({ grammar: phrases.grammar, grammarSets: phrases.grammarSets, set, region, level, rng, avoid }));
  }
  if (scope.startsWith('cat:')) return categoryQuestion(scope.slice(4), { verbs, region, level, mode, rng, avoid });

  for (let attempt = 0; attempt < 50; attempt++) {
    const tenseId = chooseTense(scope, level, rng);
    const verb = chooseVerb(regional, level, TENSE_BY_ID[tenseId].level, rng, avoid);
    const persons = personsFor(verb, tenseId, region);
    if (persons.length === 0) continue; // e.g. commands of an impersonal verb
    return conjQuestionFor({ verb, tense: tenseId, person: pick(persons, rng), mode, region, rng });
  }
  throw new NoQuestion(`${scope} at ${level}`);
}

/** A conjugation question for one cell of a verb's table. */
export function conjQuestionFor({ verb, tense, person, mode, region, rng }) {
  const answer = tables(verb).table[tense][person ?? 0];
  const q = {
    kind: 'conj',
    mode,
    verb,
    tense,
    person,
    answer,
    accepted: accepted(answer),
    level: LEVELS[Math.max(lvl(verb.level), lvl(TENSE_BY_ID[tense].level))],
    region: questionRegion(verb, person),
    audience: region, // the learner's region setting
    key: `conj|${verb.inf}|${tense}|${person}`,
    spec: { kind: 'conj', inf: verb.inf, tense, person },
  };
  if (mode === 'mc') q.options = conjugationOptions(q, rng);
  return q;
}

// The thing a question is about, for avoiding repeats: the verb, or the item.
export const subjectOf = (q) => (q.verb ? q.verb.inf : q.item.id);

// ---------------------------------------------------------------------------
// Practicing one review category (e.g. irregular preterite stems)

const categoryCache = new Map();

/** Every table cell whose form exercises `category`, as { verb, tense, person }. */
export function cellsForCategory(category, verbs, region) {
  const key = `${category}|${region}|${verbs.length}`;
  if (categoryCache.has(key)) return categoryCache.get(key);
  const cells = [];
  for (const verb of verbs) {
    if (!verbInRegion(verb, region)) continue;
    const { table } = tables(verb);
    for (const t of TENSES) {
      for (const person of personsFor(verb, t.id, region)) {
        const f = table[t.id][person ?? 0];
        if (conjCategories(t.id, person, f).includes(category)) cells.push({ verb, tense: t.id, person });
      }
    }
  }
  categoryCache.set(key, cells);
  return cells;
}

function categoryQuestion(category, { verbs, region, level, mode, rng, avoid }) {
  // vosotros can only be practiced with Spain's forms
  let cells = cellsForCategory(category, verbs, region);
  if (!cells.length && region === 'mx') cells = cellsForCategory(category, verbs, 'both');
  if (!cells.length) throw new NoQuestion(`category ${category}`);
  const atLevel = cells.filter((c) => lvl(c.verb.level) <= lvl(level) && lvl(TENSE_BY_ID[c.tense].level) <= lvl(level));
  const pool = atLevel.length ? atLevel : cells;
  const fresh = pool.filter((c) => !avoid.has(c.verb.inf));
  const cell = pick(fresh.length ? fresh : pool, rng);
  return conjQuestionFor({ ...cell, mode, region, rng });
}

// ---------------------------------------------------------------------------
// The mistakes deck

/** Cards in the deck whose content is loaded (sentences load on demand). */
export function usableCards(deck, { verbs, vocab = { items: [] }, phrases = emptyPhrases(), sentences = [] }) {
  const ids = (list) => new Set(list.map((x) => x.id));
  const known = {
    conj: new Set(verbs.map((v) => v.inf)),
    vocab: ids(vocab.items),
    idiom: ids(phrases.idioms),
    conversation: ids(phrases.conversation),
    grammar: ids(phrases.grammar),
    sentence: ids(sentences),
  };
  known.meaning = known.conj;
  return deck.filter((d) => known[d.spec.kind]?.has(d.spec.inf ?? d.spec.id));
}

function reviewQuestion({ deck, verbs, vocab, phrases, sentences, region, mode, rng, avoid }) {
  const usable = usableCards(deck, { verbs, vocab, phrases, sentences });
  if (!usable.length) throw new NoQuestion('review-empty');
  const fresh = usable.filter((d) => !avoid.has(d.spec.inf ?? d.spec.id));
  const { spec } = pick(fresh.length ? fresh : usable, rng);
  const verb = (inf) => verbs.find((v) => v.inf === inf);
  const find = (list) => list.find((x) => x.id === spec.id);
  switch (spec.kind) {
    case 'conj':
      return conjQuestionFor({ verb: verb(spec.inf), tense: spec.tense, person: spec.person, mode, region, rng });
    case 'meaning':
      return meaningQuestionFor({ verb: verb(spec.inf), direction: spec.direction, mode, verbs, rng });
    case 'vocab':
      return vocabQuestionFor({ item: find(vocab.items), dir: spec.dir, region: spec.region, mode, items: vocab.items, rng });
    case 'idiom':
      return idiomQuestionFor({ item: find(phrases.idioms), dir: spec.dir, idioms: phrases.idioms, rng });
    case 'conversation':
      return conversationQuestionFor({ item: find(phrases.conversation), rng });
    case 'grammar':
      return grammarQuestionFor({ item: find(phrases.grammar), grammarSets: phrases.grammarSets, rng });
    case 'sentence': {
      const item = find(sentences);
      return sentenceQuestionFor({ item, verb: verb(item.inf), mode, region, rng });
    }
  }
  throw new NoQuestion(`unknown card ${spec.kind}`);
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

function conjugationOptions(q, rng, pool = distractorPool(q)) {
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
// Verbs in real sentences: a Tatoeba sentence with its verb blanked out
//
// The card shows the infinitive, the tense and the English translation, so
// the learner works out the person from the sentence. The blank never holds
// a reflexive pronoun (it is already in the sentence), so these questions
// use the engine's forms without pronouns.

const SIMPLE_TENSES = ['pres', 'pret', 'impf', 'fut', 'cond', 'subj_pres', 'subj_impf'];

const rawCache = new Map();
export function rawTables(entry) {
  let c = rawCache.get(entry.inf);
  if (!c) {
    c = { table: conjugate(entry, { raw: true }).table, regular: conjugate(entry, { raw: true, regular: true }).table };
    rawCache.set(entry.inf, c);
  }
  return c;
}

/** The verb form a sentence's blank replaces. */
export const blankText = (item) => item.es.slice(item.blank[0], item.blank[1]);

export const sentenceLevel = (item, verb) => LEVELS[Math.max(lvl(verb.level), lvl(TENSE_BY_ID[item.tense].level))];

function sentenceQuestion({ sentences, verbs, region, level, mode, rng, avoid }) {
  const byInf = new Map(verbs.map((v) => [v.inf, v]));
  const pool = sentences.filter((s) => {
    const verb = byInf.get(s.inf);
    return verb && verbInRegion(verb, region) && !(region === 'mx' && s.persons.includes(VOSOTROS));
  });
  if (!pool.length) return null;
  // Prefer sentences by speakers from the learner's region (or unknown).
  const other = { mx: 'es', es: 'mx' }[region];
  const item = pickAtLevel(pool, {
    level,
    levelOf: (s) => sentenceLevel(s, byInf.get(s.inf)),
    subject: (s) => s.inf,
    avoid,
    weight: (s) => (other && s.region === other ? 1 : 3),
    rng,
  });
  return sentenceQuestionFor({ item, verb: byInf.get(item.inf), mode, region, rng });
}

export function sentenceQuestionFor({ item, verb, mode, region, rng }) {
  const form = blankText(item);
  const person = item.persons[0];
  const cell = rawTables(verb).table[item.tense][person];
  const alts = accepted(cell).filter((f) => f !== form); // e.g. hablase for hablara
  const q = {
    kind: 'sentence',
    mode,
    item,
    verb,
    tense: item.tense,
    person,
    persons: item.persons,
    answer: { form, alts, tags: cell.tags },
    accepted: [form, ...alts],
    level: sentenceLevel(item, verb),
    region: item.persons.includes(VOSOTROS) ? 'es' : null,
    audience: region,
    key: `sentence|${item.id}`,
    spec: { kind: 'sentence', id: item.id },
  };
  if (mode === 'mc') q.options = conjugationOptions(q, rng, sentenceDistractors(q));
  return q;
}

// Wrong options that the sentence itself rules out. Other persons are risky:
// English "you" covers tú, usted, vosotros and ustedes, so only yo and
// nosotros forms are offered (when they differ from the answer).
export function sentenceDistractors(q) {
  const { table, regular } = rawTables(q.verb);
  const p = q.person;
  const pool = [];
  const reg = regular[q.tense][p];
  if (reg) pool.push({ form: reg.form, why: { kind: 'regular' } });
  for (const other of [0, 3]) {
    const f = table[q.tense][other];
    if (f && !q.persons.includes(other)) pool.push({ form: f.form, why: { kind: 'person', person: other } });
  }
  for (const t of [...RELATED[q.tense], ...SIMPLE_TENSES]) {
    const f = SIMPLE_TENSES.includes(t) && table[t][p];
    if (f) pool.push({ form: f.form, why: { kind: 'tense', tense: t, person: p } });
  }
  const correct = new Set(q.accepted);
  const seen = new Set();
  return pool.filter((d) => {
    if (correct.has(d.form) || seen.has(d.form)) return false;
    seen.add(d.form);
    return true;
  });
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

function meaningQuestion(verbs, level, mode, rng, avoid) {
  const pool = verbs.filter((v) => lvl(v.level) <= lvl(level));
  const fresh = pool.filter((v) => !avoid.has(v.inf));
  const verb = weightedPick(fresh.length ? fresh : pool, (v) => (v.level === level ? 3 : 1), rng);
  // English is too loose to grade when typed, so typed answers are always Spanish.
  const direction = mode === 'typed' || rng() < 0.5 ? 'en-es' : 'es-en';
  return meaningQuestionFor({ verb, direction, mode, verbs, rng });
}

/** What a verb means: es-en (pick the English) or en-es (pick or type the infinitive). */
export function meaningQuestionFor({ verb, direction, mode, verbs, rng }) {
  const text = (v) => (direction === 'es-en' ? v.en : v.inf);
  const q = {
    kind: 'meaning',
    mode: direction === 'es-en' ? 'mc' : mode,
    direction,
    verb,
    answer: { form: text(verb), alts: [], tags: [] },
    accepted: [text(verb)],
    level: verb.level,
    region: verb.regions?.length === 1 ? verb.regions[0] : null,
    key: `meaning|${verb.inf}|${direction}`,
    spec: { kind: 'meaning', inf: verb.inf, direction },
  };
  if (q.mode !== 'mc') return q;
  const near = verbs.filter(
    (v) => v.inf !== verb.inf && Math.abs(lvl(v.level) - lvl(verb.level)) <= 1 && !glossesOverlap(v.en, verb.en),
  );
  const chosen = [];
  for (const v of shuffle(near, rng)) {
    if (chosen.every((c) => !glossesOverlap(c.en, v.en))) chosen.push(v);
    if (chosen.length === 3) break;
  }
  q.options = shuffle(
    [{ text: text(verb), correct: true }, ...chosen.map((v) => ({ text: text(v), correct: false, why: { kind: 'meaning', verb: v } }))],
    rng,
  );
  return q;
}

// ---------------------------------------------------------------------------
// Grading typed answers

const SUBJECT = /^(yo|t[uú]|[eé]l|ella|usted|ud\.?|nosotros|nosotras|vosotros|vosotras|ellos|ellas|ustedes|uds\.?)\s+/;
const REFLEXIVE_START = new RegExp(`^(${[...new Set(REFLEXIVE_PRONOUNS)].join('|')})\\s+`);

export function normalizeAnswer(s) {
  return s
    .toLowerCase()
    .replace(/[¡!¿?.,;:"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Remove every diacritic, including the tilde of ñ and the dieresis of ü.
export const plain = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Find where else in the verb's table a written form appears (`raw`: in the
// forms without reflexive pronouns).
export function locateForm(entry, form, { raw = false } = {}) {
  const { table } = raw ? rawTables(entry) : tables(entry);
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
  if (q.kind === 'vocab') return gradeVocab(q, input, { strict, normalize: normalizeAnswer, plain });
  if (q.kind === 'meaning') {
    const s = normalizeAnswer(input);
    if (q.accepted.includes(s)) return { result: 'correct', typed: s };
    const match = !strict && q.accepted.find((a) => plain(a) === plain(s));
    return match ? { result: 'accent', expected: match, typed: s } : { result: 'wrong', typed: s };
  }
  const sentence = q.kind === 'sentence';
  let s = normalizeAnswer(input).replace(SUBJECT, '');
  // The sentence already has the reflexive pronoun; typing it again is fine.
  if (sentence) s = s.replace(REFLEXIVE_START, '');
  if (q.tense === 'imp_neg' && !s.startsWith('no ')) s = `no ${s}`;
  if (q.accepted.includes(s)) return { result: 'correct' };
  const elsewhere = s ? locateForm(q.verb, s, { raw: sentence }) : null;
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
