// Page text and explanation templates in English and Spanish.
//
// Templates return HTML; every value that comes from data goes through `b()`
// or `esc()` so it is escaped. Hand-written content (verb notes) has an `en`
// text and an optional `es` text; Spanish falls back to English.

import { ENDINGS, FUT, COND, TENSE_BY_ID } from './conjugate.js';

export const LANGS = ['en', 'es'];

export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const b = (s) => `<b lang="es">${esc(s)}</b>`;
const ends = (list) => list.map((e) => `-${e}`).join(', ');

const UI = {
  en: {
    title: 'Tarjetas — Spanish flash cards',
    mode: 'Mode',
    scope: 'Scope',
    level: 'Level',
    region: 'Region',
    'mode.mc': 'Multiple choice',
    'mode.typed': 'Type the answer',
    'mode.meaning': 'Verb meanings',
    'mode.mixed': 'Mixed',
    'scope.verbs': 'Verbs: all tenses',
    'mood.indicative': 'Indicative',
    'mood.subjunctive': 'Subjunctive',
    'mood.imperative': 'Imperative',
    'mood.nonfinite': 'Non-finite forms',
    'level.auto': 'Auto',
    'level.autoAt': 'Auto ({level})',
    'region.mx': 'Mexico',
    'region.es': 'Spain',
    'region.both': 'Both',
    'lang.en': 'English',
    'lang.es': 'Español',
    score: '{correct}/{answered} correct',
    streak: 'Streak {streak}',
    help: 'Keyboard shortcuts',
    hint: 'Hint',
    hintMore: 'More help',
    skip: 'Skip',
    next: 'Next',
    submit: 'Check',
    strict: 'Strict accents',
    answerLabel: 'Your answer',
    placeholder: 'Type the form… (a\' → á, n~ → ñ)',
    correct: 'Correct!',
    accent: 'Correct — but watch the accent: {answer}',
    wrong: 'Not quite.',
    skipped: 'Skipped.',
    answerIs: 'Answer: {answer}',
    alsoAccepted: 'Also accepted: {alts}',
    continue: 'Press Enter to continue',
    'prompt.conj': 'Conjugate',
    'prompt.es-en': 'What does this verb mean?',
    'prompt.en-es': 'Which Spanish verb means…',
    reflexive: 'reflexive',
    'badge.mx': 'Mexico',
    'badge.es': 'Spain',
    levelUp: 'Level up! Now practicing {level}.',
    levelDown: 'Stepping back to {level} for some review.',
    loading: 'Loading…',
    loadError: 'Could not load the verb list. Serve the site over http (see README).',
    'keys.title': 'Keyboard shortcuts',
    'keys.options': 'Pick an answer',
    'keys.enter': 'Check the answer / go to the next card',
    'keys.esc': 'Skip (shows the answer)',
    'keys.hint': 'Hint (press again for more)',
    'keys.hintTyped': 'Hint while typing in the answer box',
    'keys.help': 'Show this help',
    'keys.accents': "Type a' e' i' o' u' for á é í ó ú, n~ for ñ and u\" for ü.",
    close: 'Close',
    credits: 'Credits & licenses',
  },
  es: {
    title: 'Tarjetas — tarjetas de español',
    mode: 'Modo',
    scope: 'Tema',
    level: 'Nivel',
    region: 'Región',
    'mode.mc': 'Opción múltiple',
    'mode.typed': 'Escribir la respuesta',
    'mode.meaning': 'Significado de verbos',
    'mode.mixed': 'Mixto',
    'scope.verbs': 'Verbos: todos los tiempos',
    'mood.indicative': 'Indicativo',
    'mood.subjunctive': 'Subjuntivo',
    'mood.imperative': 'Imperativo',
    'mood.nonfinite': 'Formas no personales',
    'level.auto': 'Automático',
    'level.autoAt': 'Automático ({level})',
    'region.mx': 'México',
    'region.es': 'España',
    'region.both': 'Ambas',
    'lang.en': 'English',
    'lang.es': 'Español',
    score: '{correct}/{answered} correctas',
    streak: 'Racha {streak}',
    help: 'Atajos de teclado',
    hint: 'Pista',
    hintMore: 'Más ayuda',
    skip: 'Saltar',
    next: 'Siguiente',
    submit: 'Comprobar',
    strict: 'Acentos estrictos',
    answerLabel: 'Tu respuesta',
    placeholder: 'Escribe la forma… (a\' → á, n~ → ñ)',
    correct: '¡Correcto!',
    accent: 'Correcto, pero ojo con el acento: {answer}',
    wrong: 'No exactamente.',
    skipped: 'Saltada.',
    answerIs: 'Respuesta: {answer}',
    alsoAccepted: 'También vale: {alts}',
    continue: 'Pulsa Enter para continuar',
    'prompt.conj': 'Conjuga',
    'prompt.es-en': '¿Qué significa este verbo?',
    'prompt.en-es': '¿Qué verbo significa…?',
    reflexive: 'reflexivo',
    'badge.mx': 'México',
    'badge.es': 'España',
    levelUp: '¡Subes de nivel! Ahora practicas {level}.',
    levelDown: 'Volvemos a {level} para repasar.',
    loading: 'Cargando…',
    loadError: 'No se pudo cargar la lista de verbos. Abre el sitio con un servidor http (ver README).',
    'keys.title': 'Atajos de teclado',
    'keys.options': 'Elegir una respuesta',
    'keys.enter': 'Comprobar / pasar a la siguiente tarjeta',
    'keys.esc': 'Saltar (muestra la respuesta)',
    'keys.hint': 'Pista (pulsa otra vez para más)',
    'keys.hintTyped': 'Pista mientras escribes la respuesta',
    'keys.help': 'Mostrar esta ayuda',
    'keys.accents': 'Escribe a\' e\' i\' o\' u\' para á é í ó ú, n~ para ñ y u" para ü.',
    close: 'Cerrar',
    credits: 'Créditos y licencias',
  },
};

