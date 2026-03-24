# note_utils.py — fonte canônica para conversão freq ↔ nota musical
#
# REGRA: todo o código do projeto deve importar freq_to_note DAQUI.
# Não duplicar em music_utils.py nem em routes_pitch_realtime.py.
#
# Correções aplicadas:
#   - Removida a heurística "if freq > 700: /2" (cortava soprano acima de F5)
#   - Retorna dict com cents para todo o pipeline ter info de afinação
#   - Adicionado midi_note para facilitar cálculos de intervalo downstream
#   - note_to_freq() adicionada (inversa, usada em testes)

import numpy as np

NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

# Frequência de referência A4 = 440 Hz (padrão internacional ISO 16)
A4_HZ = 440.0
A4_MIDI = 69


def freq_to_note(freq: float) -> dict | None:
    """
    Converte frequência (Hz) para nota musical com desvio em cents.

    NÃO aplica correção de harmônico aqui — filtragem de fmin/fmax
    deve ser feita na camada de extração (pitch_engine.py).

    Retorna:
        {
            "note":      str   — ex: "A4", "C#3"
            "midi":      int   — número MIDI (A4 = 69)
            "cents":     int   — desvio da nota mais próxima (-50..+50)
            "freq_ideal": float — frequência ideal da nota mais próxima (Hz)
        }
        None se freq <= 0 ou inválida.
    """
    if freq is None or freq <= 0:
        return None

    # Número MIDI contínuo (pode ter fração)
    midi_float = A4_MIDI + 12.0 * np.log2(freq / A4_HZ)
    midi_int = int(round(midi_float))

    # Proteção contra notas fora do range audível (MIDI 0–127)
    if midi_int < 0 or midi_int > 127:
        return None

    note_name = NOTES[midi_int % 12]
    octave = midi_int // 12 - 1

    # Frequência ideal da nota quantizada
    freq_ideal = A4_HZ * (2.0 ** ((midi_int - A4_MIDI) / 12.0))

    # Cents: desvio em centésimos de semitom (-50 a +50)
    cents = int(round(1200.0 * np.log2(freq / freq_ideal)))

    return {
        "note":       f"{note_name}{octave}",
        "midi":       midi_int,
        "cents":      cents,
        "freq_ideal": round(freq_ideal, 3),
    }


def note_to_midi(note: str) -> int | None:
    """
    Converte string de nota ("A4", "C#3") para número MIDI.
    Retorna None se a string for inválida.
    """
    if not note:
        return None
    try:
        # Suporta bemóis escritos como "Bb4" → converte para enarmônico
        note = note.replace("b", "#").replace("##", "")  # simplificação
        name = note[:-1]
        octave = int(note[-1])
        if name not in NOTES:
            return None
        return NOTES.index(name) + (octave + 1) * 12
    except (ValueError, IndexError):
        return None


def midi_to_note(midi: int) -> str:
    """Converte número MIDI para string de nota ("A4")."""
    note = NOTES[midi % 12]
    octave = midi // 12 - 1
    return f"{note}{octave}"


def note_to_freq(note: str) -> float | None:
    """
    Converte string de nota para frequência ideal (Hz).
    Útil em testes e comparações.
    """
    midi = note_to_midi(note)
    if midi is None:
        return None
    return A4_HZ * (2.0 ** ((midi - A4_MIDI) / 12.0))


def semitone_distance(note_a: str, note_b: str) -> int | None:
    """
    Distância absoluta em semitons entre duas notas.
    Retorna None se qualquer nota for inválida.
    """
    m_a = note_to_midi(note_a)
    m_b = note_to_midi(note_b)
    if m_a is None or m_b is None:
        return None
    return abs(m_a - m_b)