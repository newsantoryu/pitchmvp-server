# pitch_engine.py — detecção de pitch (torchcrepe + fallback pYIN)
# Suporta voice_gender e suavização para melhor cifra

import logging
import numpy as np

logger = logging.getLogger(__name__)

# Ranges por gênero vocal (Hz)
VOICE_RANGES = {
    "male":   {"fmin": 75,  "fmax": 600,  "pyin_lo": "C2", "pyin_hi": "C5"},
    "female": {"fmin": 120, "fmax": 900,  "pyin_lo": "C3", "pyin_hi": "G5"},
    "auto":   {"fmin": 60,  "fmax": 900,  "pyin_lo": "C2", "pyin_hi": "C6"},
}


def extract_pitch(path: str, voice_gender: str = "auto"):
    """
    Detecta pitch: torchcrepe (primário, com suavização) ou pYIN (fallback).
    voice_gender: "male" | "female" | "auto"
    """
    vr = VOICE_RANGES.get(voice_gender, VOICE_RANGES["auto"])
    logger.info(f"Pitch range: {voice_gender} → fmin={vr['fmin']}Hz fmax={vr['fmax']}Hz")

    # Primário: torchcrepe
    try:
        import torch
        import torchcrepe
        import librosa

        audio, sr = librosa.load(path, sr=16000, mono=True)
        audio_t = torch.tensor(audio).unsqueeze(0)
        pitch, periodicity = torchcrepe.predict(
            audio_t, sr, hop_length=160,
            fmin=vr["fmin"], fmax=vr["fmax"],
            model="full", batch_size=1024, device="cpu", return_periodicity=True
        )
        pitch = pitch[0].cpu().numpy()
        periodicity = periodicity[0].cpu().numpy()
        times = np.arange(len(pitch)) * 0.01
        frames = [
            {"time": float(t), "freq": float(p)}
            for t, p, c in zip(times, pitch, periodicity)
            if c >= 0.85 and p > 0 and vr["fmin"] <= p <= vr["fmax"]
        ]
        logger.info(f"torchcrepe: {len(frames)} frames ({voice_gender})")

        # Suavização (remove jitter)
        if len(frames) > 3:
            freqs = np.array([f["freq"] for f in frames])
            smooth = librosa.decompose.nn_filter(
                freqs.reshape(1, -1), aggregate=np.median
            ).flatten()
            for i in range(len(frames)):
                frames[i]["freq"] = float(smooth[i])
        return frames
    except Exception as e:
        logger.warning(f"torchcrepe indisponível ({e}), usando pYIN...")

    # Fallback: pYIN
    try:
        import librosa
        audio, sr = librosa.load(path, sr=22050, mono=True)
        f0, voiced_flag, _ = librosa.pyin(
            audio,
            fmin=librosa.note_to_hz(vr["pyin_lo"]),
            fmax=librosa.note_to_hz(vr["pyin_hi"]),
            sr=sr, hop_length=512, fill_na=None,
        )
        hop_duration = 512 / sr
        frames = [
            {"time": float(i * hop_duration), "freq": float(f)}
            for i, (f, v) in enumerate(zip(f0, voiced_flag))
            if v and f and f > 0
        ]
        logger.info(f"pYIN: {len(frames)} frames ({voice_gender})")
        return frames
    except Exception as e:
        logger.error(f"pYIN falhou: {e}")
        return []
