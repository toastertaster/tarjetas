# tarjetas

Flash cards to learn Spanish, built for the keyboard. Practice verb
conjugations in every tense, verbs in real sentences, everyday vocabulary,
idioms, conversation and grammar, for Mexican and Spain Spanish, with
explanations for every mistake.

**Live site:** https://toastertaster.github.io/tarjetas/

## Using it

The dropdowns along the top choose what you practice:

| Dropdown | Options |
|---|---|
| Mode | How you answer: multiple choice, type the answer, or mixed |
| Scope | What you practice: verbs in all tenses or one tense, verb meanings, verbs in real sentences, vocabulary (all topics or one), idioms, conversation (all situations or one), grammar (all topics or one), your mistakes |
| Level | Auto, or a fixed CEFR level A1–C2 |
| Region | Mexico (default), Spain, or both. *Vosotros*, and words, idioms and phrases marked for one country, appear only with that country or Both; Both also asks Mexico ↔ Spain equivalents (*carro* → *coche*). |

The 🇺🇸 / 🇲🇽 buttons switch the page between English and Spanish. On phones
the settings fold away behind the ⚙ button.

| Key | Action |
|---|---|
| `1`–`4` | Pick an answer |
| `Enter` | Check the answer / go to the next card |
| `Esc` | Skip (shows the answer) |
| `H` (`Alt+H` / `⌥H` while typing) | Hint; press again for more help |
| `?` | Keyboard help |

Each card reads top to bottom: the Spanish word or sentence in large type,
then what it means and a **Sounds like** pronunciation guide written in
English spelling with the stressed syllable in capitals (*tener* → *teh-NEHR*;
with Region set to Spain, *c* and *z* sound like *th*), then the task in bold
(*Conjugate it for **yo** in the **preterite***), then the answers. The guide
is rule-based, so treat it as an approximation.

