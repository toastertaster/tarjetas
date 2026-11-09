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
    'mode.mixed': 'Mixed',
    'scope.verbs': 'Verbs: all tenses',
    'scope.meanings': 'Verb meanings',
    'scope.vocab': 'Vocabulary: all topics',
    'scope.review': 'My mistakes ({n})',
    'scope.cat': 'Review: {label}',
    'scope.sentences': 'Verbs in real sentences',
    'scope.recognize': 'Recognize conjugated verbs',
    'scope.listening': 'Listen to real sentences',
    'scope.idioms': 'Idioms & expressions',
    'scope.conversation': 'Conversation: all situations',
    'scope.grammar': 'Grammar: all topics',
    'group.verbs': 'Verbs',
    'group.vocab': 'Vocabulary topics',
    'group.phrases': 'Idioms & conversation',
    'group.listening': 'Listening',
    'group.grammar': 'Grammar',
    'group.review': 'Review',
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
    showAnswer: 'Show answer',
    next: 'Next',
    submit: 'Check',
    strict: 'Strict accents',
    answerLabel: 'Your answer',
    placeholder: 'Type the form… (a\' → á, n~ → ñ)',
    correct: 'Correct!',
    accent: 'Correct — but watch the accent: {answer}',
    wrong: 'Not quite.',
    shown: 'Answer shown (not scored)',
    answerIs: 'Answer: {answer}',
    alsoAccepted: 'Also accepted: {alts}',
    continue: 'Press Enter to continue',
    'task.conj': 'Conjugate it for {person} in the {tense}',
    'task.nonfinite': 'What is its {tense}?',
    'task.sentence': 'Fill in the blank with {inf} in the {tense}',
    say: 'Sounds like',
    'prompt.es-en': 'What does this verb mean?',
    'prompt.en-es': 'Which Spanish verb means this?',
    'prompt.vocab.es-en': 'What does this mean?',
    'prompt.vocab.en-es': 'How do you say this in Spanish?',
    'prompt.vocab.en-es-region': 'How do you say this in {region}?',
    'prompt.vocab.regional': 'They say this in {from}. What do they say in {to}?',
    'prompt.idiom.es-en': 'What does this expression mean?',
    'prompt.idiom.en-es': 'Which expression means this?',
    'prompt.conversation': 'What is the best reply?',
    'prompt.grammar': 'Which word fills the blank?',
    'prompt.recognize': 'Which verb, person and tense is this?',
    'chip.recognize': 'Recognize',
    'prompt.listen': 'What does it mean?',
    listen: 'Listen',
    listenSlow: 'Slower',
    noVoice: 'This device has no Spanish voice to read aloud with.',
    'table.title': '{inf} in the {tense}',
    'credit.sentence': 'Sentence {link} by {by}',
    'credit.translation': 'translation {link} by {by}',
    'loadSentencesError': 'Could not load the example sentences.',
    invented: 'not a real form',
    rememberArticle: 'Correct! With its article: {answer}',
    settings: 'Settings',
    review: 'Review',
    scoreAria: '{correct} of {answered} correct, streak {streak}',
    'review.title': 'What to review',
    'review.intro': 'Topics you have missed more than once recently. Each one comes with the rule and the examples you got wrong.',
    'review.empty': 'Nothing to review yet. Topics you miss repeatedly will show up here.',
    'review.missed': 'Missed {misses} of your last {attempts}',
    'review.examples': 'You missed',
    'review.practice': 'Practice this',
    'review.practiceDeck': 'Practice my mistakes ({n})',
    'review.deckHint': 'Cards you got wrong come back until you answer them right twice in a row.',
    'review.back': 'Back to the cards',
    'review.reset': 'Clear review history',
    'review.resetConfirm': 'Clear your review history and mistakes deck?',
    'review.deckEmpty': 'No mistakes left to practice. Well done!',
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
    'keys.esc': 'Skip to the next card (not scored)',
    'keys.hint': 'Hint (press again for more)',
    'keys.answer': 'Show the answer (not scored)',
    'keys.speak': 'Listen: read the Spanish aloud',
    'keys.typed': 'Hint / show the answer / listen while typing in the answer box',
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
    'mode.mixed': 'Mixto',
    'scope.verbs': 'Verbos: todos los tiempos',
    'scope.meanings': 'Significado de verbos',
    'scope.vocab': 'Vocabulario: todos los temas',
    'scope.review': 'Mis errores ({n})',
    'scope.cat': 'Repaso: {label}',
    'scope.sentences': 'Verbos en frases reales',
    'scope.recognize': 'Reconocer verbos conjugados',
    'scope.listening': 'Escuchar frases reales',
    'scope.idioms': 'Modismos y expresiones',
    'scope.conversation': 'Conversación: todas las situaciones',
    'scope.grammar': 'Gramática: todos los temas',
    'group.verbs': 'Verbos',
    'group.vocab': 'Temas de vocabulario',
    'group.phrases': 'Modismos y conversación',
    'group.listening': 'Comprensión auditiva',
    'group.grammar': 'Gramática',
    'group.review': 'Repaso',
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
    showAnswer: 'Ver respuesta',
    next: 'Siguiente',
    submit: 'Comprobar',
    strict: 'Acentos estrictos',
    answerLabel: 'Tu respuesta',
    placeholder: 'Escribe la forma… (a\' → á, n~ → ñ)',
    correct: '¡Correcto!',
    accent: 'Correcto, pero ojo con el acento: {answer}',
    wrong: 'No exactamente.',
    shown: 'Respuesta mostrada (no cuenta)',
    answerIs: 'Respuesta: {answer}',
    alsoAccepted: 'También vale: {alts}',
    continue: 'Pulsa Enter para continuar',
    'task.conj': 'Conjúgalo para {person} en {tense}',
    'task.nonfinite': '¿Cuál es su {tense}?',
    'task.sentence': 'Completa la frase con {inf} en {tense}',
    say: 'Suena como',
    'prompt.es-en': '¿Qué significa este verbo?',
    'prompt.en-es': '¿Qué verbo español significa esto?',
    'prompt.vocab.es-en': '¿Qué significa?',
    'prompt.vocab.en-es': '¿Cómo se dice en español?',
    'prompt.vocab.en-es-region': '¿Cómo se dice en {region}?',
    'prompt.vocab.regional': 'Así se dice en {from}. ¿Y en {to}?',
    'prompt.idiom.es-en': '¿Qué significa esta expresión?',
    'prompt.idiom.en-es': '¿Qué expresión significa esto?',
    'prompt.conversation': '¿Cuál es la mejor respuesta?',
    'prompt.grammar': '¿Qué palabra completa la frase?',
    'prompt.recognize': '¿Qué verbo, persona y tiempo es?',
    'chip.recognize': 'Reconocer',
    'prompt.listen': '¿Qué significa?',
    listen: 'Escuchar',
    listenSlow: 'Más despacio',
    noVoice: 'Este dispositivo no tiene una voz en español para leer en voz alta.',
    'table.title': '{inf} en {tense}',
    'credit.sentence': 'Frase {link} de {by}',
    'credit.translation': 'traducción {link} de {by}',
    'loadSentencesError': 'No se pudieron cargar las frases de ejemplo.',
    invented: 'esta forma no existe',
    rememberArticle: '¡Correcto! Con su artículo: {answer}',
    settings: 'Ajustes',
    review: 'Repaso',
    scoreAria: '{correct} de {answered} correctas, racha {streak}',
    'review.title': 'Qué repasar',
    'review.intro': 'Temas que has fallado más de una vez últimamente, con la regla y los ejemplos que fallaste.',
    'review.empty': 'Todavía no hay nada que repasar. Aquí aparecerán los temas que falles varias veces.',
    'review.missed': 'Fallaste {misses} de tus últimos {attempts}',
    'review.examples': 'Fallaste',
    'review.practice': 'Practicar esto',
    'review.practiceDeck': 'Practicar mis errores ({n})',
    'review.deckHint': 'Las tarjetas que fallas vuelven hasta que las aciertas dos veces seguidas.',
    'review.back': 'Volver a las tarjetas',
    'review.reset': 'Borrar el historial de repaso',
    'review.resetConfirm': '¿Borrar tu historial de repaso y tus errores?',
    'review.deckEmpty': 'No quedan errores por practicar. ¡Bien hecho!',
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
    'keys.esc': 'Saltar a la siguiente tarjeta (no cuenta)',
    'keys.hint': 'Pista (pulsa otra vez para más)',
    'keys.answer': 'Ver la respuesta (no cuenta)',
    'keys.speak': 'Escuchar: lee el español en voz alta',
    'keys.typed': 'Pista / ver la respuesta / escuchar mientras escribes',
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

