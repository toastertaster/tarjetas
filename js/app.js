// Page controller: settings bar, the flipping card, keyboard handling, the
// feedback panel and the review page. All quiz logic lives in quiz.js,
// vocab.js, explain.js and review.js.

import { TENSES, LEVELS, analyze } from './conjugate.js';
import { makeQuestion, gradeTyped, scoreFor, subjectOf, NoQuestion, MODES, REGIONS } from './quiz.js';
import { emptyPhrases } from './phrases.js';
import { respell } from './pronounce.js';
import { explanationNotes, hintNotes, noteContext, reveal, optionMeaning } from './explain.js';
import { needsReview, scopeFor } from './review.js';
import {
  t,
  tenseLabel,
  tenseInfoHtml,
  personLabel,
  renderNote,
  esc,
  LANGS,
  regionName,
  categoryLabel,
  categoryTipHtml,
  exampleHtml,
} from './i18n.js';
import { Progress } from './progress.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const progress = new Progress(safeStorage());
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const ACCENT_KEYS = ['á', 'é', 'í', 'ó', 'ú', 'ñ', 'ü'];
const FLIP_DELAY = 700; // ms to show the green "correct" state before flipping
const ACCENT_DELAY = 1700; // longer, so the accent reminder can be read

const state = {
  verbs: [],
  vocab: { topics: {}, items: [] },
  phrases: emptyPhrases(),
  sentences: null, // loaded the first time they are needed
  packs: [],
  loading: 0, // bumped by every content load, so only the latest one flips the card
  q: null,
  phase: 'loading', // answering | transition | feedback
  hintLevel: 0,
  turn: 0,
  recent: [],
  outcome: null, // { kind: 'wrong' | 'skipped', picked?, grade? } while feedback shows
};

function safeStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const lang = () => progress.settings.lang;
const T = (key, params) => t(lang(), key, params);
const currentFace = () => $$('#card .face')[state.turn % 2];

// ---------------------------------------------------------------------------
// Static text and the settings bar

function option(value, label, selected) {
  const o = document.createElement('option');
  o.value = value;
  o.textContent = label;
  o.selected = value === selected;
  return o;
}

function buildControls() {
  const s = progress.settings;
  $('#mode').replaceChildren(...MODES.map((m) => option(m, T(`mode.${m}`), s.mode)));

  const scope = $('#scope');
  const group = (label, options) => {
    const g = document.createElement('optgroup');
    g.label = label;
    g.append(...options);
    return g;
  };
  const verbScopes = [option('verbs', T('scope.verbs'), s.scope), option('meanings', T('scope.meanings'), s.scope)];
  if (state.packs.some((p) => p.kind === 'sentences')) verbScopes.push(option('sentences', T('scope.sentences'), s.scope));
  scope.replaceChildren(group(T('group.verbs'), verbScopes));
  for (const mood of ['indicative', 'subjunctive', 'imperative', 'nonfinite']) {
    const tenses = TENSES.filter((x) => x.mood === mood);
    scope.append(group(T(`mood.${mood}`), tenses.map((x) => option(`tense:${x.id}`, `${tenseLabel(lang(), x.id)} · ${x.level}`, s.scope))));
  }
  const topics = Object.entries(state.vocab.topics);
  if (topics.length) {
    scope.append(
      group(T('group.vocab'), [
        option('vocab', T('scope.vocab'), s.scope),
        ...topics.map(([id, name]) => option(`topic:${id}`, name[lang()] ?? name.en, s.scope)),
      ]),
    );
  }
  const { idioms, situations, conversation, grammarSets, grammar } = state.phrases;
  if (idioms.length || conversation.length) {
    scope.append(
      group(T('group.phrases'), [
        ...(idioms.length ? [option('idioms', T('scope.idioms'), s.scope)] : []),
        ...(conversation.length ? [option('conversation', T('scope.conversation'), s.scope)] : []),
        ...Object.entries(situations).map(([id, name]) => option(`situation:${id}`, name[lang()] ?? name.en, s.scope)),
      ]),
    );
  }
  if (grammar.length) {
    scope.append(
      group(T('group.grammar'), [
        option('grammar', T('scope.grammar'), s.scope),
        ...Object.entries(grammarSets).map(([id, set]) => option(`grammar:${id}`, set[lang()] ?? set.en, s.scope)),
      ]),
    );
  }
  const deck = progress.review.deck.length;
  const review = [option('review', T('scope.review', { n: deck }), s.scope)];
  review[0].disabled = deck === 0 && s.scope !== 'review';
  if (s.scope.startsWith('cat:')) {
    review.push(option(s.scope, T('scope.cat', { label: categoryLabel(lang(), s.scope.slice(4)) }), s.scope));
  }
  scope.append(group(T('group.review'), review));

  $('#level').replaceChildren(
    option('auto', T('level.autoAt', { level: progress.auto.level }), s.level),
    ...LEVELS.map((l) => option(l, l, s.level)),
  );
  $('#region').replaceChildren(...REGIONS.map((r) => option(r, T(`region.${r}`), s.region)));
}

