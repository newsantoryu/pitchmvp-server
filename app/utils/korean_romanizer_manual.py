# Romanização Coreana Manual (Fallback)

# Mapeamento básico de sílabas coreanas para romaji
# Baseado na Revised Romanization of Korean

# Consoantes iniciais (choseong)
INITIAL_CONSONANTS = {
    '': 'g', '': 'kk', '': 'n', '': 'd', '': 'tt', '': 'r', '': 'm', '': 'b', '': 'pp', '': 's', '': 'ss', '': '', '': 'j', '': 'jj', '': 'ch', '': 'k', '': 't', '': 'p', '': 'h'
}

# Vogais (jungseong)
VOWELS = {
    '': 'a', '': 'ae', '': 'ya', '': 'yae', '': 'eo', '': 'e', '': 'yeo', '': 'ye', '': 'o', '': 'wa', '': 'wae', '': 'oe', '': 'yo', '': 'u', '': 'weo', '': 'we', '': 'wi', '': 'yu', '': 'eu', '': 'ui', '': 'i'
}

# Consoantes finais (jongseong)
FINAL_CONSONANTS = {
    '': '', '': 'k', '': 'k', '': 'k', '': 'n', '': 'n', '': 'n', '': 't', '': 'l', '': 'l', '': 'l', '': 'l', '': 'l', '': 'm', '': 'p', '': 'p', '': 'p', '': 's', '': 'ng', '': 'j', '': 'j', '': 'ch', '': 'k', '': 't', '': 'p', '': 'h'
}

def romanize_korean_manual(text: str) -> str:
    """
    Romanização coreana manual simples.
    Funciona como fallback quando hangul-romanize falha.
    """
    if not text:
        return text
    
    result = []
    for char in text:
        # Verificar se é um caractere Hangul (U+AC00-U+D7A3)
        if '\uAC00' <= char <= '\uD7A3':
            # Decompor sílaba em consoante inicial + vogal + consoante final
            code = ord(char) - 0xAC00
            jongseong_idx = code % 28
            jungseong_idx = (code // 28) % 21
            choseong_idx = code // (28 * 21)
            
            # Mapear para romaji
            choseong = list(INITIAL_CONSONANTS.keys())[choseong_idx] if choseong_idx < len(INITIAL_CONSONANTS) else ''
            jungseong = list(VOWELS.keys())[jungseong_idx] if jungseong_idx < len(VOWELS) else ''
            jongseong = list(FINAL_CONSONANTS.keys())[jongseong_idx] if jongseong_idx < len(FINAL_CONSONANTS) else ''
            
            # Construir romaji
            romaji = ''
            if choseong in INITIAL_CONSONANTS:
                romaji += INITIAL_CONSONANTS[choseong]
            if jungseong in VOWELS:
                romaji += VOWELS[jungseong]
            if jongseong in FINAL_CONSONANTS:
                romaji += FINAL_CONSONANTS[jongseong]
            
            result.append(romaji)
        else:
            # Manter caracteres não-coreanos como estão
            result.append(char)
    
    return ''.join(result)

# Teste rápido
if __name__ == "__main__":
    test_words = ['', '', '', '', '']
    for word in test_words:
        print(f"'{word}' -> '{romanize_korean_manual(word)}'")
