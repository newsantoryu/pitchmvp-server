import numpy as np

NOTES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]

def freq_to_note(freq):
    if freq <= 0:
        return None
    A4 = 440
    n = round(12 * np.log2(freq / A4)) + 69
    note = NOTES[n % 12]
    octave = n // 12 - 1
    ideal = A4 * (2 ** ((n - 69) / 12))
    cents = round(1200 * np.log2(freq / ideal))
    return {"note": f"{note}{octave}", "cents": cents}