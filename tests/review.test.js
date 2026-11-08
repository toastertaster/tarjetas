import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeQuestion, conjQuestionFor, cellsForCategory, seededRng } from '../js/quiz.js';
import { vocabQuestionFor } from '../js/vocab.js';
import {
  categoriesFor,
  recordAnswer,
  needsReview,
  emptyReview,
  scopeFor,
  DECK_CLEAR_STREAK,
  NEEDS_REVIEW_MISSES,
} from '../js/review.js';
import { categoryKeys } from '../js/i18n.js';

const verbs = JSON.parse(readFileSync(new URL('../data/verbs.json', import.meta.url), 'utf8'));
const vocab = JSON.parse(readFileSync(new URL('../data/vocab.json', import.meta.url), 'utf8'));
const verb = (inf) => verbs.find((v) => v.inf === inf);
const conj = (inf, tense, person, region = 'mx') =>
  conjQuestionFor({ verb: verb(inf), tense, person, mode: 'mc', region, rng: seededRng(1) });

test('questions map to their tense and the patterns they exercise', () => {
  assert.deepEqual(categoriesFor(conj('tener', 'pret', 0)).sort(), ['pret-strong', 'tense:pret']);
  assert.ok(categoriesFor(conj('pensar', 'pres', 0)).includes('stem:e-ie'));
  assert.ok(categoriesFor(conj('conocer', 'pres', 0)).includes('zc'));
  assert.ok(categoriesFor(conj('buscar', 'pret', 0)).includes('orth'));
  assert.ok(categoriesFor(conj('levantarse', 'imp_aff', 1)).includes('reflexive-commands'));
  assert.ok(categoriesFor(conj('hablar', 'pres', 4, 'es')).includes('vosotros'));
  assert.deepEqual(categoriesFor(conj('hablar', 'pres', 0)), ['tense:pres']);
  const regional = vocabQuestionFor({ item: vocab.items.find((i) => i.id === 'car'), dir: 'regional', region: 'es', mode: 'mc', items: vocab.items, rng: seededRng(1) });
  assert.deepEqual(categoriesFor(regional), ['topic:transport', 'regional']);
});

test('a category is flagged after repeated recent misses, with examples', () => {
  let review = emptyReview();
  review = recordAnswer(review, conj('tener', 'pret', 0), false);
  assert.equal(needsReview(review).length, 0);
  review = recordAnswer(review, conj('hacer', 'pret', 2), false);
  review = recordAnswer(review, conj('poner', 'pret', 1), true);
  const flagged = needsReview(review);
  assert.equal(NEEDS_REVIEW_MISSES, 2);
  // pret-strong (more specific) is listed before tense:pret
  assert.deepEqual(flagged.map((c) => c.key), ['pret-strong', 'tense:pret']);
  assert.equal(flagged[0].misses, 2);
  assert.equal(flagged[0].attempts, 3);
  assert.deepEqual(flagged[0].examples.map((e) => e.answer), ['hizo', 'tuve']);
});

test('getting a category right again clears the flag', () => {
  let review = emptyReview();
  review = recordAnswer(review, conj('tener', 'pret', 0), false);
  review = recordAnswer(review, conj('hacer', 'pret', 2), false);
  for (let i = 0; i < 8; i++) review = recordAnswer(review, conj('estar', 'pret', i % 6), true);
  assert.ok(!needsReview(review).some((c) => c.key === 'pret-strong'));
});

test('missed cards go into the deck and leave after right answers in a row', () => {
  const q = conj('tener', 'pret', 0);
  let review = recordAnswer(emptyReview(), q, false);
  assert.equal(review.deck.length, 1);
  assert.deepEqual(review.deck[0].spec, { kind: 'conj', inf: 'tener', tense: 'pret', person: 0 });
  review = recordAnswer(review, q, true);
  assert.equal(review.deck.length, DECK_CLEAR_STREAK > 1 ? 1 : 0);
  review = recordAnswer(review, q, false); // a miss resets the streak
  for (let i = 0; i < DECK_CLEAR_STREAK; i++) review = recordAnswer(review, q, true);
  assert.equal(review.deck.length, 0);
});

test('the review scope asks the cards in the deck', () => {
  let review = emptyReview();
  review = recordAnswer(review, conj('tener', 'pret', 0), false);
  const car = vocabQuestionFor({ item: vocab.items.find((i) => i.id === 'car'), dir: 'en-es', region: 'mx', mode: 'mc', items: vocab.items, rng: seededRng(1) });
  review = recordAnswer(review, car, false);
  const keys = new Set();
  for (let seed = 0; seed < 40; seed++) {
    const q = makeQuestion({ verbs, vocab, settings: { mode: 'typed', scope: 'review', region: 'mx' }, level: 'A1', rng: seededRng(seed), deck: review.deck });
    keys.add(q.key);
  }
  assert.deepEqual([...keys].sort(), ['conj|tener|pret|0', 'vocab|car|en-es|mx']);
  assert.throws(() => makeQuestion({ verbs, vocab, settings: { mode: 'mc', scope: 'review', region: 'mx' }, level: 'A1', deck: [] }), /review-empty/);
});

test('every pattern category can be practiced, and practice questions belong to it', () => {
  for (const category of categoryKeys('en')) {
    const scope = scopeFor(category);
    if (!scope.startsWith('cat:')) continue;
    assert.ok(cellsForCategory(category, verbs, 'both').length > 0, `${category} has no cells`);
    const rng = seededRng(3);
    for (let i = 0; i < 10; i++) {
      const q = makeQuestion({ verbs, vocab, settings: { mode: 'mc', scope, region: 'mx' }, level: 'B1', rng });
      assert.ok(categoriesFor(q).includes(category), `${category}: ${q.key}`);
    }
  }
});

test('tense, topic and meaning categories practice through the normal scopes', () => {
  assert.equal(scopeFor('tense:pret'), 'tense:pret');
  assert.equal(scopeFor('topic:food'), 'topic:food');
  assert.equal(scopeFor('meanings'), 'meanings');
  assert.equal(scopeFor('regional'), 'vocab');
  assert.equal(scopeFor('stem:e-ie'), 'cat:stem:e-ie');
});
