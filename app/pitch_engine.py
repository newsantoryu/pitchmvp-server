# pitch_engine.py — detecção de pitch (torchcrepe + fallback pYIN)
#
# Correções aplicadas (vs versão original):
#
#   PROBLEMA 1 — CORRIGIDO
#     conf_min para voice_gender == "auto" caía no `else` de "female" e
#     recebia 0.85 — o threshold mais restritivo, descartando mais frames
#     em exatamente o modo padrão (auto). Substituído por dict explícito
#     com valor intermediário 0.80 para "auto".
#
#   PROBLEMA 2 — CORRIGIDO
#     librosa.decompose.nn_filter() foi projetado para denoising de
#     espectrogramas 2D — aplicado num vetor 1D de frequências produz
#     resultado matematicamente inesperado. Substituído por
#     scipy.signal.savgol_filter (Savitzky-Golay), que preserva
#     transições rápidas (portamentos) enquanto remove jitter de alta
#     frequência. Fallback para mediana deslizante se scipy indisponível.
#
#   PROBLEMA 3 — CORRIGIDO (realtime)
#     process_realtime_frame_moved() usava apenas pitch[0, 0] — o
#     primeiro frame temporal do batch. Para janelas de 0.3–1 s o
#     torchcrepe retorna dezenas de frames; só usar o primeiro introduz
#     dependência de qual momento do frame foi enviado. Substituído por
#     mediana dos frames voiced (periodicity > VOICED_THRESHOLD).
#
#   PROBLEMA 4 — CORRIGIDO (realtime)
#     Threshold `voiced = confidence > 0.3` era permissivo demais —
#     inclui ruído de fundo e respiração como nota cantada.
#     Aumentado para VOICED_THRESHOLD = 0.50, que é o mínimo razoável
#     para discriminar voz vs não-voz com torchcrepe.

import logging
import numpy as np
import asyncio
import torch
import torchcrepe
from fastapi import HTTPException
from app.note_utils import freq_to_note

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Thresholds de confiança (periodicity do torchcrepe, 0–1)
# ---------------------------------------------------------------------------

# Batch (extract_pitch): threshold por gênero vocal.
# "auto" recebe valor intermediário — não deve herdar o mais restritivo.
CONF_MIN_BY_GENDER = {
    "male":   0.78,
    "female": 0.85,
    "auto":   0.80,  # CORRIGIDO: antes caía no else → 0.85
}

# Realtime: threshold para considerar um frame como "voz presente".
# 0.50 é o mínimo razoável para discriminar voz vs ruído/respiração.
# (original era 0.30 — permissivo demais)
VOICED_THRESHOLD = 0.50

# ---------------------------------------------------------------------------
# Timeouts
# ---------------------------------------------------------------------------
TIMEOUT_CONFIG = {
    "pitch_extraction": 0,        # 0 = sem timeout — arquivo pode ser longo
    "realtime_frame":   5,        # 5 s — deve ser quase instantâneo
    "whisper_transcribe": 300,    # 5 min — arquivos longos são esperados
}

# ---------------------------------------------------------------------------
# Ranges por gênero vocal (Hz)
# ---------------------------------------------------------------------------
VOICE_RANGES = {
    "male":   {"fmin":  75, "fmax": 900, "pyin_lo": "C2", "pyin_hi": "G5"},
    "female": {"fmin": 120, "fmax": 900, "pyin_lo": "C3", "pyin_hi": "G5"},
    "auto":   {"fmin":  60, "fmax": 900, "pyin_lo": "C2", "pyin_hi": "C6"},
}


# ---------------------------------------------------------------------------
# Suavização de pitch — Savitzky-Golay com fallback para mediana deslizante
# ---------------------------------------------------------------------------