export function t(lang, key, params = {}) {
  const s = UI[lang]?.[key] ?? UI.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? '');
}

export const uiKeys = (lang) => Object.keys(UI[lang]);

const TENSE_NAMES = {
  en: {
    pres: 'Present',
    pret: 'Preterite',
    impf: 'Imperfect',
    fut: 'Future',
    cond: 'Conditional',
    pres_perf: 'Present perfect',
    pluperf: 'Past perfect',
    fut_perf: 'Future perfect',
    cond_perf: 'Conditional perfect',
    past_ant: 'Past anterior',
    subj_pres: 'Present subjunctive',
    subj_impf: 'Imperfect subjunctive',
    subj_perf: 'Present perfect subjunctive',
    subj_pluperf: 'Past perfect subjunctive',
    subj_fut: 'Future subjunctive',
    subj_fut_perf: 'Future perfect subjunctive',
    imp_aff: 'Affirmative command',
    imp_neg: 'Negative command',
    gerund: 'Gerund',
    participle: 'Past participle',
  },
  es: {
    pres: 'Presente',
    pret: 'Pretérito indefinido',
    impf: 'Pretérito imperfecto',
    fut: 'Futuro',
    cond: 'Condicional',
    pres_perf: 'Pretérito perfecto',
    pluperf: 'Pluscuamperfecto',
    fut_perf: 'Futuro perfecto',
    cond_perf: 'Condicional perfecto',
    past_ant: 'Pretérito anterior',
    subj_pres: 'Presente de subjuntivo',
    subj_impf: 'Imperfecto de subjuntivo',
    subj_perf: 'Pretérito perfecto de subjuntivo',
    subj_pluperf: 'Pluscuamperfecto de subjuntivo',
    subj_fut: 'Futuro de subjuntivo',
    subj_fut_perf: 'Futuro perfecto de subjuntivo',
    imp_aff: 'Imperativo afirmativo',
    imp_neg: 'Imperativo negativo',
    gerund: 'Gerundio',
    participle: 'Participio',
  },
};

export const tenseName = (lang, id) => TENSE_NAMES[lang][id];

