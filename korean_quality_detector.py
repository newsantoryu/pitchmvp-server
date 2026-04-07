#!/usr/bin/env python3
"""
Detector de coreano "perdido" - identifica quando Whisper transcreve coreano como inglês
"""

import re
from app.utils.language_utils import _is_latin_only

def is_english_phonetic(text):
    """
    Detecta se texto parece fonética inglesa que poderia ser coreano
    """
    # Palavras muito curtas que são suspeitas
    words = text.lower().split()
    if len(words) >= 3 and all(len(word) <= 5 for word in words):
        return True
    
    # Padrões que sugerem coreano mal transcrito
    korean_phonetic_patterns = [
        # Padrões específicos do exemplo "bo so na gui wi he"
        r'\b(bo|so|na|gui|wi|he)\b',
        # Padrões comuns de coreano transcrito como inglês
        r'\b(da|ga|na|ra|ma|ba|sa|ja|cha|ka|ta|pa|ha)\b',
        # Padrões com jo/jwe
        r'\b(jwo|jwe|jwa|jwi|jwu)\b',
        # Padrões com mwo/mwe
        r'\b(mwo|mwe|mwa|mwi|mwu)\b',
        # Contrações que poderiam ser coreano
        r"\b(i'm|ain't|don't|won't|can't)\b",
        # Palavras de 1-3 letras (muito suspeitas)
        r'\b\w{1,3}\b',
    ]
    
    for pattern in korean_phonetic_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    
    return False

def suggest_korean_correction(english_text):
    """
    Sugere correção de inglês fonético para coreano
    """
    # Mapeamento simples de fonética para coreano
    phonetic_to_korean = {
        'bo': 'bo',
        'so': 'so', 
        'na': 'na',
        'gui': 'gwi',
        'wi': 'wi',
        'he': 'he',
        'da': 'da',
        'ga': 'ga',
        'jwo': 'jwo',
        'mwo': 'mwo',
    }
    
    words = english_text.lower().split()
    corrected = []
    
    for word in words:
        if word in phonetic_to_korean:
            # Converter para Hangul (simplificado)
            corrected.append(f"[COREANO:{phonetic_to_korean[word]}]")
        else:
            corrected.append(word)
    
    return ' '.join(corrected)

def analyze_transcription_quality(words):
    """
    Analisa qualidade da transcrição para detectar coreano perdido
    """
    total_words = len(words)
    english_words = 0
    korean_words = 0
    suspicious_words = 0
    
    print("=== Análise de Qualidade da Transcrição ===")
    
    for i, word_data in enumerate(words):
        text = word_data.get('text', '')
        
        # Contar tipos de palavras
        if _is_latin_only(text):
            english_words += 1
            
            # Verificar se é suspeito (poderia ser coreano)
            if is_english_phonetic(text):
                suspicious_words += 1
                corrected = suggest_korean_correction(text)
                print(f"  SUSPEITO {i}: '{text}' -> {corrected}")
        else:
            korean_words += 1
            print(f"  COREANO {i}: '{text}'")
    
    print(f"\nEstatísticas:")
    print(f"  Total: {total_words}")
    print(f"  Inglês: {english_words} ({english_words/total_words*100:.1f}%)")
    print(f"  Coreano: {korean_words} ({korean_words/total_words*100:.1f}%)")
    print(f"  Suspeitos: {suspicious_words} ({suspicious_words/total_words*100:.1f}%)")
    
    if suspicious_words > 0:
        print(f"\nAVISO: {suspicious_words} palavras podem ser coreano mal transcrito!")
        return False
    
    return True

# Teste com exemplo real
test_words = [
    {"text": "Plus"},
    {"text": "I'm"},
    {"text": "lucky"},
    {"text": "we"},
    {"text": "ain't"},
    {"text": "no"},
    {"text": "one"},
    {"text": "but"},
    {"text": "him"}
]

if __name__ == "__main__":
    analyze_transcription_quality(test_words)
