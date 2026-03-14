import torch
import torchcrepe
import librosa
import numpy as np


def extract_pitch(path):

    audio, sr = librosa.load(path, sr=16000)

    audio = torch.tensor(audio).unsqueeze(0)

    pitch, periodicity = torchcrepe.predict(
        audio,
        sr,
        hop_length=160,
        fmin=50,
        fmax=1000,
        model="full",
        batch_size=1024,
        device="cpu",
        return_periodicity=True
    )

    pitch = pitch[0].cpu().numpy()
    periodicity = periodicity[0].cpu().numpy()

    times = np.arange(len(pitch)) * 0.01

    frames = []

    for t, p, conf in zip(times, pitch, periodicity):

        # filtro de confiança
        if conf < 0.8:
            continue

        if p <= 0:
            continue

        frames.append({
            "time": float(t),
            "freq": float(p)
        })

    return frames