const tatoebaLink = (id) =>
  `<a href="https://tatoeba.org/en/sentences/show/${encodeURIComponent(id)}" target="_blank" rel="noopener">#${esc(id)}</a>`;

/**
 * "Sentence #123 by X, translation #456 by Y": the attribution Tatoeba's
 * license asks for, of the sentence and (when shown) its translation.
 */
export function tatoebaCredit(lang, s, { translation = true } = {}) {
  const parts = [t(lang, 'credit.sentence', { link: tatoebaLink(s.id), by: esc(s.by) })];
  if (translation) parts.push(t(lang, 'credit.translation', { link: tatoebaLink(s.enId), by: esc(s.enBy) }));
  return `${parts.join(', ')} · Tatoeba, CC BY 2.0 FR`;
}
const creditSmall = (lang, n, opts) => `<small class="credit">${tatoebaCredit(lang, n, opts)}</small>`;

/**
 * One reading of a conjugated form, "tener · nosotros · Preterite", as HTML:
 * { inf, tense, persons } (persons [null] for the gerund and participle).
 */
export function readingHtml(lang, r) {
  const persons = r.persons[0] === null ? [] : [r.persons.map((p) => esc(personLabel(r.tense, p))).join(lang === 'en' ? ' or ' : ' o ')];
  return [`<span lang="es">${esc(r.inf)}</span>`, ...persons, esc(tenseName(lang, r.tense))].join(' · ');
}

