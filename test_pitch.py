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
print("\n[1/5] Verificando dependências...")

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
print("\n[2/5] Gerando áudio sintético (nota A4 = 440Hz, 3 segundos)...")
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

# ── 3. Testa pYIN (librosa) ───────────────────────────────────────────────────
print("\n[3/5] Testando pYIN (librosa)...")
if deps["librosa"]:
    try:
        import librosa
        audio_load, sr_load = librosa.load(tmp_path, sr=22050, mono=True)
        f0, voiced_flag, voiced_prob = librosa.pyin(
            audio_load,
            fmin=librosa.note_to_hz("C2"),
            fmax=librosa.note_to_hz("C6"),
            sr=sr_load,
            hop_length=512,
            fill_na=None,
        )
        hop_dur = 512 / sr_load
        frames = [{"time": float(i * hop_dur), "freq": float(f)}
                  for i, (f, v) in enumerate(zip(f0, voiced_flag))
                  if v and f and f > 0]

        print(f"  OK  {len(frames)} frames de pitch detectados")
        if frames:
            freqs = [fr["freq"] for fr in frames]
            median_freq = float(np.median(freqs))
            midi = int(round(69 + 12 * np.log2(median_freq / 440)))
            NOTE_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]
            note = f"{NOTE_NAMES[midi % 12]}{midi // 12 - 1}"
            print(f"  OK  Mediana: {median_freq:.1f}Hz → nota detectada: {note}")
            print(f"  {'OK' if note == 'A4' else 'AVISO nota errada, esperado A4, got ' + note}  Esperado: A4")
        else:
            print("  FALHOU  Nenhum frame detectado — pYIN não funcionou")
    except Exception as e:
        print(f"  ERRO  pYIN: {e}")
        import traceback; traceback.print_exc()
else:
    print("  PULADO  librosa não instalado")

# ── 4. Testa torchcrepe (opcional) ───────────────────────────────────────────
print("\n[4/5] Testando torchcrepe (opcional)...")
if deps["torch"] and deps["torchcrepe"]:
    try:
        import torch, torchcrepe, librosa
        audio_load, _ = librosa.load(tmp_path, sr=16000, mono=True)
        audio_t = torch.tensor(audio_load).unsqueeze(0)
        pitch, periodicity = torchcrepe.predict(
            audio_t, 16000, hop_length=160,
            fmin=50, fmax=1000, model="full",
            batch_size=512, device="cpu", return_periodicity=True
        )
        pitch = pitch[0].cpu().numpy()
        periodicity = periodicity[0].cpu().numpy()
        times = np.arange(len(pitch)) * 0.01
        frames = [{"time": float(t), "freq": float(p)}
                  for t, p, c in zip(times, pitch, periodicity) if c >= 0.8 and p > 0]
        print(f"  OK  torchcrepe: {len(frames)} frames")
        if frames:
            median_freq = float(np.median([f["freq"] for f in frames]))
            midi = int(round(69 + 12 * np.log2(median_freq / 440)))
            NOTE_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]
            note = f"{NOTE_NAMES[midi % 12]}{midi // 12 - 1}"
            print(f"  OK  Mediana: {median_freq:.1f}Hz → {note}")
    except Exception as e:
        print(f"  ERRO  torchcrepe: {e}")
else:
    print("  PULADO  torch/torchcrepe não instalado (pYIN será usado como fallback)")

# ── 5. Testa match_notes completo ─────────────────────────────────────────────
print("\n[5/5] Testando match_notes com palavras simuladas...")
try:
    import librosa
    audio_load, sr_load = librosa.load(tmp_path, sr=22050, mono=True)
    f0, voiced_flag, _ = librosa.pyin(
        audio_load, fmin=librosa.note_to_hz("C2"),
        fmax=librosa.note_to_hz("C6"), sr=sr_load, hop_length=512, fill_na=None
    )
    hop_dur = 512 / sr_load
    pitch_frames = [{"time": float(i * hop_dur), "freq": float(f)}
                    for i, (f, v) in enumerate(zip(f0, voiced_flag)) if v and f and f > 0]

    # Palavras simuladas distribuídas ao longo do áudio
    words = [
        {"text": "I'm",        "start": 0.0,  "end": 0.3,  "note": None},
        {"text": "so",         "start": 0.3,  "end": 0.5,  "note": None},
        {"text": "tired",      "start": 0.5,  "end": 0.9,  "note": None},
        {"text": "of",         "start": 0.9,  "end": 1.1,  "note": None},
        {"text": "being",      "start": 1.1,  "end": 1.5,  "note": None},
        {"text": "here",       "start": 1.5,  "end": 2.0,  "note": None},
    ]

    NOTE_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]
    def freq_to_note(freq):
        if not freq or freq <= 0: return None
        midi = int(round(69 + 12 * np.log2(freq / 440)))
        return f"{NOTE_NAMES[midi % 12]}{midi // 12 - 1}"

    last_note = None
    for w in words:
        freqs = [f["freq"] for f in pitch_frames if w["start"] <= f["time"] <= w["end"]]
        if freqs:
            note = freq_to_note(float(np.median(freqs)))
        else:
            note = last_note
        w["note"] = note
        if note: last_note = note

    notes_filled = sum(1 for w in words if w["note"] is not None)
    print(f"  OK  {notes_filled}/{len(words)} palavras com notas")
    for w in words:
        print(f"       {w['text']:10} → {w['note'] or '(sem nota)'}")

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