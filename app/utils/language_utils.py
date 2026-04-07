"""
language_utils.py — Romanização fonética para idiomas com escrita não-latina.

Suporte atual:
  - ko (Korean / Hangeul)  → Revised Romanization of Korean
  - ja (Japanese)          → Romaji via pykakasi (se instalado)

Músicas mistas (ex: K-pop com partes em inglês):
  - Romanização é aplicada PALAVRA A PALAVRA com base no script detectado.
  - Palavras já em escrita latina (inglês, português etc.) recebem romanized=None.
  - Apenas palavras com caracteres Hangeul/Kanji/Kana são romanizadas.

Exemplo K-pop misto:
  '안녕'   → romanized: 'annyeong'
  'baby'   → romanized: None          ← já é latino, não precisa
  '사랑해' → romanized: 'salanghae'
  'I love' → romanized: None
"""

import logging
import re

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# Detecção de script por palavra
# ─────────────────────────────────────────────────────────────

def _is_hangul(text: str) -> bool:
    """True se o texto contém pelo menos um caractere Hangeul."""
    return bool(re.search(r'[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]', text))


def _is_japanese(text: str) -> bool:
    """True se o texto contém hiragana, katakana ou kanji."""
    return bool(re.search(r'[\u3040-\u30FF\u4E00-\u9FFF]', text))


def _is_latin_only(text: str) -> bool:
    """
    True se o texto não contém nenhum caractere não-latino relevante.
    Palavras puramente latinas (inglês, pt, espanhol...) não precisam de
    romanização — já estão em escrita fonética para falantes ocidentais.
    """
    # Verificar se contém caracteres coreanos
    korean_match = re.search(r'[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]', text)
    logger.info(f"DEBUG - Korean match for '{text}': {bool(korean_match)}")
    
    if korean_match:
        return False
    
    # Verificar se contém caracteres japoneses
    japanese_match = re.search(r'[\u3040-\u30FF\u4E00-\u9FFF]', text)
    logger.info(f"DEBUG - Japanese match for '{text}': {bool(japanese_match)}")
    
    if japanese_match:
        return False
    
    logger.info(f"DEBUG - '{text}' detected as latin-only")
    return True


# ─────────────────────────────────────────────────────────────
# Korean — Revised Romanization (국어의 로마자 표기법)
# ─────────────────────────────────────────────────────────────

_ko_transliter = None


def _get_ko_transliter():
    """Lazy-load do transliterador coreano (evita import no cold-start)."""
    global _ko_transliter
    if _ko_transliter is None:
        try:
            from hangul_romanize import Transliter
            from hangul_romanize.rule import academic
            _ko_transliter = Transliter(academic)
            logger.info("✅ Transliterador coreano (hangul-romanize) carregado")
        except ImportError:
            logger.warning("⚠️ hangul-romanize não instalado — pip install hangul-romanize")
    return _ko_transliter


def romanize_korean(text: str):
    """
    Converte Hangeul para Revised Romanization.

    Retorna:
      - str  com o romaji  se o texto contiver Hangeul
      - None               se o texto já for latino (inglês, etc.) — não romaniza
    """
    if not text:
        return None

    # Palavras em escrita latina não precisam de romanização
    if _is_latin_only(text):
        return None

    # Tentar com hangul-romanize primeiro
    t = _get_ko_transliter()
    if t is not None:
        try:
            result = t.translit(text).strip()
            if result:  # Se retornou algo não vazio
                logger.info(f"Romanização hangul-romanize: '{text}' -> '{result}'")
                return result
        except Exception as e:
            logger.debug("Erro ao romanizar com hangul-romanize '%s': %s", text, e)
    
    # Fallback para romanização manual
    try:
        from app.utils.korean_romanizer_manual import romanize_korean_manual
        result = romanize_korean_manual(text)
        logger.info(f"Romanização manual (fallback): '{text}' -> '{result}'")
        return result if result else None
    except Exception as e:
        logger.debug("Erro ao romanizar manualmente '%s': %s", text, e)
        return None


