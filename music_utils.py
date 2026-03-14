import numpy as np

NOTE_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]


def freq_to_note(freq):

    if freq <= 0:
        return None

    midi = 69 + 12 * np.log2(freq / 440)

    midi = int(round(midi))

    note = NOTE_NAMES[midi % 12]
    octave = midi // 12 - 1

    return f"{note}{octave}"


def match_notes(words, pitch_frames):

    result = []

    last_note = None

    for w in words:

        frames = [
            f["freq"]
            for f in pitch_frames
            if w["start"] <= f["time"] <= w["end"]
        ]

        if frames:

            # mediana remove vibrato
            freq = np.median(frames)

            note = freq_to_note(freq)

        else:

            note = last_note

        # suavização musical
        if note == last_note:
            note = last_note

        result.append({
            "word": w["text"],
            "note": note,
            "start": w["start"]
        })

        last_note = note

    return result