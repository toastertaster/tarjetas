// Page controller: settings bar, the flipping card, keyboard handling and the
// feedback panel. All quiz logic lives in quiz.js / explain.js.

import { TENSES, LEVELS, analyze } from './conjugate.js';
import { makeQuestion, gradeTyped, scoreFor, MODES, REGIONS } from './quiz.js';
import { explanationNotes, hintNotes, noteContext, reveal } from './explain.js';
import { t, tenseName, personLabel, renderNote, esc, LANGS } from './i18n.js';
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
  packs: [],
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
  scope.replaceChildren(option('verbs', T('scope.verbs'), s.scope));
  for (const mood of ['indicative', 'subjunctive', 'imperative', 'nonfinite']) {
    const group = document.createElement('optgroup');
    group.label = T(`mood.${mood}`);
    for (const tense of TENSES.filter((x) => x.mood === mood)) {
      group.append(option(`tense:${tense.id}`, `${tenseName(lang(), tense.id)} · ${tense.level}`, s.scope));
    }
    scope.append(group);
  }
  scope.disabled = s.mode === 'meaning';

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
  $('#score').textContent = `${T('score', s)} · ${T('streak', s)}`;
}

function renderFooter() {
  const packs = state.packs.map((p) => `${esc(p.title)} (${esc(p.source)}, ${esc(p.license)})`).join(' · ');
  $('#footer').innerHTML =
    `Tarjetas · <a href="https://github.com/toastertaster/tarjetas">GitHub</a>` + (packs ? ` · ${packs}` : '');
}

// ---------------------------------------------------------------------------
// Rendering a card face

function flag(region) {
  return `<span class="chip"><img src="img/flags/${region}.svg" alt="">${esc(T(`badge.${region}`))}</span>`;
}

function promptHtml(q) {
  if (q.kind === 'meaning') {
    const word = q.direction === 'es-en' ? `<p class="verb" lang="es">${esc(q.verb.inf)}</p>` : `<p class="verb" lang="en">${esc(q.verb.en)}</p>`;
    return `<p class="instruction">${esc(T(`prompt.${q.direction}`))}</p>${word}`;
  }
  const nonfinite = q.person === null;
  const v = analyze(q.verb);
  // Non-finite forms are taught without the reflexive pronoun.
  const inf = nonfinite ? v.base : q.verb.inf;
  const refl = v.reflexive && !nonfinite ? ` <small>(${esc(T('reflexive'))})</small>` : '';
  const person = nonfinite ? '' : `<p class="person" lang="es">${esc(personLabel(q.tense, q.person))}${refl}</p>`;
  return `
    <p class="instruction">${esc(T('prompt.conj'))}</p>
    <p class="verb" lang="es">${esc(inf)}</p>
    <p class="gloss">${esc(q.verb.en)}</p>
    ${person}`;
}

function answerHtml(q, id) {
  if (q.mode === 'mc') {
    const textLang = q.kind === 'meaning' && q.direction === 'es-en' ? 'en' : 'es';
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

function renderFace(face, q) {
  const tense = q.kind === 'conj' ? `<span class="chip">${esc(tenseName(lang(), q.tense))}</span>` : `<span class="chip">${esc(T('mode.meaning'))}</span>`;
  face.innerHTML = `
    <div class="meta">${tense}<span class="chip level">${esc(q.level)}</span>${q.region ? flag(q.region) : ''}</div>
    ${promptHtml(q)}
    ${answerHtml(q, state.turn)}
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
  const q = makeQuestion({ verbs: state.verbs, settings: progress.settings, level: progress.level, recent: state.recent });
  state.recent = [q.verb.inf, ...state.recent].slice(0, 15);
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
  const change = progress.record(score);
  renderScore();
  if (change) {
    buildControls();
    toast(T(change === 'up' ? 'levelUp' : 'levelDown', { level: progress.auto.level }));
  }
}

// Show the result on the card: highlight options, lock the inputs.
function markAnswered(face, outcome = state.outcome) {
  const q = state.q;
  for (const b of $$('.option', face)) {
    const o = q.options[Number(b.dataset.i)];
    b.disabled = true;
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
  if (result === 'accent') {
    const note = $('.card-note', face);
    note.textContent = T('accent', { answer: outcome.grade.expected });
    note.hidden = false;
  }
  record(scoreFor(result, state.hintLevel > 0));
  setTimeout(flipToNext, result === 'accent' ? ACCENT_DELAY : FLIP_DELAY);
}

function fail(outcome) {
  state.phase = 'feedback';
  state.outcome = outcome;
  const face = currentFace();
  markAnswered(face, outcome);
  face.classList.add('is-wrong');
  record(0);
  renderFeedback();
}

// ---------------------------------------------------------------------------
// Hints and feedback

function hint() {
  if (state.phase !== 'answering' || state.hintLevel >= 2) return;
  state.hintLevel += 1;
  if (state.hintLevel === 2 && state.q.options) {
    // Second hint in multiple choice: remove two wrong options.
    const wrong = state.q.options.filter((o) => !o.correct && !o.eliminated);
    for (const o of wrong.sort(() => Math.random() - 0.5).slice(0, 2)) o.eliminated = true;
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
  if (state.hintLevel >= 2) btn.disabled = true;
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
    <p class="answer">${T('answerIs', { answer: `<b lang="${q.kind === 'meaning' && q.direction === 'es-en' ? 'en' : 'es'}">${esc(q.answer.form)}</b>` })}</p>
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
// Events

function onKeyDown(e) {
  if ($('#help').open) return;
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

function onSettingChange(key, value) {
  progress.set(key, value);
  buildControls();
  if (state.q) flipToNext();
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
}

async function loadData() {
  const manifest = await (await fetch('data/manifest.json')).json();
  state.packs = manifest.packs;
  const lists = await Promise.all(
    manifest.packs.filter((p) => p.kind === 'verbs').map((p) => fetch(`data/${p.file}`).then((r) => r.json())),
  );
  state.verbs = lists.flat();
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
  state.q = newQuestion();
  state.phase = 'answering';
  redrawCurrent();
}

main();
