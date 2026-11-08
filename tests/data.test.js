// Content checks: every data file is well formed and every verb conjugates.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { conjugate, analyze, LEVELS, PATTERNS, IRREGULAR, TENSES } from '../js/conjugate.js';

const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
const manifest = read('data/manifest.json');
const verbs = read('data/verbs.json');

const VERB_FIELDS = new Set(['inf', 'en', 'level', 'pattern', 'like', 'pp', 'tu', 'futStem', 'impersonal', 'regions', 'note']);
const REGIONS = ['mx', 'es'];

test('manifest lists existing files with source and license', () => {
  assert.ok(manifest.packs.length > 0);
  const ids = new Set();
  for (const p of manifest.packs) {
    for (const field of ['id', 'kind', 'file', 'title', 'source', 'license']) {
      assert.ok(typeof p[field] === 'string' && p[field], `pack ${p.id} needs ${field}`);
    }
    assert.ok(!ids.has(p.id), `duplicate pack id ${p.id}`);
    ids.add(p.id);
    assert.ok(existsSync(new URL(`../data/${p.file}`, import.meta.url)), `missing data/${p.file}`);
  }
});

test('at least 750 verbs, each listed once', () => {
  assert.ok(verbs.length >= 750, `only ${verbs.length} verbs`);
  const seen = new Set();
  for (const v of verbs) {
    assert.ok(!seen.has(v.inf), `duplicate verb ${v.inf}`);
    seen.add(v.inf);
  }
});

test('verb entries are well formed', () => {
  for (const v of verbs) {
    const where = `verb ${v.inf}`;
    for (const key of Object.keys(v)) assert.ok(VERB_FIELDS.has(key), `${where}: unknown field ${key}`);
    assert.match(v.inf, /^[a-záéíóúüñ]*(ar|er|ir|ír)(se)?$/, `${where}: not an infinitive`);
    assert.ok(typeof v.en === 'string' && v.en.trim() && !/placeholder/i.test(v.en), `${where}: needs an English gloss`);
    assert.ok(LEVELS.includes(v.level), `${where}: bad level ${v.level}`);
    if (v.pattern) assert.ok(PATTERNS.includes(v.pattern), `${where}: unknown pattern ${v.pattern}`);
    if (v.like) {
      assert.ok(IRREGULAR[v.like], `${where}: like must name an irregular base verb`);
      assert.ok(analyze(v).base.endsWith(v.like), `${where}: must end with ${v.like}`);
      assert.ok(!v.pattern, `${where}: like and pattern can't be combined`);
    }
    if (v.regions) {
      assert.ok(v.regions.length > 0 && v.regions.every((r) => REGIONS.includes(r)), `${where}: bad regions`);
    }
    if (v.note) assert.ok(typeof v.note.en === 'string' && v.note.en, `${where}: note needs en text`);
    if (v.impersonal) assert.equal(v.impersonal, true, `${where}: impersonal is a boolean`);
  }
});

test('every verb conjugates in every tense', () => {
  for (const v of verbs) {
    const { table } = conjugate(v);
    for (const t of TENSES) {
      const cells = table[t.id].filter(Boolean);
      if (t.mood === 'imperative' && (v.impersonal || v.inf === 'haber')) {
        assert.equal(cells.length, 0, `${v.inf} should have no ${t.id}`);
        continue;
      }
      assert.ok(cells.length > 0, `${v.inf} has no ${t.id}`);
      for (const f of cells) {
        for (const form of [f.form, ...f.alts]) {
          assert.match(form, /^[a-záéíóúüñ ]+$/, `${v.inf} ${t.id}: odd form "${form}"`);
        }
      }
    }
  }
});

const vocabPacks = manifest.packs.filter((p) => p.kind === 'vocab').map((p) => read(`data/${p.file}`));
const VOCAB_FIELDS = new Set(['id', 'en', 'es', 'alts', 'level', 'topic', 'gender', 'note']);
const SPANISH = /^[¡¿]?[a-záéíóúüñA-Z ]+[!?]?$/;

