// "What to review": which topics a learner keeps getting wrong.
//
// Every question belongs to a few categories: its tense, the patterns its
// answer exercises (from the conjugation engine's tags), its vocabulary
// topic, idioms, its conversation situation or its grammar set. Results are kept per category, and categories that are missed
// repeatedly are suggested for review. Missed questions also go into a
// mistakes deck that can be practiced directly.

export const RECENT = 10; // results remembered per category
export const NEEDS_REVIEW_MISSES = 2; // recent misses before a category is flagged
export const NEEDS_REVIEW_RATE = 0.3; // and the recent miss rate
export const EXAMPLES = 3; // missed examples kept per category
export const DECK_MAX = 60;
export const DECK_CLEAR_STREAK = 2; // right answers in a row that clear a deck card

// Engine tag → review category
const TAG_CATEGORY = {
  'yo-irregular': 'yo-irregular',
  zc: 'zc',
  'stem-weak': 'stem-weak',
  'pret-strong': 'pret-strong',
  'pret-j': 'pret-strong',
  'fut-stem': 'fut-stem',
  'pp-irregular': 'pp-irregular',
  'imp-tu-irregular': 'imp-tu-irregular',
  orth: 'orth',
  'drop-i': 'orth',
  'accent-stem': 'accents',
  hiatus: 'accents',
  monosyllable: 'accents',
  'uir-y': 'y-insertion',
  y: 'y-insertion',
  irregular: 'irregular',
};

/** Pattern categories (not tenses) for one conjugated form. */
export function conjCategories(tense, person, form) {
  const cats = new Set();
  for (const tag of form?.tags ?? []) {
    if (tag.id === 'stem') cats.add(`stem:${tag.pattern}`);
    else if (tag.id === 'reflexive') cats.add(tag.enclitic ? 'reflexive-commands' : 'reflexive');
    else if (TAG_CATEGORY[tag.id]) cats.add(TAG_CATEGORY[tag.id]);
  }
  if (person === 4) cats.add('vosotros');
  return [...cats];
}

/** Every category a question counts toward. */
export function categoriesFor(q) {
  switch (q.kind) {
    case 'conj':
    case 'sentence':
      return [`tense:${q.tense}`, ...conjCategories(q.tense, q.person, q.answer)];
    case 'meaning':
      return ['meanings'];
    case 'recognize':
      return ['recognize'];
    case 'listen':
      return ['listening'];
    case 'idiom':
      return ['idioms'];
    case 'conversation':
      return [`situation:${q.situation}`];
    case 'grammar':
      return [`grammar:${q.set}`];
  }
  const cats = [`topic:${q.topic}`];
  if (q.dir === 'regional') cats.push('regional');
  return cats;
}

// Categories that are also Scope settings.
const SCOPE_PREFIXES = ['tense:', 'topic:', 'situation:', 'grammar:'];
const SCOPES = ['meanings', 'idioms', 'recognize', 'listening'];

// Which Scope setting practices a category, if any.
export function scopeFor(category) {
  if (SCOPE_PREFIXES.some((p) => category.startsWith(p)) || SCOPES.includes(category)) return category;
  if (category === 'regional') return 'vocab';
  return `cat:${category}`;
}

/** A short record of what was missed, for the review page. */
export function exampleOf(q) {
  switch (q.kind) {
    case 'conj':
    case 'sentence':
      return { kind: 'conj', inf: q.verb.inf, tense: q.tense, person: q.person, answer: q.answer.form };
    case 'meaning':
      return { kind: 'meaning', prompt: q.verb.inf, answer: q.verb.en };
    case 'recognize':
      return { kind: 'recognize', form: q.form, inf: q.verb.inf, tense: q.tense, persons: q.persons };
    case 'listen':
      return { kind: 'listen', prompt: q.item.es, answer: q.item.en };
    case 'idiom':
      return { kind: 'idiom', prompt: q.item.es, answer: q.item.en };
    case 'conversation':
      return { kind: 'conversation', prompt: q.prompt, answer: q.answer.form };
    case 'grammar':
      return { kind: 'grammar', prompt: q.item.es, answer: q.answer.form };
  }
  return { kind: 'vocab', prompt: q.prompt, answer: q.answer.form, dir: q.dir, region: q.vocabRegion };
}

export const emptyReview = () => ({ cats: {}, deck: [] });

/**
 * Record one answer. `correct` is true for right answers (with or without a
 * hint). Returns a new review state; the input is not modified.
 */
export function recordAnswer(review, q, correct) {
  const cats = { ...review.cats };
  for (const key of categoriesFor(q)) {
    const c = cats[key] ?? { seen: 0, missed: 0, recent: [], examples: [] };
    const next = { ...c, seen: c.seen + 1, recent: [...c.recent, correct ? 1 : 0].slice(-RECENT) };
    if (!correct) {
      const ex = exampleOf(q);
      next.missed = c.missed + 1;
      next.examples = [ex, ...c.examples.filter((e) => JSON.stringify(e) !== JSON.stringify(ex))].slice(0, EXAMPLES);
    }
    cats[key] = next;
  }
  let deck = review.deck;
  const i = deck.findIndex((d) => d.key === q.key);
  if (!correct) {
    const card = { key: q.key, spec: q.spec, streak: 0 };
    deck = [card, ...deck.filter((d) => d.key !== q.key)].slice(0, DECK_MAX);
  } else if (i >= 0) {
    const streak = deck[i].streak + 1;
    deck = streak >= DECK_CLEAR_STREAK ? deck.filter((_, j) => j !== i) : deck.map((d, j) => (j === i ? { ...d, streak } : d));
  }
  return { cats, deck };
}

/** Categories that need review, most-missed first. */
export function needsReview(review) {
  const out = [];
  for (const [key, c] of Object.entries(review.cats)) {
    const misses = c.recent.filter((r) => r === 0).length;
    if (misses >= NEEDS_REVIEW_MISSES && misses / c.recent.length >= NEEDS_REVIEW_RATE) {
      out.push({ key, misses, attempts: c.recent.length, ...c });
    }
  }
  // Patterns before tenses/topics when equally missed: they're more specific.
  const specific = (k) => (SCOPE_PREFIXES.some((p) => k.startsWith(p)) ? 0 : 1);
  return out.sort((a, b) => b.misses - a.misses || specific(b.key) - specific(a.key) || b.missed - a.missed);
}
