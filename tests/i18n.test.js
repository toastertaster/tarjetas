// Every explanation the app can show renders in both languages.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TENSES, conjugate, accepted } from '../js/conjugate.js';
import { makeQuestion, seededRng, distractorPool } from '../js/quiz.js';
import { explanationNotes, hintNotes, noteContext } from '../js/explain.js';
import { LANGS, uiKeys, noteKeys, renderNote, tenseName, tenseLabel, tenseShort, tenseInfoHtml } from '../js/i18n.js';

const verbs = JSON.parse(readFileSync(new URL('../data/verbs.json', import.meta.url), 'utf8'));

test('both languages define the same page text and notes', () => {
  assert.deepEqual(uiKeys('es').sort(), uiKeys('en').sort());
  assert.deepEqual(noteKeys('es').sort(), noteKeys('en').sort());
  for (const lang of LANGS) for (const tense of TENSES) assert.ok(tenseName(lang, tense.id), `${lang} ${tense.id}`);
});

test('every tense has a plain-language description and example in both languages', () => {
  for (const lang of LANGS) {
    for (const tense of TENSES) {
      assert.match(tenseLabel(lang, tense.id), /^.+ \(.+\)$/, `${lang} ${tense.id}`);
      const html = tenseInfoHtml(lang, tense.id);
      assert.ok(!html.includes('undefined'), `${lang} ${tense.id}: ${html}`);
      assert.match(html, /<em>.+<\/em>/, `${lang} ${tense.id}: example needs a highlighted verb`);
    }
  }
});

test('tense descriptions never contain a form that could be the answer', () => {
  const words = (s) => s.toLowerCase().replace(/<[^>]+>/g, ' ').split(/[^a-záéíóúüñ]+/).filter(Boolean);
  const notGiveaways = new Set(['me', 'te', 'se', 'nos', 'os', 'no']);
  const tables = verbs.map((v) => conjugate(v).table);
  for (const tense of TENSES) {
    const answers = new Set();
    for (const table of tables) {
      for (const f of table[tense.id]) for (const form of accepted(f)) for (const w of words(form)) answers.add(w);
    }
    for (const lang of LANGS) {
      // The description, not the grammar name ("Presente" is unavoidable).
      const shown = words(`${tenseShort(lang, tense.id)} ${tenseInfoHtml(lang, tense.id)}`);
      const leaks = shown.filter((w) => answers.has(w) && !notGiveaways.has(w));
      assert.deepEqual(leaks, [], `${lang} ${tense.id} description contains answer words`);
    }
  }
});

test('explanations and hints render for every verb in every tense', () => {
  const rng = seededRng(11);
  for (const verb of verbs) {
    const settings = { mode: 'mc', region: 'es' };
    for (const tense of TENSES) {
      let q;
      try {
        q = makeQuestion({ verbs: [verb], settings: { ...settings, scope: `tense:${tense.id}` }, level: 'C2', rng });
      } catch {
        continue; // e.g. commands of impersonal verbs
      }
      const ctx = noteContext(q);
      const wrong = q.options.find((o) => !o.correct);
      for (const lang of LANGS) {
        for (const note of explanationNotes(q, { picked: wrong })) {
          const html = renderNote(lang, note, 'explain', ctx);
          assert.ok(html, `${lang}: empty ${note.key} for ${verb.inf} ${tense.id}`);
          assert.ok(!html.includes('undefined'), `${lang}: ${html}`);
        }
        for (const note of hintNotes(q)) {
          const html = renderNote(lang, note, 'hint', ctx);
          if (html !== null) {
            assert.ok(!html.includes('undefined'), `${lang}: ${html}`);
            // a first hint must not give the answer away
            if (!['tense-rule', 'orth', 'reflexive', 'like'].includes(note.key)) {
              assert.ok(!html.includes(`>${q.answer.form}<`), `${lang} hint reveals ${q.answer.form}: ${html}`);
            }
          }
        }
      }
    }
  }
});

test('every kind of wrong pick is explained', () => {
  const kinds = new Set();
  for (const [inf, tense] of [['tener', 'pret'], ['levantarse', 'imp_neg'], ['decir', 'gerund'], ['hacer', 'participle']]) {
    const verb = verbs.find((v) => v.inf === inf);
    const q = makeQuestion({ verbs: [verb], settings: { mode: 'mc', scope: `tense:${tense}`, region: 'es' }, level: 'C2', rng: seededRng(5) });
    for (const d of distractorPool(q)) {
      kinds.add(d.why.kind);
      for (const lang of LANGS) {
        const [note] = explanationNotes(q, { picked: { text: d.form, why: d.why } });
        assert.equal(note.key, 'picked');
        const html = renderNote(lang, note, 'explain', noteContext(q));
        assert.ok(html && !html.includes('undefined'), `${lang} ${inf} ${d.why.kind}: ${html}`);
      }
    }
  }
  assert.deepEqual([...kinds].sort(), ['ending', 'negated', 'person', 'regular', 'tense']);
});