test('vocabulary entries are well formed', () => {
  const ids = new Set();
  let regional = 0;
  for (const pack of vocabPacks) {
    for (const [id, name] of Object.entries(pack.topics)) {
      assert.ok(name.en && name.es, `topic ${id} needs en and es names`);
    }
    for (const v of pack.items) {
      const where = `vocab ${v.id}`;
      for (const key of Object.keys(v)) assert.ok(VOCAB_FIELDS.has(key), `${where}: unknown field ${key}`);
      assert.match(v.id, /^[a-z0-9-]+$/, `${where}: bad id`);
      assert.ok(!ids.has(v.id), `duplicate vocab id ${v.id}`);
      ids.add(v.id);
      assert.ok(typeof v.en === 'string' && v.en.trim(), `${where}: needs English`);
      assert.ok(LEVELS.includes(v.level), `${where}: bad level`);
      assert.ok(pack.topics[v.topic], `${where}: unknown topic ${v.topic}`);
      const forms = [];
      if (typeof v.es === 'string') {
        forms.push(v.es, ...(v.alts ?? []));
        assert.ok(!v.alts || Array.isArray(v.alts), `${where}: alts must be a list for a shared word`);
      } else {
        regional++;
        assert.deepEqual(Object.keys(v.es).sort(), ['es', 'mx'], `${where}: regional words need mx and es`);
        assert.notEqual(v.es.mx, v.es.es, `${where}: mx and es are the same; use a plain string`);
        forms.push(v.es.mx, v.es.es, ...(v.alts?.mx ?? []), ...(v.alts?.es ?? []));
        assert.ok(!Array.isArray(v.alts), `${where}: regional alts must be { mx, es }`);
      }
      for (const f of forms) assert.match(f, SPANISH, `${where}: odd Spanish "${f}"`);
      if (v.gender) assert.ok(['m', 'f'].includes(v.gender), `${where}: gender is m or f`);
      if (v.note) assert.ok(v.note.en, `${where}: note needs en text`);
    }
  }
  assert.ok(ids.size >= 300, `only ${ids.size} vocabulary items`);
  assert.ok(regional >= 80, `only ${regional} Mexico/Spain pairs`);
});

// ---------------------------------------------------------------------------
// Phrase packs (idioms, conversation, grammar) and Tatoeba sentences

const packsOf = (kind) => manifest.packs.filter((p) => p.kind === kind).map((p) => ({ pack: p, data: read(`data/${p.file}`) }));
const itemsOf = (kind) => packsOf(kind).flatMap(({ data }) => data.items);
const bilingual = (o, where) => assert.ok(o && typeof o.en === 'string' && o.en && typeof o.es === 'string' && o.es, `${where}: needs en and es`);
const checkFields = (item, allowed, where) => {
  for (const key of Object.keys(item)) assert.ok(allowed.has(key), `${where}: unknown field ${key}`);
};
const checkCommon = (item, ids, where) => {
  assert.match(String(item.id), /^[a-z0-9-]+$/, `${where}: bad id`);
  assert.ok(!ids.has(item.id), `${where}: duplicate id`);
  ids.add(item.id);
  assert.ok(LEVELS.includes(item.level), `${where}: bad level`);
  if (item.region) assert.ok(REGIONS.includes(item.region), `${where}: region is mx or es`);
  if (item.note) assert.ok(item.note.en, `${where}: note needs en text`);
};

test('every kind of pack the app loads is in the manifest', () => {
  const kinds = new Set(manifest.packs.map((p) => p.kind));
  for (const kind of ['verbs', 'vocab', 'idioms', 'conversation', 'grammar', 'sentences']) assert.ok(kinds.has(kind), kind);
});

test('idioms are well formed', () => {
  const ids = new Set();
  const fields = new Set(['id', 'es', 'en', 'literal', 'level', 'region', 'example', 'note']);
  for (const i of itemsOf('idioms')) {
    const where = `idiom ${i.id}`;
    checkFields(i, fields, where);
    checkCommon(i, ids, where);
    for (const f of ['es', 'en', 'literal']) assert.ok(typeof i[f] === 'string' && i[f].trim(), `${where}: needs ${f}`);
    bilingual(i.example, `${where} example`);
  }
  assert.ok(ids.size >= 100, `only ${ids.size} idioms`);
});

test('conversation items are well formed', () => {
  const ids = new Set();
  const fields = new Set(['id', 'situation', 'level', 'region', 'prompt', 'answer', 'wrong', 'note']);
  for (const { data } of packsOf('conversation')) {
    for (const [id, name] of Object.entries(data.situations)) bilingual(name, `situation ${id}`);
    for (const i of data.items) {
      const where = `conversation ${i.id}`;
      checkFields(i, fields, where);
      checkCommon(i, ids, where);
      assert.ok(data.situations[i.situation], `${where}: unknown situation ${i.situation}`);
      bilingual(i.prompt, `${where} prompt`);
      bilingual(i.answer, `${where} answer`);
      assert.equal(i.wrong.length, 3, `${where}: needs 3 wrong replies`);
      i.wrong.forEach((w, n) => bilingual(w, `${where} wrong ${n}`));
      const replies = [i.answer.es, ...i.wrong.map((w) => w.es)];
      assert.equal(new Set(replies).size, 4, `${where}: replies must differ`);
    }
  }
  assert.ok(ids.size >= 50, `only ${ids.size} conversation items`);
});

