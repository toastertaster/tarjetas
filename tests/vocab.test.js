import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LEVELS } from '../js/conjugate.js';
import { makeQuestion, gradeTyped, seededRng } from '../js/quiz.js';
import { vocabQuestionFor, formsFor, isRegional, sensesOverlap, genderOf } from '../js/vocab.js';

const vocab = JSON.parse(readFileSync(new URL('../data/vocab.json', import.meta.url), 'utf8'));
const verbs = JSON.parse(readFileSync(new URL('../data/verbs.json', import.meta.url), 'utf8'));
const item = (id) => vocab.items.find((i) => i.id === id);
const ask = (settings, level = 'C2', seed = 1) =>
  makeQuestion({ verbs, vocab, settings: { mode: 'mc', scope: 'vocab', region: 'mx', ...settings }, level, rng: seededRng(seed) });

test('multiple choice: four distinct options, exactly one right, in every topic and region', () => {
  const rng = seededRng(21);
  for (const region of ['mx', 'es', 'both']) {
    for (const topic of Object.keys(vocab.topics)) {
      for (let i = 0; i < 40; i++) {
        const q = makeQuestion({ verbs, vocab, settings: { mode: 'mc', scope: `topic:${topic}`, region }, level: 'C2', rng });
        const texts = q.options.map((o) => o.text);
        assert.equal(new Set(texts).size, 4, `${q.item.id} ${q.dir}: ${texts}`);
        assert.equal(q.options.filter((o) => o.correct).length, 1);
        assert.equal(q.topic, topic);
        for (const o of q.options.filter((x) => !x.correct)) {
          // a wrong option must really be wrong
          assert.ok(!q.accepted.includes(o.text), `${q.item.id}: ${o.text}`);
          assert.ok(!sensesOverlap(o.why.item.en, q.item.en), `${q.item.id} vs ${o.why.item.id}`);
        }
      }
    }
  }
});

test('a Spanish word with two meanings never makes two options right', () => {
  // la llave is both "key" and (in Mexico) "faucet"
  for (let seed = 0; seed < 50; seed++) {
    const q = vocabQuestionFor({ item: item('key'), dir: 'es-en', region: 'mx', mode: 'mc', items: vocab.items, rng: seededRng(seed) });
    assert.ok(!q.options.some((o) => o.text.includes('faucet')), q.options.map((o) => o.text).join(', '));
  }
});

test('the region decides which word is asked for', () => {
  const car = item('car');
  assert.equal(vocabQuestionFor({ item: car, dir: 'en-es', region: 'mx', mode: 'typed', items: vocab.items, rng: seededRng(1) }).answer.form, 'el carro');
  assert.equal(vocabQuestionFor({ item: car, dir: 'en-es', region: 'es', mode: 'typed', items: vocab.items, rng: seededRng(1) }).answer.form, 'el coche');
  const regional = vocabQuestionFor({ item: car, dir: 'regional', region: 'es', mode: 'mc', items: vocab.items, rng: seededRng(1) });
  assert.equal(regional.prompt, 'el carro');
  assert.equal(regional.answer.form, 'el coche');
  assert.ok(regional.options.every((o) => o.correct || isRegional(o.why.item)));
});

test('Mexico and Spain modes only ask their own words; Both mixes and adds regional questions', () => {
  for (const region of ['mx', 'es']) {
    for (let seed = 0; seed < 400; seed++) {
      const q = ask({ region }, 'C2', seed);
      assert.notEqual(q.dir, 'regional');
      if (isRegional(q.item) && q.dir === 'en-es') assert.equal(q.answer.form, formsFor(q.item, region).form);
    }
  }
  const dirs = new Set();
  for (let seed = 0; seed < 400; seed++) dirs.add(ask({ region: 'both' }, 'C2', seed).dir);
  assert.deepEqual([...dirs].sort(), ['en-es', 'es-en', 'regional']);
});

test('typed mode asks for Spanish, and levels limit the words', () => {
  for (let seed = 0; seed < 200; seed++) {
    const q = ask({ mode: 'typed' }, 'A1', seed);
    assert.equal(q.dir, 'en-es');
    assert.equal(q.mode, 'typed');
    assert.equal(q.item.level, 'A1');
  }
});

const typedQ = (id, region = 'mx', dir = 'en-es') =>
  vocabQuestionFor({ item: item(id), dir, region, mode: 'typed', items: vocab.items, rng: seededRng(1) });

test('typed answers: articles optional, gender checked, accents lenient', () => {
  const car = typedQ('car');
  assert.equal(gradeTyped(car, 'el carro').result, 'correct');
  assert.equal(gradeTyped(car, 'El Carro').result, 'correct');
  const noArticle = gradeTyped(car, 'carro');
  assert.equal(noArticle.result, 'correct');
  assert.equal(noArticle.expected, 'el carro'); // reminder to learn the article
  assert.equal(gradeTyped(car, 'un carro').result, 'correct');
  assert.equal(gradeTyped(car, 'el auto').result, 'correct');
  const gender = gradeTyped(car, 'la carro');
  assert.equal(gender.result, 'wrong');
  assert.equal(gender.why.kind, 'gender');

  assert.equal(gradeTyped(typedQ('water'), 'el agua').result, 'correct');
  assert.equal(gradeTyped(typedQ('water'), 'la agua').result, 'correct'); // feminine, even though it takes el
  assert.equal(gradeTyped(typedQ('cell-phone', 'es'), 'el movil').result, 'accent');
  assert.equal(gradeTyped(typedQ('cell-phone', 'es'), 'el movil', { strict: true }).result, 'wrong');
  assert.equal(gradeTyped(typedQ('ok-agreement', 'es'), 'vale').result, 'correct');
  assert.equal(gradeTyped(typedQ('beans', 'es'), 'las alubias').result, 'correct');
});

test("typing the other region's word is explained", () => {
  const g = gradeTyped(typedQ('car', 'mx'), 'el coche');
  assert.equal(g.result, 'wrong');
  assert.equal(g.why.kind, 'other-region');
  assert.equal(g.why.region, 'es');
  assert.equal(gradeTyped(typedQ('car', 'es', 'regional'), 'carro').why.kind, 'other-region');
});

test('gender comes from the article unless the data overrides it', () => {
  assert.equal(genderOf(item('car'), 'el carro'), 'm');
  assert.equal(genderOf(item('hand'), 'la mano'), 'f');
  assert.equal(genderOf(item('water'), 'el agua'), 'f');
  assert.equal(genderOf(item('big'), 'grande'), null);
});

test('every level has vocabulary to ask', () => {
  for (const level of LEVELS) assert.ok(ask({}, level).item);
});
