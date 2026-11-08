// Hand-written phrase content: idioms, conversation replies and grammar
// choices. All of it is multiple choice: free answers would be too loose to
// grade. Data formats: CONTENT.md. The pickers return null when nothing
// fits the settings.

import { LEVELS } from './conjugate.js';
import { sensesOverlap } from './vocab.js';
import { shuffle, pickAtLevel } from './random.js';

const lvl = (l) => LEVELS.indexOf(l);

/** Items marked for one region are only asked with that region (or Both). */
export const phraseInRegion = (item, region) => !item.region || region === 'both' || item.region === region;

export const emptyPhrases = () => ({ idioms: [], situations: {}, conversation: [], grammarSets: {}, grammar: [] });

const answerOf = (form) => ({ form, alts: [], tags: [] });

// ---------------------------------------------------------------------------
// Idioms: what an expression means (es-en), or which expression means
// something (en-es)

export function idiomQuestion({ idioms, region, level, rng, avoid }) {
  const pool = idioms.filter((i) => phraseInRegion(i, region));
  if (!pool.length) return null;
  const item = pickAtLevel(pool, { level, avoid, rng });
  return idiomQuestionFor({ item, dir: rng() < 0.5 ? 'es-en' : 'en-es', idioms: pool, rng });
}

export function idiomQuestionFor({ item, dir, idioms, rng }) {
  const text = (i) => (dir === 'es-en' ? i.en : i.es);
  const q = {
    kind: 'idiom',
    mode: 'mc',
    dir,
    item,
    prompt: dir === 'es-en' ? item.es : item.en,
    answer: answerOf(text(item)),
    accepted: [text(item)],
    level: item.level,
    region: item.region ?? null,
    optionLang: dir === 'es-en' ? 'en' : 'es',
    key: `idiom|${item.id}|${dir}`,
    spec: { kind: 'idiom', id: item.id, dir },
  };
  // Wrong options: other idioms near the same level whose meanings don't overlap.
  const ranked = idioms
    .filter((o) => o.id !== item.id && !sensesOverlap(o.en, item.en))
    .map((o) => [(Math.abs(lvl(o.level) - lvl(item.level)) <= 1 ? 1 : 0) + rng(), o])
    .sort((a, b) => b[0] - a[0])
    .map(([, o]) => o);
  const chosen = [];
  for (const o of ranked) {
    if (chosen.some((c) => sensesOverlap(c.en, o.en))) continue;
    chosen.push(o);
    if (chosen.length === 3) break;
  }
  q.options = shuffle(
    [{ text: text(item), correct: true }, ...chosen.map((o) => ({ text: text(o), correct: false, why: { kind: 'idiom', item: o } }))],
    rng,
  );
  return q;
}

// ---------------------------------------------------------------------------
// Conversation: pick the best reply to what someone says

export function conversationQuestion({ conversation, situation = null, region, level, rng, avoid }) {
  const pool = conversation.filter((i) => phraseInRegion(i, region) && (!situation || i.situation === situation));
  if (!pool.length) return null;
  return conversationQuestionFor({ item: pickAtLevel(pool, { level, avoid, rng }), rng });
}

export function conversationQuestionFor({ item, rng }) {
  return {
    kind: 'conversation',
    mode: 'mc',
    item,
    situation: item.situation,
    prompt: item.prompt.es,
    answer: answerOf(item.answer.es),
    accepted: [item.answer.es],
    level: item.level,
    region: item.region ?? null,
    optionLang: 'es',
    key: `conversation|${item.id}`,
    spec: { kind: 'conversation', id: item.id },
    options: shuffle(
      [
        { text: item.answer.es, correct: true },
        ...item.wrong.map((w) => ({ text: w.es, correct: false, why: { kind: 'reply', es: w.es, en: w.en } })),
      ],
      rng,
    ),
  };
}

// ---------------------------------------------------------------------------
// Grammar: fill the blank with one of a few given choices

export function grammarQuestion({ grammar, grammarSets, set = null, region, level, rng, avoid }) {
  const pool = grammar.filter((i) => phraseInRegion(i, region) && (!set || i.set === set));
  if (!pool.length) return null;
  return grammarQuestionFor({ item: pickAtLevel(pool, { level, avoid, rng }), grammarSets, rng });
}

export function grammarQuestionFor({ item, grammarSets, rng }) {
  return {
    kind: 'grammar',
    mode: 'mc',
    item,
    set: item.set,
    tip: grammarSets[item.set]?.tip ?? null,
    answer: answerOf(item.answer),
    accepted: [item.answer],
    level: item.level,
    region: item.region ?? null,
    optionLang: 'es',
    key: `grammar|${item.id}`,
    spec: { kind: 'grammar', id: item.id },
    options: shuffle(
      item.options.map((o) => (o === item.answer ? { text: o, correct: true } : { text: o, correct: false })),
      rng,
    ),
  };
}

/** The grammar sentence with its blank filled in. */
export const filledSentence = (item, text = item.answer) => item.es.replace('___', text);