function applyStaticText() {
  document.documentElement.lang = lang();
  document.title = T('title');
  for (const el of $$('[data-i18n]')) el.textContent = T(el.dataset.i18n);
  for (const el of $$('[data-i18n-title]')) el.title = T(el.dataset.i18nTitle);
  for (const b of $$('.lang button')) b.setAttribute('aria-pressed', String(b.dataset.lang === lang()));
  renderFooter();
  renderScore();
}

function renderScore() {
  const s = progress.session;
  const el = $('#score');
  el.textContent = `✓ ${s.correct}/${s.answered} · 🔥 ${s.streak}`;
  el.setAttribute('aria-label', T('scoreAria', s));
  el.title = `${T('score', s)} · ${T('streak', s)}`;
  renderReviewCount();
}

function renderReviewCount() {
  const n = needsReview(progress.review).length;
  const count = $('#review-count');
  count.textContent = String(n);
  count.hidden = n === 0;
}

function renderFooter() {
  const packs = state.packs
    .map((p) => {
      const credit = `${esc(p.source)}, ${esc(p.license)}`;
      return `${esc(p.title)} (${p.attribution ? `<a href="${esc(p.attribution)}">${credit}</a>` : credit})`;
    })
    .join(' · ');
  $('#footer').innerHTML =
    `Tarjetas · <a href="https://github.com/toastertaster/tarjetas">GitHub</a>` + (packs ? ` · ${packs}` : '');
}

// ---------------------------------------------------------------------------
// Rendering a card face

// Flag images carry their proportions, so no browser stretches them.
const FLAG_SIZE = { mx: [21, 12], es: [15, 10], us: [19, 10] };

function flag(region) {
  const [w, h] = FLAG_SIZE[region];
  return `<span class="chip"><img src="img/flags/${region}.svg" width="${w}" height="${h}" alt="">${esc(T(`badge.${region}`))}</span>`;
}

// The language of the options and the answer.
const answerLang = (q) => q.optionLang ?? (q.direction === 'es-en' || q.dir === 'es-en' ? 'en' : 'es');

const tatoebaLink = (id) => `<a href="https://tatoeba.org/en/sentences/show/${encodeURIComponent(id)}" target="_blank" rel="noopener">#${esc(id)}</a>`;

// Every card reads top to bottom: what the card is about (big), what helps
// to understand it (meaning, pronunciation, translation), then the task in
// one line, right above the answers.

const subject = (text, textLang, cls = '') => `<p class="verb${cls}" lang="${textLang}">${esc(text)}</p>`;
const helper = (text, textLang = 'en') => `<p class="gloss" lang="${textLang}">${esc(text)}</p>`;
const task = (html) => `<p class="task">${html}</p>`;
const bold = (text, textLang) => `<b${textLang ? ` lang="${textLang}"` : ''}>${esc(text)}</b>`;
// "preterite (simple past)", to sit mid-sentence in a task
const tenseInTask = (id) => {
  const label = tenseLabel(lang(), id);
  return label[0].toLowerCase() + label.slice(1);
};

// The pronunciation guide (hablar → ah-BLAHR), with Spain's "th" when practicing Spain's Spanish.
function say(text, region = progress.settings.region) {
  return `<p class="say">${esc(T('say'))} <span class="sounds">${esc(respell(text, region))}</span></p>`;
}

