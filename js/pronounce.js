// A pronunciation guide in English-friendly spelling: hablar → ah-BLAHR,
// conocer → koh-noh-SEHR (Spain: koh-noh-THEHR). The stressed syllable is in
// capitals. Spanish spelling is close to its sound, so this is rule-based;
// it is a guide for learners, not phonetic transcription (b/v are both "b",
// soft d and g are not marked, r and rr are "r" and "rr").

import { nuclei, stressIndex } from './conjugate.js';

const VOWEL = { a: 'ah', e: 'eh', i: 'ee', o: 'oh', u: 'oo', á: 'ah', é: 'eh', í: 'ee', ó: 'oh', ú: 'oo', ü: 'oo' };
const plainVowel = (c) => ({ á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u' })[c] ?? c;
// Falling diphthongs: the second vowel glides.
const FALLING = { ai: 'eye', ay: 'eye', ei: 'ay', ey: 'ay', oi: 'oy', oy: 'oy', au: 'ow', eu: 'ew', ou: 'oh' };
// Consonant pairs that start a syllable together (pa-dre, ha-blar).
const CLUSTERS = new Set(['pr', 'br', 'tr', 'dr', 'cr', 'gr', 'fr', 'pl', 'bl', 'cl', 'gl', 'fl', 'kr', 'kl', 'tl']);
// Short words said without stress of their own.
const UNSTRESSED = new Set('el la los las lo un una unos unas de del al a y o en con por para que se me te nos os le les mi tu su mis tus sus'.split(' '));

// The vowel sound of a nucleus (one or more vowel letters).
function vowelSound(letters) {
  const v = letters.map(plainVowel).join('');
  if (v.length === 1) return VOWEL[letters[0]];
  if (FALLING[v] && !letters.some((c) => 'íú'.includes(c))) return FALLING[v];
  // rising: i/u glide into the next vowel (ie → yeh, ue → weh, uai → wy)
  const glide = v[0] === 'i' ? 'y' : v[0] === 'u' || v[0] === 'ü' ? 'w' : '';
  return glide + vowelSound(letters.slice(1));
}

// Split consonant letters into units: ch, ll, rr, qu, and gu before e/i
// (where the u is silent). `after` is the letter that follows them.
function consonantUnits(s, after = '') {
  const units = [];
  const t = s + after;
  for (let i = 0; i < s.length; i++) {
    const two = s.slice(i, i + 2);
    if (['ch', 'll', 'rr', 'qu'].includes(two) || (two === 'gu' && /[eéií]/.test(t[i + 2] ?? ''))) {
      units.push(two);
      i++;
    } else units.push(s[i]);
  }
  return units;
}

// How a consonant unit sounds before `next` (the following letter).
function consonantSound(unit, next, { initial, afterNLS, region }) {
  const soft = /[eéií]/.test(next ?? '');
  switch (unit) {
    case 'b':
    case 'v':
      return 'b';
    case 'c':
      return soft ? (region === 'es' ? 'th' : 's') : 'k';
    case 'z':
      return region === 'es' ? 'th' : 's';
    case 'g':
      return soft ? 'h' : 'g';
    case 'gu':
      return 'g';
    case 'qu':
      return 'k';
    case 'j':
      return 'h';
    case 'h':
      return '';
    case 'll':
      return 'y';
    case 'ñ':
      return 'ny';
    case 'r':
      return initial || afterNLS ? 'rr' : 'r';
    case 'x':
      return 'ks';
    default:
      return unit;
  }
}

/** Syllables of one word, each as { onset, nucleus, coda } letter strings. */
export function syllables(word) {
  const w = word.toLowerCase();
  const groups = nuclei(w).map((g) => [g[0], g[g.length - 1] + 1]);
  if (!groups.length) return [{ onset: w, nucleus: '', coda: '' }];
  const out = [];
  let start = 0;
  for (let k = 0; k < groups.length; k++) {
    const [vs, ve] = groups[k];
    let end;
    if (k === groups.length - 1) end = w.length;
    else {
      // consonants between this nucleus and the next: who gets which
      const units = consonantUnits(w.slice(ve, groups[k + 1][0]), w[groups[k + 1][0]]);
      let keep; // units that stay in this syllable's coda
      if (units.length <= 1) keep = 0;
      else if (units.length === 2) keep = CLUSTERS.has(units.join('')) ? 0 : 1;
      else keep = CLUSTERS.has(units.slice(-2).join('')) ? units.length - 2 : units.length - 1;
      end = ve + units.slice(0, keep).join('').length;
    }
    out.push({ onset: w.slice(start, vs), nucleus: w.slice(vs, ve), coda: w.slice(ve, end) });
    start = end;
  }
  return out;
}

function respellWord(word, region) {
  const w = word.toLowerCase().replace(/[^a-záéíóúüñ]/g, '');
  if (!w) return '';
  const parts = syllables(w);
  const stressed = UNSTRESSED.has(w) ? -1 : stressIndex(w);
  let pos = 0;
  return parts
    .map((syl, k) => {
      const sylStart = pos;
      pos += syl.onset.length + syl.nucleus.length + syl.coda.length;
      const text = syl.onset + syl.nucleus + syl.coda;
      let out = '';
      let i = 0;
      // onset consonants
      for (const unit of consonantUnits(syl.onset, syl.nucleus[0])) {
        const next = text[i + unit.length];
        const prevLetter = k > 0 ? parts[k - 1].coda.slice(-1) : '';
        out += consonantSound(unit, next, { initial: sylStart === 0 && i === 0, afterNLS: i === 0 && 'nls'.includes(prevLetter) && prevLetter !== '', region });
        i += unit.length;
      }
      // y as a final vowel (hoy, muy) belongs to the nucleus
      let nucleus = [...syl.nucleus].filter((c) => c !== 'h'); // prohibir: the h is silent
      let coda = syl.coda;
      if (coda === 'y' && k === parts.length - 1) {
        nucleus = [...nucleus, 'i'];
        coda = '';
      }
      out += nucleus.length ? vowelSound(nucleus) : '';
      const codaUnits = consonantUnits(coda);
      codaUnits.forEach((unit, j) => {
        out += consonantSound(unit, codaUnits[j + 1]?.[0], { initial: false, afterNLS: false, region });
      });
      const isStressed = stressed >= sylStart && stressed < pos && parts.length > 1;
      return isStressed ? out.toUpperCase() : out;
    })
    .join('-');
}

/**
 * The pronunciation guide for a Spanish word or short phrase. `region` 'es'
 * says c (before e/i) and z as "th", as most of Spain does; elsewhere "s".
 */
export function respell(text, region = 'mx') {
  return text
    .split(/\s+/)
    .map((word) => respellWord(word, region))
    .filter(Boolean)
    .join(' ');
}
