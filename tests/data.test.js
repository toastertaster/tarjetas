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

test('both regions have verbs at every level', () => {
  for (const region of REGIONS) {
    for (const level of LEVELS) {
      const n = verbs.filter((v) => v.level === level && (!v.regions || v.regions.includes(region))).length;
      assert.ok(n >= 20, `${region} ${level}: only ${n} verbs`);
    }
  }
});