def _smooth_pitch_frames(freqs: np.ndarray, window: int = 5) -> np.ndarray:
    """
    Suaviza um array de frequências de pitch preservando transições rápidas
    (portamentos, ornamentos) enquanto remove jitter de alta frequência.

    Usa Savitzky-Golay (polinômio grau 2) — melhor que mediana para
    sinal de pitch porque preserva a forma do contorno melódico.

    Fallback para mediana deslizante se scipy não estiver disponível.

    Args:
        freqs:  array 1-D de frequências (Hz), já filtrado por confiança
        window: tamanho da janela (ímpar). 5 ≈ 50 ms a 100 frames/s.
    """
    if len(freqs) < window:
        return freqs

    # Garante window ímpar
    if window % 2 == 0:
        window += 1

    try:
        from scipy.signal import savgol_filter
        # polyorder=2: preserva forma quadrática (bom para curvas de pitch)
        return savgol_filter(freqs, window_length=window, polyorder=2)
    except ImportError:
        # Fallback: mediana deslizante (mais robusta a outliers que média)
        logger.warning("scipy indisponível — usando mediana deslizante para suavização")
        half = window // 2
        smoothed = freqs.copy()
        for i in range(half, len(freqs) - half):
            smoothed[i] = np.median(freqs[i - half: i + half + 1])
        return smoothed


# ---------------------------------------------------------------------------
# extract_pitch — processamento batch (arquivo completo)
# ---------------------------------------------------------------------------

def extract_pitch(path: str, voice_gender: str = "auto") -> list[dict]:
    """
    Detecta pitch de um arquivo de áudio.

    Estratégia primária: torchcrepe (modelo "full", alta precisão)
    Fallback:           pYIN via librosa

    Args:
        path:         caminho para o arquivo de áudio
        voice_gender: "male" | "female" | "auto"

    Retorna lista de dicts {"time": float, "freq": float},
    já filtrados por confiança e suavizados.
    """
    vr = VOICE_RANGES.get(voice_gender, VOICE_RANGES["auto"])
    conf_min = CONF_MIN_BY_GENDER.get(voice_gender, CONF_MIN_BY_GENDER["auto"])

    logger.info(
        "Pitch range: %s → fmin=%.0fHz fmax=%.0fHz conf_min=%.2f",
        voice_gender, vr["fmin"], vr["fmax"], conf_min,
    )

    # ── Primário: torchcrepe ─────────────────────────────────────────────────
    try:
        import librosa

        audio, sr = librosa.load(path, sr=16000, mono=True)
        audio_t = torch.tensor(audio).unsqueeze(0)

        pitch, periodicity = torchcrepe.predict(
            audio_t, sr,
            hop_length=160,                # 10 ms por frame a 16 kHz
            fmin=vr["fmin"],
            fmax=vr["fmax"],
            model="full",
            batch_size=1024,
            device="cpu",
            return_periodicity=True,
        )

        # Converter para numpy imediatamente e liberar tensores
        pitch_np       = pitch[0].cpu().numpy()
        periodicity_np = periodicity[0].cpu().numpy()
        del pitch, periodicity, audio_t

        import gc
        gc.collect()

        # Timestamps (10 ms por frame)
        times = np.arange(len(pitch_np)) * 0.01

        # Filtro: confiança mínima + dentro do range vocal
        mask = (
            (periodicity_np >= conf_min) &
            (pitch_np > 0) &
            (pitch_np >= vr["fmin"]) &
            (pitch_np <= vr["fmax"])
        )

        times_f = times[mask]
        freqs_f = pitch_np[mask]

        logger.info(
            "torchcrepe: %d frames válidos de %d totais (%s, conf>=%.2f)",
            len(freqs_f), len(pitch_np), voice_gender, conf_min,
        )

        # Suavização — Savitzky-Golay (CORRIGIDO: era nn_filter errado)
        if len(freqs_f) > 5:
            freqs_f = _smooth_pitch_frames(freqs_f, window=5)

        frames = [
            {"time": float(t), "freq": float(f)}
            for t, f in zip(times_f, freqs_f)
        ]

        gc.collect()
        return frames

    except Exception as e:
        logger.warning("torchcrepe indisponível (%s), usando pYIN...", e)

        # Cleanup em caso de erro
        for var_name in ("audio_t", "pitch", "periodicity"):
            if var_name in locals():
                del locals()[var_name]
        import gc
        gc.collect()

    # ── Fallback: pYIN ───────────────────────────────────────────────────────
    try:
        import librosa

        audio, sr = librosa.load(path, sr=22050, mono=True)
        f0, voiced_flag, _ = librosa.pyin(
            audio,
            fmin=librosa.note_to_hz(vr["pyin_lo"]),
            fmax=librosa.note_to_hz(vr["pyin_hi"]),
            sr=sr,
            hop_length=512,
            fill_na=None,
        )
        hop_duration = 512 / sr
        frames = [
            {"time": float(i * hop_duration), "freq": float(f)}
            for i, (f, v) in enumerate(zip(f0, voiced_flag))
            if v and f and f > 0
        ]
        logger.info("pYIN: %d frames (%s)", len(frames), voice_gender)
        return frames

    except Exception as e:
        logger.error("pYIN fallback falhou: %s", e)
        return []


