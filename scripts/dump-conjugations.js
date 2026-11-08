// Writes every verb's forms as JSON for scripts/crosscheck.py.
//
//   node scripts/dump-conjugations.js > conjugations.json
//
// Forms are written without reflexive pronouns (verbecc conjugates the
// non-reflexive verb), each cell as the list of accepted spellings.
import { readFileSync } from 'node:fs';
import { conjugate, accepted, TENSES } from '../js/conjugate.js';

const verbs = JSON.parse(readFileSync(new URL('../data/verbs.json', import.meta.url), 'utf8'));
const out = [];
const seen = new Set();
for (const entry of verbs) {
  const { verb, table } = conjugate(entry, { raw: true });
  if (seen.has(verb.base)) continue; // levantar and levantarse share forms
  seen.add(verb.base);
  const cells = {};
  for (const t of TENSES) cells[t.id] = table[t.id].map((f) => (f ? accepted(f) : null));
  out.push({ inf: verb.base, entry: entry.inf, cells });
}
process.stdout.write(JSON.stringify(out));