test('grammar items are well formed', () => {
  const ids = new Set();
  const fields = new Set(['id', 'set', 'level', 'region', 'es', 'options', 'answer', 'en', 'why']);
  for (const { data } of packsOf('grammar')) {
    for (const [id, set] of Object.entries(data.sets)) {
      bilingual(set, `grammar set ${id}`);
      bilingual(set.tip, `grammar set ${id} tip`);
    }
    for (const i of data.items) {
      const where = `grammar ${i.id}`;
      checkFields(i, fields, where);
      checkCommon(i, ids, where);
      assert.ok(data.sets[i.set], `${where}: unknown set ${i.set}`);
      assert.equal(i.es.split('___').length, 2, `${where}: needs exactly one ___`);
      assert.ok(i.options.length >= 2 && i.options.length <= 4, `${where}: 2 to 4 options`);
      assert.equal(new Set(i.options).size, i.options.length, `${where}: duplicate options`);
      assert.ok(i.options.includes(i.answer), `${where}: answer must be an option`);
      assert.ok(i.en && i.why?.en, `${where}: needs en and why.en`);
    }
  }
  assert.ok(ids.size >= 100, `only ${ids.size} grammar items`);
});

test('third-party packs link to their attribution', () => {
  for (const p of manifest.packs) {
    if (p.source !== 'Written for tarjetas') assert.ok(p.attribution, `pack ${p.id} needs an attribution link`);
  }
});

test('Tatoeba sentences keep their license and credits', () => {
  const attribution = readFileSync(new URL('../ATTRIBUTION.md', import.meta.url), 'utf8');
  const fields = new Set(['id', 'es', 'blank', 'inf', 'tense', 'persons', 'by', 'region', 'en', 'enId', 'enBy']);
  for (const { pack, data } of packsOf('sentences')) {
    assert.equal(pack.license, data.license);
    assert.equal(data.license, 'CC BY 2.0 FR');
    assert.ok(attribution.includes('CC BY 2.0 FR'));
    const ids = new Set();
    for (const s of data.items) {
      checkFields(s, fields, `sentence ${s.id}`);
      assert.ok(Number.isInteger(s.id) && Number.isInteger(s.enId), `sentence ${s.id}: ids are Tatoeba numbers`);
      assert.ok(!ids.has(s.id), `duplicate sentence ${s.id}`);
      ids.add(s.id);
      assert.ok(s.by && s.enBy && s.en, `sentence ${s.id}: needs authors and a translation`);
      if (s.region) assert.ok(REGIONS.includes(s.region));
    }
    // every author is credited with every sentence id
    const credited = new Map();
    for (const line of attribution.split('\n')) {
      const m = line.match(/^- \*\*(.+)\*\*: (.+)$/);
      if (m) credited.set(m[1], new Set(m[2].split(', ').map(Number)));
    }
    for (const s of data.items) {
      assert.ok(credited.get(s.by)?.has(s.id), `ATTRIBUTION.md misses ${s.by} #${s.id}`);
      assert.ok(credited.get(s.enBy)?.has(s.enId), `ATTRIBUTION.md misses ${s.enBy} #${s.enId}`);
    }
  }
});

test("each sentence's blank is the engine's form of its verb", () => {
  const byInf = new Map(verbs.map((v) => [v.inf, v]));
  const tenses = ['pres', 'pret', 'impf', 'fut', 'cond', 'subj_pres', 'subj_impf'];
  for (const s of itemsOf('sentences')) {
    const where = `sentence ${s.id} "${s.es}"`;
    const verb = byInf.get(s.inf);
    assert.ok(verb, `${where}: ${s.inf} is not in the verb list`);
    assert.ok(tenses.includes(s.tense), `${where}: tense ${s.tense}`);
    const form = s.es.slice(s.blank[0], s.blank[1]);
    assert.match(form, /^[a-záéíóúüñ]+$/, `${where}: blank "${form}" is not one lowercase word`);
    assert.ok(s.persons.length > 0, `${where}: needs persons`);
    const { table } = conjugate(verb, { raw: true });
    for (let p = 0; p < 6; p++) {
      const forms = table[s.tense][p] ? [table[s.tense][p].form, ...table[s.tense][p].alts] : [];
      assert.equal(forms.includes(form), s.persons.includes(p), `${where}: ${form} vs ${s.tense} person ${p}`);
    }
  }
  assert.ok(itemsOf('sentences').length >= 1000);
});

test('both regions have verbs at every level', () => {
  for (const region of REGIONS) {
    for (const level of LEVELS) {
      const n = verbs.filter((v) => v.level === level && (!v.regions || v.regions.includes(region))).length;
      assert.ok(n >= 20, `${region} ${level}: only ${n} verbs`);
    }
  }
});