# ---------------------------------------------------------------------------
# process_realtime_frame — processamento de frame único (realtime)
# ---------------------------------------------------------------------------

def process_realtime_frame_moved(samples: list[float], sample_rate: int) -> dict:
    """
    Processa um frame de áudio em tempo real.

    Correções vs versão original:
      - Agrega TODOS os frames voiced (periodicity > VOICED_THRESHOLD)
        via mediana, em vez de usar apenas pitch[0, 0] (o 1º frame).
      - voiced usa VOICED_THRESHOLD = 0.50, não 0.30.
      - fmax reduzido para 900 Hz (range vocal realista).
      - freq_to_note importada da fonte canônica (retorna cents).

    Retorna dict completo com frequency, note, cents, confidence, voiced,
    voice_analysis, sample_rate, hop_length, frame_time, processing_mode.
    """
    n_samples = len(samples)
    logger.info("Processando %d samples @ %d Hz", n_samples, sample_rate)

    hop_length = max(int(0.01 * sample_rate), 1)  # 10 ms por frame

    samples_tensor = torch.tensor(samples, dtype=torch.float32).unsqueeze(0)

    with torch.no_grad():
        pitch, periodicity = torchcrepe.predict(
            audio=samples_tensor,
            sample_rate=sample_rate,
            fmin=50.0,
            fmax=900.0,           # CORRIGIDO: 2000 Hz era alto demais para voz
            model="full",
            hop_length=hop_length,
            device="cpu",
            return_periodicity=True,
        )

    pitch_np       = pitch[0].cpu().numpy()       # shape: (n_frames,)
    periodicity_np = periodicity[0].cpu().numpy()

    # ── CORRIGIDO: agrega todos os frames voiced via mediana ─────────────────
    # Original: freq = pitch[0, 0].item()  — apenas o 1º frame
    voiced_mask = periodicity_np >= VOICED_THRESHOLD

    if voiced_mask.any():
        freq       = float(np.median(pitch_np[voiced_mask]))
        confidence = float(np.mean(periodicity_np[voiced_mask]))
    else:
        # Nenhum frame com confiança suficiente — sem nota detectável
        freq       = 0.0
        confidence = float(np.max(periodicity_np)) if len(periodicity_np) > 0 else 0.0

    # Nota musical (com cents — fonte canônica)
    note_result = freq_to_note(freq) if freq > 0 else None

    note_str  = note_result["note"]   if note_result else "-"
    cents_val = note_result["cents"]  if note_result else 0
    is_voiced = freq > 0 and confidence >= VOICED_THRESHOLD

    result = {
        # Dados principais
        "frequency":   freq,
        "note":        note_str,
        "cents":       cents_val,

        # Qualidade da detecção
        "confidence":  confidence,
        "periodicity": confidence,
        "voiced":      is_voiced,       # CORRIGIDO: era > 0.3

        # Análise de voz
        "voice_analysis": _analyze_voice_characteristics(freq, confidence),

        # Metadados do processamento
        "sample_rate":     sample_rate,
        "hop_length":      hop_length,
        "frame_time":      0.01,
        "frames_analyzed": int(voiced_mask.sum()),
        "frames_total":    len(pitch_np),
        "processing_mode": "realtime",
        "range_info": {
            "fmin":  50.0,
            "fmax":  900.0,
            "model": "full",
        },
    }

    logger.info(
        "Realtime: %s (%.1f Hz, conf=%.2f, %d/%d frames voiced)",
        note_str, freq, confidence,
        result["frames_analyzed"], result["frames_total"],
    )
    return result


