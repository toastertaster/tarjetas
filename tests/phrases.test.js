// Idioms, conversation, grammar and Tatoeba sentence questions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeQuestion, gradeTyped, seededRng, sentenceQuestionFor, sentenceDistractors, usableCards, VOSOTROS } from '../js/quiz.js';
import { idiomQuestionFor, emptyPhrases } from '../js/phrases.js';
import { sensesOverlap } from '../js/vocab.js';
import { categoriesFor, recordAnswer, emptyReview, scopeFor } from '../js/review.js';

const read = (p) => JSON.parse(readFileSync(new URL(`../data/${p}`, import.meta.url), 'utf8'));
const verbs = read('verbs.json');
const idioms = read('idioms.json');
const conversation = read('conversation.json');
const grammar = read('grammar.json');
const sentences = read('sentences.json').items;
const phrases = {
  ...emptyPhrases(),
  idioms: idioms.items,
  situations: conversation.situations,
  conversation: conversation.items,
  grammarSets: grammar.sets,
  grammar: grammar.items,
};
const ask = (scope, { region = 'both', level = 'C2', mode = 'mc', seed = 1, rng = seededRng(seed), deck = [] } = {}) =>
  makeQuestion({ verbs, phrases, sentences, settings: { mode, scope, region }, level, rng, deck });

function checkOptions(q, n = 4) {
  const texts = q.options.map((o) => o.text);
  assert.equal(q.options.length, n, `${q.key}: ${texts}`);
  assert.equal(new Set(texts).size, n, `${q.key}: duplicate options ${texts}`);
  assert.equal(q.options.filter((o) => o.correct).length, 1, q.key);
  assert.equal(q.options.find((o) => o.correct).text, q.answer.form);
}

test('every idiom asks four options in both directions, with no two meanings alike', () => {
  const rng = seededRng(2);
  for (const item of idioms.items) {
    for (const dir of ['es-en', 'en-es']) {
      const q = idiomQuestionFor({ item, dir, idioms: idioms.items, rng });
      checkOptions(q);
      const meanings = q.options.map((o) => (o.correct ? item.en : o.why.item.en));
      for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) assert.ok(!sensesOverlap(meanings[a], meanings[b]), `${meanings[a]} / ${meanings[b]}`);
    }
  }
});

test('conversation and grammar questions use their own options', () => {
  const rng = seededRng(3);
  for (let i = 0; i < 300; i++) {
    checkOptions(ask('conversation', { rng }));
    const g = ask('grammar', { rng });
    checkOptions(g, g.item.options.length);
  }
});

test('situation and grammar-set scopes stay inside their group', () => {
  for (const situation of Object.keys(conversation.situations)) {
    for (let seed = 0; seed < 10; seed++) assert.equal(ask(`situation:${situation}`, { seed }).situation, situation);
  }
  for (const set of Object.keys(grammar.sets)) {
    for (let seed = 0; seed < 10; seed++) assert.equal(ask(`grammar:${set}`, { seed }).set, set);
  }
});

test('phrase questions are always multiple choice, even in typed mode', () => {
  for (const scope of ['idioms', 'conversation', 'grammar']) assert.equal(ask(scope, { mode: 'typed' }).mode, 'mc');
});

test("region settings leave out the other region's phrases", () => {
  const rng = seededRng(4);
  for (const region of ['mx', 'es']) {
    for (let i = 0; i < 400; i++) {
      for (const scope of ['idioms', 'conversation']) {
        const q = ask(scope, { region, rng });
        assert.ok(!q.item.region || q.item.region === region, `${region}: ${q.key}`);
      }
    }
  }
});

test('a scope with few cards at the level adds the next levels up, so cards vary', () => {
  const LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const seen = (scope, level) => {
    const keys = new Set();
    const levels = new Set();
    for (let seed = 0; seed < 120; seed++) {
      const q = ask(scope, { level, region: 'mx', seed });
      keys.add(q.key);
      levels.add(q.level);
    }
    return { keys, top: Math.max(...[...levels].map((l) => LEVEL_ORDER.indexOf(l))) };
  };
  // the subjunctive starts at B1: at A2 the B1 cards join in, and no higher
  const subj = seen('grammar:subjunctive', 'A2');
  assert.ok(subj.keys.size >= 8, `${subj.keys.size} subjunctive cards at A2`);
  assert.equal(LEVEL_ORDER[subj.top], 'B1');
  // every situation has enough cards for a beginner
  for (const situation of Object.keys(conversation.situations)) {
    const s = seen(`situation:${situation}`, 'A1');
    assert.ok(s.keys.size >= 8, `${situation}: ${s.keys.size} cards at A1`);
  }
});