test('meaning questions explain both the answer and the wrong pick', () => {
  const q = makeQuestion({ verbs, settings: { mode: 'mc', scope: 'meanings', region: 'both' }, level: 'B1', rng: seededRng(2) });
  const wrong = q.options.find((o) => !o.correct);
  for (const lang of LANGS) {
    const html = explanationNotes(q, { picked: wrong }).map((n) => renderNote(lang, n, 'explain', noteContext(q)));
    assert.ok(html.length >= 2 && html.every(Boolean));
  }
});

const vocab = JSON.parse(readFileSync(new URL('../data/vocab.json', import.meta.url), 'utf8'));
const readData = (f) => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), 'utf8'));
const idioms = readData('idioms.json');
const conversation = readData('conversation.json');
const grammar = readData('grammar.json');
const sentences = readData('sentences.json').items;

function checkRendered(q, notes, mode) {
  for (const lang of LANGS) {
    for (const note of notes) {
      const html = renderNote(lang, note, mode, noteContext(q));
      if (html === null && mode === 'hint') continue;
      assert.ok(html && !html.includes('undefined') && !html.includes('[object'), `${lang} ${q.key} ${note.key}: ${html}`);
    }
  }
}

test('idiom, conversation and grammar explanations and hints render for every item', async () => {
  const { idiomQuestionFor, conversationQuestionFor, grammarQuestionFor } = await import('../js/phrases.js');
  const rng = seededRng(13);
  const questions = [
    ...idioms.items.flatMap((item) => ['es-en', 'en-es'].map((dir) => idiomQuestionFor({ item, dir, idioms: idioms.items, rng }))),
    ...conversation.items.map((item) => conversationQuestionFor({ item, rng })),
    ...grammar.items.map((item) => grammarQuestionFor({ item, grammarSets: grammar.sets, rng })),
  ];
  for (const q of questions) {
    const wrong = q.options.find((o) => !o.correct);
    checkRendered(q, explanationNotes(q, { picked: wrong }), 'explain');
    const hints = hintNotes(q);
    checkRendered(q, hints, 'hint');
    // a hint never contains the answer as a whole word
    for (const lang of LANGS) {
      const text = hints.map((n) => renderNote(lang, n, 'hint', noteContext(q))).join(' ').replace(/<[^>]+>/g, '');
      if (q.kind === 'idiom') assert.ok(!text.toLowerCase().includes(q.answer.form.toLowerCase()), `${lang} ${q.key}: ${text}`);
    }
  }
});

test('sentence explanations and hints render, and hints never show the form', async () => {
  const { sentenceQuestionFor } = await import('../js/quiz.js');
  const rng = seededRng(14);
  for (const item of sentences.filter((_, i) => i % 7 === 0)) {
    const verb = verbs.find((v) => v.inf === item.inf);
    const q = sentenceQuestionFor({ item, verb, mode: 'mc', region: 'es', rng });
    checkRendered(q, explanationNotes(q, { picked: q.options.find((o) => !o.correct) }), 'explain');
    checkRendered(q, hintNotes(q), 'hint');
    for (const lang of LANGS) {
      for (const note of hintNotes(q)) {
        const html = renderNote(lang, note, 'hint', noteContext(q));
        if (html && !['tense-rule', 'orth', 'like'].includes(note.key)) assert.ok(!html.includes(`>${q.answer.form}<`), `${lang} hint reveals ${q.answer.form}: ${html}`);
      }
    }
  }
});

