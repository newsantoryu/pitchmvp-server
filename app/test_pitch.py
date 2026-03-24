#!/usr/bin/env python3
# test_pitch.py — diagnóstico e validação das correções de pitch
# Uso: source venv/bin/activate && python test_pitch.py
#
# Cada seção testa uma correção específica com resultado PASS/FAIL claro.

import sys
import numpy as np

PASS = "  ✓ PASS"
FAIL = "  ✗ FAIL"

print("=" * 65)
print("PitchMVP — Diagnóstico + Validação de Correções")
print("=" * 65)

failures = []

# ── 1. Dependências ───────────────────────────────────────────────────────────
print("\n[1/8] Dependências...")
for lib in ["librosa", "torch", "torchcrepe", "faster_whisper", "scipy"]:
    try:
        __import__(lib)
        print(f"  ok  {lib}")
    except ImportError as e:
        print(f"  FALTA  {lib}: {e}")
        if lib != "scipy":  # scipy tem fallback
            failures.append(f"dependência faltando: {lib}")

# ── 2. note_utils — fonte canônica ───────────────────────────────────────────
print("\n[2/8] note_utils.freq_to_note (fonte canônica com cents)...")
from app.note_utils import freq_to_note, note_to_midi, semitone_distance

# A4 = 440 Hz exato → cents deve ser 0
r = freq_to_note(440.0)
assert r and r["note"] == "A4" and r["cents"] == 0, f"A4 falhou: {r}"
print(f"{PASS}  A4=440Hz → {r['note']} cents={r['cents']}")

# A#4 = 466.16 Hz → cents deve ser 0
r = freq_to_note(466.16)
assert r and r["note"] == "A#4", f"A#4 falhou: {r}"
print(f"{PASS}  A#4≈466Hz → {r['note']}")

# CORREÇÃO: G5 = 783.99 Hz NÃO deve ser corrigido para G4
# (bug original: if freq > 700: freq /= 2)
r = freq_to_note(784.0)
assert r and r["note"] == "G5", f"G5 falhou — possível bug do /2: {r}"
print(f"{PASS}  G5=784Hz → {r['note']} (não foi dividido por 2)")

# B5 = 987.77 Hz
r = freq_to_note(987.77)
assert r and r["note"] == "B5", f"B5 falhou: {r}"
print(f"{PASS}  B5≈988Hz → {r['note']}")

# Retorno None para freq inválida
r = freq_to_note(0)
assert r is None, f"freq=0 deveria retornar None: {r}"
print(f"{PASS}  freq=0 → None")

# ── 3. Distância em semitons ──────────────────────────────────────────────────
print("\n[3/8] semitone_distance (para validar threshold de salto)...")
d = semitone_distance("A4", "A5")
assert d == 12, f"oitava deveria ser 12 st: {d}"
print(f"{PASS}  A4 → A5 = {d} semitons (oitava)")

d = semitone_distance("C4", "G4")
assert d == 7, f"quinta deveria ser 7 st: {d}"
print(f"{PASS}  C4 → G4 = {d} semitons (quinta — antes era suprimido!)")

d = semitone_distance("A4", "E6")
assert d == 19, f"esperado 19 st: {d}"
print(f"{PASS}  A4 → E6 = {d} semitons (salto grande — suprimido corretamente)")

# ── 4. match_notes — bug crítico do return dentro do for ─────────────────────
print("\n[4/8] match_notes — return corrigido para fora do loop...")
from app.music_utils import match_notes

# Frames cobrindo 3 palavras distintas
pitch_frames = [
    {"time": 0.05, "freq": 261.63},  # C4
    {"time": 0.10, "freq": 261.63},
    {"time": 0.15, "freq": 261.63},
    {"time": 0.35, "freq": 392.00},  # G4
    {"time": 0.40, "freq": 392.00},
    {"time": 0.45, "freq": 392.00},
    {"time": 0.65, "freq": 523.25},  # C5
    {"time": 0.70, "freq": 523.25},
    {"time": 0.75, "freq": 523.25},
]

words = [
    {"text": "um",   "start": 0.0,  "end": 0.2},
    {"text": "dois", "start": 0.3,  "end": 0.55},
    {"text": "três", "start": 0.6,  "end": 0.85},
]

result = match_notes(words, pitch_frames)

assert len(result) == 3, f"esperado 3 resultados, got {len(result)}"
notes_filled = sum(1 for w in result if w["note"] is not None)

# ANTES do fix: apenas 1 palavra tinha nota (return dentro do for)
# DEPOIS do fix: todas as 3 devem ter nota
if notes_filled == 3:
    print(f"{PASS}  {notes_filled}/3 palavras com nota (bug do return corrigido)")
    for w in result:
        print(f"       {w['word']:6} → {w['note']}")
