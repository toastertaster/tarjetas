"""Import example sentences from Tatoeba for "verbs in real sentences" cards.

Tatoeba (https://tatoeba.org) publishes its sentences under CC BY 2.0 FR,
which allows reuse with attribution. This script picks short Spanish
sentences written by native speakers that have an English translation and
contain exactly one unambiguous form of a verb from data/verbs.json, and
writes:

  data/sentences.json   the sentences, each with its Tatoeba id and authors
  ATTRIBUTION.md        credits for every sentence used

Many verb forms are also nouns or adjectives (esfuerzo, alegre, juntas), so
every candidate is checked with spaCy's Spanish part-of-speech tagger: the
word must be tagged as a finite verb whose mood, tense and person agree with
the conjugation engine. The tagger only filters; nothing it produces is
written out.

Usage (needs node for the conjugation engine; downloads ~50 MB once):

    pip install spacy
    pip install https://github.com/explosion/spacy-models/releases/download/es_core_news_md-3.8.0/es_core_news_md-3.8.0-py3-none-any.whl
    python3 scripts/import-tatoeba.py [--cache .cache/tatoeba]

Re-running is deterministic for the same Tatoeba export and tagger model.
"""

import argparse
import bz2
import json
import re
import subprocess
import sys
import urllib.request
from collections import defaultdict
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE_URL = "https://downloads.tatoeba.org/exports/per_language/"
FILES = {
    "spa": "spa/spa_sentences_detailed.tsv.bz2",
    "eng": "eng/eng_sentences_detailed.tsv.bz2",
    "links": "spa/spa-eng_links.tsv.bz2",
    "users": "spa/spa_user_languages.tsv.bz2",
}

# Simple tenses whose forms are single words and can be blanked.
TENSES = ["pres", "pret", "impf", "fut", "cond", "subj_pres", "subj_impf"]
MAX_PER_VERB_TENSE = 2
MIN_WORDS, MAX_WORDS = 3, 12

