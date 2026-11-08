// Golden tables for the hardest verbs and for cases the verbecc cross-check
// can't cover (reflexive pronouns, 2010 accent rules, verbs verbecc fails on).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { conjugate, accepted, attachEnclitic, placeAccent, stressIndex, syllableCount } from '../js/conjugate.js';

const verbs = JSON.parse(readFileSync(new URL('../data/verbs.json', import.meta.url), 'utf8'));
const entry = (inf) => {
  const e = verbs.find((v) => v.inf === inf);
  if (!e) throw new Error(`${inf} is not in data/verbs.json`);
  return e;
};
const forms = (inf, tense) => conjugate(entry(inf)).table[tense].map((f) => (f ? f.form : null));
const _ = null;

const GOLDEN = {
  ser: {
    pres: ['soy', 'eres', 'es', 'somos', 'sois', 'son'],
    impf: ['era', 'eras', 'era', 'éramos', 'erais', 'eran'],
    pret: ['fui', 'fuiste', 'fue', 'fuimos', 'fuisteis', 'fueron'],
    subj_pres: ['sea', 'seas', 'sea', 'seamos', 'seáis', 'sean'],
    imp_aff: [_, 'sé', 'sea', 'seamos', 'sed', 'sean'],
    gerund: ['siendo'],
    participle: ['sido'],
  },
  ir: {
    pres: ['voy', 'vas', 'va', 'vamos', 'vais', 'van'],
    impf: ['iba', 'ibas', 'iba', 'íbamos', 'ibais', 'iban'],
    fut: ['iré', 'irás', 'irá', 'iremos', 'iréis', 'irán'],
    subj_pres: ['vaya', 'vayas', 'vaya', 'vayamos', 'vayáis', 'vayan'],
    subj_impf: ['fuera', 'fueras', 'fuera', 'fuéramos', 'fuerais', 'fueran'],
    imp_aff: [_, 've', 'vaya', 'vamos', 'id', 'vayan'],
    gerund: ['yendo'],
  },
  estar: {
    pres: ['estoy', 'estás', 'está', 'estamos', 'estáis', 'están'],
    pret: ['estuve', 'estuviste', 'estuvo', 'estuvimos', 'estuvisteis', 'estuvieron'],
    subj_pres: ['esté', 'estés', 'esté', 'estemos', 'estéis', 'estén'],
    imp_aff: [_, 'está', 'esté', 'estemos', 'estad', 'estén'],
  },
  haber: {
    pres: ['he', 'has', 'ha', 'hemos', 'habéis', 'han'],
    subj_pres: ['haya', 'hayas', 'haya', 'hayamos', 'hayáis', 'hayan'],
    imp_aff: [_, _, _, _, _, _],
  },
  tener: {
    pres: ['tengo', 'tienes', 'tiene', 'tenemos', 'tenéis', 'tienen'],
    pret: ['tuve', 'tuviste', 'tuvo', 'tuvimos', 'tuvisteis', 'tuvieron'],
    cond: ['tendría', 'tendrías', 'tendría', 'tendríamos', 'tendríais', 'tendrían'],
    imp_aff: [_, 'ten', 'tenga', 'tengamos', 'tened', 'tengan'],
    imp_neg: [_, 'no tengas', 'no tenga', 'no tengamos', 'no tengáis', 'no tengan'],
  },
  mantener: { imp_aff: [_, 'mantén', 'mantenga', 'mantengamos', 'mantened', 'mantengan'] },
  convenir: { imp_aff: [_, 'convén', 'convenga', 'convengamos', 'convenid', 'convengan'] },
  componer: { imp_aff: [_, 'compón', 'componga', 'compongamos', 'componed', 'compongan'], participle: ['compuesto'] },
  deshacer: { imp_aff: [_, 'deshaz', 'deshaga', 'deshagamos', 'deshaced', 'deshagan'], participle: ['deshecho'] },
  prever: {
    pres: ['preveo', 'prevés', 'prevé', 'prevemos', 'prevéis', 'prevén'],
    pret: ['preví', 'previste', 'previó', 'previmos', 'previsteis', 'previeron'],
    participle: ['previsto'],
  },
  hacer: {
    pres: ['hago', 'haces', 'hace', 'hacemos', 'hacéis', 'hacen'],
    pret: ['hice', 'hiciste', 'hizo', 'hicimos', 'hicisteis', 'hicieron'],
    fut: ['haré', 'harás', 'hará', 'haremos', 'haréis', 'harán'],
    participle: ['hecho'],
  },
  satisfacer: {
    pret: ['satisfice', 'satisficiste', 'satisfizo', 'satisficimos', 'satisficisteis', 'satisficieron'],
    fut: ['satisfaré', 'satisfarás', 'satisfará', 'satisfaremos', 'satisfaréis', 'satisfarán'],
  },
  decir: {
    pres: ['digo', 'dices', 'dice', 'decimos', 'decís', 'dicen'],
    pret: ['dije', 'dijiste', 'dijo', 'dijimos', 'dijisteis', 'dijeron'],
    imp_aff: [_, 'di', 'diga', 'digamos', 'decid', 'digan'],
    gerund: ['diciendo'],
    participle: ['dicho'],
  },
  predecir: {
    fut: ['predeciré', 'predecirás', 'predecirá', 'predeciremos', 'predeciréis', 'predecirán'],
    imp_aff: [_, 'predice', 'prediga', 'predigamos', 'predecid', 'predigan'],
    participle: ['predicho'],
  },
  bendecir: { pret: ['bendije', 'bendijiste', 'bendijo', 'bendijimos', 'bendijisteis', 'bendijeron'], participle: ['bendecido'] },
  dar: {
    pres: ['doy', 'das', 'da', 'damos', 'dais', 'dan'],
    pret: ['di', 'diste', 'dio', 'dimos', 'disteis', 'dieron'],
    subj_pres: ['dé', 'des', 'dé', 'demos', 'deis', 'den'],
  },
  ver: {
    impf: ['veía', 'veías', 'veía', 'veíamos', 'veíais', 'veían'],
    pret: ['vi', 'viste', 'vio', 'vimos', 'visteis', 'vieron'],
    participle: ['visto'],
  },
  saber: { pres: ['sé', 'sabes', 'sabe', 'sabemos', 'sabéis', 'saben'], subj_pres: ['sepa', 'sepas', 'sepa', 'sepamos', 'sepáis', 'sepan'] },
  caber: { pres: ['quepo', 'cabes', 'cabe', 'cabemos', 'cabéis', 'caben'], pret: ['cupe', 'cupiste', 'cupo', 'cupimos', 'cupisteis', 'cupieron'] },
  poder: { pres: ['puedo', 'puedes', 'puede', 'podemos', 'podéis', 'pueden'], gerund: ['pudiendo'] },
  oír: {
    pres: ['oigo', 'oyes', 'oye', 'oímos', 'oís', 'oyen'],
    pret: ['oí', 'oíste', 'oyó', 'oímos', 'oísteis', 'oyeron'],
    fut: ['oiré', 'oirás', 'oirá', 'oiremos', 'oiréis', 'oirán'],
    imp_aff: [_, 'oye', 'oiga', 'oigamos', 'oíd', 'oigan'],
    participle: ['oído'],
  },
  reír: { pret: ['reí', 'reíste', 'rio', 'reímos', 'reísteis', 'rieron'], subj_pres: ['ría', 'rías', 'ría', 'riamos', 'riais', 'rían'] },
  sonreír: { pret: ['sonreí', 'sonreíste', 'sonrió', 'sonreímos', 'sonreísteis', 'sonrieron'], subj_pres: ['sonría', 'sonrías', 'sonría', 'sonriamos', 'sonriáis', 'sonrían'] },
  freír: { pret: ['freí', 'freíste', 'frio', 'freímos', 'freísteis', 'frieron'], participle: ['frito'] },
  leer: { pret: ['leí', 'leíste', 'leyó', 'leímos', 'leísteis', 'leyeron'], gerund: ['leyendo'], participle: ['leído'] },
  caer: { pres: ['caigo', 'caes', 'cae', 'caemos', 'caéis', 'caen'], pret: ['caí', 'caíste', 'cayó', 'caímos', 'caísteis', 'cayeron'] },
  traer: { pret: ['traje', 'trajiste', 'trajo', 'trajimos', 'trajisteis', 'trajeron'], gerund: ['trayendo'] },
  conducir: {
    pres: ['conduzco', 'conduces', 'conduce', 'conducimos', 'conducís', 'conducen'],
    pret: ['conduje', 'condujiste', 'condujo', 'condujimos', 'condujisteis', 'condujeron'],
  },
  conocer: { pres: ['conozco', 'conoces', 'conoce', 'conocemos', 'conocéis', 'conocen'], subj_pres: ['conozca', 'conozcas', 'conozca', 'conozcamos', 'conozcáis', 'conozcan'] },
  construir: {
    pres: ['construyo', 'construyes', 'construye', 'construimos', 'construís', 'construyen'],
    pret: ['construí', 'construiste', 'construyó', 'construimos', 'construisteis', 'construyeron'],
  },
  huir: { pres: ['huyo', 'huyes', 'huye', 'huimos', 'huis', 'huyen'], pret: ['hui', 'huiste', 'huyó', 'huimos', 'huisteis', 'huyeron'] },
  pensar: { pres: ['pienso', 'piensas', 'piensa', 'pensamos', 'pensáis', 'piensan'], subj_pres: ['piense', 'pienses', 'piense', 'pensemos', 'penséis', 'piensen'] },
  empezar: { pret: ['empecé', 'empezaste', 'empezó', 'empezamos', 'empezasteis', 'empezaron'], subj_pres: ['empiece', 'empieces', 'empiece', 'empecemos', 'empecéis', 'empiecen'] },
  jugar: { pres: ['juego', 'juegas', 'juega', 'jugamos', 'jugáis', 'juegan'], pret: ['jugué', 'jugaste', 'jugó', 'jugamos', 'jugasteis', 'jugaron'] },
  pedir: { pres: ['pido', 'pides', 'pide', 'pedimos', 'pedís', 'piden'], pret: ['pedí', 'pediste', 'pidió', 'pedimos', 'pedisteis', 'pidieron'], gerund: ['pidiendo'] },
  sentir: { subj_pres: ['sienta', 'sientas', 'sienta', 'sintamos', 'sintáis', 'sientan'], pret: ['sentí', 'sentiste', 'sintió', 'sentimos', 'sentisteis', 'sintieron'] },
  dormir: { subj_pres: ['duerma', 'duermas', 'duerma', 'durmamos', 'durmáis', 'duerman'], gerund: ['durmiendo'] },
  morir: { pret: ['morí', 'moriste', 'murió', 'morimos', 'moristeis', 'murieron'], participle: ['muerto'] },
  seguir: { pres: ['sigo', 'sigues', 'sigue', 'seguimos', 'seguís', 'siguen'], subj_pres: ['siga', 'sigas', 'siga', 'sigamos', 'sigáis', 'sigan'] },
  elegir: { pres: ['elijo', 'eliges', 'elige', 'elegimos', 'elegís', 'eligen'] },
  oler: { pres: ['huelo', 'hueles', 'huele', 'olemos', 'oléis', 'huelen'] },
  errar: { pres: ['yerro', 'yerras', 'yerra', 'erramos', 'erráis', 'yerran'] },
  adquirir: { pres: ['adquiero', 'adquieres', 'adquiere', 'adquirimos', 'adquirís', 'adquieren'] },
  avergonzarse: { pres: ['me avergüenzo', 'te avergüenzas', 'se avergüenza', 'nos avergonzamos', 'os avergonzáis', 'se avergüenzan'] },
  averiguar: { pret: ['averigüé', 'averiguaste', 'averiguó', 'averiguamos', 'averiguasteis', 'averiguaron'] },
  enviar: { pres: ['envío', 'envías', 'envía', 'enviamos', 'enviáis', 'envían'] },
  guiar: { pres: ['guío', 'guías', 'guía', 'guiamos', 'guiais', 'guían'], pret: ['guie', 'guiaste', 'guio', 'guiamos', 'guiasteis', 'guiaron'] },
  continuar: { pres: ['continúo', 'continúas', 'continúa', 'continuamos', 'continuáis', 'continúan'] },
  reunir: { pres: ['reúno', 'reúnes', 'reúne', 'reunimos', 'reunís', 'reúnen'] },
  prohibir: { pres: ['prohíbo', 'prohíbes', 'prohíbe', 'prohibimos', 'prohibís', 'prohíben'] },
  gruñir: { pret: ['gruñí', 'gruñiste', 'gruñó', 'gruñimos', 'gruñisteis', 'gruñeron'], gerund: ['gruñendo'] },
  vencer: { pres: ['venzo', 'vences', 'vence', 'vencemos', 'vencéis', 'vencen'] },
  coger: { pres: ['cojo', 'coges', 'coge', 'cogemos', 'cogéis', 'cogen'] },
  distinguir: { pres: ['distingo', 'distingues', 'distingue', 'distinguimos', 'distinguís', 'distinguen'] },
  // Reflexive verbs: pronouns, compound tenses and attached pronouns in commands
  levantarse: {
    pres: ['me levanto', 'te levantas', 'se levanta', 'nos levantamos', 'os levantáis', 'se levantan'],
    pres_perf: ['me he levantado', 'te has levantado', 'se ha levantado', 'nos hemos levantado', 'os habéis levantado', 'se han levantado'],
    imp_aff: [_, 'levántate', 'levántese', 'levantémonos', 'levantaos', 'levántense'],
    imp_neg: [_, 'no te levantes', 'no se levante', 'no nos levantemos', 'no os levantéis', 'no se levanten'],
    gerund: ['levantando'],
  },
  vestirse: { imp_aff: [_, 'vístete', 'vístase', 'vistámonos', 'vestíos', 'vístanse'] },
  irse: { imp_aff: [_, 'vete', 'váyase', 'vámonos', 'idos', 'váyanse'] },
  ponerse: { imp_aff: [_, 'ponte', 'póngase', 'pongámonos', 'poneos', 'pónganse'] },
  sentarse: { imp_aff: [_, 'siéntate', 'siéntese', 'sentémonos', 'sentaos', 'siéntense'] },
  dormirse: { imp_aff: [_, 'duérmete', 'duérmase', 'durmámonos', 'dormíos', 'duérmanse'] },
  reunirse: { imp_aff: [_, 'reúnete', 'reúnase', 'reunámonos', 'reuníos', 'reúnanse'] },
  arrepentirse: { pres: ['me arrepiento', 'te arrepientes', 'se arrepiente', 'nos arrepentimos', 'os arrepentís', 'se arrepienten'], pret: ['me arrepentí', 'te arrepentiste', 'se arrepintió', 'nos arrepentimos', 'os arrepentisteis', 'se arrepintieron'] },
  atenerse: { pres: ['me atengo', 'te atienes', 'se atiene', 'nos atenemos', 'os atenéis', 'se atienen'], imp_aff: [_, 'atente', 'aténgase', 'atengámonos', 'ateneos', 'aténganse'] },
  // Verbs verbecc cannot conjugate
  pasar: { pret: ['pasé', 'pasaste', 'pasó', 'pasamos', 'pasasteis', 'pasaron'] },
  gobernar: { pres: ['gobierno', 'gobiernas', 'gobierna', 'gobernamos', 'gobernáis', 'gobiernan'] },
  nevar: { pres: [_, _, 'nieva', _, _, _], pret: [_, _, 'nevó', _, _, _], subj_pres: [_, _, 'nieve', _, _, _], imp_aff: [_, _, _, _, _, _] },
  llover: { pres: [_, _, 'llueve', _, _, _], pres_perf: [_, _, 'ha llovido', _, _, _] },
  tronar: { pres: [_, _, 'truena', _, _, _] },
  helar: { pres: [_, _, 'hiela', _, _, _] },
  granizar: { pret: [_, _, 'granizó', _, _, _], subj_pres: [_, _, 'granice', _, _, _] },
  enfriar: { pres: ['enfrío', 'enfrías', 'enfría', 'enfriamos', 'enfriáis', 'enfrían'] },
  rociar: { subj_pres: ['rocíe', 'rocíes', 'rocíe', 'rociemos', 'rociéis', 'rocíen'] },
  pringar: { pret: ['pringué', 'pringaste', 'pringó', 'pringamos', 'pringasteis', 'pringaron'] },
  agüitarse: { pret: ['me agüité', 'te agüitaste', 'se agüitó', 'nos agüitamos', 'os agüitasteis', 'se agüitaron'] },
};