// What each tense means, for learners who don't remember the grammar terms.
//   short – shown in brackets after the tense name: "Preterite (simple past)"
//   use   – one line on when the tense is used
// These must never contain a Spanish verb form: it could be the answer to
// the card (tests/i18n.test.js checks this for every verb).
const TENSE_INFO = {
  en: {
    pres: ['now / usually', 'What happens now or regularly.'],
    pret: ['simple past', 'Finished actions at a specific time in the past.'],
    impf: ['was doing / used to', 'Ongoing or repeated actions, and descriptions, in the past.'],
    fut: ['will', 'What will happen; also guesses about the present.'],
    cond: ['would', 'What would happen; also polite requests.'],
    pres_perf: ['have done', 'Past actions connected to now. Spain also uses it for things done today, where Mexico usually prefers the preterite.'],
    pluperf: ['had done', 'An action completed before another moment in the past.'],
    fut_perf: ['will have done', 'What will be finished by a moment in the future; also guesses about the past.'],
    cond_perf: ['would have done', 'What would have happened, but didn\'t.'],
    past_ant: ['had done, literary', 'Right after another past action. Found almost only in formal writing.'],
    subj_pres: ['wishes, doubts', 'After expressions of wishing, doubt, emotion or requests, usually after que.'],
    subj_impf: ['if I were…', 'The subjunctive in the past, and in unreal "if" clauses.'],
    subj_perf: ['that I have done', 'The subjunctive for something that has already happened.'],
    subj_pluperf: ['if I had done', 'Unreal conditions in the past, and impossible wishes.'],
    subj_fut: ['archaic', 'Old-fashioned: only in legal texts and set phrases.'],
    subj_fut_perf: ['archaic', 'Old-fashioned: only in legal texts.'],
    imp_aff: ['Do it!', 'Telling someone to do something.'],
    imp_neg: ["Don't do it!", 'Telling someone not to do something.'],
    gerund: ['-ing form', 'With estar it means "to be doing".'],
    participle: ['-ed / -en form', 'Used with haber to form the perfect tenses, and as an adjective.'],
  },
  es: {
    pres: ['ahora / habitual', 'Acciones actuales o habituales.'],
    pret: ['pasado simple', 'Acciones terminadas en un momento concreto del pasado.'],
    impf: ['pasado en curso / hábitos', 'Acciones en curso, hábitos y descripciones en el pasado.'],
    fut: ['acciones venideras', 'Acciones venideras y suposiciones sobre el presente.'],
    cond: ['hipótesis', 'Situaciones hipotéticas y peticiones corteses.'],
    pres_perf: ['acción reciente', 'Acciones ya ocurridas pero conectadas con el presente. En España también para lo ocurrido hoy; en México se prefiere el pretérito.'],
    pluperf: ['anterior a otra acción', 'Una acción terminada antes de otro momento ya ocurrido.'],
    fut_perf: ['acción completa en el futuro', 'Acciones terminadas antes de un momento futuro; también suposiciones sobre lo ocurrido.'],
    cond_perf: ['hipótesis irreal', 'Hipótesis irreales sobre lo ya ocurrido.'],
    past_ant: ['literario', 'Justo antes de otra acción, en relatos. Casi solo en textos formales.'],
    subj_pres: ['deseos, dudas', 'Tras expresiones de deseo, duda, emoción o petición, normalmente con que.'],
    subj_impf: ['hipótesis, pasado', 'Subjuntivo en el pasado y en condiciones irreales con si.'],
    subj_perf: ['algo ya ocurrido', 'Subjuntivo sobre algo ya ocurrido.'],
    subj_pluperf: ['condición irreal', 'Condiciones irreales sobre lo ya ocurrido y deseos imposibles.'],
    subj_fut: ['arcaico', 'Anticuado: solo en textos legales y frases hechas.'],
    subj_fut_perf: ['arcaico', 'Anticuado: solo en textos legales.'],
    imp_aff: ['órdenes', 'Órdenes, instrucciones y consejos directos.'],
    imp_neg: ['prohibiciones', 'Prohibiciones y consejos en negativo.'],
    gerund: ['forma en -ndo', 'Con estar expresa una acción en curso.'],
    participle: ['forma en -do', 'Con haber forma los tiempos compuestos; también funciona como adjetivo.'],
  },
};

// English example sentences, with the verb phrase that matches the tense
// between asterisks. English on purpose: a Spanish example could contain the
// answer.
const TENSE_EXAMPLES = {
  pres: 'I *eat* breakfast every day.',
  pret: 'Yesterday I *ate* at noon.',
  impf: 'I *was eating* when you called. As a kid, I *used to eat* cereal.',
  fut: 'Tomorrow I *will eat* early.',
  cond: 'I *would eat* more if I were hungry.',
  pres_perf: 'I *have* already *eaten*.',
  pluperf: 'I *had* already *eaten* when you arrived.',
  fut_perf: 'By eight o\'clock I *will have eaten*.',
  cond_perf: 'I *would have eaten*, but there was no time.',
  past_ant: 'As soon as he *had eaten*, he left.',
  subj_pres: 'I want you *to eat* more.',
  subj_impf: 'If I *ate* more, I would grow.',
  subj_perf: 'I\'m glad you *have eaten*.',
  subj_pluperf: 'If I *had eaten*, I wouldn\'t be hungry now.',
  subj_fut: 'Whoever *shall enter* must pay.',
  subj_fut_perf: 'If anyone *shall have broken* this law…',
  imp_aff: '*Eat* your vegetables!',
  imp_neg: '*Don\'t eat* that!',
  gerund: 'I am *eating* right now.',
  participle: 'I have *eaten*. The door is *closed*.',
};

export const tenseShort = (lang, id) => TENSE_INFO[lang][id][0];

// "Preterite (simple past)" – the tense name with its plain meaning.
export const tenseLabel = (lang, id) => `${tenseName(lang, id)} (${tenseShort(lang, id)})`;

