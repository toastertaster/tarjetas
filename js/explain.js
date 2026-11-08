// Turns a question (and what the learner picked) into a list of language-
// neutral notes. js/i18n.js renders each note in English or Spanish.

import { analyze, TENSE_BY_ID } from './conjugate.js';
import { VOSOTROS, tables } from './quiz.js';
import { formsFor, genderOf, isRegional, splitArticle } from './vocab.js';
import { filledSentence } from './phrases.js';
import { englishForm } from './english.js';

// Engine tags with no note of their own (the tense rule already covers them).
export const SILENT_TAGS = new Set(['subj-from-yo']);

function tagNotes(q) {
  const seen = new Set();
  const notes = [];
  for (const tag of q.answer.tags) {
    if (SILENT_TAGS.has(tag.id)) continue;
    const key = JSON.stringify(tag);
    if (seen.has(key)) continue;
    seen.add(key);
    notes.push({ key: tag.id, ...tag });
  }
  return notes;
}

// Context every note template may use.
export function noteContext(q) {
  if (!q.verb) return { form: q.answer.form };
  const ctx = { inf: q.verb.inf, form: q.answer.form, tense: q.tense, person: q.person };
  if (q.kind === 'conj' || q.kind === 'sentence' || q.kind === 'recognize') {
    ctx.cls = analyze(q.verb).cls;
    ctx.pp = tables(q.verb).table.participle[0].form;
  }
  return ctx;
}

// "to break; to tear (paper)" → ["brea", "tear", "pape"]: word stems that
// show a translation uses the verb in the meaning being taught.
const GLOSS_FILLER = new Set(['to', 'get', 'one', 'someone', 'something', 'oneself', 'out', 'up', 'down', 'off', 'with', 'for', 'about']);
const stems = (text) =>
  text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length > 1 && !GLOSS_FILLER.has(w))
    .map((w) => w.slice(0, 4));

// Sentences a learner of the region should see: no other country's speakers,
// no vosotros for Mexico.
const suits = (s, region) => (!s.region || region === 'both' || s.region === region) && !(region === 'mx' && s.persons?.includes(VOSOTROS));

/**
 * The sentence that best shows what a word means, from candidates that
 * contain it ({ ...sentence, blank: where the word is }). The best is one
 * whose translation uses the meaning being taught (not an idiom like "te
 * eché de menos" for echar), and then one of about five words: enough
 * context, little else to read.
 */
function bestExample(candidates, gloss) {
  const meaning = new Set(stems(gloss));
  const rank = (s) => [
    stems(s.en).some((w) => meaning.has(w)) ? 0 : 1,
    Math.abs(s.es.split(' ').length - 5),
    s.es.length,
    s.id,
  ];
  let best = null;
  let bestRank = null;
  for (const s of candidates) {
    const r = rank(s);
    const i = bestRank ? r.findIndex((x, k) => x !== bestRank[k]) : 0;
    if (!bestRank || (i >= 0 && r[i] < bestRank[i])) [best, bestRank] = [s, r];
  }
  return best;
}

