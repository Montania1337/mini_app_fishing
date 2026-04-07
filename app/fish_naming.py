import inspect
import re
from collections import namedtuple
from functools import lru_cache

try:
    from natasha import Doc, MorphVocab, NewsEmbedding, NewsMorphTagger, Segmenter
except Exception:
    Doc = MorphVocab = NewsEmbedding = NewsMorphTagger = Segmenter = None

try:
    import pymorphy2
except Exception:
    pymorphy2 = None

try:
    import pymorphy2_dicts_ru
except Exception:
    pymorphy2_dicts_ru = None


_WORD_RE = re.compile(r"[A-Za-zА-Яа-яЁё-]+")
_ADJECTIVE_POS = {"ADJF", "ADJS", "PRTF", "PRTS"}
_NOUN_POS = {"NOUN", "NPRO"}
_PREPOSITION_POS = {"PREP"}
_KNOWN_PREPOSITIONS = {
    "без",
    "в",
    "во",
    "для",
    "до",
    "за",
    "из",
    "изо",
    "к",
    "ко",
    "на",
    "над",
    "о",
    "об",
    "обо",
    "от",
    "перед",
    "по",
    "под",
    "при",
    "про",
    "с",
    "со",
    "у",
}
_INVARIABLE_GENDER_OVERRIDES = {
    "фугу": "femn",
    "водоросли": "plur",
}
_NATASHA_GENDER_MAP = {
    "Masc": "masc",
    "Fem": "femn",
    "Neut": "neut",
}
_NATASHA_NUMBER_MAP = {
    "Sing": "sing",
    "Plur": "plur",
}
_TARGET_FROM_GRAMS = {
    "masc": "masc",
    "femn": "femn",
    "neut": "neut",
    "plur": "plur",
}
_ADJECTIVE_ENDINGS = (
    "аяся",
    "яяся",
    "ийся",
    "ыйся",
    "ойся",
    "ееся",
    "оеся",
    "иеся",
    "ыеся",
    "ская",
    "ское",
    "ские",
    "ский",
    "ая",
    "яя",
    "ое",
    "ее",
    "ые",
    "ие",
    "ый",
    "ий",
    "ой",
)

_ADJECTIVE_LEXEMES = {
    "бессмертный": {"masc": "бессмертный", "femn": "бессмертная", "neut": "бессмертное", "plur": "бессмертные"},
    "бодрый": {"masc": "бодрый", "femn": "бодрая", "neut": "бодрое", "plur": "бодрые"},
    "быстрый": {"masc": "быстрый", "femn": "быстрая", "neut": "быстрое", "plur": "быстрые"},
    "гигантский": {"masc": "гигантский", "femn": "гигантская", "neut": "гигантское", "plur": "гигантские"},
    "глубинный": {"masc": "глубинный", "femn": "глубинная", "neut": "глубинное", "plur": "глубинные"},
    "древний": {"masc": "древний", "femn": "древняя", "neut": "древнее", "plur": "древние"},
    "жирный": {"masc": "жирный", "femn": "жирная", "neut": "жирное", "plur": "жирные"},
    "золотой": {"masc": "золотой", "femn": "золотая", "neut": "золотое", "plur": "золотые"},
    "крошечный": {"masc": "крошечный", "femn": "крошечная", "neut": "крошечное", "plur": "крошечные"},
    "крупный": {"masc": "крупный", "femn": "крупная", "neut": "крупное", "plur": "крупные"},
    "маленький": {"masc": "маленький", "femn": "маленькая", "neut": "маленькое", "plur": "маленькие"},
    "мифический": {"masc": "мифический", "femn": "мифическая", "neut": "мифическое", "plur": "мифические"},
    "ночной": {"masc": "ночной", "femn": "ночная", "neut": "ночное", "plur": "ночные"},
    "пластиковый": {"masc": "пластиковый", "femn": "пластиковая", "neut": "пластиковое", "plur": "пластиковые"},
    "призрачный": {"masc": "призрачный", "femn": "призрачная", "neut": "призрачное", "plur": "призрачные"},
    "радиоактивный": {"masc": "радиоактивный", "femn": "радиоактивная", "neut": "радиоактивное", "plur": "радиоактивные"},
    "светящийся": {"masc": "светящийся", "femn": "светящаяся", "neut": "светящееся", "plur": "светящиеся"},
    "теневой": {"masc": "теневой", "femn": "теневая", "neut": "теневое", "plur": "теневые"},
    "тёмный": {"masc": "тёмный", "femn": "тёмная", "neut": "тёмное", "plur": "тёмные"},
    "темный": {"masc": "тёмный", "femn": "тёмная", "neut": "тёмное", "plur": "тёмные"},
    "титанический": {"masc": "титанический", "femn": "титаническая", "neut": "титаническое", "plur": "титанические"},
    "упитанный": {"masc": "упитанный", "femn": "упитанная", "neut": "упитанное", "plur": "упитанные"},
    "хилый": {"masc": "хилый", "femn": "хилая", "neut": "хилое", "plur": "хилые"},
    "хрустальный": {"masc": "хрустальный", "femn": "хрустальная", "neut": "хрустальное", "plur": "хрустальные"},
    "чёрный": {"masc": "чёрный", "femn": "чёрная", "neut": "чёрное", "plur": "чёрные"},
    "черный": {"masc": "чёрный", "femn": "чёрная", "neut": "чёрное", "plur": "чёрные"},
    "ядовитый": {"masc": "ядовитый", "femn": "ядовитая", "neut": "ядовитое", "plur": "ядовитые"},
    "алмазный": {"masc": "алмазный", "femn": "алмазная", "neut": "алмазное", "plur": "алмазные"},
    "админский": {"masc": "админский", "femn": "админская", "neut": "админское", "plur": "админские"},
    "лотерейный": {"masc": "лотерейный", "femn": "лотерейная", "neut": "лотерейное", "plur": "лотерейные"},
}