test('levels limit phrase questions', () => {
  const rng = seededRng(5);
  for (let i = 0; i < 200; i++) {
    for (const scope of ['idioms', 'conversation', 'grammar']) assert.ok(['A1', 'A2'].includes(ask(scope, { level: 'A2', rng }).level));
  }
});

// ---------------------------------------------------------------------------
// Sentences

const verbOf = (s) => verbs.find((v) => v.inf === s.inf);
const sentenceQ = (id, mode = 'mc', region = 'both') => {
  const item = sentences.find((s) => s.id === id);
  return sentenceQuestionFor({ item, verb: verbOf(item), mode, region, rng: seededRng(1) });
};

test('every sentence has four options, and wrong persons are only yo or nosotros', () => {
  const rng = seededRng(6);
  for (const item of sentences) {
    const q = sentenceQuestionFor({ item, verb: verbOf(item), mode: 'mc', region: 'both', rng });
    checkOptions(q);
    assert.equal(q.answer.form, item.es.slice(...item.blank));
    for (const o of q.options) {
      if (o.why?.kind === 'person') assert.ok([0, 3].includes(o.why.person), `${item.id}: ${o.text}`);
    }
  }
});

test('Mexico mode never asks vosotros sentences', () => {
  const rng = seededRng(7);
  for (let i = 0; i < 1000; i++) assert.ok(!ask('sentences', { region: 'mx', rng }).persons.includes(VOSOTROS));
});

test('typed sentence answers: accents, a repeated pronoun, other forms', () => {
  const s = sentences.find((x) => x.tense === 'pret' && /ó$/.test(x.es.slice(...x.blank)) && x.persons.length === 1);
  const q = sentenceQ(s.id, 'typed');
  const form = q.answer.form;
  assert.equal(gradeTyped(q, form).result, 'correct');
  assert.equal(gradeTyped(q, `se ${form}`).result, 'correct');
  // habló → hablo is the present: a different form, so it is wrong
  const g = gradeTyped(q, form.replace(/ó$/, 'o'));
  assert.equal(g.result, 'wrong');
  assert.equal(g.why.kind, 'accent-matters');
  const preocupes = sentences.find((x) => x.es.slice(...x.blank) === 'preocupes');
  if (preocupes) assert.equal(gradeTyped(sentenceQ(preocupes.id, 'typed'), 'preocupes').result, 'correct');
});

test('sentence distractors include the regularized form of irregular verbs', () => {
  const s = sentences.find((x) => x.inf === 'tener' && x.tense === 'pret');
  const pool = sentenceDistractors(sentenceQ(s.id));
  assert.ok(pool.some((d) => d.why.kind === 'regular' && /^ten/.test(d.form)), pool.map((d) => d.form).join());
});

// ---------------------------------------------------------------------------
// Review

test('new kinds of question count toward their review categories', () => {
  assert.deepEqual(categoriesFor(ask('idioms')), ['idioms']);
  const c = ask('conversation');
  assert.deepEqual(categoriesFor(c), [`situation:${c.situation}`]);
  const g = ask('grammar');
  assert.deepEqual(categoriesFor(g), [`grammar:${g.set}`]);
  const s = ask('sentences');
  assert.equal(categoriesFor(s)[0], `tense:${s.tense}`);
  for (const cat of ['idioms', 'situation:restaurant', 'grammar:por-para']) assert.equal(scopeFor(cat), cat);
});

test('missed phrase and sentence cards come back in the review scope', () => {
  let review = emptyReview();
  const missed = ['idioms', 'conversation', 'grammar', 'sentences'].map((scope) => ask(scope, { seed: 9 }));
  for (const q of missed) review = recordAnswer(review, q, false);
  const keys = new Set();
  for (let seed = 0; seed < 60; seed++) keys.add(ask('review', { seed, deck: review.deck }).key);
  assert.deepEqual([...keys].sort(), missed.map((q) => q.key).sort());
  // until the sentences are loaded, their cards are skipped
  assert.equal(usableCards(review.deck, { verbs, phrases }).length, 3);
});