// A Tatoeba sentence with its verb in bold.
const sentenceHtml = (n) =>
  `<span lang="es">${esc(n.es.slice(0, n.blank[0]))}<b>${esc(n.es.slice(n.blank[0], n.blank[1]))}</b>${esc(n.es.slice(n.blank[1]))}</span>`;
// The persons a form can be: "yo or él / ella / usted".
const personList = (n, or) => n.persons.map((p) => b(personLabel(n.tense, p))).join(or);

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
    note: { explain: (n) => esc(n.note.en), hint: () => null },
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
    'meaning-hint': { explain: (n) => `${n.english ? 'In English it' : 'It'} starts with “${esc(n.letter)}”.` },
    'in-sentence': {
      explain: (n) => `${sentenceHtml(n)} — “${esc(n.en)}” ${creditSmall('en', n)}`,
      hint: (n) => `Here it is in a sentence: ${sentenceHtml(n)} ${creditSmall('en', n, { translation: false })}`,
    },
    reading: {
      explain: (n) => `${b(n.form)} = ${readingHtml('en', n)}. ${b(n.inf)} means “${esc(n.en)}”, so ${b(n.form)} means “${esc(n.english)}”.`,
    },
    'picked-reading': { explain: (n) => `You chose ${readingHtml('en', n)}: that would be ${b(n.form)}.`, hint: () => null },
    'recognize-hint': { explain: (n) => `It's a form of ${b(n.inf)} (“${esc(n.en)}”).` },
    transcript: { explain: (n) => `It says: <span lang="es">${esc(n.es)}</span>` },
    'picked-listen': { explain: (n) => `You chose “${esc(n.en)}”, which would be ${b(n.es)}`, hint: () => null },
    'vocab-meaning': { explain: (n) => `${b(n.es)} means “${esc(n.en)}”.` },
    'vocab-regions': { explain: (n) => `Mexico: ${b(n.mx)} · Spain: ${b(n.es)}` },
    'picked-vocab': { explain: (n) => `You chose: ${b(n.es)} means “${esc(n.en)}”.`, hint: () => null },
    'vocab-gender': {
      explain: (n) => `Watch the gender: it's ${b(n.expected)} (${n.gender === 'f' ? 'feminine' : 'masculine'}).`,
      hint: () => null,
    },
    'vocab-other-region': {
      explain: (n) => `${b(n.form)} is what they say in ${REGION_NAMES.en[n.region]}; in ${REGION_NAMES.en[n.asked]} it's ${b(n.expected)}.`,
      hint: () => null,
    },
    'vocab-hint': {
      explain: (n) =>
        n.gender
          ? `A ${n.gender === 'f' ? 'feminine' : 'masculine'} noun starting with “${esc(n.letter)}”.`
          : `It starts with “${esc(n.letter)}”.`,
    },
    reveal: { explain: (n) => `It starts like this: ${b(n.text)}` },
    sentence: { explain: (n) => `${sentenceHtml(n)} — “${esc(n.en)}”` },
    'sentence-person': { explain: (n) => `Subject: ${personList(n, ' or ')}.` },
    'idiom-meaning': { explain: (n) => `${b(n.es)} means “${esc(n.en)}”.` },
    'picked-idiom': { explain: (n) => `You chose: ${b(n.es)} means “${esc(n.en)}”.`, hint: () => null },
    literal: { explain: (n) => `Literally: “${esc(n.literal)}”.` },
    example: { explain: (n) => `${b(n.es)} — “${esc(n.en)}”` },
    'phrase-region': { explain: (n) => `Used mainly in ${REGION_NAMES.en[n.region]}.` },
    exchange: { explain: (n) => `They say ${b(n.prompt.es)} (“${esc(n.prompt.en)}”). A good reply: ${b(n.answer.es)} (“${esc(n.answer.en)}”).` },
    'picked-reply': { explain: (n) => `You chose ${b(n.es)} (“${esc(n.en)}”), which doesn't answer what they said.`, hint: () => null },
    'they-said': { explain: (n) => `They said: “${esc(n.en)}”` },
    'grammar-why': { explain: (n) => esc(n.why.en), hint: () => null },
    'grammar-tip': { explain: (n) => esc(n.tip.en) },
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
    note: { explain: (n) => esc(n.note.es ?? n.note.en), hint: () => null },
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
    'meaning-hint': { explain: (n) => `${n.english ? 'En inglés empieza' : 'Empieza'} por “${esc(n.letter)}”.` },
    'in-sentence': {
      explain: (n) => `${sentenceHtml(n)} — “${esc(n.en)}” ${creditSmall('es', n)}`,
      hint: (n) => `Así se usa en una frase: ${sentenceHtml(n)} ${creditSmall('es', n, { translation: false })}`,
    },
    reading: {
      explain: (n) => `${b(n.form)} = ${readingHtml('es', n)}. ${b(n.inf)} significa “${esc(n.en)}”, así que ${b(n.form)} significa “${esc(n.english)}”.`,
    },
    'picked-reading': { explain: (n) => `Elegiste ${readingHtml('es', n)}: sería ${b(n.form)}.`, hint: () => null },
    'recognize-hint': { explain: (n) => `Es una forma de ${b(n.inf)} (“${esc(n.en)}”).` },
    transcript: { explain: (n) => `Dice: <span lang="es">${esc(n.es)}</span>` },
    'picked-listen': { explain: (n) => `Elegiste “${esc(n.en)}”, que sería ${b(n.es)}`, hint: () => null },
    'vocab-meaning': { explain: (n) => `${b(n.es)} significa “${esc(n.en)}”.` },
    'vocab-regions': { explain: (n) => `México: ${b(n.mx)} · España: ${b(n.es)}` },
    'picked-vocab': { explain: (n) => `Elegiste: ${b(n.es)} significa “${esc(n.en)}”.`, hint: () => null },
    'vocab-gender': {
      explain: (n) => `Ojo con el género: es ${b(n.expected)} (${n.gender === 'f' ? 'femenino' : 'masculino'}).`,
      hint: () => null,
    },
    'vocab-other-region': {
      explain: (n) => `${b(n.form)} es como se dice en ${REGION_NAMES.es[n.region]}; en ${REGION_NAMES.es[n.asked]} se dice ${b(n.expected)}.`,
      hint: () => null,
    },
    'vocab-hint': {
      explain: (n) =>
        n.gender
          ? `Un sustantivo ${n.gender === 'f' ? 'femenino' : 'masculino'} que empieza por “${esc(n.letter)}”.`
          : `Empieza por “${esc(n.letter)}”.`,
    },
    reveal: { explain: (n) => `Empieza así: ${b(n.text)}` },
    sentence: { explain: (n) => `${sentenceHtml(n)} — “${esc(n.en)}”` },
    'sentence-person': { explain: (n) => `Sujeto: ${personList(n, ' o ')}.` },
    'idiom-meaning': { explain: (n) => `${b(n.es)} significa “${esc(n.en)}”.` },
    'picked-idiom': { explain: (n) => `Elegiste: ${b(n.es)} significa “${esc(n.en)}”.`, hint: () => null },
    literal: { explain: (n) => `Literalmente: “${esc(n.literal)}”.` },
    example: { explain: (n) => `${b(n.es)} — “${esc(n.en)}”` },
    'phrase-region': { explain: (n) => `Se usa sobre todo en ${REGION_NAMES.es[n.region]}.` },
    exchange: { explain: (n) => `Te dicen ${b(n.prompt.es)} (“${esc(n.prompt.en)}”). Una buena respuesta: ${b(n.answer.es)} (“${esc(n.answer.en)}”).` },
    'picked-reply': { explain: (n) => `Elegiste ${b(n.es)} (“${esc(n.en)}”), que no responde a lo que te dijeron.`, hint: () => null },
    'they-said': { explain: (n) => `Te dijeron: “${esc(n.en)}”` },
    'grammar-why': { explain: (n) => esc(n.why.es ?? n.why.en), hint: () => null },
    'grammar-tip': { explain: (n) => esc(n.tip.es ?? n.tip.en) },
  },
};