def _build_adjective_aliases():
    aliases = {}
    for lemma, forms in _ADJECTIVE_LEXEMES.items():
        aliases[lemma] = lemma
        aliases[lemma.replace("ё", "е")] = lemma
        for form in forms.values():
            aliases[form] = lemma
            aliases[form.replace("ё", "е")] = lemma
    return aliases


_ADJECTIVE_ALIASES = _build_adjective_aliases()


def _patch_inspect_for_pymorphy2():
    if hasattr(inspect, "getargspec"):
        return

    arg_spec = namedtuple("ArgSpec", "args varargs keywords defaults")

    def getargspec(func):
        spec = inspect.getfullargspec(func)
        return arg_spec(spec.args, spec.varargs, spec.varkw, spec.defaults)

    inspect.getargspec = getargspec


def _build_pymorphy():
    if pymorphy2 is None:
        return None

    try:
        _patch_inspect_for_pymorphy2()
        analyzer_kwargs = {}
        if pymorphy2_dicts_ru is not None:
            analyzer_kwargs["path"] = pymorphy2_dicts_ru.get_path()
        return pymorphy2.MorphAnalyzer(**analyzer_kwargs)
    except Exception:
        return None


class NatashaTagger:
    def __init__(self):
        if None in (Doc, MorphVocab, NewsEmbedding, NewsMorphTagger, Segmenter):
            raise RuntimeError("Natasha is unavailable")

        self.segmenter = Segmenter()
        self.morph_vocab = MorphVocab()
        self.emb = NewsEmbedding()
        self.morph_tagger = NewsMorphTagger(self.emb)

    def tag(self, text: str):
        doc = Doc(text)
        doc.segment(self.segmenter)
        doc.tag_morph(self.morph_tagger)
        return list(doc.tokens)


def _build_natasha():
    try:
        return NatashaTagger()
    except Exception:
        return None


_PYMORPHY = _build_pymorphy()
_NATASHA = _build_natasha()


@lru_cache(maxsize=4096)
def _parse_word(word: str):
    if not _PYMORPHY or not word:
        return None

    parsed = _PYMORPHY.parse(word)
    if not parsed:
        return None
    return parsed[0]


def _extract_words(text: str) -> list[str]:
    return _WORD_RE.findall(text or "")


def _lower_words(text: str) -> str:
    return " ".join(word.lower() for word in _extract_words(text))


def _capitalize_first(text: str) -> str:
    if not text:
        return text
    return text[:1].upper() + text[1:]