**Verbs in real sentences** shows a sentence written by a native speaker with
its verb blanked out, plus the infinitive, the tense and an English
translation; you work out the person from the sentence. The sentences come
from [Tatoeba](https://tatoeba.org) (CC BY 2.0 FR) and each card credits and
links its authors. **Idioms**, **conversation** (pick the best reply) and
**grammar** (ser/estar, por/para, preterite/imperfect, subjunctive, gustar)
are always multiple choice, whatever the Mode.

After a miss (or a skip), every multiple-choice option shows what it means,
so all four can be compared: *tuve — I had*, *tenía — I used to have*,
*tuvo — he/she had*, and *tení — not a real form*. For vocabulary, idioms and
conversation the options show their translations.

When typing, `a'` becomes `á`, `n~` becomes `ñ` and `u"` becomes `ü`. A
missing accent counts as correct with a reminder, unless *Strict accents* is
ticked or the unaccented word is a different form (*hablo* vs *habló*). For
nouns the article is optional, but a wrong one (*la carro*) is a gender mistake.

**Auto level** starts at A2 and watches your last 20 answers: 85% or better
moves you up a level, below 60% moves you down. Answers after a hint count
half. Skipping a card (`Esc`) shows the answer without counting it: it doesn't
change your score, streak or level, and isn't recorded as a mistake. Your
settings and level are saved in the browser.

**Review** (📋 in the header) lists the topics you have missed at least twice
in your last ten tries: a tense, a pattern such as irregular preterite stems or
e → ie stem changes, a vocabulary topic, idioms, a conversation situation or a
grammar topic. Each comes with its rule, the
examples you got wrong and a *Practice this* button. Every card you miss also
goes into *My mistakes*, where it stays until you get it right twice in a row.

## Running locally

The site is static: plain HTML, CSS and JavaScript modules with no build step
and no dependencies. Browsers won't load modules from `file://`, so serve the
folder over http:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Tests

```sh
node --test            # engine, quiz logic, translations and content checks
```

### Rendering tests

`tests/visual/` uses [Playwright](https://playwright.dev) to open the site on
a desktop screen and four phones: Pixel 7, Pixel 11 and Galaxy S24 (360px,
the most common Android width) in Chromium, the engine of Chrome on Android,
and iPhone 14 in WebKit, Safari's engine. These are emulated: the screen size,
pixel density, touch and browser identity of each phone, not a real device.

- `layout.spec.js` checks rules that must always hold: the header keeps its
  size when the language changes (at every desktop width), images keep their
  proportions, nothing sticks out of the card or the screen, and every option
  is explained after a miss.
- `screens.spec.js` takes screenshots of the main screens (cards of each kind,
  the Spanish page, a missed card, the review page, phone settings) and
  compares them with the approved images in `tests/visual/snapshots/`.
  Questions are seeded so the same cards come up every time.

CI runs both in the official Playwright container (`render` job), and pages
are only deployed when they pass. Screenshots depend on the installed fonts,
so they are only compared on Linux; on a Mac the layout rules still run:

```sh
npm ci
npx playwright install chromium webkit
npx playwright test
```

**When a screenshot changes.** The `render` job fails and uploads two
artifacts: `rendering-report` (open `index.html`: expected, actual and diff
for each screenshot) and `visual-snapshots` (a complete new set). If the
change is intended, approve it by committing the new set:

```sh
gh run download <run-id> -n visual-snapshots -D tests/visual/snapshots
git add tests/visual/snapshots && git commit -m "Approve new screenshots"
```

The conjugation engine is also cross-checked against
[verbecc](https://github.com/bretttolbert/verbecc), an independent conjugator:

```sh
pip install verbecc==2.1.0
node scripts/dump-conjugations.js > conjugations.json
python3 scripts/crosscheck.py conjugations.json
```

Known verbecc mistakes are listed, with reasons, in
`tests/crosscheck-exceptions.json`.

`data/sentences.json` and `ATTRIBUTION.md` are generated from Tatoeba's
exports by `scripts/import-tatoeba.py` (see the script for its requirements:
node and spaCy with its Spanish model).

## Deployment

`.github/workflows/deploy.yml` runs the unit tests (`test` job) and the
rendering tests (`render` job) on every pull request and push. Pushes to
`main` that pass both are published to GitHub Pages. The repository's
Pages source must be set to **GitHub Actions** (Settings → Pages).
`.github/workflows/crosscheck.yml` runs the verbecc comparison whenever the
engine or verb list changes.

## How it fits together

| File | Role |
|---|---|
| `js/conjugate.js` | Conjugation engine. Every form records the rules that shaped it. |
| `js/quiz.js` | Picks questions for each Scope, builds multiple-choice distractors, grades typed answers |
| `js/vocab.js` | Vocabulary questions, regional variants, article and gender grading |
| `js/phrases.js` | Idiom, conversation and grammar questions |
| `js/pronounce.js` | The "Sounds like" guide: respells Spanish in English spelling, stressed syllable in capitals |
| `js/english.js` | English meanings of verb forms (*tuve — I had*), shown on the options after a miss |
| `js/random.js` | Seeded randomness and level-weighted picking shared by every kind of question |
| `js/review.js` | Maps questions to review topics, tracks misses, keeps the mistakes deck |
| `js/explain.js` | Turns a question and a wrong answer into explanation and hint notes |
| `js/i18n.js` | English and Spanish page text, note templates and review topic tips |
| `js/progress.js` | Settings, auto level, score and review history, saved in `localStorage` |
| `js/app.js` | The page: dropdowns, the flipping card, keyboard handling, the review page; loads the sentences only when needed |
| `data/` | Content. See [CONTENT.md](CONTENT.md) for the format and licensing rules. |

## License

Code and original content are MIT licensed (see `LICENSE`). Third-party
content keeps its own license, recorded in `data/manifest.json`: the Tatoeba
sentences in `data/sentences.json` are CC BY 2.0 FR, credited in
[ATTRIBUTION.md](ATTRIBUTION.md).
