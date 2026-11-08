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

test('both regions have verbs at every level', () => {
  for (const region of REGIONS) {
    for (const level of LEVELS) {
      const n = verbs.filter((v) => v.level === level && (!v.regions || v.regions.includes(region))).length;
      assert.ok(n >= 20, `${region} ${level}: only ${n} verbs`);
    }
  }
});
