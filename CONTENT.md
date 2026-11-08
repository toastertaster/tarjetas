# Content guide

All quiz content lives in `data/` as JSON. `node --test` checks every file, so
a malformed entry fails CI before it can be deployed.

## The manifest

`data/manifest.json` lists every content file ("pack"). The app loads packs
from here, and the page footer credits each one.

```json
{ "id": "verbs", "kind": "verbs", "file": "verbs.json",
  "title": "Core verbs", "source": "Written for tarjetas", "license": "MIT" }
```

To add more verbs, add a new pack of `kind: "verbs"` and the app picks it up
with no code change.

## Verb entries

```json
{ "inf": "poder", "en": "to be able to; can", "level": "A1" }
```

| Field | Required | Meaning |
|---|---|---|
| `inf` | yes | Infinitive. Reflexive verbs end in `-se` (`levantarse`); the engine adds the pronouns. |
| `en` | yes | English meaning(s), separated by `;` (used by "Verb meanings" mode) |
| `level` | yes | CEFR level of the verb itself: `A1`–`C2` |
| `pattern` | if irregular | One of the patterns below |
| `like` | for compounds | An irregular base verb this one is conjugated like: `"mantener"` → `"like": "tener"` |
| `pp` | if irregular | Past participle, or a list with the main one first: `["impreso", "imprimido"]` |
| `tu` | rarely | Affirmative tú command override (`predecir` → `predice`) |
| `futStem` | rarely | Future/conditional stem override (`bendecir` → `bendecir`) |
| `impersonal` | weather verbs | `true`: only the third-person singular exists (`llueve`) |
| `regions` | regional verbs | `["mx"]` or `["es"]`. Omit for verbs used everywhere. |
| `note` | optional | `{ "en": "...", "es": "..." }` usage note shown in explanations. `es` is optional and falls back to `en`. |

Patterns (stem changes are applied to the last matching vowel of the stem):

| Pattern | Example | What changes |
|---|---|---|
| `e-ie` | pensar → pienso | stressed e → ie |
| `o-ue` | contar → cuento | stressed o → ue |
| `u-ue` | jugar → juego | stressed u → ue |
| `i-ie` | adquirir → adquiero | stressed i → ie |
| `e-i` | pedir → pido, pidió | e → i (also in the -ir weak forms) |
| `e-ie-i` | sentir → siento, sintió | e → ie stressed, e → i weak |
| `o-ue-u` | dormir → duermo, durmió | o → ue stressed, o → u weak |
| `zc` | conocer → conozco | adds z before c in yo and the subjunctive |
| `ducir` | conducir → conduzco, conduje | zc plus a `-j-` preterite |
| `accent` | enviar → envío, reunir → reúno | stressed i/u takes a written accent |

Spelling changes (`busqué`, `pagué`, `empecé`, `cojo`, `sigo`, `venzo`,
`averigüe`), `-uir` verbs (`construyo`), vowel stems (`leyó`, `leído`) and the
2010 RAE accent rules (`hui`, `guio`) are automatic. Fully irregular verbs
(`ser`, `ir`, `tener`...) are defined in `IRREGULAR` in `js/conjugate.js`.

### Checking a new verb

1. Run `node --test`. It conjugates every verb in every tense.
2. Run the verbecc cross-check (see README). If verbecc disagrees and our form
   is right, add an entry with a `reason` to `tests/crosscheck-exceptions.json`.
   Never add an exception just to make the check pass.
3. If verbecc can't conjugate the verb, add a golden table to
   `tests/conjugate.test.js`.

## Licensing rules for outside content

- Only use sources whose license allows redistribution in this repository,
  including commercial use. Record `source` and `license` on the pack in
  `data/manifest.json`.
- Keep attribution requirements: list the source, author and license, plus
  per-item IDs or links when the license asks for them.
- **Share-alike** content (e.g. CC BY-SA, such as Wiktionary) would force its
  license onto our data files. Don't import it without a deliberate decision.
- **Non-commercial** content (e.g. CC BY-NC-SA, such as the Fred Jehle verb
  database) is not compatible with the MIT license here. Don't use it.
- Tools used only to *check* our content (like verbecc in CI) are fine, as
  long as nothing they produce is committed.
- Candidate sources checked so far:
  - Tatoeba sentences: CC BY 2.0 FR, some CC0. Compatible with attribution.
  - Wiktionary: CC BY-SA. Share-alike.
  - Fred Jehle database: CC BY-NC-SA. Not compatible.