// One line for the card: when the tense is used, and an English example.
export function tenseInfoHtml(lang, id) {
  const example = esc(TENSE_EXAMPLES[id]).replace(/\*([^*]+)\*/g, '<em>$1</em>');
  const eg = lang === 'en' ? 'e.g.' : 'p. ej.';
  return `${esc(TENSE_INFO[lang][id][1])} <span class="example">${eg} <q lang="en">${example}</q></span>`;
}

const PERSON_LABELS = ['yo', 'tú', 'él / ella / usted', 'nosotros', 'vosotros', 'ellos / ellas / ustedes'];
const IMPERATIVE_LABELS = [null, 'tú', 'usted', 'nosotros', 'vosotros', 'ustedes'];

export function personLabel(tense, person) {
  if (person === null || person === undefined) return '';
  return TENSE_BY_ID[tense].mood === 'imperative' ? IMPERATIVE_LABELS[person] : PERSON_LABELS[person];
}

// ---------------------------------------------------------------------------
// Explanation notes

const HABER = {
  pres: ['he', 'has', 'ha', 'hemos', 'habéis', 'han'],
  impf: ['había', 'habías', 'había', 'habíamos', 'habíais', 'habían'],
  pret: ['hube', 'hubiste', 'hubo', 'hubimos', 'hubisteis', 'hubieron'],
  fut: ['habré', 'habrás', 'habrá', 'habremos', 'habréis', 'habrán'],
  cond: ['habría', 'habrías', 'habría', 'habríamos', 'habríais', 'habrían'],
  subj_pres: ['haya', 'hayas', 'haya', 'hayamos', 'hayáis', 'hayan'],
  subj_impf: ['hubiera', 'hubieras', 'hubiera', 'hubiéramos', 'hubierais', 'hubieran'],
  subj_fut: ['hubiere', 'hubieres', 'hubiere', 'hubiéremos', 'hubiereis', 'hubieren'],
};
const clsLabel = (cls) => (cls === 'ar' ? '-ar' : '-er/-ir');
// The present is the only simple tense whose -er and -ir endings differ.
const endingLabel = (tense, cls) => (tense === 'pres' && cls !== 'ar' ? `-${cls}` : clsLabel(cls));
const endingsFor = (table, cls) => ends(cls === 'ar' ? table.ar : cls === 'er' ? table.er : table.ir);

const TENSE_RULES = {
  en: (tense, cls) => {
    const aux = TENSE_BY_ID[tense].aux;
    if (aux) return `${TENSE_NAMES.en[tense]}: ${tenseName('en', aux).toLowerCase()} of <i>haber</i> (${HABER[aux].map(esc).join(', ')}) + past participle.`;
    switch (tense) {
      case 'pres':
      case 'impf':
      case 'pret':
        return `${TENSE_NAMES.en[tense]} endings for ${endingLabel(tense, cls)} verbs: ${endingsFor(ENDINGS[tense], cls)}.`;
      case 'fut':
        return `Future: infinitive (or an irregular stem) + ${ends(FUT)}.`;
      case 'cond':
        return `Conditional: infinitive (or the future's irregular stem) + ${ends(COND)}.`;
      case 'subj_pres':
        return `Present subjunctive: take the yo form of the present, drop the -o and switch the vowel: ${cls === 'ar' ? '-ar verbs take' : '-er/-ir verbs take'} ${endingsFor(ENDINGS.subj_pres, cls)}.`;
      case 'subj_impf':
        return 'Imperfect subjunctive: take the ellos form of the preterite, drop -ron, add -ra, -ras, -ra, -´ramos, -rais, -ran (or -se, -ses, -se, -´semos, -seis, -sen).';
      case 'subj_fut':
        return 'Future subjunctive (archaic; legal and literary texts): ellos preterite minus -ron + -re, -res, -re, -´remos, -reis, -ren.';
      case 'imp_aff':
        return 'Affirmative commands: tú uses the él form of the present; vosotros swaps the infinitive\'s -r for -d; usted, nosotros and ustedes use the present subjunctive.';
      case 'imp_neg':
        return 'Negative commands: no + the present subjunctive, for every person.';
      case 'gerund':
        return 'Gerund: -ar → -ando; -er/-ir → -iendo (-yendo after a vowel).';
      case 'participle':
        return 'Past participle: -ar → -ado; -er/-ir → -ido.';
    }
    return '';
  },
  es: (tense, cls) => {
    const aux = TENSE_BY_ID[tense].aux;
    if (aux) return `${TENSE_NAMES.es[tense]}: <i>haber</i> en ${tenseName('es', aux).toLowerCase()} (${HABER[aux].map(esc).join(', ')}) + participio.`;
    switch (tense) {
      case 'pres':
      case 'impf':
      case 'pret':
        return `Terminaciones de ${TENSE_NAMES.es[tense].toLowerCase()} para verbos en ${endingLabel(tense, cls)}: ${endingsFor(ENDINGS[tense], cls)}.`;
      case 'fut':
        return `Futuro: infinitivo (o una raíz irregular) + ${ends(FUT)}.`;
      case 'cond':
        return `Condicional: infinitivo (o la raíz irregular del futuro) + ${ends(COND)}.`;
      case 'subj_pres':
        return `Presente de subjuntivo: toma la forma de yo del presente, quita la -o y cambia la vocal: los verbos en ${cls === 'ar' ? '-ar llevan' : '-er/-ir llevan'} ${endingsFor(ENDINGS.subj_pres, cls)}.`;
      case 'subj_impf':
        return 'Imperfecto de subjuntivo: toma la forma de ellos del pretérito, quita -ron y añade -ra, -ras, -ra, -´ramos, -rais, -ran (o -se, -ses, -se, -´semos, -seis, -sen).';
      case 'subj_fut':
        return 'Futuro de subjuntivo (arcaico; textos legales y literarios): ellos del pretérito sin -ron + -re, -res, -re, -´remos, -reis, -ren.';
      case 'imp_aff':
        return 'Imperativo afirmativo: tú usa la forma de él del presente; vosotros cambia la -r del infinitivo por -d; usted, nosotros y ustedes usan el presente de subjuntivo.';
      case 'imp_neg':
        return 'Imperativo negativo: no + presente de subjuntivo, en todas las personas.';
      case 'gerund':
        return 'Gerundio: -ar → -ando; -er/-ir → -iendo (-yendo después de vocal).';
      case 'participle':
        return 'Participio: -ar → -ado; -er/-ir → -ido.';
    }
    return '';
  },
};