def _normalize_lookup_key(word: str) -> str:
    return (word or "").strip().lower()


@lru_cache(maxsize=1024)
def _natasha_tokens(text: str):
    if not _NATASHA or not text:
        return ()

    try:
        tokens = []
        for token in _NATASHA.tag(text):
            token_text = getattr(token, "text", "")
            if not _WORD_RE.fullmatch(token_text or ""):
                continue

            feats = getattr(token, "feats", None)
            feat_items = set()
            if feats:
                feat_items = {item.strip() for item in str(feats).strip("<>").split(",") if item.strip()}

            tokens.append(
                {
                    "text": token_text,
                    "pos": getattr(token, "pos", None),
                    "feats": feat_items,
                }
            )
        return tuple(tokens)
    except Exception:
        return ()


def _get_pos(form):
    return getattr(getattr(form, "tag", None), "POS", None) if form else None


def _get_gender(form):
    if not form:
        return None

    tag = getattr(form, "tag", None)
    gender = getattr(tag, "gender", None)
    if gender:
        return gender

    normal_form = getattr(form, "normal_form", "") or ""
    return _INVARIABLE_GENDER_OVERRIDES.get(normal_form)


def _get_number(form):
    if not form:
        return None
    return getattr(getattr(form, "tag", None), "number", None)


def _target_key_from_grams(grams: set[str]) -> str:
    if "plur" in grams:
        return "plur"
    if "femn" in grams:
        return "femn"
    if "neut" in grams:
        return "neut"
    return "masc"


def _fallback_target_from_word(word: str) -> str:
    lowered = _normalize_lookup_key(word)
    override = _INVARIABLE_GENDER_OVERRIDES.get(lowered)
    if override == "plur":
        return "plur"
    if override in _TARGET_FROM_GRAMS:
        return override

    if lowered.endswith(("ы", "и")):
        return "plur"
    if lowered.endswith(("а", "я")):
        return "femn"
    if lowered.endswith(("о", "е", "ё")):
        return "neut"
    return "masc"


def _fallback_guess_target(words: list[str], head_index: int) -> str:
    if not words:
        return "masc"

    head_word = words[head_index]
    head_target = _fallback_target_from_word(head_word)

    if head_target != "masc" or _normalize_lookup_key(head_word) in _INVARIABLE_GENDER_OVERRIDES:
        return head_target

    for offset in range(1, len(words) + 1):
        left = head_index - offset
        if left >= 0 and _fallback_is_adjective_word(words[left]):
            return _fallback_target_from_adjective(words[left])

        right = head_index + offset
        if right < len(words) and _fallback_is_adjective_word(words[right]):
            return _fallback_target_from_adjective(words[right])

    return head_target


def _fallback_target_from_adjective(word: str) -> str:
    lowered = _normalize_lookup_key(word)
    lemma = _ADJECTIVE_ALIASES.get(lowered) or _ADJECTIVE_ALIASES.get(lowered.replace("ё", "е"))
    if lemma:
        forms = _ADJECTIVE_LEXEMES[lemma]
        for target_key, form in forms.items():
            if lowered == form or lowered == form.replace("ё", "е"):
                return target_key

    if lowered.endswith(("ыеся", "иеся", "ые", "ие")):
        return "plur"
    if lowered.endswith(("оеся", "ееся", "ое", "ее", "ское")):
        return "neut"
    if lowered.endswith(("аяся", "яяся", "ая", "яя", "ская")):
        return "femn"
    return "masc"


