// Recognizing conjugated verbs, listening, and sentences for vocabulary.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TENSES } from '../js/conjugate.js';
import { makeQuestion, recognizeQuestionFor, listenQuestionFor, seededRng, tables, personsFor, verbInRegion, usableCards, VOSOTROS } from '../js/quiz.js';
import { categoriesFor, recordAnswer, emptyReview } from '../js/review.js';
import { explanationNotes, hintNotes, noteContext, optionMeaning, wordExampleFor } from '../js/explain.js';
import { renderNote, readingHtml, esc, LANGS } from '../js/i18n.js';
import { formsFor, splitArticle } from '../js/vocab.js';

const read = (p) => JSON.parse(readFileSync(new URL(`../data/${p}`, import.meta.url), 'utf8'));
const verbs = read('verbs.json');
const vocab = read('vocab.json');
const sentences = read('sentences.json').items;
const verb = (inf) => verbs.find((v) => v.inf === inf);
const ask = (scope, { region = 'both', level = 'C2', seed = 1, rng = seededRng(seed), deck = [] } = {}) =>
  makeQuestion({ verbs, vocab, sentences, settings: { mode: 'mc', scope, region }, level, rng, deck });
const recognize = (inf, tense, person, region = 'both') =>
  recognizeQuestionFor({ verb: verb(inf), tense, person, verbs: verbs.filter((v) => verbInRegion(v, region)), region, rng: seededRng(1) });

function rendered(q, notes, mode) {
  return LANGS.map((lang) => {
    const html = notes.map((n) => renderNote(lang, n, mode, noteContext(q))).filter((h) => h !== null);
    for (const h of html) assert.ok(h && !h.includes('undefined') && !h.includes('[object'), `${lang} ${q.key}: ${h}`);
    return html.join(' ');
  });
}

// ---------------------------------------------------------------------------
// Recognize

// Every verb and tense a form can be, in a region.
function everyReading(form, region) {
  const found = new Set();
  for (const v of verbs.filter((x) => verbInRegion(x, region))) {
    const { table } = tables(v);
    for (const t of TENSES) {
      for (const p of personsFor(v, t.id, region)) {
        const cell = table[t.id][p ?? 0];
        if ([cell.form, ...cell.alts].includes(form)) found.add(`${v.inf}|${t.id}`);
      }
    }
  }
  return found;
}

test('recognize asks only forms with one reading, with four different readings to choose from', () => {
  const rng = seededRng(31);
  for (const region of ['mx', 'es', 'both']) {
    for (const level of ['A1', 'B1', 'C2']) {
      for (let i = 0; i < 40; i++) {
        const q = ask('recognize', { region, level, rng });
        assert.deepEqual([...everyReading(q.form, region)], [`${q.verb.inf}|${q.tense}`], q.form);
        assert.equal(q.options.length, 4, `${q.form}: ${q.options.map((o) => o.reading.form)}`);
        assert.equal(q.options.filter((o) => o.correct).length, 1);
        assert.equal(new Set(q.options.map((o) => o.reading.form)).size, 4, `${q.form}: two options are the same form`);
        for (const o of q.options) {
          const { inf, tense, persons, form } = o.reading;
          // each option is written as the form it names, and only the right one is the form asked
          for (const p of persons) assert.equal(tables(verb(inf)).table[tense][p ?? 0].form, form, `${inf} ${tense} ${p}`);
          assert.equal(form === q.form, o.correct, `${q.form}: ${inf} ${tense}`);
          if (region === 'mx') assert.ok(!persons.includes(VOSOTROS), `${q.form}: vosotros in Mexico`);
        }
      }
    }
  }
});

test('recognize skips forms with two readings and names every person a form can be', () => {
  assert.equal(recognize('ser', 'pret', 2), null); // fue: ser or ir
  assert.equal(recognize('hablar', 'pres', 3), null); // hablamos: present or preterite
  assert.equal(recognize('hablar', 'subj_pres', 2), null); // hable: subjunctive or command
  assert.deepEqual(recognize('hablar', 'impf', 0).persons, [0, 2]); // hablaba: yo or él
  const tuvimos = recognize('tener', 'pret', 3);
  assert.deepEqual(tuvimos.reading, { inf: 'tener', tense: 'pret', persons: [3], form: 'tuvimos' });
  // a wrong reading is explained by the form it would be
  const wrong = tuvimos.options.find((o) => !o.correct);
  assert.deepEqual(optionMeaning(tuvimos, wrong), { text: wrong.reading.form, lang: 'es' });
  assert.deepEqual(optionMeaning(tuvimos, tuvimos.options.find((o) => o.correct)), { text: 'we had', lang: 'en' });
});

