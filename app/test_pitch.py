#!/usr/bin/env python3
# test_pitch.py — roda no seu servidor para diagnosticar o problema de notas
# Uso: source venv/bin/activate && python test_pitch.py
#
# O script testa cada etapa em isolamento e imprime exatamente onde falha.

import sys
import numpy as np

print("=" * 60)
print("PitchMVP — Diagnóstico de Detecção de Pitch")
print("=" * 60)

# ── 1. Verifica imports ───────────────────────────────────────────────────────
print("\n[1/6] Verificando dependências...")

deps = {}
for lib in ["librosa", "torch", "torchcrepe", "faster_whisper"]:
    try:
        __import__(lib)
        deps[lib] = True
        print(f"  OK  {lib}")
    except ImportError as e:
        deps[lib] = False
        print(f"  FALTA  {lib}: {e}")

# ── 2. Gera áudio sintético com nota conhecida (A4 = 440Hz) ──────────────────
print("\n[2/6] Gerando áudio sintético (nota A4 = 440Hz, 3 segundos)...")
sr = 22050
duration = 3.0
t = np.linspace(0, duration, int(sr * duration))
# Sinal de voz sintético: fundamental + harmônicos
audio = (
    0.6 * np.sin(2 * np.pi * 440 * t) +    # fundamental A4
    0.3 * np.sin(2 * np.pi * 880 * t) +    # 2º harmônico
    0.1 * np.sin(2 * np.pi * 1320 * t)     # 3º harmônico
).astype(np.float32)
print(f"  OK  {len(audio)} samples a {sr}Hz")

# Salva para teste
import tempfile, os
tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
tmp_path = tmp.name
tmp.close()

try:
    import soundfile as sf
    sf.write(tmp_path, audio, sr)
    print(f"  OK  Salvo em {tmp_path}")
except Exception as e:
    # Fallback: wave stdlib
    import wave, struct
    with wave.open(tmp_path, 'w') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        samples = (audio * 32767).astype(np.int16)
        wf.writeframes(samples.tobytes())
    print(f"  OK  Salvo via wave stdlib em {tmp_path}")

# ── 3. Testa extract_pitch com diferentes voice_genders ──────────────────────
print("\n[3/6] Testando extract_pitch (torchcrepe + fallback pYIN)...")
from app.pitch_engine import extract_pitch

for gender in ["auto", "male", "female"]:
    try:
        frames = extract_pitch(tmp_path, voice_gender=gender)
        print(f"  OK  {gender}: {len(frames)} frames")
        if frames:
            freqs = [f["freq"] for f in frames]
            median_freq = float(np.median(freqs))
            from app.music_utils import freq_to_note
            note = freq_to_note(median_freq)
            print(f"       Mediana: {median_freq:.1f}Hz → {note}")
    except Exception as e:
        print(f"  ERRO  {gender}: {e}")
        import traceback; traceback.print_exc()

# ── 4. Testa freq_to_note com correção de harmônicos ─────────────────────────
print("\n[4/6] Testando freq_to_note...")
from app.music_utils import freq_to_note

test_freqs = [220, 440, 880, 1760]  # A3, A4, A5, A6
for f in test_freqs:
    note = freq_to_note(f)
    print(f"  {f}Hz → {note}")

# ── 5. Testa match_notes completo ─────────────────────────────────────────────
print("\n[5/6] Testando match_notes com palavras simuladas...")
try:
    from app.pitch_engine import extract_pitch
    from app.music_utils import match_notes

    pitch_frames = extract_pitch(tmp_path, voice_gender="auto")

    # Palavras simuladas distribuídas ao longo do áudio
    words = [
        {"text": "I'm",        "start": 0.0,  "end": 0.3},
        {"text": "so",         "start": 0.3,  "end": 0.5},
        {"text": "tired",      "start": 0.5,  "end": 0.9},
        {"text": "of",         "start": 0.9,  "end": 1.1},
        {"text": "being",      "start": 1.1,  "end": 1.5},
        {"text": "here",       "start": 1.5,  "end": 2.0},
    ]

    result = match_notes(words, pitch_frames)

    notes_filled = sum(1 for w in result if w["note"] is not None)
    print(f"  OK  {notes_filled}/{len(result)} palavras com notas")
    for w in result:
        print(f"       {w['word']:10} → {w['note'] or '(sem nota)'}")

    if notes_filled == 0:
        print("\n  PROBLEMA: Nenhuma nota foi atribuída!")
        print("  Causa provável: pitch_frames vazio ou timestamps não se sobrepõem")
        print(f"  pitch_frames total: {len(pitch_frames)}")
        if pitch_frames:
            print(f"  Primeiro frame: t={pitch_frames[0]['time']:.3f}s")
            print(f"  Último frame:   t={pitch_frames[-1]['time']:.3f}s")
        print(f"  Palavras: t={words[0]['start']}s até t={words[-1]['end']}s")
    else:
        print(f"\n  SUCESSO! Pipeline funcionando corretamente.")

except Exception as e:
    print(f"  ERRO  {e}")
    import traceback; traceback.print_exc()

# ── 6. Testa suavização musical em match_notes ───────────────────────────────
print("\n[6/6] Testando suavização musical...")
try:
    from app.music_utils import match_notes

    # Simula frames com saltos grandes (para testar suavização)
    pitch_frames = [
        {"time": 0.1, "freq": 440},  # A4
        {"time": 0.2, "freq": 440},
        {"time": 0.3, "freq": 880},  # A5 (salto grande)
        {"time": 0.4, "freq": 880},
    ]

    words = [
        {"text": "test1", "start": 0.0, "end": 0.25},
        {"text": "test2", "start": 0.25, "end": 0.5},
    ]

    result = match_notes(words, pitch_frames)
    print("  OK  Suavização aplicada")
    for w in result:
        print(f"       {w['word']} → {w['note']}")

except Exception as e:
    print(f"  ERRO  {e}")
    import traceback; traceback.print_exc()

# ── Cleanup ───────────────────────────────────────────────────────────────────
os.unlink(tmp_path)

print("\n" + "=" * 60)
print("Diagnóstico concluído.")
print("=" * 60)
print("\nSe tudo está OK aqui mas as notas não aparecem no HTML,")
print("o problema é na resposta do servidor. Teste com:")
print("  curl -s http://localhost:8000/health")
print("  # Após fazer upload, pegue o job_id e teste:")
print("  curl -s http://localhost:8000/job/SEU_JOB_ID | python3 -c")
print("  \"import json,sys; d=json.load(sys.stdin); w=d.get('result',d).get('words',[]); print(f'{len(w)} palavras, {sum(1 for x in w if x.get(\\\"note\\\")))} com nota')\"")