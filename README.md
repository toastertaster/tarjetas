# tarjetas

Flash cards to learn Spanish, built for the keyboard. Practice verb conjugations
for Mexican and Spain Spanish in every tense, with explanations for every
mistake.

**Live site:** https://toastertaster.github.io/tarjetas/

## Using it

The dropdowns along the top choose what you practice:

| Dropdown | Options |
|---|---|
| Mode | Multiple choice, type the answer, verb meanings (ES ↔ EN), mixed |
| Scope | All tenses, or a single tense |
| Level | Auto, or a fixed CEFR level A1–C2 |
| Region | Mexico (default), Spain, or both. *Vosotros* and Spain-only words appear only with Spain or Both. |

The 🇺🇸 / 🇲🇽 buttons switch the page between English and Spanish.

| Key | Action |
|---|---|
| `1`–`4` | Pick an answer |
| `Enter` | Check the answer / go to the next card |
| `Esc` | Skip (shows the answer) |
| `H` (`Alt+H` / `⌥H` while typing) | Hint; press again for more help |
| `?` | Keyboard help |

When typing, `a'` becomes `á`, `n~` becomes `ñ` and `u"` becomes `ü`. A
missing accent counts as correct with a reminder, unless *Strict accents* is
ticked or the unaccented word is a different form (*hablo* vs *habló*).

**Auto level** starts at A2 and watches your last 20 answers: 85% or better
moves you up a level, below 60% moves you down. Answers after a hint count
half. Your settings and level are saved in the browser.

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

The conjugation engine is also cross-checked against
[verbecc](https://github.com/bretttolbert/verbecc), an independent conjugator:

```sh
pip install verbecc==2.1.0
node scripts/dump-conjugations.js > conjugations.json
python3 scripts/crosscheck.py conjugations.json
```

Known verbecc mistakes are listed, with reasons, in
`tests/crosscheck-exceptions.json`.

## Deployment

`.github/workflows/deploy.yml` runs the tests on every pull request and push.
Pushes to `main` that pass are published to GitHub Pages. The repository's
Pages source must be set to **GitHub Actions** (Settings → Pages).
`.github/workflows/crosscheck.yml` runs the verbecc comparison whenever the
engine or verb list changes.

## How it fits together

| File | Role |
|---|---|
| `js/conjugate.js` | Conjugation engine. Every form records the rules that shaped it. |
| `js/quiz.js` | Picks questions, builds multiple-choice distractors, grades typed answers |
| `js/explain.js` | Turns a question and a wrong answer into explanation and hint notes |
| `js/i18n.js` | English and Spanish page text and note templates |
| `js/progress.js` | Settings, auto level and score, saved in `localStorage` |
| `js/app.js` | The page: dropdowns, the flipping card, keyboard handling |
| `data/` | Content. See [CONTENT.md](CONTENT.md) for the format and licensing rules. |

## License

Code and original content are MIT licensed (see `LICENSE`). Third-party
content, when added, keeps its own license, recorded in `data/manifest.json`.
