// Spanish conjugation engine.
//
// Every form the engine produces is an object `{ form, alts, tags }`:
//   form  – the primary written form
//   alts  – other accepted spellings (e.g. the -se imperfect subjunctive)
//   tags  – the reasons the form looks the way it does. Explanations, hints
//           and multiple-choice distractors are all built from these tags, so
//           every rule the engine applies should leave a tag behind.
//
// Verb entries come from data/verbs.json:
//   { inf, en, level, pattern?, like?, pp?, tu?, futStem?, impersonal?, regions?, note? }
// See CONTENT.md for the meaning of each field.

export const PERSONS = ['yo', 'tu', 'el', 'nos', 'vos', 'ellos'];
export const REFLEXIVE_PRONOUNS = ['me', 'te', 'se', 'nos', 'os', 'se'];

export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export const TENSES = [
  { id: 'pres', mood: 'indicative', level: 'A1' },
  { id: 'pret', mood: 'indicative', level: 'A2' },
  { id: 'impf', mood: 'indicative', level: 'A2' },
  { id: 'fut', mood: 'indicative', level: 'B1' },
  { id: 'cond', mood: 'indicative', level: 'B1' },
  { id: 'pres_perf', mood: 'indicative', level: 'B1', aux: 'pres' },
  { id: 'pluperf', mood: 'indicative', level: 'B1', aux: 'impf' },
  { id: 'fut_perf', mood: 'indicative', level: 'B2', aux: 'fut' },
  { id: 'cond_perf', mood: 'indicative', level: 'B2', aux: 'cond' },
  { id: 'past_ant', mood: 'indicative', level: 'C2', aux: 'pret' },
  { id: 'subj_pres', mood: 'subjunctive', level: 'B2' },
  { id: 'subj_impf', mood: 'subjunctive', level: 'C1' },
  { id: 'subj_perf', mood: 'subjunctive', level: 'C1', aux: 'subj_pres' },
  { id: 'subj_pluperf', mood: 'subjunctive', level: 'C1', aux: 'subj_impf' },
  { id: 'subj_fut', mood: 'subjunctive', level: 'C2' },
  { id: 'subj_fut_perf', mood: 'subjunctive', level: 'C2', aux: 'subj_fut' },
  { id: 'imp_aff', mood: 'imperative', level: 'B1' },
  { id: 'imp_neg', mood: 'imperative', level: 'B2' },
  { id: 'gerund', mood: 'nonfinite', level: 'A2' },
  { id: 'participle', mood: 'nonfinite', level: 'A2' },
];
export const TENSE_BY_ID = Object.fromEntries(TENSES.map((t) => [t.id, t]));

// Stem-change patterns: strong change in stressed stems, weak change (for -ir
// verbs) in the preterite third persons, gerund and nosotros/vosotros subjunctive.
const STEM_PATTERNS = {
  'e-ie': { from: 'e', strong: 'ie' },
  'o-ue': { from: 'o', strong: 'ue' },
  'u-ue': { from: 'u', strong: 'ue' },
  'i-ie': { from: 'i', strong: 'ie' },
  'e-i': { from: 'e', strong: 'i', weak: 'i' },
  'e-ie-i': { from: 'e', strong: 'ie', weak: 'i' },
  'o-ue-u': { from: 'o', strong: 'ue', weak: 'u' },
};
export const PATTERNS = [...Object.keys(STEM_PATTERNS), 'zc', 'ducir', 'accent'];