# Verb forms that are far more often something else (a preposition, noun,
# adjective or interjection). Vocabulary words are excluded automatically.
NOT_VERBS = set(
    """como para sobre entre bajo nada solo cerca claro vino rio cura papa
    junto salvo parte paso peso cuento canto beso abrazo dibujo juego pago uso
    gasto ahorro baile pregunta ayuda duda lucha mando marca nota copia firma
    plancha vista visita corte lleno vacio limpio seco entero tarde vale venga
    anda vaya sea cambio trabajo viaje regalo llama marcha pesca cierre aviso
    regreso vuelo sueno queja grito llanto cuenta casa cocina bano baja alta
    calma charla compra venta fuga oferta prueba carga busca mira echo
    """.split()
)
DETERMINERS = set(
    """el la los las un una unos unas mi tu su mis tus sus este esta estos estas
    ese esa esos esas aquel aquella del al nuestro nuestra vuestro vuestra cada
    mucho mucha poco poca otro otra buen mal gran primer""".split()
)
WORD = re.compile(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+")
UNACCENT = str.maketrans("áéíóú", "aeiou")
REFLEXIVE = ["me", "te", "se", "nos", "os", "se"]  # by person
CLITICS = {"me", "te", "se", "nos", "os", "lo", "la", "los", "las", "le", "les"}

# What spaCy's morphology must say for each tense (a missing feature is not
# held against a sentence).
MORPH = {
    "pres": {"Mood": "Ind", "Tense": "Pres"},
    "pret": {"Mood": "Ind", "Tense": "Past"},
    "impf": {"Mood": "Ind", "Tense": "Imp"},
    "fut": {"Mood": "Ind", "Tense": "Fut"},
    "cond": {"Mood": "Cnd"},
    "subj_pres": {"Mood": "Sub", "Tense": "Pres"},
    "subj_impf": {"Mood": "Sub"},
}
PERSON = {("1", "Sing"): 0, ("2", "Sing"): 1, ("3", "Sing"): 2, ("1", "Plur"): 3, ("2", "Plur"): 4, ("3", "Plur"): 5}


def fetch(cache, key):
    path = cache / Path(FILES[key]).name
    if not path.exists():
        cache.mkdir(parents=True, exist_ok=True)
        print(f"downloading {FILES[key]}", file=sys.stderr)
        urllib.request.urlretrieve(BASE_URL + FILES[key], path)
    return path


def tsv(path):
    with bz2.open(path, "rt", encoding="utf-8") as fh:
        for line in fh:
            yield line.rstrip("\n").split("\t")


def region_of(details):
    d = details.lower()
    if any(w in d for w in ("méxico", "mexico", "mexican", "sinaloa", "jalisco", "monterrey")):
        return "mx"
    if any(w in d for w in ("españa", "spain", "madrid", "castilla", "barcelona", "andaluc", "castellano")):
        return "es"
    return None


def form_index():
    """form -> {(infinitive without -se, tense, person)} for single-word simple-tense forms."""
    out = subprocess.run(
        ["node", str(ROOT / "scripts" / "dump-conjugations.js")], check=True, capture_output=True, text=True
    ).stdout
    index = defaultdict(set)
    for verb in json.loads(out):
        for tense in TENSES:
            for person, cell in enumerate(verb["cells"][tense]):
                for form in cell or []:
                    if " " not in form:
                        index[form].add((verb["inf"], tense, person))
    return index


def choose_entry(base, persons, words, i, entries):
    """The verb-list entry a sentence uses: levantarse after a matching
    reflexive pronoun (me levanto), levantar otherwise. None when the list
    only has the reflexive verb and the sentence doesn't use it that way."""
    clitics = []
    j = i - 1
    while j >= 0 and words[j].group(0).lower() in CLITICS:
        clitics.append(words[j].group(0).lower())
        j -= 1
    reflexive = any(REFLEXIVE[p] in clitics for p in persons)
    if reflexive and base + "se" in entries:
        return base + "se"
    return base if base in entries else None


def tagged_as(token, tense, persons):
    """Does spaCy agree that this word is the finite verb form we think it is?"""
    if token.pos_ not in ("VERB", "AUX") or token.morph.get("VerbForm") != ["Fin"]:
        return False
    for feature, value in MORPH[tense].items():
        got = token.morph.get(feature)
        if got and got != [value]:
            return False
    person, number = token.morph.get("Person"), token.morph.get("Number")
    if person and number and PERSON.get((person[0], number[0])) not in persons:
        return False
    return True


def vocabulary_words():
    words = set()
    for pack in json.loads((ROOT / "data" / "manifest.json").read_text())["packs"]:
        if pack["kind"] != "vocab":
            continue
        for item in json.loads((ROOT / "data" / pack["file"]).read_text())["items"]:
            values = [item["es"]] if isinstance(item["es"], str) else list(item["es"].values())
            for v in values:
                words.update(w.lower() for w in WORD.findall(v))
    return words


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", default=str(ROOT / ".cache" / "tatoeba"))
    args = ap.parse_args()
    cache = Path(args.cache)

    natives = {}
    for p in tsv(fetch(cache, "users")):
        p += ["", "", "", ""]
        if p[0] == "spa" and p[1] == "5" and p[2] not in ("", "\\N"):
            natives[p[2]] = region_of(p[3])

    index = form_index()
    entries = {v["inf"] for v in json.loads((ROOT / "data" / "verbs.json").read_text())}
    excluded = NOT_VERBS | vocabulary_words()
    print(f"{len(natives)} native speakers, {len(index)} verb forms", file=sys.stderr)

    candidates = {}
    for p in tsv(fetch(cache, "spa")):
        if len(p) < 4 or p[3] not in natives:
            continue
        sid, text, author = int(p[0]), p[2], p[3]
        if re.search(r"[0-9\"«»()\[\]/]", text) or not re.search(r"[.!?]$", text):
            continue
        words = list(WORD.finditer(text))
        if not MIN_WORDS <= len(words) <= MAX_WORDS:
            continue
        hits = []
        for i, m in enumerate(words):
            w = m.group(0)
            lw = w.lower()
            if i > 0 and w[0].isupper():
                continue  # a name
            cells = index.get(lw)
            if not cells or lw in excluded or lw.translate(UNACCENT) in excluded:
                continue
            if i > 0 and words[i - 1].group(0).lower() in DETERMINERS:
                continue  # "el vino": a noun
            hits.append((i, m, cells))
        if len(hits) != 1:
            continue  # no verb, or more than one to choose from
        i, m, cells = hits[0]
        infs = {c[0] for c in cells}
        tenses = {c[1] for c in cells}
        if len(infs) != 1 or len(tenses) != 1:
            continue  # fue (ser/ir), hablamos (present/preterite)
        if m.group(0)[0].isupper():
            continue  # keep the capital out of the answer
        persons = sorted(c[2] for c in cells)
        entry = choose_entry(infs.pop(), persons, words, i, entries)
        if not entry:
            continue
        candidates[sid] = {
            "id": sid,
            "es": text,
            "blank": list(m.span()),
            "inf": entry,
            "tense": tenses.pop(),
            "persons": persons,
            "by": author,
            "region": natives[author],
        }
    print(f"{len(candidates)} candidate sentences", file=sys.stderr)

    import spacy  # imported late: only needed once candidates exist

    nlp = spacy.load("es_core_news_md", disable=["parser", "ner"])
    ids = sorted(candidates)
    for sid, doc in zip(ids, nlp.pipe((candidates[i]["es"] for i in ids), batch_size=500)):
        c = candidates[sid]
        token = next((t for t in doc if t.idx == c["blank"][0] and t.idx + len(t) == c["blank"][1]), None)
        if token is None or not tagged_as(token, c["tense"], c["persons"]):
            del candidates[sid]
    print(f"{len(candidates)} confirmed by the tagger", file=sys.stderr)

    translation = {}
    for spa, eng in tsv(fetch(cache, "links")):
        spa, eng = int(spa), int(eng)
        if spa in candidates and spa not in translation:
            translation[spa] = eng
    wanted = set(translation.values())
    english = {}
    for p in tsv(fetch(cache, "eng")):
        if len(p) >= 4 and int(p[0]) in wanted:
            english[int(p[0])] = (p[2], p[3])

    # Keep a few sentences per verb and tense: shortest first, then by id.
    groups = defaultdict(list)
    for sid, c in candidates.items():
        eng = english.get(translation.get(sid))
        if not eng or eng[1] in ("", "\\N"):
            continue
        c["en"], c["enId"], c["enBy"] = eng[0], translation[sid], eng[1]
        groups[(c["inf"], c["tense"])].append(c)
    items = []
    for key in sorted(groups):
        best = sorted(groups[key], key=lambda c: (len(c["es"]), c["id"]))[:MAX_PER_VERB_TENSE]
        items.extend(best)
    items.sort(key=lambda c: c["id"])
    for c in items:
        if c["region"] is None:
            del c["region"]

    data = {
        "source": "Tatoeba (https://tatoeba.org)",
        "license": "CC BY 2.0 FR",
        "imported": date.today().isoformat(),
        "changes": "One verb form per sentence is replaced by a blank for the quiz.",
        "items": items,
    }
    out = ROOT / "data" / "sentences.json"
    out.write_text(
        "{\n" + ",\n".join(f'"{k}": {json.dumps(v, ensure_ascii=False)}' for k, v in data.items() if k != "items")
        + ',\n"items": [\n'
        + ",\n".join(json.dumps(c, ensure_ascii=False) for c in items)
        + "\n]\n}\n",
        encoding="utf-8",
    )
    write_attribution(items)
    print(f"wrote {len(items)} sentences for {len(groups)} verb/tense pairs", file=sys.stderr)


def write_attribution(items):
    by_author = defaultdict(list)
    for c in items:
        by_author[c["by"]].append(c["id"])
        by_author[c["enBy"]].append(c["enId"])
    lines = [
        "# Attribution",
        "",
        "## Tatoeba sentences",
        "",
        "The example sentences in `data/sentences.json` and their English translations",
        "come from [Tatoeba](https://tatoeba.org) and are licensed under",
        "[CC BY 2.0 FR](https://creativecommons.org/licenses/by/2.0/fr/).",
        "Changes: one verb form in each Spanish sentence is replaced by a blank in the quiz.",
        "",
        "Each sentence can be viewed at `https://tatoeba.org/en/sentences/show/<id>`.",
        "Sentence ids by author:",
        "",
    ]
    for author in sorted(by_author, key=str.lower):
        ids = ", ".join(str(i) for i in sorted(set(by_author[author])))
        lines.append(f"- **{author}**: {ids}")
    lines.append("")
    (ROOT / "ATTRIBUTION.md").write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    main()