def _analyze_voice_characteristics(freq: float, confidence: float) -> dict:
    """
    Análise descritiva do range vocal — puramente informativa.
    Classificação baseada nos ranges convencionais (SATB).
    """
    if freq <= 0:
        voice_type   = "silence"
        range_desc   = "Silêncio ou sem voz"
    elif freq < 130:
        voice_type   = "bass"
        range_desc   = "Grave (Baixo)"
    elif freq < 220:
        voice_type   = "baritone_tenor"
        range_desc   = "Médio-grave (Barítono / Tenor)"
    elif freq < 350:
        voice_type   = "alto_tenor"
        range_desc   = "Médio (Alto / Tenor agudo)"
    elif freq < 525:
        voice_type   = "soprano_mezzo"
        range_desc   = "Médio-agudo (Mezzo / Soprano)"
    else:
        voice_type   = "soprano_high"
        range_desc   = "Agudo (Soprano agudo / Falsete)"

    if confidence > 0.90:
        quality = "excellent"
    elif confidence > 0.80:
        quality = "good"
    elif confidence > 0.60:
        quality = "fair"
    else:
        quality = "poor"

    return {
        "voice_type":       voice_type,
        "range_description": range_desc,
        "frequency_range":  f"{freq:.1f}Hz" if freq > 0 else "—",
        "confidence_level": quality,
        "is_in_vocal_range": 60 <= freq <= 900,
    }


# ---------------------------------------------------------------------------
# Wrappers assíncronos com timeout
# ---------------------------------------------------------------------------

async def safe_extract_pitch(file_path: str, voice_gender: str = "auto") -> list[dict]:
    """
    Executa extract_pitch em thread pool sem timeout.
    Processamento de arquivos longos pode demorar — não limitamos aqui.
    """
    try:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, extract_pitch, file_path, voice_gender)
    except Exception as e:
        logger.error("Erro no processamento de pitch: %s — %s", file_path, e)
        raise


async def safe_whisper_transcribe(model, tmp_path: str, language: str):
    """
    Executa transcrição Whisper com timeout de 5 minutos.
    """
    from fastapi import HTTPException

    def _transcribe():
        return model.transcribe(tmp_path, word_timestamps=True, language=language)

    try:
        loop = asyncio.get_event_loop()
        segments, info = await asyncio.wait_for(
            loop.run_in_executor(None, _transcribe),
            timeout=TIMEOUT_CONFIG["whisper_transcribe"],
        )
        return segments, info
    except asyncio.TimeoutError:
        logger.error("Timeout na transcrição Whisper: %s", tmp_path)
        raise HTTPException(
            status_code=408,
            detail="Arquivo muito longo para processamento. Tente um arquivo menor.",
        )


async def safe_realtime_pitch(samples: list[float], sample_rate: int) -> dict:
    """
    Executa processamento realtime em thread pool com timeout rigoroso (5 s).
    """
    from fastapi import HTTPException

    def _process():
        return process_realtime_frame_moved(samples, sample_rate)

    try:
        loop = asyncio.get_event_loop()
        return await asyncio.wait_for(
            loop.run_in_executor(None, _process),
            timeout=TIMEOUT_CONFIG["realtime_frame"],
        )
    except asyncio.TimeoutError:
        logger.error("Timeout no processamento realtime")
        raise HTTPException(status_code=408, detail="Timeout no processamento em tempo real")
    except Exception as e:
        logger.error("Erro no processamento realtime: %s", e)
        raise HTTPException(status_code=500, detail="Erro no processamento de áudio")