// Irregular base verbs. Compounds ("like": "tener" for mantener) reuse these.
//   pres/impf/pret/subj – complete 6-form overrides
//   yo       – irregular yo stem, also used for the whole present subjunctive
//   yoForm   – irregular yo form only (saber: sé)
//   subjStem – present subjunctive stem
//   pretStem – "strong" preterite stem (-e, -iste, -o, -imos, -isteis, -ieron)
//   futStem  – future/conditional stem
//   tu       – affirmative tú command (first is primary)
export const IRREGULAR = {
  ser: {
    pres: ['soy', 'eres', 'es', 'somos', 'sois', 'son'],
    impf: ['era', 'eras', 'era', 'éramos', 'erais', 'eran'],
    pret: ['fui', 'fuiste', 'fue', 'fuimos', 'fuisteis', 'fueron'],
    subjStem: 'se',
    tu: ['sé'],
  },
  ir: {
    pres: ['voy', 'vas', 'va', 'vamos', 'vais', 'van'],
    impf: ['iba', 'ibas', 'iba', 'íbamos', 'ibais', 'iban'],
    pret: ['fui', 'fuiste', 'fue', 'fuimos', 'fuisteis', 'fueron'],
    subjStem: 'vay',
    tu: ['ve'],
    impNos: ['vamos', 'vayamos'],
    gerund: 'yendo',
  },
  estar: {
    pres: ['estoy', 'estás', 'está', 'estamos', 'estáis', 'están'],
    pretStem: 'estuv',
    subj: ['esté', 'estés', 'esté', 'estemos', 'estéis', 'estén'],
    tu: ['está'],
  },
  haber: {
    pres: ['he', 'has', 'ha', 'hemos', 'habéis', 'han'],
    presAlts: { 2: ['hay'] },
    pretStem: 'hub',
    futStem: 'habr',
    subjStem: 'hay',
    noImperative: true,
  },
  dar: {
    pres: ['doy', 'das', 'da', 'damos', 'dais', 'dan'],
    pret: ['di', 'diste', 'dio', 'dimos', 'disteis', 'dieron'],
    subj: ['dé', 'des', 'dé', 'demos', 'deis', 'den'],
  },
  ver: {
    pres: ['veo', 'ves', 've', 'vemos', 'veis', 'ven'],
    impf: ['veía', 'veías', 'veía', 'veíamos', 'veíais', 'veían'],
    pret: ['vi', 'viste', 'vio', 'vimos', 'visteis', 'vieron'],
    subjStem: 've',
    pp: 'visto',
  },
  tener: { pattern: 'e-ie', yo: 'teng', pretStem: 'tuv', futStem: 'tendr', tu: ['ten'] },
  venir: { pattern: 'e-ie', yo: 'veng', pretStem: 'vin', futStem: 'vendr', tu: ['ven'], gerund: 'viniendo' },
  poner: { yo: 'pong', pretStem: 'pus', futStem: 'pondr', tu: ['pon'], pp: 'puesto' },
  salir: { yo: 'salg', futStem: 'saldr', tu: ['sal'] },
  valer: { yo: 'valg', futStem: 'valdr', tu: ['vale', 'val'] },
  hacer: { yo: 'hag', pretStem: 'hic', futStem: 'har', tu: ['haz'], pp: 'hecho' },
  satisfacer: { yo: 'satisfag', pretStem: 'satisfic', futStem: 'satisfar', tu: ['satisfaz', 'satisface'], pp: 'satisfecho' },
  decir: { pattern: 'e-i', yo: 'dig', pretStem: 'dij', futStem: 'dir', tu: ['di'], pp: 'dicho' },
  traer: { yo: 'traig', pretStem: 'traj' },
  caer: { yo: 'caig' },
  oír: { yo: 'oig', pres: ['oigo', 'oyes', 'oye', 'oímos', 'oís', 'oyen'] },
  saber: { yoForm: 'sé', subjStem: 'sep', pretStem: 'sup', futStem: 'sabr' },
  caber: { yo: 'quep', pretStem: 'cup', futStem: 'cabr' },
  poder: { pattern: 'o-ue', pretStem: 'pud', futStem: 'podr', gerund: 'pudiendo' },
  querer: { pattern: 'e-ie', pretStem: 'quis', futStem: 'querr' },
  andar: { pretStem: 'anduv' },
  reír: {
    pres: ['río', 'ríes', 'ríe', 'reímos', 'reís', 'ríen'],
    pret: ['reí', 'reíste', 'rio', 'reímos', 'reísteis', 'rieron'],
    subj: ['ría', 'rías', 'ría', 'riamos', 'riais', 'rían'],
    tu: ['ríe'],
    gerund: 'riendo',
  },
};

