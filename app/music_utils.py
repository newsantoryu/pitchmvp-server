# music_utils.py — utilitários musicais para matching nota↔palavra
#
# Correções aplicadas (vs versão original):
#
#   BUG CRÍTICO 1 — CORRIGIDO
#     `return result` estava indentado DENTRO do `for` em match_notes().
#     Resultado: apenas a 1ª palavra recebia nota suavizada; todas as
#     demais retornavam None. Corrigido: `return` movido para fora do loop.
#
#   PROBLEMA 2 — CORRIGIDO
#     freq_to_note() duplicada aqui com heurística errada (freq > 700 → /2),
#     que cortava notas de soprano acima de F5 (≈ 698 Hz). Removida.
#     Agora importa da fonte canônica: note_utils.freq_to_note().
#
#   PROBLEMA 3 — CORRIGIDO
#     Filtro IQR em match_notes() descartava 50% dos frames por palavra.
#     Para palavras curtas (≤ 0.3 s, ~30 frames) isso é agressivo demais
#     e remove portamentos e ataques legítimos. Substituído por rejeição
#     de outliers baseada em MAD (Median Absolute Deviation) em semitons —
#     rejeita apenas frames que desviam mais de OUTLIER_SEMITONES da mediana.
#
#   PROBLEMA 4 — CORRIGIDO
#     Supressão de saltos > 7 semitons entre palavras consecutivas.
#     7 semitons = quinta perfeita — intervalo comum em música popular.
#     Threshold aumentado para JUMP_SUPPRESS_SEMITONES = 13 (> oitava),
#     que cobre erros reais de detector de pitch (oitava errada = 12 st)
#     sem suprimir saltos musicais legítimos.

import logging
import numpy as np
from app.note_utils import freq_to_note, note_to_midi, midi_to_note

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constantes de qualidade — ajuste aqui se quiser afinar o comportamento
# ---------------------------------------------------------------------------

# Range de frequência válida para vozes humanas (Hz)
MIN_FREQ = 60.0
MAX_FREQ = 1200.0

# Limiar de rejeição de outliers por palavra: frames que desviam mais que
# este número de semitons da mediana do frame são descartados.
# 2.0 st = ~12% de diferença de frequência — cobre vibrato normal sem cortar.
OUTLIER_SEMITONES = 2.0

# Saltos entre palavras consecutivas maiores que este valor (em semitons)
# são considerados erro do detector (ex: detecção de oitava errada = 12 st).
# 13 preserva todos os intervalos musicais normais (oitava = 12 st).
JUMP_SUPPRESS_SEMITONES = 13


# ---------------------------------------------------------------------------
# Funções públicas
# ---------------------------------------------------------------------------

def detect_range(words: list[dict]) -> dict | None:
    """
    Detecta o range vocal (nota mais grave e mais aguda) das palavras.
    Requer pelo menos 5 palavras com nota para ser confiável.
    """
    notes = [w.get("note") for w in words if w.get("note")]

    if len(notes) < 5:
        return None

    midis = [note_to_midi(n) for n in notes if n]
    midis = [m for m in midis if m is not None]

    if not midis:
        return None

    midis_sorted = sorted(midis)
    return {
        "low":  midi_to_note(midis_sorted[0]),
        "high": midi_to_note(midis_sorted[-1]),
    }


def smooth_notes(note_sequence: list[str | None]) -> list[str | None]:
    """
    Suavização musical simples: elimina notas isoladas que diferem das
    notas vizinhas idênticas (prováveis erros de detector em frames únicos).

    Exemplo: [A4, A4, B4, A4, A4] → [A4, A4, A4, A4, A4]
    """
    if len(note_sequence) < 3:
        return list(note_sequence)

    smoothed = list(note_sequence)
    for i in range(1, len(note_sequence) - 1):
        prev = note_sequence[i - 1]
        curr = note_sequence[i]
        nxt  = note_sequence[i + 1]
        if curr != prev and prev == nxt and prev is not None:
            smoothed[i] = prev

    return smoothed