def _fallback_inflect_adjective(word: str, target_key: str) -> str:
    lowered = _normalize_lookup_key(word)
    lookup_key = lowered.replace("ё", "е")
    lemma = _ADJECTIVE_ALIASES.get(lowered) or _ADJECTIVE_ALIASES.get(lookup_key)
    if lemma:
        return _ADJECTIVE_LEXEMES[lemma][target_key]

    if lowered.endswith("аяся"):
        stem = lowered[:-5]
        return {
            "masc": f"{stem}ийся",
            "femn": lowered,
            "neut": f"{stem}ееся",
            "plur": f"{stem}иеся",
        }[target_key]

    if lowered.endswith("яяся"):
        stem = lowered[:-5]
        return {
            "masc": f"{stem}ийся",
            "femn": lowered,
            "neut": f"{stem}ееся",
            "plur": f"{stem}иеся",
        }[target_key]

    if lowered.endswith("ский") or lowered.endswith("ская") or lowered.endswith("ское") or lowered.endswith("ские"):
        stem = lowered[:-4]
        return {
            "masc": f"{stem}ский",
            "femn": f"{stem}ская",
            "neut": f"{stem}ское",
            "plur": f"{stem}ские",
        }[target_key]

    if lowered.endswith("ой"):
        stem = lowered[:-2]
        return {
            "masc": f"{stem}ой",
            "femn": f"{stem}ая",
            "neut": f"{stem}ое",
            "plur": f"{stem}ые",
        }[target_key]

    if lowered.endswith("ий") or lowered.endswith("яя") or lowered.endswith("ее") or lowered.endswith("ие"):
        stem = lowered[:-2]
        return {
            "masc": f"{stem}ий",
            "femn": f"{stem}яя",
            "neut": f"{stem}ее",
            "plur": f"{stem}ие",
        }[target_key]

    if lowered.endswith("ый") or lowered.endswith("ая") or lowered.endswith("ое") or lowered.endswith("ые"):
        stem = lowered[:-2]
        return {
            "masc": f"{stem}ый",
            "femn": f"{stem}ая",
            "neut": f"{stem}ое",
            "plur": f"{stem}ые",
        }[target_key]

    return lowered


def _inflect_adjective_like(word: str, grams: set[str], target_key: str) -> str:
    form = _parse_word(word)
    if form and grams:
        inflected = form.inflect(grams)
        return (getattr(inflected, "word", None) or form.normal_form or word).lower()

    return _fallback_inflect_adjective(word, target_key)


def _is_adjective_word(word: str) -> bool:
    form = _parse_word(word)
    if form:
        return _get_pos(form) in _ADJECTIVE_POS
    return _fallback_is_adjective_word(word)


def _fallback_is_adjective_word(word: str) -> bool:
    lowered = _normalize_lookup_key(word)
    if lowered in _ADJECTIVE_ALIASES or lowered.replace("ё", "е") in _ADJECTIVE_ALIASES:
        return True
    return lowered.endswith(_ADJECTIVE_ENDINGS)


def _is_noun_word(word: str) -> bool:
    form = _parse_word(word)
    if form:
        return _get_pos(form) in _NOUN_POS
    return not _fallback_is_adjective_word(word) and not _is_preposition_word(word)


def _is_preposition_word(word: str) -> bool:
    lowered = _normalize_lookup_key(word)
    if lowered in _KNOWN_PREPOSITIONS:
        return True

    form = _parse_word(word)
    return _get_pos(form) in _PREPOSITION_POS


def _find_head_index(words: list[str]) -> int:
    for index in range(len(words) - 1, -1, -1):
        if _is_noun_word(words[index]):
            return index
    return max(len(words) - 1, 0)


def _find_context_grammar(words: list[str], head_index: int) -> tuple[str | None, str | None]:
    for offset in range(1, len(words) + 1):
        left = head_index - offset
        if left >= 0:
            form = _parse_word(words[left])
            if _get_pos(form) in _ADJECTIVE_POS:
                return _get_gender(form), _get_number(form)

        right = head_index + offset
        if right < len(words):
            form = _parse_word(words[right])
            if _get_pos(form) in _ADJECTIVE_POS:
                return _get_gender(form), _get_number(form)

    return None, None


def _natasha_head_metadata(text: str, words: list[str]) -> tuple[int | None, str | None, str | None]:
    tokens = _natasha_tokens(text)
    if not tokens or len(tokens) != len(words):
        return None, None, None

    for index in range(len(tokens) - 1, -1, -1):
        token = tokens[index]
        if token["pos"] not in {"NOUN", "PROPN", "NPRO"}:
            continue

        feats = token["feats"]
        gender = next((_NATASHA_GENDER_MAP[item] for item in feats if item in _NATASHA_GENDER_MAP), None)
        number = next((_NATASHA_NUMBER_MAP[item] for item in feats if item in _NATASHA_NUMBER_MAP), None)
        return index, gender, number

    return None, None, None