const PATTERN = {
  'e-ie': ['e', 'ie', null],
  'o-ue': ['o', 'ue', null],
  'u-ue': ['u', 'ue', null],
  'i-ie': ['i', 'ie', null],
  'e-i': ['e', 'i', 'i'],
  'e-ie-i': ['e', 'ie', 'i'],
  'o-ue-u': ['o', 'ue', 'u'],
};

const ORTH = {
  en: {
    'c-qu': 'Spelling change: c → qu before e keeps the hard k sound (busqué).',
    'g-gu': 'Spelling change: g → gu before e keeps the hard g sound (pagué).',
    'z-c': 'Spelling change: z → c before e (empecé); Spanish rarely writes ze.',
    'gu-gü': 'Spelling change: gu → gü before e so the u is still pronounced (averigüe).',
    'c-z': 'Spelling change: c → z before a or o keeps the soft c sound (venzo).',
    'g-j': 'Spelling change: g → j before a or o keeps the throaty sound (cojo, dirija).',
    'gu-g': 'Spelling change: gu → g before a or o, where the u is not needed (sigo, distinga).',
    'qu-c': 'Spelling change: qu → c before a or o.',
  },
  es: {
    'c-qu': 'Cambio ortográfico: c → qu delante de e para mantener el sonido /k/ (busqué).',
    'g-gu': 'Cambio ortográfico: g → gu delante de e para mantener el sonido de g suave (pagué).',
    'z-c': 'Cambio ortográfico: z → c delante de e (empecé); en español casi nunca se escribe ze.',
    'gu-gü': 'Cambio ortográfico: gu → gü delante de e para que la u se pronuncie (averigüe).',
    'c-z': 'Cambio ortográfico: c → z delante de a u o para mantener el sonido (venzo).',
    'g-j': 'Cambio ortográfico: g → j delante de a u o para mantener el sonido (cojo, dirija).',
    'gu-g': 'Cambio ortográfico: gu → g delante de a u o, donde la u ya no hace falta (sigo, distinga).',
    'qu-c': 'Cambio ortográfico: qu → c delante de a u o.',
  },
};

// " for tú" / " de tú" for a wrong pick, labeled by the tense it belongs to.
const personName = (lang, n, c) => {
  const p = n.why.person;
  if (p === null || p === undefined) return '';
  return (lang === 'en' ? ' for ' : ' de ') + b(personLabel(n.why.tense ?? c.tense, p));
};

