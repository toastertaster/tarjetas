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

## Vocabulary packs

A pack of `kind: "vocab"` is an object with `topics` and `items`. Topics
become entries in the Scope list; packs can add new topics or more words to
existing ones.

```json
{
  "topics": { "food": { "en": "Food & drink", "es": "Comida y bebida" } },
  "items": [
    { "id": "bread", "en": "bread", "es": "el pan", "level": "A1", "topic": "food" },
    { "id": "juice", "en": "juice", "es": { "mx": "el jugo", "es": "el zumo" }, "level": "A1", "topic": "food" }
  ]
}
```

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Unique, lowercase with dashes. Saved in learners' review history, so don't rename it. |
| `en` | yes | English meaning(s), separated by `;`. Add a hint in brackets when a word is ambiguous: `"fish (as food)"`. |
| `es` | yes | The Spanish word with its article (`"el pan"`), or `{ "mx": ..., "es": ... }` when Mexico and Spain use different words |
| `alts` | optional | Other accepted answers: a list, or `{ "mx": [...], "es": [...] }` for regional words |
| `level` | yes | CEFR level `A1`–`C2` |
| `topic` | yes | A topic id from `topics` |
| `gender` | rarely | `"m"` or `"f"` when the article misleads (`el agua` is feminine) |
| `note` | optional | `{ "en": "...", "es": "..." }` usage note shown in explanations |

Two words with the same Spanish spelling (*la llave*: key, and faucet in
Mexico) are fine: a question never offers both meanings as options.

## Idioms

A pack of `kind: "idioms"` is `{ "items": [...] }`. Questions go both ways:
what an idiom means, and which idiom means something.

```json
{ "id": "meter-la-pata", "es": "meter la pata", "en": "to put your foot in it; to blunder",
  "literal": "to put in the paw", "level": "B1",
  "example": { "es": "Metí la pata cuando le pregunté por su ex.", "en": "I put my foot in it when I asked about her ex." } }
```

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Unique, lowercase with dashes; saved in review history |
| `es` | yes | The idiom |
| `en` | yes | What it means, senses separated by `;`. Two idioms whose senses overlap are never offered together. |
| `literal` | yes | Word-for-word meaning, used as the first hint |
| `level` | yes | CEFR level |
| `region` | optional | `"mx"` or `"es"` for idioms used mainly in one country; omit for both |
| `example` | yes | `{ "es", "en" }` sentence shown in the explanation |
| `note` | optional | `{ "en", "es"? }` usage note |

## Conversation

A pack of `kind: "conversation"` has `situations` (each becomes a Scope entry)
and `items`. Each item is something said to the learner, the natural reply,
and three replies that don't fit.

```json
{ "id": "how-are-you", "situation": "greetings", "level": "A1",
  "prompt": { "es": "Hola, ¿cómo estás?", "en": "Hi, how are you?" },
  "answer": { "es": "Muy bien, gracias. ¿Y tú?", "en": "Very well, thanks. And you?" },
  "wrong": [ { "es": "Me llamo Carlos.", "en": "My name is Carlos." }, ... ] }
```

`region` and `note` work as for idioms. Wrong replies should be good Spanish
that simply doesn't answer the prompt, so the mistake is about meaning.

## Grammar

A pack of `kind: "grammar"` has `sets` (each with `en`/`es` names and a `tip`
shown as the first hint and on the review page) and `items`:

```json
{ "id": "ser-estar-02", "set": "ser-estar", "level": "A1",
  "es": "Madrid ___ en el centro de España.", "options": ["es", "está"], "answer": "está",
  "en": "Madrid is in the center of Spain.",
  "why": { "en": "Where something is located takes estar.", "es": "La ubicación de algo va con estar." } }
```

`es` has exactly one `___`; `options` has 2–4 choices including `answer`.
Write the sentence so only one option is right: add the context
(*ayer*, *todos los días*, *siempre*) that decides it.

## Example sentences (Tatoeba)

`data/sentences.json` (`kind: "sentences"`) is generated by
`scripts/import-tatoeba.py`; don't edit it by hand, re-run the script. Each
item records the Tatoeba sentence id and author (`id`, `by`), the English
translation and its author (`en`, `enId`, `enBy`), the blanked verb form's
position (`blank`), its verb-list entry (`inf`), tense and the persons that
share the form (`persons`), and the author's country when known (`region`).
The script also rewrites `ATTRIBUTION.md`, and `node --test` checks that every
blank is the engine's form of its verb and that every author is credited.

The app loads this pack only when a learner picks *Verbs in real sentences*
(or reviews a missed sentence card).

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
- The Tatoeba import uses spaCy's Spanish model (GPL) only to filter out
  sentences where the verb form is really a noun or adjective; nothing the
  model produces is committed.
- Candidate sources checked so far:
  - Tatoeba sentences: CC BY 2.0 FR, some CC0. **In use** (`data/sentences.json`,
    credited in `ATTRIBUTION.md`).
  - Wiktionary: CC BY-SA. Share-alike.
  - Fred Jehle database: CC BY-NC-SA. Not compatible.