test('vocabulary explanations and hints render for every word, direction and mistake', async () => {
  const { vocabQuestionFor } = await import('../js/vocab.js');
  const { gradeTyped } = await import('../js/quiz.js');
  const rng = seededRng(4);
  for (const item of vocab.items) {
    for (const dir of ['es-en', 'en-es', 'regional']) {
      if (dir === 'regional' && typeof item.es !== 'object') continue;
      const q = vocabQuestionFor({ item, dir, region: 'es', mode: 'mc', items: vocab.items, rng });
      const typed = vocabQuestionFor({ item, dir: dir === 'es-en' ? 'en-es' : dir, region: 'es', mode: 'typed', items: vocab.items, rng });
      const wrongGender = gradeTyped(typed, `la ${q.answer.form.replace(/^(el|la|los|las) /, '')}`);
      const otherRegion = typeof item.es === 'object' ? gradeTyped(typed, item.es.mx) : null;
      for (const lang of LANGS) {
        const ctx = noteContext(q);
        const notes = [
          ...explanationNotes(q, { picked: q.options.find((o) => !o.correct) }),
          ...explanationNotes(typed, { grade: wrongGender }),
          ...(otherRegion ? explanationNotes(typed, { grade: otherRegion }) : []),
        ];
        for (const note of notes) {
          const html = renderNote(lang, note, 'explain', ctx);
          assert.ok(html && !html.includes('undefined'), `${lang} ${item.id} ${note.key}: ${html}`);
        }
        for (const note of hintNotes(q)) {
          const html = renderNote(lang, note, 'hint', ctx);
          assert.ok(html && !html.includes('undefined'), `${lang} ${item.id} hint: ${html}`);
          const text = ` ${html.replace(/<[^>]+>/g, ' ').toLowerCase()} `.replace(/[^a-záéíóúüñ]+/g, ' ');
          assert.ok(!text.includes(` ${q.answer.form.toLowerCase()} `), `${lang} hint gives away ${q.answer.form}: ${html}`);
        }
      }
    }
  }
});

test('Spanish-to-English verb meaning hints show the verb in a real sentence, never the meaning', async () => {
  const { meaningQuestionFor } = await import('../js/quiz.js');
  const { exampleFor } = await import('../js/explain.js');
  const rng = seededRng(21);
  let withExample = 0;
  for (const verb of verbs) {
    const q = meaningQuestionFor({ verb, direction: 'es-en', mode: 'mc', verbs, rng });
    const example = exampleFor(verb, sentences, 'mx');
    if (example) {
      withExample += 1;
      assert.notEqual(example.region, 'es', `${verb.inf}: a Spain-only sentence for Mexico`);
    }
    const hints = hintNotes(q, { example });
    assert.equal(hints[0].key, example ? 'in-sentence' : 'meaning-hint');
    checkRendered(q, hints, 'hint');
    checkRendered(q, explanationNotes(q, { example }), 'explain');
    for (const lang of LANGS) {
      const text = hints.map((n) => renderNote(lang, n, 'hint', noteContext(q))).join(' ');
      assert.ok(!text.includes(q.verb.en), `${lang} ${verb.inf} hint gives the meaning away: ${text}`);
      if (example) assert.ok(text.includes('tatoeba.org'), `${lang} ${verb.inf}: the sentence needs its credit`);
    }
  }
  // most verbs have one (the rest fall back to the first letter)
  assert.ok(withExample > verbs.length * 0.65, `${withExample} of ${verbs.length}`);
  // English to Spanish, a sentence would show the verb itself
  const en = meaningQuestionFor({ verb: verbs[2], direction: 'en-es', mode: 'mc', verbs, rng });
  assert.equal(hintNotes(en, { example: exampleFor(verbs[2], sentences, 'mx') })[0].key, 'meaning-hint');
});

test('every review category has a label and a tip in both languages', async () => {
  const { categoryKeys, categoryLabel, categoryTipHtml, exampleHtml } = await import('../js/i18n.js');
  assert.deepEqual(categoryKeys('es').sort(), categoryKeys('en').sort());
  for (const lang of LANGS) {
    const names = { topics: vocab.topics, situations: conversation.situations, grammarSets: grammar.sets };
    const named = [
      ...Object.keys(vocab.topics).map((id) => `topic:${id}`),
      ...Object.keys(conversation.situations).map((id) => `situation:${id}`),
      ...Object.keys(grammar.sets).map((id) => `grammar:${id}`),
    ];
    for (const key of [...categoryKeys('en'), 'tense:pret', ...named]) {
      const label = categoryLabel(lang, key, names);
      assert.ok(label && !key.endsWith(`:${label}`) && label !== key, `${lang} ${key} has no label`);
      if (!key.startsWith('topic:') && !key.startsWith('situation:')) assert.ok(categoryTipHtml(lang, key, names), `${lang} ${key} has no tip`);
    }
    const ex = exampleHtml(lang, { kind: 'conj', inf: 'tener', tense: 'pret', person: 0, answer: 'tuve' });
    assert.ok(ex.includes('tuve') && ex.includes('yo'));
  }
});

test('data values are escaped', () => {
  const html = renderNote('en', { key: 'meaning', inf: '<i>x</i>', en: '"&' }, 'explain', {});
  assert.ok(!html.includes('<i>x'));
  assert.ok(html.includes('&lt;i&gt;'));
});
