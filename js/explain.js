// Turns a question (and what the learner picked) into a list of language-
// neutral notes. js/i18n.js renders each note in English or Spanish.

import { analyze, TENSE_BY_ID } from './conjugate.js';
import { VOSOTROS, tables } from './quiz.js';

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
  const ctx = { inf: q.verb.inf, form: q.answer.form, tense: q.tense, person: q.person };
  if (q.kind === 'conj') {
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
  const notes = [];
  if (q.kind === 'meaning') {
    notes.push({ key: 'meaning', inf: q.verb.inf, en: q.verb.en });
    if (picked?.why?.kind === 'meaning') notes.push({ key: 'picked-meaning', inf: picked.why.verb.inf, en: picked.why.verb.en });
  } else {
    if (picked?.why) notes.push({ key: 'picked', form: picked.text, why: picked.why });
    if (grade?.why) notes.push({ key: 'picked', form: grade.typed, why: grade.why });
    notes.push(...tenseRule(q), ...tagNotes(q));
    if (q.person === VOSOTROS) notes.push({ key: 'vosotros' });
  }
  if (q.verb.note) notes.push({ key: 'verb-note', note: q.verb.note });
  return notes;
}

// First hint: the rules that apply, without giving the form away.
export function hintNotes(q) {
  if (q.kind === 'meaning') {
    const target = q.direction === 'es-en' ? q.verb.en.replace(/^to /, '') : q.verb.inf;
    return [{ key: 'meaning-hint', letter: target[0] }];
  }
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