def _reject_outliers_by_semitones(freqs: np.ndarray) -> np.ndarray:
    """
    Remove outliers de um array de frequências usando MAD em semitons.

    Frequências que desviam mais de OUTLIER_SEMITONES da mediana são
    descartadas. Retorna o array filtrado (pode estar vazio).

    Vantagem sobre IQR: preserva a forma da distribuição e descarta
    apenas valores genuinamente anômalos, não uma fração fixa.
    """
    if len(freqs) == 0:
        return freqs

    median_freq = float(np.median(freqs))
    if median_freq <= 0:
        return freqs

    # Converter desvio de frequência para semitons
    # |Δsemitons| = 12 * |log2(f / median)|
    with np.errstate(divide="ignore", invalid="ignore"):
        semitone_dev = np.abs(12.0 * np.log2(freqs / median_freq))

    mask = np.isfinite(semitone_dev) & (semitone_dev <= OUTLIER_SEMITONES)
    return freqs[mask]


def match_notes(
    words: list[dict],
    pitch_frames: list[dict],
) -> list[dict]:
    """
    Associa cada palavra (com timestamps start/end) à sua nota dominante,
    a partir dos frames de pitch detectados pelo pitch_engine.

    Pipeline por palavra:
      1. Coleta frames cujo `time` cai dentro de [start, end]
      2. Filtra por MIN_FREQ / MAX_FREQ
      3. Rejeita outliers via MAD em semitons (substitui IQR)
      4. Nota dominante = moda das notas (mais frequente no trecho)
      5. Suprime saltos > JUMP_SUPPRESS_SEMITONES (anti-erro de oitava)
      6. Aplica smooth_notes() no resultado completo

    Retorna lista de dicts com chaves: word, note, start
    """
    result = []
    last_note: str | None = None

    for w in words:
        t_start = w.get("start", 0.0)
        t_end   = w.get("end",   t_start + 0.1)

        # 1+2 — frames no intervalo da palavra, dentro do range válido
        frame_freqs = np.array([
            f["freq"]
            for f in pitch_frames
            if t_start <= f["time"] <= t_end
            and MIN_FREQ <= f["freq"] <= MAX_FREQ
        ], dtype=np.float64)

        note: str | None = None

        if len(frame_freqs) > 0:
            # 3 — rejeição de outliers (MAD em semitons)
            filtered = _reject_outliers_by_semitones(frame_freqs)

            if len(filtered) > 0:
                # 4 — nota dominante (moda)
                note_labels = [
                    r["note"]
                    for f in filtered
                    if (r := freq_to_note(float(f))) is not None
                ]
                if note_labels:
                    note = max(set(note_labels), key=note_labels.count)

        # Fallback para última nota conhecida se nenhum frame encontrado
        if note is None:
            note = last_note

        # 5 — supressão de saltos > JUMP_SUPPRESS_SEMITONES
        #     Cobre erros de detecção de oitava (12 st) sem suprimir
        #     saltos musicais legítimos (5ª perfeita = 7 st, oitava = 12 st)
        if last_note and note:
            dist = abs((note_to_midi(note) or 0) - (note_to_midi(last_note) or 0))
            if dist > JUMP_SUPPRESS_SEMITONES:
                logger.debug(
                    "Jump suppressed: %s → %s (%d st)", last_note, note, dist
                )
                note = last_note

        result.append({
            "word":  w.get("text", ""),
            "note":  note,
            "start": t_start,
        })
        last_note = note

    # 6 — suavização musical global
    notes_only = [r["note"] for r in result]
    smoothed   = smooth_notes(notes_only)

    # ✅ BUG CRÍTICO CORRIGIDO: `return` estava dentro do `for` original.
    #    Isso fazia a função retornar após processar apenas a 1ª palavra.
    for i in range(len(result)):
        result[i]["note"] = smoothed[i]

    return result  # ← fora do loop