const END = {
  pres: {
    ar: ['o', 'as', 'a', 'amos', 'áis', 'an'],
    er: ['o', 'es', 'e', 'emos', 'éis', 'en'],
    ir: ['o', 'es', 'e', 'imos', 'ís', 'en'],
  },
  impf: {
    ar: ['aba', 'abas', 'aba', 'ábamos', 'abais', 'aban'],
    er: ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían'],
    ir: ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían'],
  },
  pret: {
    ar: ['é', 'aste', 'ó', 'amos', 'asteis', 'aron'],
    er: ['í', 'iste', 'ió', 'imos', 'isteis', 'ieron'],
    ir: ['í', 'iste', 'ió', 'imos', 'isteis', 'ieron'],
  },
  subj_pres: {
    ar: ['e', 'es', 'e', 'emos', 'éis', 'en'],
    er: ['a', 'as', 'a', 'amos', 'áis', 'an'],
    ir: ['a', 'as', 'a', 'amos', 'áis', 'an'],
  },
};
export const ENDINGS = END;
export const STRONG_PRET = ['e', 'iste', 'o', 'imos', 'isteis', 'ieron'];
export const FUT = ['é', 'ás', 'á', 'emos', 'éis', 'án'];
export const COND = ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían'];
const IMPSUBJ_RA = ['ra', 'ras', 'ra', 'ramos', 'rais', 'ran'];
const IMPSUBJ_SE = ['se', 'ses', 'se', 'semos', 'seis', 'sen'];
const SUBJ_FUT = ['re', 'res', 're', 'remos', 'reis', 'ren'];
const BOOT = [0, 1, 2, 5]; // persons whose stem is stressed in the present

// ---------------------------------------------------------------------------
// Spelling helpers: syllables, stress and written accents

