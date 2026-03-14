import numpy as np

NOTE_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]


def freq_to_note(freq):

    if freq is None or freq <= 0:
        return None

    # corrige erro comum de harmônico (oitava acima)
    if freq > 700:
        freq = freq / 2

    midi = 69 + 12 * np.log2(freq / 440.0)
    midi = int(round(midi))

    note = NOTE_NAMES[midi % 12]
    octave = midi // 12 - 1

    return f"{note}{octave}"


def note_to_midi(note):

    if note is None:
        return None

    name = note[:-1]
    octave = int(note[-1])

    return NOTE_NAMES.index(name) + (octave + 1) * 12


def match_notes(words, pitch_frames):

    result = []
    last_note = None

    for w in words:

        frames = [
            f["freq"]
            for f in pitch_frames
            if w["start"] <= f["time"] <= w["end"]
        ]

        note = None

        if frames:

            frames = np.array(frames)

            # remove extremos (vibrato forte / erro detector)
            q1 = np.percentile(frames, 25)
            q3 = np.percentile(frames, 75)

            frames = frames[(frames >= q1) & (frames <= q3)]

            # converte todos os frames em notas
            notes = [freq_to_note(f) for f in frames if f > 0]

            # pega a nota mais comum (dominante)
            if notes:
                note = max(set(notes), key=notes.count)

        if note is None:
            note = last_note

        # suavização musical
        if last_note and note:

            n1 = note_to_midi(note)
            n2 = note_to_midi(last_note)

            if n1 and n2:
                if abs(n1 - n2) > 7:
                    note = last_note

        result.append({
            "word": w["text"],
            "note": note,
            "start": w["start"]
        })

        last_note = note

    return result