export const noteKeys = (lang) => Object.keys(NOTES[lang]);

const REGION_NAMES = { en: { mx: 'Mexico', es: 'Spain' }, es: { mx: 'México', es: 'España' } };
export const regionName = (lang, r) => REGION_NAMES[lang][r];

// ---------------------------------------------------------------------------
// Review categories (see js/review.js): a label and a short tip each.
// Tense, vocabulary topic, conversation situation and grammar set categories
// are labeled from the tense names and the content data instead.

const CATEGORIES = {
  en: {
    'stem:e-ie': ['Stem change e → ie (pienso, quiero)', 'In stressed forms the e of the stem becomes ie. Nosotros and vosotros keep the e: pensamos.'],
    'stem:o-ue': ['Stem change o → ue (puedo, vuelvo)', 'In stressed forms the o of the stem becomes ue. Nosotros and vosotros keep the o: podemos.'],
    'stem:u-ue': ['Stem change u → ue (juego)', 'Only jugar: the stressed u becomes ue (juego, juegas), but jugamos.'],
    'stem:i-ie': ['Stem change i → ie (adquiero)', 'adquirir and inquirir: the stressed i becomes ie.'],
    'stem:e-i': ['Stem change e → i (pido, sigo)', 'In stressed forms of these -ir verbs the e becomes i, and it also does in the preterite él/ellos and the gerund: pidió, pidiendo.'],
    'stem:e-ie-i': ['Stem change e → ie / i (siento, sintió)', 'Stressed forms use ie (siento); the preterite él/ellos, gerund and nosotros/vosotros subjunctive use i (sintió, sintiendo, sintamos).'],
    'stem:o-ue-u': ['Stem change o → ue / u (duermo, durmió)', 'Stressed forms use ue (duermo); the preterite él/ellos, gerund and nosotros/vosotros subjunctive use u (durmió, durmiendo, durmamos).'],
    'stem-weak': ['-ir stem changes outside the present', 'Stem-changing -ir verbs also change e → i and o → u in the preterite él/ellos, the gerund, and the nosotros/vosotros subjunctive.'],
    'yo-irregular': ['Irregular yo forms (tengo, hago, salgo)', 'Many common verbs have an irregular yo form in the present, and the whole present subjunctive is built on it: tengo → tenga.'],
    zc: ['-zc verbs (conozco, ofrezca)', 'Verbs ending in a vowel + -cer/-cir add z before the c in the yo form and the present subjunctive: conozco, conozca.'],
    'pret-strong': ['Irregular preterite stems (tuve, hice, dije)', 'These verbs use a new stem in the preterite with unaccented endings -e, -iste, -o, -imos, -isteis, -ieron: tener → tuv-, hacer → hic-, decir → dij- (dijeron).'],
    'fut-stem': ['Irregular future stems (tendré, haré, podré)', 'A dozen verbs shorten or change their stem in the future and conditional: tendr-, pondr-, saldr-, har-, dir-, podr-, querr-, sabr-, cabr-, habr-.'],
    'pp-irregular': ['Irregular past participles (hecho, escrito, vuelto)', 'Common irregular participles: abierto, dicho, escrito, hecho, muerto, puesto, roto, visto, vuelto; compounds follow them (devuelto, descrito).'],
    'imp-tu-irregular': ['Short tú commands (pon, ten, haz, di)', 'Eight verbs have a short affirmative tú command: di, haz, ve, pon, sal, sé, ten, ven. Compounds add an accent: mantén, compón.'],
    orth: ['Spelling changes (busqué, pagué, empecé, cojo)', 'The spelling changes to keep the sound: c → qu and g → gu before e, z → c before e, g → j and gu → g before a/o.'],
    accents: ['Written accents (envío, leíste, hui)', 'Stressed í/ú next to another vowel need an accent (envío, reúno, leíste); one-syllable forms take none (hui, rio, guio).'],
    'y-insertion': ['i → y between vowels (leyó, construyo)', 'An unstressed i between vowels is written y (leyó, cayendo), and -uir verbs add y: construyo, construya.'],
    reflexive: ['Reflexive pronouns (me levanto)', 'Reflexive verbs need the pronoun that matches the person: me, te, se, nos, os, se.'],
    'reflexive-commands': ['Pronouns in commands (levántate, vámonos)', 'In affirmative commands the pronoun attaches to the end and an accent keeps the stress (levántate); nosotros drops -s (levantémonos), vosotros drops -d (levantaos).'],
    irregular: ['Fully irregular forms (ser, ir, haber, dar)', 'Some forms follow no pattern and have to be memorized: soy, fui, voy, he, doy, sé.'],
    vosotros: ['Vosotros forms', 'Spain uses vosotros for "you all" among friends: -áis/-éis/-ís in the present, -steis in the preterite, -d in commands.'],
    meanings: ['Verb meanings', 'Which Spanish verb means what.'],
    recognize: ['Recognizing conjugated verbs', 'Read the ending first: -mos is nosotros, -ron is ellos in the preterite, -ría the conditional, -ra/-se the imperfect subjunctive. Then find the verb under any stem change (tuv- → tener).'],
    listening: ['Listening', 'Listen for the verb and its ending first. Play a sentence again, or slower, as often as you need.'],
    regional: ['Mexico ↔ Spain words', 'Everyday words that differ between Mexico and Spain: carro/coche, computadora/ordenador.'],
    idioms: ['Idioms & expressions', 'Idioms rarely mean what their words say. Learn each one with its literal image and an example: meter la pata, literally "to put in the paw", means to put your foot in it.'],
  },
  es: {
    'stem:e-ie': ['Cambio de raíz e → ie (pienso, quiero)', 'En las formas tónicas la e de la raíz pasa a ie. Nosotros y vosotros mantienen la e: pensamos.'],
    'stem:o-ue': ['Cambio de raíz o → ue (puedo, vuelvo)', 'En las formas tónicas la o de la raíz pasa a ue. Nosotros y vosotros mantienen la o: podemos.'],
    'stem:u-ue': ['Cambio de raíz u → ue (juego)', 'Solo jugar: la u tónica pasa a ue (juego, juegas), pero jugamos.'],
    'stem:i-ie': ['Cambio de raíz i → ie (adquiero)', 'adquirir e inquirir: la i tónica pasa a ie.'],
    'stem:e-i': ['Cambio de raíz e → i (pido, sigo)', 'En las formas tónicas de estos verbos en -ir la e pasa a i, y también en él/ellos del pretérito y el gerundio: pidió, pidiendo.'],
    'stem:e-ie-i': ['Cambio de raíz e → ie / i (siento, sintió)', 'Las formas tónicas llevan ie (siento); él/ellos del pretérito, el gerundio y nosotros/vosotros del subjuntivo llevan i (sintió, sintiendo, sintamos).'],
    'stem:o-ue-u': ['Cambio de raíz o → ue / u (duermo, durmió)', 'Las formas tónicas llevan ue (duermo); él/ellos del pretérito, el gerundio y nosotros/vosotros del subjuntivo llevan u (durmió, durmiendo, durmamos).'],
    'stem-weak': ['Cambios de raíz en -ir fuera del presente', 'Los verbos en -ir con cambio de raíz también cambian e → i y o → u en él/ellos del pretérito, el gerundio y nosotros/vosotros del subjuntivo.'],
    'yo-irregular': ['Formas de yo irregulares (tengo, hago, salgo)', 'Muchos verbos comunes tienen la forma de yo del presente irregular, y todo el presente de subjuntivo se forma a partir de ella: tengo → tenga.'],
    zc: ['Verbos en -zc (conozco, ofrezca)', 'Los verbos en vocal + -cer/-cir añaden z antes de la c en yo y en el presente de subjuntivo: conozco, conozca.'],
    'pret-strong': ['Raíces irregulares del pretérito (tuve, hice, dije)', 'Estos verbos usan otra raíz en el pretérito con terminaciones sin tilde -e, -iste, -o, -imos, -isteis, -ieron: tener → tuv-, hacer → hic-, decir → dij- (dijeron).'],
    'fut-stem': ['Raíces irregulares del futuro (tendré, haré, podré)', 'Una docena de verbos acortan o cambian la raíz en el futuro y el condicional: tendr-, pondr-, saldr-, har-, dir-, podr-, querr-, sabr-, cabr-, habr-.'],
    'pp-irregular': ['Participios irregulares (hecho, escrito, vuelto)', 'Participios irregulares comunes: abierto, dicho, escrito, hecho, muerto, puesto, roto, visto, vuelto; los compuestos los siguen (devuelto, descrito).'],
    'imp-tu-irregular': ['Imperativos cortos de tú (pon, ten, haz, di)', 'Ocho verbos tienen un imperativo afirmativo de tú corto: di, haz, ve, pon, sal, sé, ten, ven. Los compuestos llevan tilde: mantén, compón.'],
    orth: ['Cambios ortográficos (busqué, pagué, empecé, cojo)', 'La ortografía cambia para mantener el sonido: c → qu y g → gu delante de e, z → c delante de e, g → j y gu → g delante de a/o.'],
    accents: ['Tildes (envío, leíste, hui)', 'La í/ú tónica junto a otra vocal lleva tilde (envío, reúno, leíste); las formas de una sílaba no llevan (hui, rio, guio).'],
    'y-insertion': ['i → y entre vocales (leyó, construyo)', 'Una i átona entre vocales se escribe y (leyó, cayendo), y los verbos en -uir añaden y: construyo, construya.'],
    reflexive: ['Pronombres reflexivos (me levanto)', 'Los verbos reflexivos llevan el pronombre de su persona: me, te, se, nos, os, se.'],
    'reflexive-commands': ['Pronombres en el imperativo (levántate, vámonos)', 'En el imperativo afirmativo el pronombre va al final con tilde para mantener el acento (levántate); nosotros pierde la -s (levantémonos) y vosotros la -d (levantaos).'],
    irregular: ['Formas totalmente irregulares (ser, ir, haber, dar)', 'Algunas formas no siguen ningún patrón y hay que memorizarlas: soy, fui, voy, he, doy, sé.'],
    vosotros: ['Formas de vosotros', 'En España se usa vosotros para "ustedes" en confianza: -áis/-éis/-ís en presente, -steis en pretérito, -d en el imperativo.'],
    meanings: ['Significado de verbos', 'Qué significa cada verbo.'],
    recognize: ['Reconocer verbos conjugados', 'Mira primero la terminación: -mos es nosotros, -ron es ellos en el pretérito, -ría el condicional, -ra/-se el imperfecto de subjuntivo. Luego busca el verbo bajo el cambio de raíz (tuv- → tener).'],
    listening: ['Comprensión auditiva', 'Escucha primero el verbo y su terminación. Repite la frase, o escúchala más despacio, las veces que haga falta.'],
    regional: ['Palabras de México ↔ España', 'Palabras cotidianas que cambian entre México y España: carro/coche, computadora/ordenador.'],
    idioms: ['Modismos y expresiones', 'Los modismos casi nunca significan lo que dicen sus palabras. Apréndelos con su imagen literal y un ejemplo: meter la pata es equivocarse.'],
  },
};

