// English meanings of Spanish verb forms, built from the first sense of a
// verb's gloss: tener ("to have; to own") in the preterite, yo → "I had".
// Shown next to the answer options after a miss, so the forms can be
// compared side by side. These are study aids, not translations: one
// English rendering is chosen per tense (the imperfect is always "used to").

// base: [past, past participle]
const IRREGULAR = Object.fromEntries(
  `arise arose arisen|awake awoke awoken|bear bore borne|beat beat beaten|become became become|begin began begun|
  bend bent bent|bet bet bet|bind bound bound|bite bit bitten|bleed bled bled|blow blew blown|break broke broken|
  breed bred bred|bring brought brought|build built built|burst burst burst|buy bought bought|cast cast cast|
  catch caught caught|choose chose chosen|cling clung clung|come came come|cost cost cost|creep crept crept|
  cut cut cut|deal dealt dealt|dig dug dug|do did done|draw drew drawn|drink drank drunk|drive drove driven|
  eat ate eaten|fall fell fallen|feed fed fed|feel felt felt|fight fought fought|find found found|fit fit fit|
  flee fled fled|fling flung flung|fly flew flown|forbid forbade forbidden|forecast forecast forecast|
  foresee foresaw foreseen|forget forgot forgotten|forgive forgave forgiven|freeze froze frozen|get got gotten|
  give gave given|go went gone|grind ground ground|grow grew grown|hang hung hung|have had had|hear heard heard|
  hide hid hidden|hit hit hit|hold held held|hurt hurt hurt|keep kept kept|kneel knelt knelt|know knew known|
  lay laid laid|lead led led|leave left left|lend lent lent|let let let|light lit lit|lose lost lost|
  make made made|mean meant meant|meet met met|mislay mislaid mislaid|mislead misled misled|
  overcome overcame overcome|overthrow overthrew overthrown|pay paid paid|put put put|quit quit quit|
  read read read|rebuild rebuilt rebuilt|redo redid redone|reread reread reread|ride rode ridden|ring rang rung|
  rise rose risen|run ran run|say said said|see saw seen|seek sought sought|sell sold sold|send sent sent|
  set set set|sew sewed sewn|shake shook shaken|shine shone shone|shoe shod shod|shoot shot shot|show showed shown|
  shrink shrank shrunk|shut shut shut|sing sang sung|sink sank sunk|sit sat sat|sleep slept slept|slide slid slid|
  slit slit slit|sow sowed sown|speak spoke spoken|spend spent spent|spin spun spun|split split split|
  spread spread spread|spring sprang sprung|stand stood stood|steal stole stolen|stick stuck stuck|
  sting stung stung|strike struck struck|swear swore sworn|sweep swept swept|swim swam swum|swing swung swung|
  take took taken|teach taught taught|tear tore torn|tell told told|think thought thought|throw threw thrown|
  understand understood understood|undertake undertook undertaken|undo undid undone|upset upset upset|
  wake woke woken|wear wore worn|weave wove woven|weep wept wept|win won won|wind wound wound|
  withdraw withdrew withdrawn|wring wrung wrung|write wrote written`
    .split('|')
    .map((s) => s.trim().split(' '))
    .map(([base, past, pp]) => [base, [past, pp]]),
);

// Verbs of more than one syllable that double their last consonant (US spelling).
const DOUBLES = new Set(
  'abet acquit admit commit compel confer control defer deter emit equip excel expel incur infer occur omit patrol permit prefer propel rebel recur refer regret submit transmit'.split(' '),
);

const syllables = (w) => (w.match(/[aeiouy]+/g) ?? []).length;

// stop → stopp(ed), but rain, visit, fix and play stay as they are.
function doubled(w) {
  if (!/[^aeiou][aeiou][^aeiouwxy]$/.test(w)) return w;
  return syllables(w) === 1 || DOUBLES.has(w) ? w + w.at(-1) : w;
}

function thirdPerson(w) {
  if (w === 'be') return 'is';
  if (w === 'have') return 'has';
  if (w === 'do' || w === 'go') return `${w}es`;
  if (/(s|x|z|ch|sh)$/.test(w)) return `${w}es`;
  if (/[^aeiou]y$/.test(w)) return `${w.slice(0, -1)}ies`;
  return `${w}s`;
}

function regularPast(w) {
  if (w.endsWith('e')) return `${w}d`;
  if (/[^aeiou]y$/.test(w)) return `${w.slice(0, -1)}ied`;
  return `${doubled(w)}ed`;
}