const ACCENT = { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú' };
const UNACCENT = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u' };
const isStrong = (c) => 'aeoáéó'.includes(c);
const isAccentedWeak = (c) => c === 'í' || c === 'ú';
const isVowelChar = (c) => c !== undefined && c !== '' && 'aeiouáéíóúü'.includes(c);

export function stripAccents(s) {
  return s.replace(/[áéíóú]/g, (c) => UNACCENT[c]);
}

// Vowel nuclei (one per syllable) as arrays of character indexes. Two strong
// vowels, or a strong vowel next to an accented í/ú, belong to separate
// syllables; anything else forms a diphthong or triphthong. The u in
// gue/gui/que/qui is silent and an h does not break a diphthong.
export function nuclei(word) {
  const w = word.toLowerCase();
  const groups = [];
  let cur = null;
  for (let i = 0; i < w.length; i++) {
    const c = w[i];
    let vowel = isVowelChar(c);
    if (c === 'u' && (w[i - 1] === 'q' || w[i - 1] === 'g') && 'eiéí'.includes(w[i + 1] ?? '-')) vowel = false;
    if (!vowel) {
      if (c === 'h' && cur && isVowelChar(w[i + 1])) continue;
      cur = null;
      continue;
    }
    if (cur) {
      const prev = w[cur[cur.length - 1]];
      const split =
        (isStrong(prev) && isStrong(c)) ||
        (isAccentedWeak(prev) && isStrong(c)) ||
        (isStrong(prev) && isAccentedWeak(c));
      if (!split) {
        cur.push(i);
        continue;
      }
    }
    cur = [i];
    groups.push(cur);
  }
  return groups;
}

export const syllableCount = (word) => nuclei(word).length;

// Index of the stressed vowel, from a written accent or the default rules
// (words ending in a vowel, n or s stress the second-to-last syllable).
export function stressIndex(word) {
  const accented = word.search(/[áéíóú]/);
  if (accented >= 0) return accented;
  const groups = nuclei(word);
  if (groups.length === 0) return -1;
  const target =
    groups.length === 1 ? groups[0] : /[aeiouns]$/.test(word) ? groups[groups.length - 2] : groups[groups.length - 1];
  const strong = target.find((i) => isStrong(word[i]));
  return strong ?? target[target.length - 1];
}

// Write `word` so that it is stressed on character `idx`, adding or removing
// the written accent as the rules require.
export function placeAccent(word, idx) {
  const plain = stripAccents(word);
  if (stressIndex(plain) === idx) return plain;
  return plain.slice(0, idx) + ACCENT[plain[idx]] + plain.slice(idx + 1);
}

// Since the 2010 RAE orthography, one-syllable words take no written accent
// (hui, guio, rio) unless the accent is diacritic (dé, sé), which only occur
// in the irregular tables and never pass through here.
function monosyllableRule(form, tags) {
  if (/[áéíóú]/.test(form) && syllableCount(form) === 1) {
    tags.push({ id: 'monosyllable' });
    return stripAccents(form);
  }
  return form;
}

// ---------------------------------------------------------------------------
// Building forms

const F = (form, tags = [], alts = []) => ({ form, alts, tags });

export function analyze(entry) {
  let base = entry.inf;
  let reflexive = false;
  if (/(ar|er|ir|ír)se$/.test(base)) {
    reflexive = true;
    base = base.slice(0, -2);
  }
  const ending = base.slice(-2);
  const cls = ending === 'ar' ? 'ar' : ending === 'er' ? 'er' : 'ir';
  return { entry, base, reflexive, cls, stem: base.slice(0, -2) };
}

// stem + ending, applying the spelling rules that keep the stem's sound.
// `raw` skips them for irregular stems that are already spelled correctly.
function join(stem, ending, v, tags, raw = false) {
  let s = stem;
  let e = ending;
  if (!raw) {
    if (v.cls === 'ar' && /^[eé]/.test(e)) {
      if (s.endsWith('gu')) {
        s = s.slice(0, -2) + 'gü';
        tags.push({ id: 'orth', rule: 'gu-gü' });
      } else if (s.endsWith('c')) {
        s = s.slice(0, -1) + 'qu';
        tags.push({ id: 'orth', rule: 'c-qu' });
      } else if (s.endsWith('g')) {
        s = s + 'u';
        tags.push({ id: 'orth', rule: 'g-gu' });
      } else if (s.endsWith('z')) {
        s = s.slice(0, -1) + 'c';
        tags.push({ id: 'orth', rule: 'z-c' });
      }
    } else if (v.cls !== 'ar' && /^[aoáó]/.test(e)) {
      if (s.endsWith('zc')) {
        // already spelled for its sound
      } else if (s.endsWith('gu')) {
        s = s.slice(0, -2) + 'g';
        tags.push({ id: 'orth', rule: 'gu-g' });
      } else if (s.endsWith('qu')) {
        s = s.slice(0, -2) + 'c';
        tags.push({ id: 'orth', rule: 'qu-c' });
      } else if (s.endsWith('c')) {
        s = s.slice(0, -1) + 'z';
        tags.push({ id: 'orth', rule: 'c-z' });
      } else if (s.endsWith('g')) {
        s = s.slice(0, -1) + 'j';
        tags.push({ id: 'orth', rule: 'g-j' });
      }
    }
  }
  if (v.cls !== 'ar') {
    const vowelStem = isVowelChar(s[s.length - 1]) && !/[gq]u$/.test(s);
    if (/(ñ|ll)$/.test(s) && /^i[aeoó]/.test(e)) {
      e = e.slice(1);
      tags.push({ id: 'drop-i' });
    } else if (vowelStem && /^i[aeoó]/.test(e)) {
      e = 'y' + e.slice(1);
      tags.push({ id: 'y' });
    } else if (/[aeo]$/.test(s) && /^i(?![aeoó])/.test(e)) {
      e = 'í' + e.slice(1);
      tags.push({ id: 'hiatus' });
    }
  }
  return s + e;
}

function changeStem(stem, from, to) {
  const i = stem.lastIndexOf(from);
  if (i < 0) throw new Error(`stem "${stem}" has no "${from}" to change`);
  let rep = to;
  if (i === 0 && to === 'ie') rep = 'ye'; // errar → yerro
  if (i === 0 && to === 'ue') rep = 'hue'; // oler → huelo
  if (stem[i - 1] === 'g' && to === 'ue') rep = 'üe'; // avergonzar → avergüenzo
  return stem.slice(0, i) + rep + stem.slice(i + 1);
}

function accentLastWeak(stem) {
  const i = Math.max(stem.lastIndexOf('i'), stem.lastIndexOf('u'));
  if (i < 0) throw new Error(`stem "${stem}" has no i/u to accent`);
  return stem.slice(0, i) + ACCENT[stem[i]] + stem.slice(i + 1);
}

const isUir = (v) => /uir$/.test(v.base) && !/[gq]uir$/.test(v.base);

// The verb's regular stem as modified for one person of the present
// (indicative or subjunctive), with the tags that explain it.
function presentStem(v, spec, person, mood) {
  const tags = [];
  if (spec.yo && (mood === 'subj' || person === 0)) {
    tags.push({ id: 'yo-irregular', yo: spec.yo + 'o' });
    return { stem: spec.yo, tags, raw: true };
  }
  if (spec.subjStem && mood === 'subj') {
    tags.push({ id: 'irregular' });
    return { stem: spec.subjStem, tags, raw: true };
  }
  let stem = v.stem;
  const sp = STEM_PATTERNS[spec.pattern];
  if (sp) {
    if (BOOT.includes(person)) {
      stem = changeStem(stem, sp.from, sp.strong);
      tags.push({ id: 'stem', pattern: spec.pattern });
    } else if (mood === 'subj' && sp.weak && v.cls === 'ir') {
      stem = changeStem(stem, sp.from, sp.weak);
      tags.push({ id: 'stem-weak', pattern: spec.pattern });
    }
  }
  if ((spec.pattern === 'zc' || spec.pattern === 'ducir') && (mood === 'subj' || person === 0)) {
    stem = stem.slice(0, -1) + 'zc';
    tags.push({ id: 'zc' });
  }
  if (spec.pattern === 'accent' && BOOT.includes(person)) {
    stem = accentLastWeak(stem);
    tags.push({ id: 'accent-stem' });
  }
  if (isUir(v) && (mood === 'subj' || BOOT.includes(person))) {
    stem += 'y';
    tags.push({ id: 'uir-y' });
  }
  return { stem, tags, raw: false };
}

function fromList(list, tags = [{ id: 'irregular' }]) {
  return list.map((form) => F(form, [...tags]));
}

function regularSimple(v, spec, cls) {
  const out = {};

  // Present indicative
  if (spec.pres) {
    out.pres = fromList(spec.pres);
    for (const [p, alts] of Object.entries(spec.presAlts ?? {})) out.pres[p].alts.push(...alts);
  } else {
    out.pres = PERSONS.map((_, p) => {
      if (p === 0 && spec.yoForm) return F(spec.yoForm, [{ id: 'irregular' }]);
      const { stem, tags, raw } = presentStem(v, spec, p, 'ind');
      const form = monosyllableRule(join(stem, END.pres[cls][p], v, tags, raw), tags);
      return F(form, tags);
    });
  }

  // Present subjunctive
  if (spec.subj) {
    out.subj_pres = fromList(spec.subj);
  } else {
    out.subj_pres = PERSONS.map((_, p) => {
      const { stem, tags, raw } = presentStem(v, spec, p, 'subj');
      const form = monosyllableRule(join(stem, END.subj_pres[cls][p], v, tags, raw), tags);
      return F(form, [...tags, { id: 'subj-from-yo' }]);
    });
  }

  // Imperfect
  out.impf = spec.impf
    ? fromList(spec.impf)
    : PERSONS.map((_, p) => {
        const tags = [];
        return F(join(v.stem, END.impf[cls][p], v, tags), tags);
      });

  // Preterite
  if (spec.pret) {
    out.pret = fromList(spec.pret);
  } else if (spec.pretStem || spec.pattern === 'ducir') {
    const pstem = spec.pretStem ?? v.stem.slice(0, -1) + 'j';
    out.pret = PERSONS.map((_, p) => {
      const tags = [{ id: 'pret-strong', stem: pstem }];
      let ending = STRONG_PRET[p];
      if (p === 5 && pstem.endsWith('j')) {
        ending = 'eron';
        tags.push({ id: 'pret-j' });
      }
      return F(join(pstem, ending, v, tags), tags);
    });
  } else {
    const sp = STEM_PATTERNS[spec.pattern];
    out.pret = PERSONS.map((_, p) => {
      const tags = [];
      let stem = v.stem;
      if (sp?.weak && cls === 'ir' && (p === 2 || p === 5)) {
        stem = changeStem(stem, sp.from, sp.weak);
        tags.push({ id: 'stem-weak', pattern: spec.pattern });
      }
      return F(monosyllableRule(join(stem, END.pret[cls][p], v, tags), tags), tags);
    });
  }

  // Future and conditional
  const futStem = spec.futStem ?? stripAccents(v.base);
  const futTags = spec.futStem ? [{ id: 'fut-stem', stem: spec.futStem }] : [];
  out.fut = FUT.map((e) => F(futStem + e, [...futTags]));
  out.cond = COND.map((e) => F(futStem + e, [...futTags]));

  // Imperfect and future subjunctive, from the ellos preterite minus -ron
  const p3 = out.pret[5].form;
  const b = p3.slice(0, -3);
  const bAcc = b.slice(0, -1) + ACCENT[b[b.length - 1]];
  const subjBase = (endings) =>
    endings.map((e, p) => (p === 3 ? bAcc : b) + e);
  const ra = subjBase(IMPSUBJ_RA);
  const se = subjBase(IMPSUBJ_SE);
  const tagP3 = { id: 'subj-from-pret', p3 };
  out.subj_impf = ra.map((form, p) => F(form, [tagP3], [se[p]]));
  out.subj_fut = subjBase(SUBJ_FUT).map((form) => F(form, [tagP3]));

  // Commands that are not borrowed from the subjunctive
  if (spec.tu) out.imp_tu = F(spec.tu[0], [{ id: 'imp-tu-irregular' }], spec.tu.slice(1));
  else out.imp_tu = F(out.pres[2].form, [...out.pres[2].tags, { id: 'imp-tu' }]);
  out.imp_vos = F(v.base.slice(0, -1) + 'd', [{ id: 'imp-vos' }]);
  if (spec.impNos) out.imp_nos = F(spec.impNos[0], [{ id: 'irregular' }], spec.impNos.slice(1));

  // Gerund
  if (spec.gerund) {
    out.gerund = F(spec.gerund, [{ id: 'irregular' }]);
  } else {
    const tags = [];
    let stem = v.stem;
    const sp = STEM_PATTERNS[spec.pattern];
    if (sp?.weak && cls === 'ir') {
      stem = changeStem(stem, sp.from, sp.weak);
      tags.push({ id: 'stem-weak', pattern: spec.pattern });
    }
    out.gerund = F(join(stem, cls === 'ar' ? 'ando' : 'iendo', v, tags), tags);
  }

  // Past participle
  if (spec.pp) {
    out.pp = F(spec.pp, [{ id: 'pp-irregular' }]);
  } else {
    const tags = [];
    out.pp = F(join(v.stem, cls === 'ar' ? 'ado' : 'ido', v, tags), tags);
  }
  return out;
}

const SIMPLE_KEYS = ['pres', 'subj_pres', 'impf', 'pret', 'fut', 'cond', 'subj_impf', 'subj_fut'];
const SINGLE_KEYS = ['imp_tu', 'imp_vos', 'imp_nos', 'gerund', 'pp'];

// Prefix a base verb's form (tener → mantener). One-syllable base forms gain
// a syllable, so their stress may now need a written accent (ten → mantén).
function prefixForm(prefix, form) {
  if (syllableCount(form) === 1) return placeAccent(prefix + form, stressIndex(form) + prefix.length);
  return prefix + form;
}

function mapForm(f, fn, extraTag) {
  return { form: fn(f.form), alts: f.alts.map(fn), tags: extraTag ? [...f.tags, extraTag] : f.tags };
}

// All simple (one-word) forms of a verb.
export function simpleForms(v, opts = {}) {
  const e = v.entry;
  if (opts.regular) {
    return regularSimple(v, {}, v.cls);
  }
  let out;
  if (e.like) {
    const base = analyze({ inf: e.like });
    if (!v.base.endsWith(e.like)) throw new Error(`${e.inf} does not end with its model ${e.like}`);
    const prefix = v.base.slice(0, v.base.length - e.like.length);
    const baseForms = simpleForms(base);
    const tag = { id: 'like', base: e.like };
    const fn = (form) => prefixForm(prefix, form);
    out = {};
    for (const k of SIMPLE_KEYS) out[k] = baseForms[k].map((f) => mapForm(f, fn, tag));
    for (const k of SINGLE_KEYS) if (baseForms[k]) out[k] = mapForm(baseForms[k], fn, tag);
  } else {
    const spec = { ...(IRREGULAR[v.base] ?? {}) };
    if (e.pattern) spec.pattern = e.pattern;
    out = regularSimple(v, spec, v.cls);
  }
  // Entry-level overrides
  if (e.futStem) {
    const tags = [{ id: 'fut-stem', stem: e.futStem }];
    out.fut = FUT.map((x) => F(e.futStem + x, [...tags]));
    out.cond = COND.map((x) => F(e.futStem + x, [...tags]));
  }
  if (e.tu) {
    const tu = [].concat(e.tu);
    out.imp_tu = F(tu[0], [{ id: 'imp-tu-irregular' }], tu.slice(1));
  }
  if (e.pp) {
    const pp = [].concat(e.pp);
    out.pp = F(pp[0], [{ id: 'pp-irregular' }], pp.slice(1));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Full conjugation table, with compound tenses, commands and pronouns

let haberCache = null;
function haber() {
  haberCache ??= simpleForms(analyze({ inf: 'haber' }));
  return haberCache;
}

const ENCLITIC = [null, 'te', 'se', 'nos', 'os', 'se'];

// Attach a reflexive pronoun to an affirmative command, dropping the final -s
// of nosotros and -d of vosotros forms and keeping the original stress.
export function attachEnclitic(form, person, base) {
  if (person === 4 && base === 'ir') return 'idos';
  let f = form;
  if (person === 3) f = f.replace(/s$/, '');
  if (person === 4) f = f.replace(/d$/, '');
  return placeAccent(f + ENCLITIC[person], stressIndex(form));
}

function compound(aux, pp, alsoAux = null) {
  const tags = [{ id: 'compound', aux: aux.form, pp: pp.form }, ...pp.tags.filter((t) => t.id === 'pp-irregular' || t.id === 'like')];
  const forms = [aux.form, ...(alsoAux ?? aux.alts.filter((a) => a !== 'hay'))];
  const all = [];
  for (const a of forms) for (const p of [pp.form, ...pp.alts]) all.push(`${a} ${p}`);
  return F(all[0], tags, all.slice(1));
}

/**
 * Conjugate a verb entry. Returns `{ verb, table }` where `table[tenseId]` is
 * an array of six forms (index = person; null where the form doesn't exist)
 * for finite tenses, or a one-element array for the gerund and participle.
 * Reflexive pronouns are included; `raw: true` returns forms without them.
 */
export function conjugate(entry, opts = {}) {
  const v = analyze(entry);
  const s = simpleForms(v, opts);
  const h = haber();
  const t = {};
  t.pres = s.pres;
  t.pret = s.pret;
  t.impf = s.impf;
  t.fut = s.fut;
  t.cond = s.cond;
  t.subj_pres = s.subj_pres;
  t.subj_impf = s.subj_impf;
  t.subj_fut = s.subj_fut;
  for (const tense of TENSES) {
    if (!tense.aux) continue;
    t[tense.id] = PERSONS.map((_, p) => {
      const aux = h[tense.aux][p];
      // hubiera/hubiese: both auxiliaries are accepted
      return compound(aux, s.pp, tense.aux === 'subj_impf' ? aux.alts : []);
    });
  }
  const fromSubj = (p) => F(s.subj_pres[p].form, [...s.subj_pres[p].tags, { id: 'imp-from-subj' }], [...s.subj_pres[p].alts]);
  const irr = IRREGULAR[entry.like ?? v.base];
  const noImperative = entry.impersonal || (!entry.like && irr?.noImperative);
  t.imp_aff = noImperative
    ? PERSONS.map(() => null)
    : [null, s.imp_tu, fromSubj(2), s.imp_nos ?? fromSubj(3), s.imp_vos, fromSubj(5)];
  t.imp_neg = noImperative
    ? PERSONS.map(() => null)
    : PERSONS.map((_, p) => {
        if (p === 0) return null;
        const f = s.subj_pres[p];
        return F(`no ${f.form}`, [...f.tags, { id: 'imp-neg' }], f.alts.map((a) => `no ${a}`));
      });
  t.gerund = [s.gerund];
  t.participle = [s.pp];

  if (entry.impersonal) {
    for (const tense of TENSES) {
      if (tense.mood === 'nonfinite') continue;
      t[tense.id] = t[tense.id].map((f, p) => (p === 2 && f ? withTag(f, { id: 'impersonal' }) : null));
    }
  }
  if (v.reflexive && !opts.raw) addPronouns(t, v);
  return { verb: v, table: t };
}

function withTag(f, tag) {
  return { ...f, tags: [...f.tags, tag] };
}

function addPronouns(t, v) {
  for (const tense of TENSES) {
    if (tense.mood === 'nonfinite') continue;
    t[tense.id] = t[tense.id].map((f, p) => {
      if (!f) return f;
      const tag = { id: 'reflexive', pronoun: REFLEXIVE_PRONOUNS[p] };
      if (tense.id === 'imp_aff') {
        const fn = (x) => attachEnclitic(x, p, v.base);
        const alts = f.alts.map(fn);
        if (p === 4 && v.base === 'ir') alts.push('iros');
        return { form: fn(f.form), alts, tags: [...f.tags, { ...tag, enclitic: true }] };
      }
      if (tense.id === 'imp_neg') {
        const fn = (x) => x.replace(/^no /, `no ${REFLEXIVE_PRONOUNS[p]} `);
        return mapForm(f, fn, tag);
      }
      return mapForm(f, (x) => `${REFLEXIVE_PRONOUNS[p]} ${x}`, tag);
    });
  }
}

// Every accepted written answer for one cell of the table.
export function accepted(f) {
  return f ? [f.form, ...f.alts] : [];
}
