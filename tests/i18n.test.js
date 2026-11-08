// Every explanation the app can show renders in both languages.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TENSES } from '../js/conjugate.js';
import { makeQuestion, seededRng, distractorPool } from '../js/quiz.js';
import { explanationNotes, hintNotes, noteContext } from '../js/explain.js';
import { LANGS, uiKeys, noteKeys, renderNote, tenseName } from '../js/i18n.js';

const verbs = JSON.parse(readFileSync(new URL('../data/verbs.json', import.meta.url), 'utf8'));

test('both languages define the same page text and notes', () => {
  assert.deepEqual(uiKeys('es').sort(), uiKeys('en').sort());
  assert.deepEqual(noteKeys('es').sort(), noteKeys('en').sort());
  for (const lang of LANGS) for (const tense of TENSES) assert.ok(tenseName(lang, tense.id), `${lang} ${tense.id}`);
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
  const q = makeQuestion({ verbs, settings: { mode: 'meaning', scope: 'verbs', region: 'both' }, level: 'B1', rng: seededRng(2) });
  const wrong = q.options.find((o) => !o.correct);
  for (const lang of LANGS) {
    const html = explanationNotes(q, { picked: wrong }).map((n) => renderNote(lang, n, 'explain', noteContext(q)));
    assert.ok(html.length >= 2 && html.every(Boolean));
  }
});

test('data values are escaped', () => {
  const html = renderNote('en', { key: 'meaning', inf: '<i>x</i>', en: '"&' }, 'explain', {});
  assert.ok(!html.includes('<i>x'));
  assert.ok(html.includes('&lt;i&gt;'));
});
