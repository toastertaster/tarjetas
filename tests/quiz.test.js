import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LEVELS, TENSES } from '../js/conjugate.js';
import { makeQuestion, gradeTyped, scoreFor, seededRng, glossesOverlap, distractorPool, tables, VOSOTROS } from '../js/quiz.js';

const verbs = JSON.parse(readFileSync(new URL('../data/verbs.json', import.meta.url), 'utf8'));
const entry = (inf) => verbs.find((v) => v.inf === inf);
const conjQ = (inf, tense, person) => {
  const verb = entry(inf);
  const answer = tables(verb).table[tense][person ?? 0];
  return { kind: 'conj', verb, tense, person, answer, accepted: [answer.form, ...answer.alts] };
};

test('multiple choice: four distinct options, exactly one correct', () => {
  const rng = seededRng(42);
  for (const region of ['mx', 'es', 'both']) {
    for (const level of LEVELS) {
      for (let i = 0; i < 150; i++) {
        const q = makeQuestion({ verbs, settings: { mode: 'mc', scope: 'verbs', region }, level, rng });
        const texts = q.options.map((o) => o.text);
        assert.equal(q.options.length, 4, `${q.verb.inf} ${q.tense}: ${texts}`);
        assert.equal(new Set(texts).size, 4, `${q.verb.inf} ${q.tense}: duplicate options ${texts}`);
        assert.equal(q.options.filter((o) => o.correct).length, 1);
        for (const o of q.options) {
          if (!o.correct) assert.ok(!q.accepted.includes(o.text), `${q.verb.inf} ${q.tense}: ${o.text} is also right`);
        }
      }
    }
  }
});

test('every tense scope produces questions at every level', () => {
  const rng = seededRng(7);
  for (const t of TENSES) {
    for (const level of ['A1', 'C2']) {
      for (let i = 0; i < 20; i++) {
        const q = makeQuestion({ verbs, settings: { mode: 'mc', scope: `tense:${t.id}`, region: 'mx' }, level, rng });
        assert.equal(q.tense, t.id);
        assert.equal(q.options.length, 4, `${q.verb.inf} ${t.id}`);
      }
    }
  }
});

test('levels limit verbs and tenses', () => {
  const rng = seededRng(1);
  for (let i = 0; i < 300; i++) {
    const q = makeQuestion({ verbs, settings: { mode: 'mc', scope: 'verbs', region: 'both' }, level: 'A2', rng });
    assert.ok(['A1', 'A2'].includes(q.verb.level));
    assert.ok(['A1', 'A2'].includes(q.level));
  }
});

test('Mexico mode never asks vosotros or Spain-only verbs', () => {
  const rng = seededRng(3);
  for (let i = 0; i < 1500; i++) {
    const q = makeQuestion({ verbs, settings: { mode: 'mixed', scope: 'verbs', region: 'mx' }, level: 'C2', rng });
    assert.notEqual(q.person, VOSOTROS);
    assert.ok(!q.verb.regions || q.verb.regions.includes('mx'), q.verb.inf);
  }
});

test('Mexico mode never offers vosotros forms as wrong options', () => {
  const rng = seededRng(8);
  for (let i = 0; i < 1500; i++) {
    const q = makeQuestion({ verbs, settings: { mode: 'mc', scope: 'verbs', region: 'mx' }, level: 'C2', rng });
    for (const o of q.options) assert.notEqual(o.why?.person, VOSOTROS, `${q.verb.inf} ${q.tense}: ${o.text}`);
  }
});

test('negative command options all start with "no"', () => {
  const rng = seededRng(12);
  for (let i = 0; i < 300; i++) {
    const q = makeQuestion({ verbs, settings: { mode: 'mc', scope: 'tense:imp_neg', region: 'both' }, level: 'C2', rng });
    for (const o of q.options) assert.match(o.text, /^no /, `${q.verb.inf}: ${o.text}`);
  }
  const pool = distractorPool({ ...conjQ('levantarse', 'imp_neg', 1), audience: 'mx' });
  assert.ok(pool.some((d) => d.form === 'no levántate' && d.why.kind === 'negated'));
  assert.ok(pool.some((d) => d.form === 'no te levantas' && d.why.kind === 'negated'));
});

