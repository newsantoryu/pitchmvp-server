#!/usr/bin/env python3
"""
Filtro de repetições para pós-processamento do Whisper
"""

def filter_repetitions(words, max_repeats=3):
    """Remove repetições excessivas das palavras transcritas"""
    
    filtered_words = []
    word_sequence = []
    
    for i, word in enumerate(words):
        text = word.get('text', '').strip()
        
        # Pular palavras vazias
        if not text:
            continue
        
        # Detectar se é repetição recente
        recent_words = word_sequence[-max_repeats:]
        if text in recent_words:
            print(f"🔄 REMOVENDO REPETIÇÃO: '{text}' (posição {i})")
            continue
        
        # Adicionar palavra válida
        filtered_words.append(word)
        word_sequence.append(text)
    
    print(f"📊 FILTRADO: {len(words)} → {len(filtered_words)} palavras")
    return filtered_words

def merge_overlapping_segments(words):
    """Mescla segmentos sobrepostos que causam repetição"""
    
    if not words:
        return []
    
    merged_words = []
    i = 0
    
    while i < len(words):
        current = words[i].copy()
        
        # Verificar sobreposição com próximas palavras
        j = i + 1
        overlap_end = current.get('end', 0)
        
        while j < len(words):
            next_word = words[j]
            
            # Se o próximo começa antes do atual terminar, há sobreposição
            if next_word.get('start', 0) < overlap_end:
                print(f"🔗 MESCLANDO SOBREPOSIÇÃO: '{current.get('text')}' + '{next_word.get('text')}'")
                
                # Mesclar textos diferentes
                if next_word.get('text', '') != current.get('text', ''):
                    current['text'] += ' ' + next_word['text']
                
                # Estender o fim do segmento
                current['end'] = max(current.get('end', 0), next_word.get('end', 0))
                overlap_end = current['end']
                j += 1
            else:
                break
        
        merged_words.append(current)
        i = j
    
    print(f"🔗 MESCLADO: {len(words)} → {len(merged_words)} segmentos")
    return merged_words

def detect_repetition_patterns(words):
    """Detecta padrões de repetição problemáticos"""
    
    print("🔍 DETECTANDO PADRÕES DE REPETIÇÃO:")
    
    # Contar repetições
    word_counts = {}
    repetition_patterns = []
    
    for i, word in enumerate(words):
        text = word.get('text', '').lower()
        
        # Contar ocorrências
        word_counts[text] = word_counts.get(text, 0) + 1
        
        # Detectar padrões de repetição
        if i > 0:
            prev_text = words[i-1].get('text', '').lower()
            if text == prev_text:
                repetition_patterns.append(f"Repetição direta: '{text}' em {i-1} e {i}")
    
    # Mostrar palavras mais repetidas
    sorted_words = sorted(word_counts.items(), key=lambda x: x[1], reverse=True)
    
    print("📈 Palavras mais repetidas:")
    for word, count in sorted_words[:10]:
        if count > 3:  # Apenas mostrar repetições significativas
            print(f"    '{word}': {count} vezes")
    
    print(f"⚠️  Total de padrões de repetição: {len(repetition_patterns)}")
    return repetition_patterns, word_counts

def clean_whisper_output(words, language):
    """Limpa saída do Whisper removendo repetições e sobreposições"""
    
    if language != 'ko':
        return words
    
    print("🧹 LIMPANDO SAÍDA DO WHISPER (COREANO)")
    print(f"📥 Entrada: {len(words)} palavras")
    
    # Etapa 1: Detectar padrões de repetição
    patterns, counts = detect_repetition_patterns(words)
    
    # Etapa 2: Remover repetições diretas
    filtered = filter_repetitions(words, max_repeats=2)
    
    # Etapa 3: Mesclar segmentos sobrepostos
    merged = merge_overlapping_segments(filtered)
    
    # Etapa 4: Limpeza final
    final_words = []
    for word in merged:
        text = word.get('text', '').strip()
        if text and not text.isspace():
            final_words.append(word)
    
    print(f"✅ Saída final: {len(final_words)} palavras")
    
    # Estatísticas finais
    reduction = len(words) - len(final_words)
    reduction_pct = (reduction / len(words)) * 100 if words else 0
    
    print(f"📊 Estatísticas da limpeza:")
    print(f"    Redução: {reduction} palavras ({reduction_pct:.1f}%)")
    print(f"    Eficiência: {len(final_words)}/{len(words)} ({(len(final_words)/len(words)*100):.1f}%)")
    
    return final_words

# Teste com exemplo do usuário
if __name__ == "__main__":
    # Simular palavras repetidas do exemplo
    test_words = []
    
    # Criar repetição de "nam-eun nam"
    for i in range(5):
        test_words.append({"text": "nam-eun", "start": i*2, "end": i*2+1})
        test_words.append({"text": "nam", "start": i*2+1, "end": i*2+2})
    
    # Adicionar algumas palavras coreanas válidas
    test_words.extend([
        {"text": "bo", "start": 20, "end": 21},
        {"text": "so", "start": 21, "end": 22},
        {"text": "na", "start": 22, "end": 23},
        {"text": "gui", "start": 23, "end": 24},
        {"text": "wi", "start": 24, "end": 25},
        {"text": "he", "start": 25, "end": 26}
    ])
    
    print("=== TESTE DE LIMPEZA DE REPETIÇÕES ===")
    cleaned = clean_whisper_output(test_words, 'ko')
    
    print("\nResultado final limpo:")
    for i, word in enumerate(cleaned):
        print(f"  {i}: '{word['text']}'")
