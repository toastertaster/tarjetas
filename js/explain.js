// Turns a question (and what the learner picked) into a list of language-
// neutral notes. js/i18n.js renders each note in English or Spanish.

import { analyze, TENSE_BY_ID } from './conjugate.js';
import { VOSOTROS, tables } from './quiz.js';
import { formsFor, genderOf, isRegional, splitArticle } from './vocab.js';
import { filledSentence } from './phrases.js';

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
  if (q.kind === 'conj' || q.kind === 'sentence') {
    ctx.cls = analyze(q.verb).cls;
    ctx.pp = tables(q.verb).table.participle[0].form;
  }
  return ctx;
}

/**
 * Notes for the feedback panel.
 *   picked – the wrong multiple-choice option, if any
 *   grade  – the result of gradeTyped, if the answer was typed
 */
export function explanationNotes(q, { picked = null, grade = null } = {}) {
  if (q.kind === 'vocab') return vocabNotes(q, { picked, grade });
  if (q.kind === 'idiom') return idiomNotes(q, picked);
  if (q.kind === 'conversation') return conversationNotes(q, picked);
  if (q.kind === 'grammar') return grammarNotes(q);
  const notes = [];
  if (q.kind === 'sentence') notes.push({ key: 'sentence', es: q.item.es, blank: q.item.blank, en: q.item.en });
  if (q.kind === 'meaning') {
    notes.push({ key: 'meaning', inf: q.verb.inf, en: q.verb.en });
    if (picked?.why?.kind === 'meaning') notes.push({ key: 'picked-meaning', inf: picked.why.verb.inf, en: picked.why.verb.en });
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

const firstLetter = (s) => s.replace(/^[¡¿]/, '')[0];

// First hint: the rules that apply, without giving the form away.
export function hintNotes(q) {
  if (q.kind === 'vocab') {
    if (q.dir === 'es-en') return [{ key: 'meaning-hint', letter: firstLetter(q.item.en) }];
    const { core } = splitArticle(q.answer.form);
    return [{ key: 'vocab-hint', letter: firstLetter(core), gender: genderOf(q.item, q.answer.form) }];
  }
  if (q.kind === 'meaning') {
    const target = q.direction === 'es-en' ? q.verb.en.replace(/^to /, '') : q.verb.inf;
    return [{ key: 'meaning-hint', letter: target[0] }];
  }
  // Idioms: the word-for-word meaning gives the image without the answer;
  // asked the other way round, the literal meaning would give it away.
  if (q.kind === 'idiom') {
    if (q.dir === 'es-en') return [{ key: 'literal', literal: q.item.literal }];
    const words = q.item.es.split(' ');
    return [{ key: 'meaning-hint', letter: words.length > 1 ? words[0] : firstLetter(q.item.es) }];
  }
  if (q.kind === 'conversation') return [{ key: 'they-said', en: q.item.prompt.en }];
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