function blanked(text, [start, end]) {
  return `<p class="sentence" lang="es">${esc(text.slice(0, start))}<span class="blank">____</span>${esc(text.slice(end))}</p>`;
}

function promptHtml(q) {
  switch (q.kind) {
    case 'conj': {
      const nonfinite = q.person === null;
      const v = analyze(q.verb);
      // Non-finite forms are taught without the reflexive pronoun.
      const inf = nonfinite ? v.base : q.verb.inf;
      const refl = v.reflexive && !nonfinite ? ` <small>(${esc(T('reflexive'))})</small>` : '';
      const tense = bold(tenseInTask(q.tense));
      const todo = nonfinite
        ? T('task.nonfinite', { tense })
        : T('task.conj', { person: bold(personLabel(q.tense, q.person), 'es') + refl, tense });
      return subject(inf, 'es') + helper(q.verb.en) + say(inf) + task(todo);
    }
    case 'sentence': {
      const todo = T('task.sentence', { inf: bold(q.verb.inf, 'es'), tense: bold(tenseInTask(q.tense)) });
      return blanked(q.item.es, q.item.blank) + helper(q.item.en) + task(todo);
    }
    case 'meaning':
      return q.direction === 'es-en'
        ? subject(q.verb.inf, 'es') + say(q.verb.inf) + task(esc(T('prompt.es-en')))
        : subject(q.verb.en, 'en') + task(esc(T('prompt.en-es')));
    case 'vocab': {
      const region = regionName(lang(), q.vocabRegion);
      if (q.dir === 'es-en') return subject(q.prompt, 'es') + say(q.prompt, q.vocabRegion) + task(esc(T('prompt.vocab.es-en')));
      if (q.dir === 'regional') {
        const fromRegion = q.vocabRegion === 'mx' ? 'es' : 'mx';
        const ask = T('prompt.vocab.regional', { from: regionName(lang(), fromRegion), to: region });
        return subject(q.prompt, 'es') + helper(q.item.en) + say(q.prompt, fromRegion) + task(esc(ask));
      }
      const ask = q.region ? T('prompt.vocab.en-es-region', { region }) : T('prompt.vocab.en-es');
      return subject(q.prompt, 'en') + task(esc(ask));
    }
    case 'idiom':
      return q.dir === 'es-en'
        ? subject(q.prompt, 'es', ' phrase') + say(q.prompt) + task(esc(T('prompt.idiom.es-en')))
        : subject(q.prompt, 'en', ' phrase') + task(esc(T('prompt.idiom.en-es')));
    case 'conversation':
      return subject(q.prompt, 'es', ' phrase speech') + task(esc(T('prompt.conversation')));
    case 'grammar':
      return blanked(q.item.es, [q.item.es.indexOf('___'), q.item.es.indexOf('___') + 3]) + helper(q.item.en) + task(esc(T('prompt.grammar')));
  }
  return '';
}

// Below the answers: the credit for a Tatoeba sentence.
function creditHtml(q) {
  if (q.kind !== 'sentence') return '';
  const { item } = q;
  const sentence = T('credit.sentence', { link: tatoebaLink(item.id), by: esc(item.by) });
  const translation = T('credit.translation', { link: tatoebaLink(item.enId), by: esc(item.enBy) });
  return `<p class="credit">${sentence}, ${translation} · Tatoeba, CC BY 2.0 FR</p>`;
}

function answerHtml(q, id) {
  if (q.mode === 'mc') {
    const textLang = answerLang(q);
    const items = q.options
      .map(
        (o, i) => `<li><button type="button" class="option" data-i="${i}">
          <kbd>${i + 1}</kbd><span lang="${textLang}">${esc(o.text)}</span><span class="mark" aria-hidden="true"></span></button></li>`,
      )
      .join('');
    return `<ol class="options">${items}</ol>`;
  }
  return `
    <form class="typed" novalidate>
      <label class="sr-only" for="answer-${id}">${esc(T('answerLabel'))}</label>
      <input type="text" id="answer-${id}" lang="es" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"
        placeholder="${esc(T('placeholder'))}" />
      <button type="submit" class="check">${esc(T('submit'))}</button>
      <div class="accents">${ACCENT_KEYS.map((c) => `<button type="button" tabindex="-1" data-char="${c}">${c}</button>`).join('')}</div>
      <label class="strict"><input type="checkbox" ${progress.settings.strict ? 'checked' : ''} /> ${esc(T('strict'))}</label>
    </form>`;
}

