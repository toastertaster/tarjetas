"""Cross-check the tarjetas conjugation engine against verbecc.

verbecc (https://github.com/bretttolbert/verbecc, LGPL-3.0) is used only as an
independent reference at test time. Nothing it produces is stored in this
repository.

    node scripts/dump-conjugations.js > conjugations.json
    python scripts/crosscheck.py conjugations.json

A cell passes when verbecc's form is one of the spellings our engine accepts.
verbecc predates the 2010 RAE orthography, so its accented one-syllable forms
(huí, guió, rió) are normalized first. Remaining disagreements must be listed,
with a reason, in tests/crosscheck-exceptions.json; anything else fails.
"""

import json
import logging
import sys
from pathlib import Path

logging.disable(logging.CRITICAL)

from verbecc import CompleteConjugator  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
EXCEPTIONS = ROOT / "tests" / "crosscheck-exceptions.json"

# our tense id -> (verbecc mood, verbecc tense)
TENSES = {
    "pres": ("indicativo", "presente"),
    "impf": ("indicativo", "pretérito-imperfecto"),
    "pret": ("indicativo", "pretérito-perfecto-simple"),
    "fut": ("indicativo", "futuro"),
    "pres_perf": ("indicativo", "pretérito-perfecto-compuesto"),
    "pluperf": ("indicativo", "pretérito-pluscuamperfecto"),
    "past_ant": ("indicativo", "pretérito-anterior"),
    "fut_perf": ("indicativo", "futuro-perfecto"),
    "cond": ("condicional", "presente"),
    "cond_perf": ("condicional", "perfecto"),
    "subj_pres": ("subjuntivo", "presente"),
    "subj_impf": ("subjuntivo", "pretérito-imperfecto-1"),
    "subj_impf_se": ("subjuntivo", "pretérito-imperfecto-2"),
    "subj_perf": ("subjuntivo", "pretérito-perfecto"),
    "subj_pluperf": ("subjuntivo", "pretérito-pluscuamperfecto-1"),
    "subj_pluperf_se": ("subjuntivo", "pretérito-pluscuamperfecto-2"),
    "subj_fut": ("subjuntivo", "futuro"),
    "subj_fut_perf": ("subjuntivo", "futuro-perfecto"),
    "imp_aff": ("imperativo", "afirmativo"),
    "imp_neg": ("imperativo", "negativo"),
    "gerund": ("gerundio", "gerundio"),
    "participle": ("participo", "participo"),
}
# -se variants are checked against our -ra cell, which accepts both
OUR_CELL = {"subj_impf_se": "subj_impf", "subj_pluperf_se": "subj_pluperf"}
PRONOUNS = ["yo", "tú", "usted", "nosotros", "vosotros", "ustedes"]

STRONG = set("aeoáéó")
VOWELS = set("aeiouáéíóúü")
UNACCENT = str.maketrans("áéíóú", "aeiou")


def syllables(word):
    """Count vowel nuclei; mirrors nuclei() in js/conjugate.js."""
    count, prev = 0, None
    for i, c in enumerate(word):
        vowel = c in VOWELS
        if c == "u" and i > 0 and word[i - 1] in "gq" and i + 1 < len(word) and word[i + 1] in "eiéí":
            vowel = False
        if not vowel:
            if not (c == "h" and prev is not None and i + 1 < len(word) and word[i + 1] in VOWELS):
                prev = None
            continue
        split = prev is None or (prev in STRONG and c in STRONG) or (prev in "íú" and c in STRONG) or (
            prev in STRONG and c in "íú"
        )
        if split:
            count += 1
        prev = c
    return count


def rae2010(form):
    """Drop written accents from one-syllable words (huí -> hui)."""
    return " ".join(w.translate(UNACCENT) if syllables(w) == 1 else w for w in form.split(" "))


def strip_pronoun(form, pronoun):
    return form[len(pronoun) + 1 :] if pronoun and form.startswith(pronoun + " ") else form