test('Spain mode asks vosotros and never Mexico-only verbs', () => {
  const rng = seededRng(4);
  let vosotros = 0;
  for (let i = 0; i < 1500; i++) {
    const q = makeQuestion({ verbs, settings: { mode: 'mc', scope: 'tense:pres', region: 'es' }, level: 'C2', rng });
    if (q.person === VOSOTROS) vosotros++;
    assert.ok(!q.verb.regions || q.verb.regions.includes('es'), q.verb.inf);
  }
  assert.ok(vosotros > 0);
});

test('regularized form is offered as a trap for irregular verbs', () => {
  const pool = distractorPool(conjQ('tener', 'pret', 0));
  assert.ok(pool.some((d) => d.form === 'tení' && d.why.kind === 'regular'));
  assert.ok(pool.some((d) => d.form === 'tuvo' && d.why.kind === 'person'));
  assert.ok(pool.some((d) => d.form === 'tenía' && d.why.kind === 'tense'));
});

test('meaning questions never offer two options with the same sense', () => {
  const rng = seededRng(9);
  for (let i = 0; i < 500; i++) {
    const q = makeQuestion({ verbs, settings: { mode: 'mc', scope: 'meanings', region: 'both' }, level: 'C2', rng });
    assert.equal(q.options.length, 4);
    const glosses = q.options.map((o) => (q.direction === 'es-en' ? o.text : verbs.find((v) => v.inf === o.text).en));
    for (let a = 0; a < 4; a++) {
      for (let b = a + 1; b < 4; b++) assert.ok(!glossesOverlap(glosses[a], glosses[b]), `${glosses[a]} / ${glosses[b]}`);
    }
  }
});

test('glossesOverlap compares individual senses', () => {
  assert.ok(glossesOverlap('to begin; to start', 'to start; to launch'));
  assert.ok(!glossesOverlap('to be able to; can', 'to put; to place'));
  assert.ok(glossesOverlap('to be (identity, traits)', 'to be (location, state)'));
});

test('typed answers: exact, accents, pronouns and "no"', () => {
  const q = conjQ('estar', 'pres', 2);
  assert.equal(gradeTyped(q, 'está').result, 'correct');
  assert.equal(gradeTyped(q, '  Él ESTÁ ').result, 'correct');
  assert.equal(gradeTyped(q, 'esta').result, 'accent');
  assert.equal(gradeTyped(q, 'esta', { strict: true }).result, 'wrong');
  assert.equal(gradeTyped(q, 'estoy').result, 'wrong');
  assert.equal(gradeTyped(q, 'estoy').why.kind, 'typed-form');

  const neg = conjQ('tener', 'imp_neg', 1);
  assert.equal(gradeTyped(neg, 'no tengas').result, 'correct');
  assert.equal(gradeTyped(neg, 'tengas').result, 'correct');

  const refl = conjQ('levantarse', 'pres', 0);
  assert.equal(gradeTyped(refl, 'yo me levanto').result, 'correct');
  assert.equal(gradeTyped(refl, 'levanto').result, 'wrong');

  const sub = conjQ('hablar', 'subj_impf', 0);
  assert.equal(gradeTyped(sub, 'hablase').result, 'correct');

  const nino = conjQ('soñar', 'pres', 0);
  assert.equal(gradeTyped(nino, 'sueno').result, 'accent');
});

test('a missing accent that makes another real form is wrong', () => {
  const q = conjQ('hablar', 'pret', 2); // habló
  const g = gradeTyped(q, 'hablo'); // present, yo
  assert.equal(g.result, 'wrong');
  assert.equal(g.why.kind, 'accent-matters');
  assert.equal(g.why.tense, 'pres');
  assert.equal(g.why.person, 0);
});

test('hints halve the score', () => {
  assert.equal(scoreFor('correct', false), 1);
  assert.equal(scoreFor('accent', true), 0.5);
  assert.equal(scoreFor('wrong', false), 0);
});