/** A real sentence that uses the verb, to work out what it means from context, or null. */
export function exampleFor(verb, sentences, region) {
  return bestExample(
    sentences.filter((s) => s.inf === verb.inf && suits(s, region)),
    verb.en,
  );
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * A real sentence that uses a vocabulary word (singular or plural, with any
 * article), with `blank` marking the word, or null.
 */
export function wordExampleFor(item, form, sentences, region) {
  const { core } = splitArticle(form);
  const word = new RegExp(`(?<!\\p{L})${escapeRegExp(core)}(?:es|s)?(?!\\p{L})`, 'iu');
  const found = [];
  for (const s of sentences) {
    if (!suits(s, region)) continue;
    const m = word.exec(s.es);
    if (m) found.push({ ...s, blank: [m.index, m.index + m[0].length] });
  }
  return bestExample(found, item.en);
}

const exampleNote = (s) => ({ key: 'in-sentence', es: s.es, blank: s.blank, en: s.en, id: s.id, by: s.by, enId: s.enId, enBy: s.enBy });

// "tener · nosotros · preterite", as data the templates can label in either language.
const readingNote = (r) => ({ inf: r.inf, tense: r.tense, persons: r.persons });

/**
 * Notes for the feedback panel.
 *   picked  – the wrong multiple-choice option, if any
 *   grade   – the result of gradeTyped, if the answer was typed
 *   example – a sentence using the verb or word (exampleFor, wordExampleFor),
 *             for meaning and vocabulary questions
 */
export function explanationNotes(q, { picked = null, grade = null, example = null } = {}) {
  if (q.kind === 'vocab') return [...vocabNotes(q, { picked, grade }), ...(example ? [exampleNote(example)] : [])];
  if (q.kind === 'listen') return listenNotes(q, picked);
  if (q.kind === 'recognize') return recognizeNotes(q, picked);
  if (q.kind === 'idiom') return idiomNotes(q, picked);
  if (q.kind === 'conversation') return conversationNotes(q, picked);
  if (q.kind === 'grammar') return grammarNotes(q);
  const notes = [];
  if (q.kind === 'sentence') notes.push({ key: 'sentence', es: q.item.es, blank: q.item.blank, en: q.item.en });
  if (q.kind === 'meaning') {
    notes.push({ key: 'meaning', inf: q.verb.inf, en: q.verb.en });
    if (picked?.why?.kind === 'meaning') notes.push({ key: 'picked-meaning', inf: picked.why.verb.inf, en: picked.why.verb.en });
    if (example) notes.push(exampleNote(example));
  } else {
    if (picked?.why) notes.push({ key: 'picked', form: picked.text, why: picked.why });
    if (grade?.why) notes.push({ key: 'picked', form: grade.typed, why: grade.why });
    notes.push(...tenseRule(q), ...tagNotes(q));
    if (q.person === VOSOTROS) notes.push({ key: 'vosotros' });
  }
  if (q.verb.note) notes.push({ key: 'note', note: q.verb.note });
  return notes;
}

function vocabNotes(q, { picked, grade }) {
  const { item, vocabRegion: region } = q;
  const notes = [];
  if (picked?.why?.kind === 'vocab') {
    const other = picked.why.item;
    notes.push({ key: 'picked-vocab', es: formsFor(other, region).form, en: other.en });
  }
  if (grade?.why?.kind === 'gender') notes.push({ key: 'vocab-gender', expected: grade.why.expected, gender: grade.why.gender });
  if (grade?.why?.kind === 'other-region') {
    notes.push({ key: 'vocab-other-region', form: grade.why.form, region: grade.why.region, expected: q.answer.form, asked: region });
  }
  notes.push({ key: 'vocab-meaning', es: formsFor(item, region).form, en: item.en });
  if (isRegional(item)) notes.push({ key: 'vocab-regions', mx: formsFor(item, 'mx').form, es: formsFor(item, 'es').form });
  if (item.note) notes.push({ key: 'note', note: item.note });
  return notes;
}

function recognizeNotes(q, picked) {
  const notes = [];
  if (picked?.why?.kind === 'reading') notes.push({ key: 'picked-reading', ...readingNote(picked.why.reading), form: picked.why.reading.form });
  notes.push({ key: 'reading', form: q.form, ...readingNote(q.reading), en: q.verb.en, english: englishForm(q.verb, q.tense, q.persons[0]) });
  notes.push(...tenseRule(q), ...tagNotes(q));
  if (q.persons.includes(VOSOTROS)) notes.push({ key: 'vosotros' });
  return notes;
}

function listenNotes(q, picked) {
  const notes = [];
  if (picked?.why?.kind === 'listen') notes.push({ key: 'picked-listen', es: picked.why.item.es, en: picked.why.item.en });
  notes.push(exampleNote(q.item));
  return notes;
}

function idiomNotes(q, picked) {
  const { item } = q;
  const notes = [];
  if (picked?.why?.kind === 'idiom') notes.push({ key: 'picked-idiom', es: picked.why.item.es, en: picked.why.item.en });
  notes.push({ key: 'idiom-meaning', es: item.es, en: item.en }, { key: 'literal', literal: item.literal });
  notes.push({ key: 'example', es: item.example.es, en: item.example.en });
  if (item.region) notes.push({ key: 'phrase-region', region: item.region });
  if (item.note) notes.push({ key: 'note', note: item.note });
  return notes;
}

function conversationNotes(q, picked) {
  const { item } = q;
  const notes = [{ key: 'exchange', prompt: item.prompt, answer: item.answer }];
  if (picked?.why?.kind === 'reply') notes.push({ key: 'picked-reply', es: picked.why.es, en: picked.why.en });
  if (item.region) notes.push({ key: 'phrase-region', region: item.region });
  if (item.note) notes.push({ key: 'note', note: item.note });
  return notes;
}

function grammarNotes(q) {
  const { item } = q;
  const notes = [{ key: 'example', es: filledSentence(item), en: item.en }, { key: 'grammar-why', why: item.why }];
  if (item.region) notes.push({ key: 'phrase-region', region: item.region });
  return notes;
}

/**
 * What one multiple-choice option means, shown on every option once the
 * answer is revealed, so all four can be compared:
 *   { text, lang } – the meaning (English for Spanish options and vice versa)
 *   { invented: true } – a form that doesn't exist (tení, no levántate)
 *   null – nothing useful to add (grammar choices like es / está)
 */
export function optionMeaning(q, o) {
  const why = o.why ?? {};
  switch (q.kind) {
    case 'conj':
    case 'sentence': {
      if (o.correct) return { text: englishForm(q.verb, q.tense, q.person), lang: 'en' };
      if (why.kind === 'person' || why.kind === 'tense') {
        return { text: englishForm(q.verb, why.tense ?? q.tense, why.person ?? null), lang: 'en' };
      }
      return { invented: true };
    }
    case 'meaning': {
      const verb = o.correct ? q.verb : why.verb;
      return q.direction === 'es-en' ? { text: verb.inf, lang: 'es' } : { text: verb.en, lang: 'en' };
    }
    case 'vocab': {
      const item = o.correct ? q.item : why.item;
      return q.dir === 'es-en' ? { text: formsFor(item, q.vocabRegion).form, lang: 'es' } : { text: item.en, lang: 'en' };
    }
    case 'idiom': {
      const item = o.correct ? q.item : why.item;
      return q.dir === 'es-en' ? { text: item.es, lang: 'es' } : { text: item.en, lang: 'en' };
    }
    case 'conversation':
      return { text: o.correct ? q.item.answer.en : why.en, lang: 'en' };
    // the right reading in English (we had), a wrong one by the form it stands for (tenemos)
    case 'recognize':
      return o.correct ? { text: englishForm(q.verb, q.tense, q.persons[0]), lang: 'en' } : { text: o.reading.form, lang: 'es' };
    case 'listen':
      return { text: o.correct ? q.item.es : why.item.es, lang: 'es' };
  }
  return null;
}

const firstLetter = (s) => s.replace(/^[¡¿]/, '')[0];

// First hint: the rules that apply, without giving the form away.
//   example – a sentence using the verb or word (exampleFor, wordExampleFor),
//             for meaning and vocabulary questions
export function hintNotes(q, { example = null } = {}) {
  if (q.kind === 'vocab') {
    // Spanish to English, as for verb meanings: the word in a real sentence.
    if (q.dir === 'es-en') return [example ? exampleNote(example) : { key: 'meaning-hint', letter: firstLetter(q.item.en), english: true }];
    const { core } = splitArticle(q.answer.form);
    return [{ key: 'vocab-hint', letter: firstLetter(core), gender: genderOf(q.item, q.answer.form) }];
  }
  if (q.kind === 'meaning') {
    // Spanish to English: the verb at work in a real sentence, so its meaning
    // can be worked out from context (the translation comes with the answer).
    // English to Spanish, a sentence would show the verb itself.
    if (q.direction === 'es-en' && example) return [exampleNote(example)];
    const english = q.direction === 'es-en';
    const target = english ? q.verb.en.replace(/^to /, '') : q.verb.inf;
    return [{ key: 'meaning-hint', letter: target[0], english }];
  }
  // Idioms: the word-for-word meaning gives the image without the answer;
  // asked the other way round, the literal meaning would give it away.
  if (q.kind === 'idiom') {
    if (q.dir === 'es-en') return [{ key: 'literal', literal: q.item.literal }];
    const words = q.item.es.split(' ');
    return [{ key: 'meaning-hint', letter: words.length > 1 ? words[0] : firstLetter(q.item.es) }];
  }
  if (q.kind === 'conversation') return [{ key: 'they-said', en: q.item.prompt.en }];
  // Which verb it is; the person and tense are left to work out.
  if (q.kind === 'recognize') return [{ key: 'recognize-hint', inf: q.verb.inf, en: q.verb.en }];
  // What was said, in writing.
  if (q.kind === 'listen') return [{ key: 'transcript', es: q.item.es }];
  if (q.kind === 'grammar') return [{ key: 'grammar-tip', tip: q.tip }];
  if (q.kind === 'sentence') return [{ key: 'sentence-person', tense: q.tense, persons: q.persons }, ...tenseRule(q), ...tagNotes(q)];
  return [...tenseRule(q), ...tagNotes(q)];
}

// The general rule for the tense. Commands are explained person by person by
// their tags (imp-tu, imp-vos, imp-from-subj, imp-neg) instead.
function tenseRule(q) {
  if (TENSE_BY_ID[q.tense].mood === 'imperative') return [];
  return [{ key: 'tense-rule', tense: q.tense, cls: analyze(q.verb).cls }];
}

// Second hint for typed answers: the start of the answer.
export function reveal(form) {
  const words = form.split(' ');
  const last = words.pop();
  const keep = Math.max(1, Math.ceil(last.length / 2));
  return [...words, last.slice(0, keep) + '…'].join(' ');
}