test('recognize explanations and hints render in both languages', () => {
  const rng = seededRng(32);
  for (let i = 0; i < 200; i++) {
    const q = ask('recognize', { region: i % 2 ? 'es' : 'mx', rng });
    const picked = q.options.find((o) => !o.correct);
    const [en] = rendered(q, explanationNotes(q, { picked }), 'explain');
    assert.ok(en.includes(`<b lang="es">${q.form}</b>`) && en.includes(`<b lang="es">${picked.reading.form}</b>`), en);
    // the hint names the verb, not the person or tense
    const [hint] = rendered(q, hintNotes(q), 'hint');
    assert.ok(hint.includes(q.verb.inf) && !hint.includes(readingHtml('en', q.reading)), hint);
  }
});

// ---------------------------------------------------------------------------
// Listening

test('listening offers four different meanings, one of them right', () => {
  const rng = seededRng(33);
  for (const region of ['mx', 'es', 'both']) {
    for (let i = 0; i < 100; i++) {
      const q = ask('listening', { region, rng });
      const texts = q.options.map((o) => o.text.toLowerCase());
      assert.equal(q.options.length, 4, q.key);
      assert.equal(new Set(texts).size, 4, `${q.key}: ${texts}`);
      assert.equal(q.options.find((o) => o.correct).text, q.item.en);
      if (region !== 'both') assert.ok(!q.item.region || q.item.region === region, `${region}: ${q.key}`);
      if (region === 'mx') assert.ok(!q.item.persons.includes(VOSOTROS), q.key);
    }
  }
});

test('a listening distractor uses the same verb when another sentence has it', () => {
  const item = sentences.find((s) => s.inf === 'tener' && s.es.split(' ').length <= 6);
  const q = listenQuestionFor({ item, sentences, verbs, rng: seededRng(2) });
  assert.ok(q.options.some((o) => !o.correct && o.why.item.inf === 'tener'));
  const [en] = rendered(q, explanationNotes(q, { picked: q.options.find((o) => !o.correct) }), 'explain');
  assert.ok(en.includes('tatoeba.org'), 'the sentence needs its credit');
  // the hint is what was said, in writing
  assert.ok(rendered(q, hintNotes(q), 'hint').every((hint) => hint.includes(esc(item.es))));
});

test('missed recognize and listening cards come back in the review scope', () => {
  const missed = [ask('recognize', { seed: 4 }), ask('listening', { seed: 4 })];
  assert.deepEqual(missed.map((q) => categoriesFor(q)), [['recognize'], ['listening']]);
  let review = emptyReview();
  for (const q of missed) review = recordAnswer(review, q, false);
  const keys = new Set();
  for (let seed = 0; seed < 40; seed++) keys.add(ask('review', { seed, deck: review.deck }).key);
  assert.deepEqual([...keys].sort(), missed.map((q) => q.key).sort());
  // until the sentences are loaded, listening cards are skipped
  assert.equal(usableCards(review.deck, { verbs }).length, 1);
});

// ---------------------------------------------------------------------------
// Vocabulary in a sentence

test('vocabulary hints find the word itself in a sentence, and fit the region', () => {
  let found = 0;
  for (const item of vocab.items) {
    for (const region of ['mx', 'es']) {
      const form = formsFor(item, region).form;
      const s = wordExampleFor(item, form, sentences, region);
      if (!s) continue;
      found += 1;
      const word = s.es.slice(...s.blank).toLowerCase();
      const core = splitArticle(form).core.toLowerCase();
      assert.ok([core, `${core}s`, `${core}es`].includes(word), `${item.id}: ${word} in ${s.es}`);
      assert.ok(!s.region || s.region === region, `${item.id}: a sentence from the other region`);
      if (region === 'mx') assert.ok(!s.persons.includes(VOSOTROS), `${item.id}: vosotros`);
    }
  }
  assert.ok(found > vocab.items.length * 0.5, `${found} sentences for ${vocab.items.length} words`);
});
