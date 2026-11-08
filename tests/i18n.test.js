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

test('every review category has a label and a tip in both languages', async () => {
  const { categoryKeys, categoryLabel, categoryTipHtml, exampleHtml } = await import('../js/i18n.js');
  assert.deepEqual(categoryKeys('es').sort(), categoryKeys('en').sort());
  for (const lang of LANGS) {
    for (const key of [...categoryKeys('en'), 'tense:pret', 'topic:food']) {
      assert.ok(categoryLabel(lang, key, vocab.topics), `${lang} ${key}`);
      assert.notEqual(categoryLabel(lang, key, vocab.topics), key, `${lang} ${key} has no label`);
      if (!key.startsWith('topic:')) assert.ok(categoryTipHtml(lang, key), `${lang} ${key} has no tip`);
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