def _build_target_grams(
    words: list[str],
    head_index: int,
    gender_hint: str | None = None,
    number_hint: str | None = None,
) -> set[str]:
    if not words or not _PYMORPHY:
        return set()

    head_form = _parse_word(words[head_index])
    gender = gender_hint or _get_gender(head_form)
    number = number_hint or _get_number(head_form)

    if not gender or not number:
        context_gender, context_number = _find_context_grammar(words, head_index)
        gender = gender or context_gender
        number = number or context_number

    if not gender and words[head_index]:
        fallback_target = _fallback_target_from_word(words[head_index])
        if fallback_target in {"masc", "femn", "neut"}:
            gender = fallback_target
        elif fallback_target == "plur":
            number = "plur"

    number = number or "sing"

    grams = {"nomn", number}
    if gender and number != "plur":
        grams.add(gender)
    return grams


def _normalize_words(words: list[str], head_index: int, grams: set[str], target_key: str) -> list[str]:
    normalized = []

    for index, word in enumerate(words):
        if index == head_index:
            normalized.append(_normalize_lookup_key(word))
            continue

        if _is_adjective_word(word):
            normalized.append(_inflect_adjective_like(word, grams, target_key))
            continue

        normalized.append(_normalize_lookup_key(word))

    return normalized


def _normalize_base_name(base_name: str) -> tuple[str, set[str], str]:
    words = _extract_words(base_name)
    if not words:
        return "", set(), "masc"

    natasha_head_index, natasha_gender, natasha_number = _natasha_head_metadata(base_name, words)
    head_index = natasha_head_index if natasha_head_index is not None else _find_head_index(words)
    grams = _build_target_grams(words, head_index, natasha_gender, natasha_number)
    target_key = _target_key_from_grams(grams) if grams else _fallback_guess_target(words, head_index)
    normalized = _normalize_words(words, head_index, grams, target_key)
    return " ".join(normalized), grams, target_key


def _all_words_adjective_like(text: str) -> bool:
    words = _extract_words(text)
    if not words:
        return False
    return all(_is_adjective_word(word) for word in words)


def _single_noun_suffix(text: str) -> bool:
    words = _extract_words(text)
    return len(words) == 1 and _is_noun_word(words[0])


def _starts_with_preposition(text: str) -> bool:
    words = _extract_words(text)
    if not words:
        return False
    return _is_preposition_word(words[0])


def _normalize_phrase(text: str, grams: set[str], target_key: str) -> str:
    words = _extract_words(text)
    if not words:
        return ""

    normalized = []
    for word in words:
        if _is_adjective_word(word):
            normalized.append(_inflect_adjective_like(word, grams, target_key))
        else:
            normalized.append(_normalize_lookup_key(word))
    return " ".join(normalized)


def _normalize_prefix(prefix_name: str, grams: set[str], target_key: str) -> str:
    prefix_name = (prefix_name or "").strip()
    if not prefix_name:
        return ""

    if _all_words_adjective_like(prefix_name):
        return _normalize_phrase(prefix_name, grams, target_key)

    return _lower_words(prefix_name)


def _normalize_suffix(suffix_name: str, grams: set[str], target_key: str) -> str:
    suffix_name = (suffix_name or "").strip()
    if not suffix_name:
        return ""

    if _starts_with_preposition(suffix_name):
        return f" {_lower_words(suffix_name)}"

    if _all_words_adjective_like(suffix_name):
        return f" {_normalize_phrase(suffix_name, grams, target_key)}"

    if _single_noun_suffix(suffix_name):
        return f"-{_lower_words(suffix_name)}"

    return f" {_lower_words(suffix_name)}"


def format_fish_name(base_name: str, prefix_name: str = "", suffix_name: str = "") -> str:
    base_name = (base_name or "").strip()
    if not base_name:
        return ""

    normalized_base, grams, target_key = _normalize_base_name(base_name)
    prefix = _normalize_prefix(prefix_name, grams, target_key)
    suffix = _normalize_suffix(suffix_name, grams, target_key)

    parts = [part for part in (prefix, normalized_base) if part]
    full_name = " ".join(parts) + suffix
    return _capitalize_first(full_name.strip())