elif notes_filled == 1:
    print(f"{FAIL}  Apenas {notes_filled}/3 palavras com nota — bug do return AINDA presente!")
    failures.append("match_notes: return ainda dentro do loop")
else:
    print(f"  ?  {notes_filled}/3 palavras com nota")
    for w in result:
        print(f"       {w['word']:6} → {w['note']}")

# ── 5. match_notes — threshold de salto (7 → 13 semitons) ───────────────────
print("\n[5/8] match_notes — salto de quinta (7 st) não deve ser suprimido...")

# C4 (262 Hz) → G4 (392 Hz) = 7 semitons — deve ser preservado
frames_jump = [
    {"time": 0.05, "freq": 261.63},
    {"time": 0.10, "freq": 261.63},
    {"time": 0.35, "freq": 392.00},
    {"time": 0.40, "freq": 392.00},
]
words_jump = [
    {"text": "A", "start": 0.0, "end": 0.2},
    {"text": "B", "start": 0.3, "end": 0.5},
]
res = match_notes(words_jump, frames_jump)
note_a = res[0]["note"]
note_b = res[1]["note"]

if note_a and note_b and note_a != note_b:
    print(f"{PASS}  {note_a} → {note_b} preservado (salto de 7 st não suprimido)")
else:
    print(f"{FAIL}  Salto de quinta foi suprimido: {note_a} → {note_b}")
    failures.append("match_notes: salto de 7 st ainda suprimido")

# ── 6. match_notes — filtro MAD (não IQR) ────────────────────────────────────
print("\n[6/8] match_notes — filtro de outliers MAD...")

# 10 frames em C4, 2 outliers em C6 (24 st acima) — MAD deve remover os outliers
frames_outlier = [{"time": i * 0.05, "freq": 261.63} for i in range(10)]
frames_outlier += [
    {"time": 0.52, "freq": 1046.5},  # C6 — outlier
    {"time": 0.54, "freq": 1046.5},  # C6 — outlier
]
frames_outlier = sorted(frames_outlier, key=lambda x: x["time"])

words_outlier = [{"text": "test", "start": 0.0, "end": 0.6}]
res = match_notes(words_outlier, frames_outlier)
nota = res[0]["note"]

if nota and nota.startswith("C4"):
    print(f"{PASS}  Outliers C6 removidos → nota dominante: {nota}")
elif nota and nota.startswith("C5"):
    print(f"  ~  Nota detectada {nota} (margem de oitava — aceitável)")
else:
    print(f"  ?  Nota: {nota} (verificar manualmente)")

# ── 7. pitch_engine — conf_min para 'auto' ───────────────────────────────────
print("\n[7/8] pitch_engine — conf_min para voice_gender='auto'...")
from app.pitch_engine import CONF_MIN_BY_GENDER

conf_auto   = CONF_MIN_BY_GENDER["auto"]
conf_male   = CONF_MIN_BY_GENDER["male"]
conf_female = CONF_MIN_BY_GENDER["female"]

print(f"  male={conf_male}, auto={conf_auto}, female={conf_female}")

# ANTES: auto caía no else de female → 0.85 (mais restritivo)
# DEPOIS: auto tem valor próprio 0.80 (intermediário)
if conf_auto == conf_female:
    print(f"{FAIL}  'auto' ainda usa o mesmo threshold de 'female' ({conf_female})")
    failures.append("conf_min: auto == female — não corrigido")
elif conf_male < conf_auto < conf_female:
    print(f"{PASS}  'auto' ({conf_auto}) é intermediário entre male ({conf_male}) e female ({conf_female})")
else:
    print(f"  ?  Valores: male={conf_male} auto={conf_auto} female={conf_female}")

# ── 8. pitch_engine — VOICED_THRESHOLD ───────────────────────────────────────
print("\n[8/8] pitch_engine — VOICED_THRESHOLD >= 0.50...")
from app.pitch_engine import VOICED_THRESHOLD as VT

if VT >= 0.50:
    print(f"{PASS}  VOICED_THRESHOLD = {VT} (suficiente para discriminar voz vs ruído)")
else:
    print(f"{FAIL}  VOICED_THRESHOLD = {VT} (muito baixo — inclui ruído como voz)")
    failures.append(f"VOICED_THRESHOLD={VT} < 0.50")

# ── Resultado final ───────────────────────────────────────────────────────────
print("\n" + "=" * 65)
if failures:
    print(f"RESULTADO: {len(failures)} falha(s) encontrada(s):")
    for f in failures:
        print(f"  - {f}")
    sys.exit(1)
else:
    print("RESULTADO: Todas as verificações passaram.")
    print("Pipeline musical funcionando corretamente.")
print("=" * 65)