for (const [inf, tenses] of Object.entries(GOLDEN)) {
  test(`golden: ${inf}`, () => {
    for (const [tense, expected] of Object.entries(tenses)) {
      assert.deepEqual(forms(inf, tense), expected, `${inf} ${tense}`);
    }
  });
}

test('alternative spellings are accepted', () => {
  const ir = conjugate(entry('ir')).table;
  assert.deepEqual(accepted(ir.imp_aff[3]), ['vamos', 'vayamos']);
  assert.deepEqual(accepted(ir.subj_impf[0]), ['fuera', 'fuese']);
  assert.deepEqual(accepted(ir.subj_pluperf[3]), ['hubiéramos ido', 'hubiésemos ido']);
  const imprimir = conjugate(entry('imprimir')).table;
  assert.deepEqual(accepted(imprimir.pres_perf[0]), ['he impreso', 'he imprimido']);
  assert.deepEqual(accepted(conjugate(entry('valer')).table.imp_aff[1]), ['vale', 'val']);
  assert.deepEqual(accepted(conjugate(entry('irse')).table.imp_aff[4]), ['idos', 'iros']);
  assert.deepEqual(accepted(conjugate(entry('haber')).table.pres[2]), ['ha', 'hay']);
});

test('regular option ignores irregularities but keeps spelling rules', () => {
  const reg = conjugate(entry('tener'), { regular: true }).table;
  assert.equal(reg.pret[0].form, 'tení');
  assert.equal(reg.pres[0].form, 'teno');
  assert.equal(conjugate(entry('buscar'), { regular: true }).table.pret[0].form, 'busqué');
});

test('accent helpers', () => {
  assert.equal(syllableCount('hui'), 1);
  assert.equal(syllableCount('guiais'), 1);
  assert.equal(syllableCount('oí'), 2);
  assert.equal(syllableCount('que'), 1);
  assert.equal(stressIndex('levanta'), 3);
  assert.equal(stressIndex('comer'), 3);
  assert.equal(placeAccent('levantate', 3), 'levántate');
  assert.equal(placeAccent('vestios', 4), 'vestíos');
  assert.equal(placeAccent('deme', 1), 'deme');
  assert.equal(attachEnclitic('vamos', 3, 'ir'), 'vámonos');
  assert.equal(attachEnclitic('dé', 2, 'dar'), 'dese');
});

test('every form carries at least one tag or is a plain regular form', () => {
  for (const inf of ['tener', 'hablar', 'levantarse']) {
    const { table } = conjugate(entry(inf));
    for (const cells of Object.values(table)) {
      for (const f of cells) if (f) assert.ok(Array.isArray(f.tags));
    }
  }
});