def reference_cells(cc, inf):
    data = cc.conjugate(inf).get_data()
    if data["verb"].get("predicted"):
        return None
    cells = {}
    for tense, (mood, vtense) in TENSES.items():
        rows = data["moods"].get(mood, {}).get(vtense, [])
        if mood in ("gerundio", "participo"):
            cells[tense] = {0: rows[0]["c"] if rows else []}
            continue
        by_pronoun = {str(r.get("pr")): r for r in rows}
        cells[tense] = {}
        for person, pronoun in enumerate(PRONOUNS):
            r = by_pronoun.get(pronoun)
            if r:
                cells[tense][person] = [strip_pronoun(c, pronoun) for c in r["c"]]
    return cells


def load_exceptions():
    data = json.loads(EXCEPTIONS.read_text(encoding="utf-8"))
    table, participles = {}, {}
    for e in data["exceptions"]:
        if not e.get("reason"):
            sys.exit(f"exception without a reason: {e}")
        table[(e["verb"], e["tense"], e["person"])] = e
    for e in data["adjectival_participles"]:
        participles[e["verb"]] = e["verbecc"]
    return table, participles


def replace_participle(form, adjective, ours):
    """verbecc uses some adjectival participles (nato) where compound tenses
    take the regular one (he nacido); swap it for our participle."""
    words = form.split(" ")
    if words[-1] != adjective:
        return form
    return " ".join(words[:-1] + [ours])


def main(path):
    ours = json.loads(Path(path).read_text(encoding="utf-8"))
    exceptions, participles = load_exceptions()
    used = set()
    cc = CompleteConjugator("es")
    failures, skipped, crashed, checked = [], [], [], 0
    for verb in ours:
        try:
            ref = reference_cells(cc, verb["inf"])
        except Exception as e:  # verbecc bugs on a few verbs
            crashed.append(f"{verb['inf']} ({type(e).__name__})")
            continue
        if ref is None:
            skipped.append(verb["inf"])
            continue
        for tense, persons in ref.items():
            our_cells = verb["cells"][OUR_CELL.get(tense, tense)]
            for person, forms in persons.items():
                ours_here = our_cells[person] if person < len(our_cells) else None
                if ours_here is None or not forms:
                    continue  # a form we don't teach (impersonal verbs, haber commands)
                checked += 1
                if any(f in ours_here or rae2010(f) in ours_here for f in forms):
                    continue
                adjective = participles.get(verb["inf"])
                if adjective:
                    pp = verb["cells"]["participle"][0][0]
                    if any(replace_participle(f, adjective, pp) in ours_here for f in forms):
                        used.add((verb["inf"], "participle"))
                        continue
                key_tense = OUR_CELL.get(tense, tense)
                for key in ((verb["inf"], key_tense, person), (verb["inf"], key_tense, "*"), (verb["inf"], "*", "*")):
                    if key in exceptions:
                        used.add(key)
                        break
                else:
                    failures.append(f"{verb['inf']:14} {tense:16} {person}  verbecc={forms!r}  ours={ours_here!r}")
    print(f"checked {checked} forms of {len(ours) - len(skipped)} verbs")
    if skipped:
        print(f"skipped {len(skipped)} verbs verbecc only predicts: {', '.join(skipped)}")
    if crashed:
        print(f"skipped {len(crashed)} verbs verbecc fails to conjugate: {', '.join(crashed)}")
    stale = [k for k in exceptions if k not in used]
    stale += [(v, "participle") for v in participles if (v, "participle") not in used]
    if stale:
        print("exceptions no longer needed (remove them):")
        for k in stale:
            print("  ", k)
    if failures:
        print(f"{len(failures)} disagreements:")
        print("\n".join(failures))
    if failures or stale:
        sys.exit(1)
    print("all forms agree")


if __name__ == "__main__":
    main(sys.argv[1])
