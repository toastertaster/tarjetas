// The pronunciation guide shown under Spanish words.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { respell, syllables } from '../js/pronounce.js';

const read = (f) => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), 'utf8'));

test('common words, with the stressed syllable in capitals', () => {
  const cases = {
    hablar: 'ah-BLAHR',
    llegar: 'yeh-GAHR',
    jugar: 'hoo-GAHR',
    querer: 'keh-REHR',
    seguir: 'seh-GEER',
    averiguar: 'ah-beh-ree-GWAHR',
    levantarse: 'leh-bahn-TAHR-seh',
    construir: 'kohns-TRWEER',
    'reír': 'rreh-EER',
    correr: 'koh-RREHR',
    enviar: 'ehn-BYAHR',
    extraño: 'ehks-TRAH-nyoh',
    girar: 'hee-RAHR',
    prohibir: 'proy-BEER',
    hoy: 'oy',
    'el carro': 'ehl KAH-rroh',
    '¡qué padre!': 'keh PAH-dreh',
  };
  for (const [word, guide] of Object.entries(cases)) assert.equal(respell(word), guide, word);
});

test("Spain's c and z sound like th", () => {
  assert.equal(respell('conocer', 'es'), 'koh-noh-THEHR');
  assert.equal(respell('la cerveza', 'es'), 'lah thehr-BEH-thah');
  assert.equal(respell('la cerveza', 'mx'), 'lah sehr-BEH-sah');
});

test('syllables keep consonant clusters together', () => {
  const split = (w) => syllables(w).map((s) => s.onset + s.nucleus + s.coda).join('-');
  assert.equal(split('hablar'), 'ha-blar');
  assert.equal(split('instruir'), 'ins-truir');
  assert.equal(split('perro'), 'pe-rro');
  assert.equal(split('muchacho'), 'mu-cha-cho');
});

test('every verb, word and idiom gets a guide with no Spanish spellings left', () => {
  const words = [
    ...read('verbs.json').map((v) => v.inf),
    ...read('vocab.json').items.flatMap((i) => (typeof i.es === 'string' ? [i.es] : Object.values(i.es))),
    ...read('idioms.json').items.map((i) => i.es),
  ];
  for (const word of words) {
    for (const region of ['mx', 'es']) {
      const guide = respell(word, region);
      assert.ok(guide, word);
      // only English-friendly letters: no q, j, ñ, ll, v, z, accents, or c outside "ch"
      assert.doesNotMatch(guide.replace(/ch/gi, ''), /[qjñvzcáéíóúü]|ll|--/i, `${word} → ${guide}`);
    }
  }
});