export const categoryKeys = (lang) => Object.keys(CATEGORIES[lang]);

// Category prefix → where its names live in the content (see `names` below).
const NAMED = { 'topic:': 'topics', 'situation:': 'situations', 'grammar:': 'grammarSets' };
const namedEntry = (key, names) => {
  const prefix = Object.keys(NAMED).find((p) => key.startsWith(p));
  return prefix ? { id: key.slice(prefix.length), entry: names[NAMED[prefix]]?.[key.slice(prefix.length)] } : null;
};
const localized = (obj, lang) => obj[lang] ?? obj.en;

/**
 * Label for a review category. `names` holds the content's names:
 * { topics, situations, grammarSets }, each id → { en, es }.
 */
export function categoryLabel(lang, key, names = {}) {
  if (key.startsWith('tense:')) return tenseLabel(lang, key.slice(6));
  const named = namedEntry(key, names);
  if (named) return named.entry ? localized(named.entry, lang) : named.id;
  return CATEGORIES[lang][key]?.[0] ?? key;
}

/** One-line rule for a category, as HTML. */
export function categoryTipHtml(lang, key, names = {}) {
  if (key.startsWith('tense:')) return tenseInfoHtml(lang, key.slice(6));
  const named = namedEntry(key, names);
  if (named) return named.entry?.tip ? esc(localized(named.entry.tip, lang)) : '';
  return esc(CATEGORIES[lang][key]?.[1] ?? '');
}

/** One missed example on the review page, as HTML. */
export function exampleHtml(lang, ex) {
  if (ex.kind === 'conj') {
    const person = ex.person === null ? '' : ` · ${esc(personLabel(ex.tense, ex.person))}`;
    return `<span lang="es">${esc(ex.inf)}</span> · ${esc(tenseName(lang, ex.tense))}${person} → ${b(ex.answer)}`;
  }
  if (ex.kind === 'recognize') return `${b(ex.form)} → ${readingHtml(lang, ex)}`;
  const answerLang = ['meaning', 'idiom', 'listen'].includes(ex.kind) || (ex.kind === 'vocab' && ex.dir === 'es-en') ? 'en' : 'es';
  return `${esc(ex.prompt)} → <b lang="${answerLang}">${esc(ex.answer)}</b>`;
}

/** Render one note as HTML (or null to skip it). mode is 'explain' or 'hint'. */
export function renderNote(lang, note, mode, ctx) {
  const tpl = NOTES[lang][note.key] ?? NOTES.en[note.key];
  if (!tpl) throw new Error(`no template for note "${note.key}"`);
  const fn = mode === 'hint' && 'hint' in tpl ? tpl.hint : tpl.explain;
  return fn(note, ctx);
}