# ─────────────────────────────────────────────────────────────
# Japanese — Romaji via pykakasi (opcional)
# ─────────────────────────────────────────────────────────────

_ja_converter = None


def _get_ja_converter():
    """Lazy-load do conversor japonês."""
    global _ja_converter
    if _ja_converter is None:
        try:
            import pykakasi
            _ja_converter = pykakasi.kakasi()
            logger.info("✅ Conversor japonês (pykakasi) carregado")
        except ImportError:
            logger.warning("⚠️ pykakasi não instalado — pip install pykakasi")
    return _ja_converter


def romanize_japanese(text: str):
    """
    Converte hiragana/katakana/kanji para romaji (Hepburn).

    Retorna None para palavras já latinas (inglês misturado em J-pop).
    """
    if not text:
        return None

    if _is_latin_only(text):
        return None

    conv = _get_ja_converter()
    if conv is None:
        return None

    try:
        result = conv.convert(text)
        return ''.join(item['hepburn'] for item in result).strip() or None
    except Exception as e:
        logger.debug("Erro ao romanizar japonês '%s': %s", text, e)
        return None


# ─────────────────────────────────────────────────────────────
# Mapeamento idioma UI → idioma Whisper
# ─────────────────────────────────────────────────────────────

# Para coreano usamos 'ko' para forçar transcrição coreana
# Isso evita que inglês domine em músicas mistas K-pop
# Para japonês mantemos None (auto-detect) por enquanto
WHISPER_LANGUAGE_MAP = {
    'ko': 'ko',   # forçar coreano para preservar Hangul
    'ja': None,   # auto-detect para japonês (pode ser ajustado depois)
    'en': 'en',
    'pt': 'pt',
}


def get_whisper_language(ui_language: str):
    """
    Retorna o código de idioma a ser passado para o Whisper.

    Para coreano retorna 'ko' (forçado) para evitar que inglês domine.
    Para outros idiomas usa o mapeamento direto ou auto-detect (None).
    """
    return WHISPER_LANGUAGE_MAP.get(ui_language, ui_language)


# ─────────────────────────────────────────────────────────────
# API pública — usada pelo routes_pitch.py
# ─────────────────────────────────────────────────────────────

# Idiomas (código UI) que ativam romanização fonética
LANGUAGES_WITH_ROMANIZATION = {'ko', 'ja'}


def add_romanization(words: list, language: str) -> list:
    """
    Adiciona o campo `romanized` a cada palavra.

    Lógica de detecção POR PALAVRA (suporte a músicas mistas):
      - Palavras com Hangeul -> romanizado para coreano
      - Palavras com kana/kanji -> romanizado para romaji
      - Palavras já latinas (baby, love, I...) -> romanized = None
        (o frontend não exibe a linha extra para palavras latinas)

    Args:
        words:    Lista de dicts com chave `text` (saída do Whisper).
        language: Código do idioma selecionado pelo usuário ('ko', 'ja', 'en', 'pt').

    Returns:
        A mesma lista com `romanized` preenchido palavra a palavra.
    """
    if language not in LANGUAGES_WITH_ROMANIZATION:
        for w in words:
            w['romanized'] = None
        return words

    ko_words = 0
    en_words = 0

    # Teste inicial para verificar se biblioteca está funcionando
    if language == 'ko':
        test_result = romanize_korean('')
        logger.info(f"TESTE - Biblioteca hangul-romanize funcionando: {test_result is not None}")
        # Teste com caracteres coreanos reais
        test_real = romanize_korean('')
        logger.info(f"TESTE - Romanização real: '' -> '{test_real}'")

    for w in words:
        raw = w.get('text', '')

        if language == 'ko':
            w['romanized'] = romanize_korean(raw)
        elif language == 'ja':
            w['romanized'] = romanize_japanese(raw)
        else:
            w['romanized'] = None

        if w['romanized'] is not None:
            ko_words += 1
        else:
            en_words += 1

    logger.info(
        " Romanização [%s]: %d palavras romanizadas, %d latinas (sem romanização)",
        language, ko_words, en_words
    )
    return words