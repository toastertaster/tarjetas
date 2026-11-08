// English meanings of verb forms, shown on the answer options after a miss.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TENSES, conjugate } from '../js/conjugate.js';
import { englishForm, englishVerb } from '../js/english.js';
import { makeQuestion, seededRng } from '../js/quiz.js';
import { optionMeaning } from '../js/explain.js';
import { emptyPhrases } from '../js/phrases.js';

const read = (f) => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), 'utf8'));
const verbs = read('verbs.json');
const verb = (inf) => verbs.find((v) => v.inf === inf);

test('English forms of common verbs', () => {
  const cases = [
    ['tener', 'pret', 0, 'I had'],
    ['tener', 'impf', 0, 'I used to have'],
    ['tener', 'pres', 2, 'he/she has'],
    ['ser', 'pres', 0, 'I am'],
    ['ser', 'pret', 5, 'they were'],
    ['ser', 'subj_impf', 2, '(if) he/she were'],
    ['ir', 'fut', 3, 'we will go'],
    ['hacer', 'pres_perf', 1, 'you have done'],
    ['hablar', 'cond_perf', 4, 'you all would have spoken'],
    ['levantarse', 'pres', 0, 'I get up'],
    ['levantarse', 'imp_aff', 1, 'get up! (tú)'],
    ['comer', 'imp_neg', 3, "let's not eat!"],
    ['peinarse', 'pret', 2, 'he/she combed his/her hair'],
    ['cuidarse', 'fut', 3, 'we will take care of ourselves'],
    ['llover', 'pres', 2, 'it rains'],
    ['decir', 'gerund', null, 'saying'],
    ['escribir', 'participle', null, 'written'],
    ['estudiar', 'pres', 2, 'he/she studies'],
    ['mentir', 'pret', 0, 'I lied'],
    ['tumbarse', 'pret', 0, 'I lay down'],
  ];
  for (const [inf, tense, person, expected] of cases) assert.equal(englishForm(verb(inf), tense, person), expected, `${inf} ${tense} ${person}`);
});

test('English spelling rules', () => {
  const parts = (gloss) => {
    const v = englishVerb(gloss);
    return [v.s, v.past, v.ing].join(' ');
  };
  assert.equal(parts('to stop'), 'stops stopped stopping');
  assert.equal(parts('to visit'), 'visits visited visiting');
  assert.equal(parts('to prefer'), 'prefers preferred preferring');
  assert.equal(parts('to try'), 'tries tried trying');
  assert.equal(parts('to play'), 'plays played playing');
  assert.equal(parts('to die'), 'dies died dying');
  assert.equal(parts('to watch'), 'watches watched watching');
  assert.equal(parts('to travel'), 'travels traveled traveling');
});

test('every verb has an English form in every tense', () => {
  for (const v of verbs) {
    const { table } = conjugate(v);
    for (const t of TENSES) {
      for (const person of t.mood === 'nonfinite' ? [null] : [0, 1, 2, 3, 4, 5]) {
        if (!table[t.id][person ?? 0]) continue; // e.g. no yo command
        const text = englishForm(v, t.id, person);
        assert.ok(text && !/undefined|null|  /.test(text), `${v.inf} ${t.id} ${person}: ${text}`);
      }
    }
  }
});

test('after a miss, every option of every kind of question has a meaning', () => {
  const vocab = read('vocab.json');
  const idioms = read('idioms.json');
  const conversation = read('conversation.json');
  const grammar = read('grammar.json');
  const phrases = { ...emptyPhrases(), idioms: idioms.items, situations: conversation.situations, conversation: conversation.items, grammarSets: grammar.sets, grammar: grammar.items };
  const sentences = read('sentences.json').items;
  const rng = seededRng(17);
  for (const scope of ['verbs', 'meanings', 'vocab', 'idioms', 'conversation', 'sentences', 'tense:imp_neg', 'tense:gerund']) {
    for (let i = 0; i < 150; i++) {
      const q = makeQuestion({ verbs, vocab, phrases, sentences, settings: { mode: 'mc', scope, region: 'both' }, level: 'C2', rng });
      const texts = new Set();
      for (const o of q.options) {
        const m = optionMeaning(q, o);
        assert.ok(m && (m.invented || (m.text && ['en', 'es'].includes(m.lang))), `${q.key}: ${o.text}`);
        if (m.invented) assert.ok(!o.correct, `${q.key}: the answer is a real form`);
        else texts.add(m.text);
      }
      // different options don't get the same meaning (they couldn't be told apart)
      const real = q.options.filter((o) => !optionMeaning(q, o).invented).length;
      if (q.kind !== 'conj' && q.kind !== 'sentence') assert.equal(texts.size, real, `${q.key}: ${[...texts]}`);
    }
  }
  // grammar choices (es / está) have nothing to add
  const g = makeQuestion({ verbs, phrases, settings: { mode: 'mc', scope: 'grammar', region: 'both' }, level: 'C2', rng });
  assert.equal(optionMeaning(g, g.options[0]), null);
});