function gerund(w) {
  if (w === 'be') return 'being';
  if (w.endsWith('ie')) return `${w.slice(0, -2)}ying`;
  if (/(ee|ye|oe)$/.test(w) || w === 'age') return w === 'age' ? 'aging' : `${w}ing`;
  if (w.endsWith('e') && w.length > 2) return `${w.slice(0, -1)}ing`;
  return `${doubled(w)}ing`;
}

/** The parts of an English verb, from its gloss: "to get up; to rise" → get + "up". */
export function englishVerb(gloss) {
  const sense = gloss.split(';')[0].replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim().replace(/^to /, '');
  const [head, ...rest] = sense.split(' ');
  // "to lie (tell lies)" is regular; "to lie down" is the irregular lie, lay, lain.
  const irregular = head === 'lie' ? (rest.length ? ['lay', 'lain'] : null) : head === 'be' ? null : IRREGULAR[head];
  return {
    base: head,
    s: thirdPerson(head),
    past: head === 'be' ? 'was' : irregular ? irregular[0] : regularPast(head),
    pp: head === 'be' ? 'been' : irregular ? irregular[1] : regularPast(head),
    ing: gerund(head),
    rest: rest.join(' '),
  };
}

const SUBJECTS = ['I', 'you', 'he/she', 'we', 'you all', 'they'];
const REFLEXIVE = ['myself', 'yourself', 'himself/herself', 'ourselves', 'yourselves', 'themselves'];
const POSSESSIVE = ['my', 'your', 'his/her', 'our', 'your', 'their'];
const COMMAND_PERSON = [null, 'tú', 'usted', null, 'vosotros', 'ustedes'];

const BE_PRESENT = ['am', 'are', 'is', 'are', 'are', 'are'];
const BE_PAST = ['was', 'were', 'was', 'were', 'were', 'were'];

/**
 * English for one cell of a verb's table, e.g. ('pret', 0) → "I had".
 * `person` is null for the gerund and participle. Impersonal verbs use "it".
 */
export function englishForm(entry, tense, person) {
  const v = englishVerb(entry.en);
  const p = person ?? 2;
  const rest = v.rest.replace(/\boneself\b/g, REFLEXIVE[p]).replace(/\bone's\b/g, POSSESSIVE[p]);
  const be = v.base === 'be';
  const subject = entry.impersonal ? 'it' : SUBJECTS[p];
  const third = p === 2;
  const join = (...parts) => parts.filter(Boolean).join(' ');
  const present = be ? BE_PRESENT[p] : third ? v.s : v.base;
  const past = be ? BE_PAST[p] : v.past;
  const haveAux = third ? 'has' : 'have';
  switch (tense) {
    case 'pres':
      return join(subject, present, rest);
    case 'pret':
      return join(subject, past, rest);
    case 'impf':
      return join(subject, 'used to', v.base, rest);
    case 'fut':
      return join(subject, 'will', v.base, rest);
    case 'cond':
      return join(subject, 'would', v.base, rest);
    case 'pres_perf':
      return join(subject, haveAux, v.pp, rest);
    case 'pluperf':
    case 'past_ant':
      return join(subject, 'had', v.pp, rest);
    case 'fut_perf':
      return join(subject, 'will have', v.pp, rest);
    case 'cond_perf':
      return join(subject, 'would have', v.pp, rest);
    case 'subj_pres':
      return join('(that)', subject, present, rest);
    case 'subj_impf':
      return join('(if)', subject, be ? 'were' : v.past, rest);
    case 'subj_perf':
      return join('(that)', subject, haveAux, v.pp, rest);
    case 'subj_pluperf':
      return join('(if)', subject, 'had', v.pp, rest);
    case 'subj_fut':
      return join('(if)', subject, 'should', v.base, rest);
    case 'subj_fut_perf':
      return join('(if)', subject, 'should have', v.pp, rest);
    case 'imp_aff':
      return p === 3 ? `let's ${join(v.base, rest)}!` : `${join(v.base, rest)}! (${COMMAND_PERSON[p]})`;
    case 'imp_neg':
      return p === 3 ? `let's not ${join(v.base, rest)}!` : `don't ${join(v.base, rest)}! (${COMMAND_PERSON[p]})`;
    case 'gerund':
      return join(v.ing, v.rest);
    case 'participle':
      return join(v.pp, v.rest);
  }
  return null;
}
