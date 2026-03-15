import numpy as np

NOTE_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]

MIN_FREQ = 70
MAX_FREQ = 1200


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


def midi_to_note(midi):

    note = NOTE_NAMES[midi % 12]
    octave = midi // 12 - 1

    return f"{note}{octave}"

def detect_range(words):

    notes = [w.get("note") for w in words if w.get("note")]

    # precisa de pelo menos algumas notas reais
    if len(notes) < 5:
        return None

    midis = [note_to_midi(n) for n in notes if n]

    if not midis:
        return None

    midis = sorted(midis)

    low = midis[0]
    high = midis[-1]

    return {
        "low": midi_to_note(low),
        "high": midi_to_note(high)
    }

def smooth_notes(note_sequence):

    smoothed = []

    for i, note in enumerate(note_sequence):

        if i == 0 or i == len(note_sequence) - 1:
            smoothed.append(note)
            continue

        prev_note = note_sequence[i-1]
        next_note = note_sequence[i+1]

        if note != prev_note and prev_note == next_note:
            smoothed.append(prev_note)
        else:
            smoothed.append(note)

    return smoothed


def match_notes(words, pitch_frames):

    result = []
    last_note = None

    for w in words:

        frames = [
            f["freq"]
            for f in pitch_frames
            if w["start"] <= f["time"] <= w["end"]
            and MIN_FREQ <= f["freq"] <= MAX_FREQ
        ]

        note = None

        if frames:

            frames = np.array(frames)

            # remove extremos (vibrato forte / erro detector)
            q1 = np.percentile(frames, 25)
            q3 = np.percentile(frames, 75)

            frames = frames[(frames >= q1) & (frames <= q3)]

            notes = [freq_to_note(f) for f in frames if f > 0]

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

    notes_only = [r["note"] for r in result]

    smoothed = smooth_notes(notes_only)

    for i in range(len(result)):
        result[i]["note"] = smoothed[i]

        return result