// The chip at the top of the card: what kind of card this is.
function chipText(q) {
  const name = (obj) => (obj ? (obj[lang()] ?? obj.en) : '');
  switch (q.kind) {
    case 'conj':
    case 'sentence':
      return tenseLabel(lang(), q.tense);
    case 'vocab':
      return name(state.vocab.topics[q.topic]);
    case 'idiom':
      return T('scope.idioms');
    case 'conversation':
      return name(state.phrases.situations[q.situation]);
    case 'grammar':
      return name(state.phrases.grammarSets[q.set]);
  }
  return T('scope.meanings');
}

function renderFace(face, q) {
  const tensed = q.kind === 'conj' || q.kind === 'sentence';
  const chip = esc(chipText(q));
  const info = tensed ? `<p class="tense-info">${tenseInfoHtml(lang(), q.tense)}</p>` : '';
  face.innerHTML = `
    <div class="meta"><span class="chip tense">${chip}</span><span class="chip level">${esc(q.level)}</span>${q.region ? flag(q.region) : ''}</div>
    ${promptHtml(q)}
    ${info}
    ${answerHtml(q, state.turn)}
    ${creditHtml(q)}
    <div class="hint-box" hidden></div>
    <p class="card-note" hidden></p>
    <div class="card-actions">
      <button type="button" class="skip-btn" title="Esc">${esc(T('skip'))} <kbd>Esc</kbd></button>
      <button type="button" class="hint-btn" title="H">💡 ${esc(T('hint'))} <kbd>H</kbd></button>
    </div>`;
  face.tabIndex = -1;

  for (const b of $$('.option', face)) b.addEventListener('click', () => choose(Number(b.dataset.i)));
  $('.hint-btn', face).addEventListener('click', hint);
  $('.skip-btn', face).addEventListener('click', skip);
  const form = $('.typed', face);
  if (form) {
    const input = $('input[type=text]', form);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (input.value.trim()) submitTyped(input.value);
    });
    input.addEventListener('input', () => applyAccentShortcuts(input));
    for (const b of $$('.accents button', form)) {
      b.addEventListener('mousedown', (e) => e.preventDefault()); // keep focus in the input
      b.addEventListener('click', () => insertAtCaret(input, b.dataset.char));
    }
    $('input[type=checkbox]', form).addEventListener('change', (e) => progress.set('strict', e.target.checked));
  }
  // Re-show hints already taken (e.g. after switching language).
  if (state.hintLevel > 0 && face === currentFace()) renderHints(face);
}