// Each note: explain(note, ctx) and hint(note, ctx). Returning null skips it.
const NOTES = {
  en: {
    'tense-rule': { explain: (n) => TENSE_RULES.en(n.tense, n.cls) },
    irregular: { explain: (_, c) => `${b(c.inf)} is irregular here; this form has to be memorized.` },
    'yo-irregular': {
      explain: (n, c) => `The yo form of ${b(c.inf)} is irregular (${b(n.yo)}), and the whole present subjunctive is built on it.`,
      hint: (_, c) => `The yo form of ${b(c.inf)} is irregular, and the present subjunctive is built on it.`,
    },
    stem: {
      explain: (n, c) => `${b(c.inf)} is a stem-changing verb: the stressed ${b(PATTERN[n.pattern][0])} of the stem becomes ${b(PATTERN[n.pattern][1])} (in every form except nosotros and vosotros).`,
    },
    'stem-weak': {
      explain: (n, c) => `${b(c.inf)} is an -ir stem-changer, so ${b(PATTERN[n.pattern][0])} also becomes ${b(PATTERN[n.pattern][2])} here (él/ellos preterite, gerund, nosotros/vosotros subjunctive).`,
    },
    zc: { explain: () => 'Verbs ending in a vowel + -cer/-cir add z before the c when an a or o follows: conozco, conozca.' },
    'accent-stem': {
      explain: (_, c) => `The i/u of the stem is stressed here and takes a written accent: ${b(c.form)}.`,
      hint: () => 'The i/u of the stem is stressed here and needs a written accent.',
    },
    'uir-y': { explain: () => 'Verbs in -uir add y before endings that don\'t start with i: construyo, construya.' },
    y: { explain: () => 'An unstressed i between two vowels is written y (leyó, cayendo, construyeron).' },
    hiatus: { explain: () => 'After a, e or o, the i of the ending takes an accent so it is pronounced separately (leíste, caído).' },
    'drop-i': { explain: () => 'After ñ or ll, the i of -ió, -ieron and -iendo disappears (gruñó, bullendo).' },
    orth: { explain: (n) => ORTH.en[n.rule] },
    'pret-strong': {
      explain: (n, c) => `${b(c.inf)} has an irregular preterite stem ${b(n.stem + '-')} with unstressed endings -e, -iste, -o, -imos, -isteis, -ieron (no written accents).`,
      hint: (_, c) => `${b(c.inf)} has an irregular ("strong") preterite stem, with endings -e, -iste, -o, -imos, -isteis, -ieron and no written accents.`,
    },
    'pret-j': { explain: () => 'After j, the ellos ending is -eron, not -ieron (dijeron, trajeron).' },
    'fut-stem': {
      explain: (n, c) => `${b(c.inf)} uses the irregular stem ${b(n.stem + '-')} in the future and conditional.`,
      hint: (_, c) => `${b(c.inf)} has an irregular stem in the future and conditional.`,
    },
    'subj-from-pret': {
      explain: (n) => `Built from the ellos preterite ${b(n.p3)}: drop -ron and add the endings.`,
      hint: () => 'Start from the ellos form of the preterite.',
    },
    'imp-tu': { explain: () => 'Affirmative tú commands use the él/ella form of the present.' },
    'imp-tu-irregular': {
      explain: (_, c) => `${b(c.inf)} has a short, irregular tú command: ${b(c.form)}.`,
      hint: (_, c) => `${b(c.inf)} has a short, irregular tú command.`,
    },
    'imp-vos': { explain: () => 'Affirmative vosotros commands replace the -r of the infinitive with -d.' },
    'imp-from-subj': { explain: () => 'usted, nosotros and ustedes commands use the present subjunctive.' },
    'imp-neg': { explain: () => 'Negative commands are no + the present subjunctive.' },
    compound: {
      explain: (n) => `Compound tense: ${b(n.aux)} (haber) + the past participle ${b(n.pp)}.`,
      hint: () => 'Compound tense: the right form of haber + the past participle.',
    },
    'pp-irregular': {
      explain: (_, c) => `${b(c.inf)} has an irregular past participle: ${b(c.pp)}.`,
      hint: (_, c) => `${b(c.inf)} has an irregular past participle.`,
    },
    like: { explain: (n, c) => `${b(c.inf)} is conjugated like ${b(n.base)}.` },
    monosyllable: {
      explain: (_, c) => `Since 2010 the RAE writes one-syllable forms like ${b(c.form)} without an accent.`,
      hint: () => null,
    },
    impersonal: { explain: (_, c) => `Weather verbs like ${b(c.inf)} are used only in the third-person singular.` },
    reflexive: {
      explain: (n) =>
        n.enclitic
          ? 'In affirmative commands the reflexive pronoun attaches to the end of the verb, with an accent added to keep the stress where it was (levántate). Nosotros drops its -s (levantémonos) and vosotros its -d (levantaos).'
          : `Reflexive verb: put the pronoun ${b(n.pronoun)} before the verb.`,
    },
    vosotros: { explain: () => 'Vosotros is used only in Spain. In Mexico and the rest of Latin America, ustedes is used for any group.' },
    'verb-note': { explain: (n) => esc(n.note.en), hint: () => null },
    picked: {
      explain: (n, c) => {
        const f = b(n.form);
        switch (n.why.kind) {
          case 'regular':
            return `You chose ${f}: that's what a regular verb would do, but ${b(c.inf)} is irregular in this form.`;
          case 'person':
            return `You chose ${f}: that's the right tense, but it's the form${personName('en', n, c)}.`;
          case 'tense':
          case 'typed-form':
            return `${f} is the ${tenseName('en', n.why.tense).toLowerCase()}${personName('en', n, c)}.`;
          case 'accent-matters':
            return `The accent matters here: ${f} is a different form, the ${tenseName('en', n.why.tense).toLowerCase()}${personName('en', n, c)}.`;
          case 'negated':
            return `${f} puts no in front of the ${tenseName('en', n.why.tense).toLowerCase()}, but negative commands always use the present subjunctive.`;
          case 'ending':
            return `${f} uses the wrong ending for a ${clsLabel(c.cls)} verb.`;
        }
        return null;
      },
      hint: () => null,
    },
    meaning: { explain: (n) => `${b(n.inf)} means “${esc(n.en)}”.` },
    'picked-meaning': { explain: (n) => `You chose: ${b(n.inf)} means “${esc(n.en)}”.`, hint: () => null },
    'meaning-hint': { explain: (n) => `It starts with “${esc(n.letter)}”.` },
    reveal: { explain: (n) => `It starts like this: ${b(n.text)}` },
  },
  es: {
    'tense-rule': { explain: (n) => TENSE_RULES.es(n.tense, n.cls) },
    irregular: { explain: (_, c) => `${b(c.inf)} es irregular aquí; esta forma hay que memorizarla.` },
    'yo-irregular': {
      explain: (n, c) => `La forma de yo de ${b(c.inf)} es irregular (${b(n.yo)}), y todo el presente de subjuntivo se forma a partir de ella.`,
      hint: (_, c) => `La forma de yo de ${b(c.inf)} es irregular, y el presente de subjuntivo se forma a partir de ella.`,
    },
    stem: {
      explain: (n, c) => `${b(c.inf)} cambia la raíz: la ${b(PATTERN[n.pattern][0])} tónica se convierte en ${b(PATTERN[n.pattern][1])} (en todas las formas menos nosotros y vosotros).`,
    },
    'stem-weak': {
      explain: (n, c) => `${b(c.inf)} es un verbo en -ir con cambio de raíz, así que aquí la ${b(PATTERN[n.pattern][0])} también pasa a ${b(PATTERN[n.pattern][2])} (él/ellos del pretérito, gerundio, nosotros/vosotros del subjuntivo).`,
    },
    zc: { explain: () => 'Los verbos en vocal + -cer/-cir añaden z antes de la c cuando sigue a u o: conozco, conozca.' },
    'accent-stem': {
      explain: (_, c) => `La i/u de la raíz es tónica aquí y lleva tilde: ${b(c.form)}.`,
      hint: () => 'La i/u de la raíz es tónica aquí y necesita tilde.',
    },
    'uir-y': { explain: () => 'Los verbos en -uir añaden y antes de las terminaciones que no empiezan por i: construyo, construya.' },
    y: { explain: () => 'Una i átona entre dos vocales se escribe y (leyó, cayendo, construyeron).' },
    hiatus: { explain: () => 'Después de a, e u o, la i de la terminación lleva tilde para pronunciarse aparte (leíste, caído).' },
    'drop-i': { explain: () => 'Después de ñ o ll desaparece la i de -ió, -ieron e -iendo (gruñó, bullendo).' },
    orth: { explain: (n) => ORTH.es[n.rule] },
    'pret-strong': {
      explain: (n, c) => `${b(c.inf)} tiene una raíz irregular en el pretérito, ${b(n.stem + '-')}, con terminaciones átonas -e, -iste, -o, -imos, -isteis, -ieron (sin tilde).`,
      hint: (_, c) => `${b(c.inf)} tiene un pretérito «fuerte» con raíz irregular y terminaciones -e, -iste, -o, -imos, -isteis, -ieron sin tilde.`,
    },
    'pret-j': { explain: () => 'Después de j, la terminación de ellos es -eron, no -ieron (dijeron, trajeron).' },
    'fut-stem': {
      explain: (n, c) => `${b(c.inf)} usa la raíz irregular ${b(n.stem + '-')} en el futuro y el condicional.`,
      hint: (_, c) => `${b(c.inf)} tiene una raíz irregular en el futuro y el condicional.`,
    },
    'subj-from-pret': {
      explain: (n) => `Se forma a partir de ellos del pretérito, ${b(n.p3)}: quita -ron y añade las terminaciones.`,
      hint: () => 'Parte de la forma de ellos del pretérito.',
    },
    'imp-tu': { explain: () => 'El imperativo afirmativo de tú usa la forma de él/ella del presente.' },
    'imp-tu-irregular': {
      explain: (_, c) => `${b(c.inf)} tiene un imperativo de tú corto e irregular: ${b(c.form)}.`,
      hint: (_, c) => `${b(c.inf)} tiene un imperativo de tú corto e irregular.`,
    },
    'imp-vos': { explain: () => 'El imperativo afirmativo de vosotros cambia la -r del infinitivo por -d.' },
    'imp-from-subj': { explain: () => 'Los imperativos de usted, nosotros y ustedes usan el presente de subjuntivo.' },
    'imp-neg': { explain: () => 'El imperativo negativo es no + presente de subjuntivo.' },
    compound: {
      explain: (n) => `Tiempo compuesto: ${b(n.aux)} (haber) + el participio ${b(n.pp)}.`,
      hint: () => 'Tiempo compuesto: la forma adecuada de haber + el participio.',
    },
    'pp-irregular': {
      explain: (_, c) => `${b(c.inf)} tiene un participio irregular: ${b(c.pp)}.`,
      hint: (_, c) => `${b(c.inf)} tiene un participio irregular.`,
    },
    like: { explain: (n, c) => `${b(c.inf)} se conjuga como ${b(n.base)}.` },
    monosyllable: {
      explain: (_, c) => `Desde 2010 la RAE escribe sin tilde las formas de una sílaba como ${b(c.form)}.`,
      hint: () => null,
    },
    impersonal: { explain: (_, c) => `Los verbos del tiempo como ${b(c.inf)} solo se usan en tercera persona del singular.` },
    reflexive: {
      explain: (n) =>
        n.enclitic
          ? 'En el imperativo afirmativo el pronombre va pegado al final del verbo, con tilde para mantener el acento donde estaba (levántate). Nosotros pierde la -s (levantémonos) y vosotros la -d (levantaos).'
          : `Verbo reflexivo: pon el pronombre ${b(n.pronoun)} delante del verbo.`,
    },
    vosotros: { explain: () => 'Vosotros solo se usa en España. En México y el resto de Latinoamérica se usa ustedes para cualquier grupo.' },
    'verb-note': { explain: (n) => esc(n.note.es ?? n.note.en), hint: () => null },
    picked: {
      explain: (n, c) => {
        const f = b(n.form);
        switch (n.why.kind) {
          case 'regular':
            return `Elegiste ${f}: así sería con un verbo regular, pero ${b(c.inf)} es irregular en esta forma.`;
          case 'person':
            return `Elegiste ${f}: el tiempo es correcto, pero es la forma${personName('es', n, c)}.`;
          case 'tense':
          case 'typed-form':
            return `${f} es ${tenseName('es', n.why.tense).toLowerCase()}${personName('es', n, c)}.`;
          case 'accent-matters':
            return `Aquí la tilde importa: ${f} es otra forma, ${tenseName('es', n.why.tense).toLowerCase()}${personName('es', n, c)}.`;
          case 'negated':
            return `${f} pone no delante del ${tenseName('es', n.why.tense).toLowerCase()}, pero el imperativo negativo siempre usa el presente de subjuntivo.`;
          case 'ending':
            return `${f} lleva una terminación equivocada para un verbo en ${clsLabel(c.cls)}.`;
        }
        return null;
      },
      hint: () => null,
    },
    meaning: { explain: (n) => `${b(n.inf)} significa “${esc(n.en)}”.` },
    'picked-meaning': { explain: (n) => `Elegiste: ${b(n.inf)} significa “${esc(n.en)}”.`, hint: () => null },
    'meaning-hint': { explain: (n) => `Empieza por “${esc(n.letter)}”.` },
    reveal: { explain: (n) => `Empieza así: ${b(n.text)}` },
  },
};

export const noteKeys = (lang) => Object.keys(NOTES[lang]);

/** Render one note as HTML (or null to skip it). mode is 'explain' or 'hint'. */
export function renderNote(lang, note, mode, ctx) {
  const tpl = NOTES[lang][note.key] ?? NOTES.en[note.key];
  if (!tpl) throw new Error(`no template for note "${note.key}"`);
  const fn = mode === 'hint' && 'hint' in tpl ? tpl.hint : tpl.explain;
  return fn(note, ctx);
}