// a' → á, n~ → ñ, u" → ü, applied to the text before the caret.
const SHORTCUTS = [
  [/([aeiou])'/g, (_, v) => ({ a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú' })[v]],
  [/([AEIOU])'/g, (_, v) => ({ A: 'Á', E: 'É', I: 'Í', O: 'Ó', U: 'Ú' })[v]],
  [/n~/g, () => 'ñ'],
  [/N~/g, () => 'Ñ'],
  [/u"/g, () => 'ü'],
];

function applyAccentShortcuts(input) {
  const caret = input.selectionStart ?? input.value.length;
  let before = input.value.slice(0, caret);
  const after = input.value.slice(caret);
  for (const [re, fn] of SHORTCUTS) before = before.replace(re, fn);
  if (before + after !== input.value) {
    input.value = before + after;
    input.setSelectionRange(before.length, before.length);
  }
}

function insertAtCaret(input, text) {
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? start;
  input.value = input.value.slice(0, start) + text + input.value.slice(end);
  input.setSelectionRange(start + text.length, start + text.length);
  input.focus();
}

// ---------------------------------------------------------------------------
// Moving between cards

function newQuestion() {
  const ask = () =>
    makeQuestion({
      verbs: state.verbs,
      vocab: state.vocab,
      phrases: state.phrases,
      sentences: state.sentences ?? [],
      settings: progress.settings,
      level: progress.level,
      recent: state.recent,
      deck: progress.review.deck,
    });
  let q;
  try {
    q = ask();
  } catch (err) {
    if (!(err instanceof NoQuestion)) throw err;
    // e.g. the mistakes deck is empty: go back to all verbs
    if (err.reason === 'review-empty') toast(T('review.deckEmpty'));
    progress.set('scope', 'verbs');
    buildControls();
    q = ask();
  }
  state.recent = [subjectOf(q), ...state.recent].slice(0, 15);
  return q;
}

function focusAnswer(face) {
  const input = $('input[type=text]', face);
  (input ?? face).focus({ preventScroll: true });
}

// Draw the next question on the hidden face and turn the card over.
function flipToNext() {
  hideFeedback();
  state.q = newQuestion();
  state.hintLevel = 0;
  state.outcome = null;
  const faces = $$('#card .face');
  const from = faces[state.turn % 2];
  const to = faces[(state.turn + 1) % 2];
  renderFace(to, state.q);
  to.inert = false;
  from.inert = true;
  from.classList.remove('is-correct', 'is-wrong');
  state.turn += 1;
  const card = $('#card');
  card.style.setProperty('--turn', state.turn);
  if (reducedMotion.matches) {
    card.classList.remove('fade');
    void card.offsetWidth; // restart the animation
    card.classList.add('fade');
  }
  state.phase = 'answering';
  focusAnswer(to);
}

// Replace the current card without flipping (first load, language change).
function redrawCurrent() {
  const face = currentFace();
  renderFace(face, state.q);
  if (state.phase === 'answering') focusAnswer(face);
  else markAnswered(face);
}

// ---------------------------------------------------------------------------
// Answering

function choose(i) {
  if (state.phase !== 'answering') return;
  const opt = state.q.options?.[i];
  if (!opt || opt.eliminated) return;
  if (opt.correct) succeed('correct', { picked: opt });
  else fail({ kind: 'wrong', picked: opt });
}

function submitTyped(value) {
  if (state.phase !== 'answering') return;
  const grade = gradeTyped(state.q, value, { strict: progress.settings.strict });
  if (grade.result === 'wrong') fail({ kind: 'wrong', grade });
  else succeed(grade.result, { grade });
}

function skip() {
  if (state.phase !== 'answering') return;
  fail({ kind: 'skipped' });
}

function record(score) {
  const deckBefore = progress.review.deck.length;
  const change = progress.record(score, state.q);
  renderScore();
  // the Scope list shows the mistakes count and the Auto list the level
  if (change || progress.review.deck.length !== deckBefore) buildControls();
  if (change) toast(T(change === 'up' ? 'levelUp' : 'levelDown', { level: progress.auto.level }));
}

// After a miss every option shows what it means, so they can be compared.
function meaningHtml(q, o) {
  const m = optionMeaning(q, o);
  if (!m) return '';
  const text = m.invented ? `<i>${esc(T('invented'))}</i>` : `<span lang="${m.lang}">${esc(m.text)}</span>`;
  return `<span class="meaning">${text}</span>`;
}

// Show the result on the card: highlight options, lock the inputs.
function markAnswered(face, outcome = state.outcome) {
  const q = state.q;
  for (const b of $$('.option', face)) {
    const o = q.options[Number(b.dataset.i)];
    b.disabled = true;
    if (outcome && !$('.meaning', b)) $('span[lang]', b).insertAdjacentHTML('afterend', meaningHtml(q, o));
    if (o.eliminated) b.classList.add('eliminated');
    if (o.correct) {
      b.classList.add('correct');
      $('.mark', b).textContent = '✓';
    } else if (outcome?.picked === o) {
      b.classList.add('wrong');
      $('.mark', b).textContent = '✗';
    }
  }
  const input = $('input[type=text]', face);
  if (input) {
    input.disabled = true;
    input.classList.add(outcome ? 'wrong' : 'correct');
    for (const b of $$('.typed button', face)) b.disabled = true;
  }
  for (const b of $$('.card-actions button', face)) b.disabled = true;
}

function succeed(result, outcome) {
  state.phase = 'transition';
  const face = currentFace();
  markAnswered(face, null);
  face.classList.add('is-correct');
  // A reminder that needs reading time: a missing accent, or a noun typed
  // without its article.
  const expected = outcome.grade?.expected;
  if (expected) {
    const note = $('.card-note', face);
    note.textContent = T(result === 'accent' ? 'accent' : 'rememberArticle', { answer: expected });
    note.hidden = false;
  }
  record(scoreFor(result, state.hintLevel > 0));
  setTimeout(flipToNext, expected ? ACCENT_DELAY : FLIP_DELAY);
}

function fail(outcome) {
  state.phase = 'feedback';
  state.outcome = outcome;
  const face = currentFace();
  markAnswered(face, outcome);
  face.classList.add('is-wrong');
  // A skip means the card wasn't worth answering: it shows the answer but
  // isn't scored, doesn't touch the auto level, and isn't a review mistake.
  if (outcome.kind !== 'skipped') record(0);
  renderFeedback();
}

// ---------------------------------------------------------------------------
// Hints and feedback

// The second hint in multiple choice removes up to two wrong options, but
// always leaves one, so a two-option card only has the first hint.
const removable = (q) => Math.min(2, q.options.filter((o) => !o.correct).length - 1);
const maxHints = (q) => (q.options && removable(q) < 1 ? 1 : 2);

function hint() {
  if (state.phase !== 'answering' || state.hintLevel >= maxHints(state.q)) return;
  state.hintLevel += 1;
  if (state.hintLevel === 2 && state.q.options) {
    const wrong = state.q.options.filter((o) => !o.correct && !o.eliminated);
    for (let n = removable(state.q); n > 0 && wrong.length; n--) wrong.splice(Math.floor(Math.random() * wrong.length), 1)[0].eliminated = true;
  }
  renderHints(currentFace());
}

function renderHints(face) {
  const q = state.q;
  const ctx = noteContext(q);
  const notes = hintNotes(q);
  if (state.hintLevel >= 2 && !q.options) notes.push({ key: 'reveal', text: reveal(q.answer.form) });
  const items = notes.map((n) => renderNote(lang(), n, 'hint', ctx)).filter(Boolean);
  const box = $('.hint-box', face);
  box.innerHTML = `<ul>${items.map((h) => `<li>${h}</li>`).join('')}</ul>`;
  box.hidden = false;
  for (const b of $$('.option', face)) {
    const o = q.options[Number(b.dataset.i)];
    if (o.eliminated) {
      b.classList.add('eliminated');
      b.disabled = true;
    }
  }
  const btn = $('.hint-btn', face);
  btn.innerHTML = `💡 ${esc(T('hintMore'))} <kbd>H</kbd>`;
  if (state.hintLevel >= maxHints(q)) btn.disabled = true;
}

function renderFeedback() {
  const q = state.q;
  const o = state.outcome;
  const ctx = noteContext(q);
  const notes = explanationNotes(q, { picked: o.picked, grade: o.grade })
    .map((n) => renderNote(lang(), n, 'explain', ctx))
    .filter(Boolean);
  const alts = q.answer.alts.length
    ? `<p class="alts">${esc(T('alsoAccepted', { alts: q.answer.alts.join(', ') }))}</p>`
    : '';
  const panel = $('#feedback');
  panel.innerHTML = `
    <h2>✗ ${esc(T(o.kind === 'skipped' ? 'skipped' : 'wrong'))}</h2>
    <p class="answer">${T('answerIs', { answer: `<b lang="${answerLang(q)}">${esc(q.answer.form)}</b>` })}</p>
    ${alts}
    <ul>${notes.map((n) => `<li>${n}</li>`).join('')}</ul>
    <footer><span>${esc(T('continue'))}</span><button type="button" class="next-btn">${esc(T('next'))} ↵</button></footer>`;
  panel.hidden = false;
  $('.next-btn', panel).addEventListener('click', flipToNext);
  $('.next-btn', panel).focus({ preventScroll: true });
  panel.scrollIntoView({ block: 'nearest', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
}

function hideFeedback() {
  const panel = $('#feedback');
  panel.hidden = true;
  panel.replaceChildren();
}

let toastTimer = null;
function toast(text) {
  const el = $('#toast');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 3500);
}

// ---------------------------------------------------------------------------
// The review page (#review)

const reviewOpen = () => !$('#review-view').hidden;
const contentNames = () => ({ topics: state.vocab.topics, situations: state.phrases.situations, grammarSets: state.phrases.grammarSets });

function renderReview() {
  const view = $('#review-view');
  const items = needsReview(progress.review);
  const deck = progress.review.deck.length;
  const list = items
    .map((c) => {
      const tip = categoryTipHtml(lang(), c.key, contentNames());
      const examples = c.examples.map((ex) => `<li>${exampleHtml(lang(), ex)}</li>`).join('');
      return `
        <li class="review-item">
          <h3>${esc(categoryLabel(lang(), c.key, contentNames()))}</h3>
          <p class="review-stat">${esc(T('review.missed', { misses: c.misses, attempts: c.attempts }))}</p>
          ${tip ? `<p class="review-tip">${tip}</p>` : ''}
          <p class="review-examples-label">${esc(T('review.examples'))}:</p>
          <ul class="review-examples">${examples}</ul>
          <button type="button" class="practice-btn" data-category="${esc(c.key)}">${esc(T('review.practice'))}</button>
        </li>`;
    })
    .join('');
  view.innerHTML = `
    <header class="review-head">
      <h2 id="review-title" tabindex="-1">${esc(T('review.title'))}</h2>
      <button type="button" class="back-btn">← ${esc(T('review.back'))}</button>
    </header>
    <p class="review-intro">${esc(T(items.length ? 'review.intro' : 'review.empty'))}</p>
    <div class="deck-box">
      <button type="button" class="next-btn deck-btn" ${deck ? '' : 'disabled'}>${esc(T('review.practiceDeck', { n: deck }))}</button>
      <span>${esc(T('review.deckHint'))}</span>
    </div>
    <ol class="review-list">${list}</ol>
    <p><button type="button" class="link-btn reset-btn">${esc(T('review.reset'))}</button></p>`;
  $('.back-btn', view).addEventListener('click', closeReview);
  $('.deck-btn', view).addEventListener('click', () => practice('review'));
  for (const b of $$('.practice-btn', view)) b.addEventListener('click', () => practiceCategory(b.dataset.category));
  $('.reset-btn', view).addEventListener('click', () => {
    if (!window.confirm(T('review.resetConfirm'))) return;
    progress.resetReview();
    renderScore();
    buildControls();
    renderReview();
  });
}

function showReview(open) {
  $('#review-view').hidden = !open;
  $('#card-stage').hidden = open;
  if (open) {
    $('#feedback').hidden = true;
    renderReview();
    $('#review-title').focus?.();
  } else if (state.q) {
    $('#feedback').hidden = state.phase !== 'feedback';
    focusAnswer(currentFace());
  }
}

function openReview() {
  if (location.hash !== '#review') location.hash = 'review';
  else showReview(true);
}

function closeReview() {
  if (location.hash === '#review') history.back();
  else showReview(false);
}

async function practice(scope, region = null) {
  progress.set('scope', scope);
  if (region) progress.set('region', region);
  buildControls();
  closeReview();
  if (await ensureContent()) flipToNext();
}

function practiceCategory(category) {
  // Mexico ↔ Spain words only come up with Region = Both; vosotros needs Spain's forms.
  const region = category === 'regional' ? 'both' : category === 'vosotros' && progress.settings.region === 'mx' ? 'es' : null;
  practice(scopeFor(category), region);
}

// ---------------------------------------------------------------------------
// Events

function onKeyDown(e) {
  if ($('#help').open) return;
  if (reviewOpen()) {
    if (e.key === 'Escape') closeReview();
    return;
  }
  if (e.target.matches?.('select')) return;
  if (e.altKey && e.code === 'KeyH') {
    e.preventDefault();
    hint();
    return;
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (state.phase === 'feedback') {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      flipToNext();
    }
    return;
  }
  if (state.phase !== 'answering') return;
  if (e.key === 'Escape') {
    e.preventDefault();
    skip();
    return;
  }
  if (e.target.matches?.('input[type=text]')) return; // letters are for typing
  if (/^[1-4]$/.test(e.key) && state.q.options) {
    e.preventDefault();
    choose(Number(e.key) - 1);
  } else if (e.key === 'h' || e.key === 'H') {
    e.preventDefault();
    hint();
  } else if (e.key === '?') {
    e.preventDefault();
    $('#help').showModal();
  }
}

async function onSettingChange(key, value) {
  progress.set(key, value);
  buildControls();
  if (state.q && (await ensureContent())) flipToNext();
}

function bindEvents() {
  document.addEventListener('keydown', onKeyDown);
  for (const key of ['mode', 'scope', 'level', 'region']) {
    $(`#${key}`).addEventListener('change', (e) => onSettingChange(key, e.target.value));
  }
  for (const b of $$('.lang button')) {
    b.addEventListener('click', () => {
      if (!LANGS.includes(b.dataset.lang) || b.dataset.lang === lang()) return;
      progress.set('lang', b.dataset.lang);
      applyStaticText();
      buildControls();
      if (state.q) {
        redrawCurrent();
        if (state.phase === 'feedback') renderFeedback();
      }
    });
  }
  $('#help-btn').addEventListener('click', () => $('#help').showModal());
  $('#review-btn').addEventListener('click', () => (reviewOpen() ? closeReview() : openReview()));
  window.addEventListener('hashchange', () => showReview(location.hash === '#review'));
  // Narrow screens: the settings start collapsed behind the ⚙ button.
  $('#settings-toggle').addEventListener('click', () => {
    const open = $('#topbar').classList.toggle('open');
    $('#settings-toggle').setAttribute('aria-expanded', String(open));
  });
}

const loadPacks = (kind) =>
  Promise.all(
    state.packs
      .filter((p) => p.kind === kind)
      .map((p) =>
        fetch(`data/${p.file}`).then((r) => {
          if (!r.ok) throw new Error(`data/${p.file}: ${r.status}`);
          return r.json();
        }),
      ),
  );

// Everything except the sentences, which are large and load on demand.
async function loadData() {
  const manifest = await (await fetch('data/manifest.json')).json();
  state.packs = manifest.packs;
  const [verbLists, vocabPacks, idiomPacks, conversationPacks, grammarPacks] = await Promise.all(
    ['verbs', 'vocab', 'idioms', 'conversation', 'grammar'].map(loadPacks),
  );
  state.verbs = verbLists.flat();
  for (const pack of vocabPacks) {
    Object.assign(state.vocab.topics, pack.topics);
    state.vocab.items.push(...pack.items);
  }
  const ph = state.phrases;
  for (const pack of idiomPacks) ph.idioms.push(...pack.items);
  for (const pack of conversationPacks) {
    Object.assign(ph.situations, pack.situations);
    ph.conversation.push(...pack.items);
  }
  for (const pack of grammarPacks) {
    Object.assign(ph.grammarSets, pack.sets);
    ph.grammar.push(...pack.items);
  }
}

const needsSentences = () => {
  const { scope } = progress.settings;
  return scope === 'sentences' || (scope === 'review' && progress.review.deck.some((d) => d.spec.kind === 'sentence'));
};

/**
 * Load what the current scope needs before the next card. Resolves to false
 * when another load started meanwhile (that one draws the card instead).
 */
async function ensureContent() {
  const ticket = ++state.loading;
  if (state.sentences === null && needsSentences()) {
    try {
      state.sentences = (await loadPacks('sentences')).flatMap((p) => p.items);
    } catch (err) {
      console.error(err);
      toast(T('loadSentencesError'));
      if (progress.settings.scope === 'sentences') progress.set('scope', 'verbs');
      buildControls();
    }
  }
  return ticket === state.loading;
}

async function main() {
  applyStaticText();
  buildControls();
  bindEvents();
  try {
    await loadData();
  } catch (err) {
    console.error(err);
    $('.face').innerHTML = `<p class="loading">${esc(T('loadError'))}</p>`;
    return;
  }
  renderFooter();
  buildControls(); // now with the content's topics
  await ensureContent();
  state.q = newQuestion();
  state.phase = 'answering';
  redrawCurrent();
  if (location.hash === '#review') showReview(true);
}

main();
